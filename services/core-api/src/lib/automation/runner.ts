/**
 * The automation executor.
 *
 * Two properties are non-negotiable (§31):
 *
 *   **Resumable.** Every node that finishes writes a row recording what it did
 *   and where it went next. A restart re-reads those rows and walks past them,
 *   so a process that dies mid-graph continues rather than starts over.
 *
 *   **Idempotent.** A node with a row is never executed again, and the one
 *   action with an outside effect — sending mail — carries its own key derived
 *   from (run, node). Both guards are needed: the first is the fast path, the
 *   second still holds if the first write never lands.
 *
 * Each node commits in its own short transaction. A single long transaction
 * around a graph containing a delay and an HTTP call would hold a connection
 * for as long as the slowest third party takes to answer.
 */
import type {
  Actor,
  Automation,
  AutomationNode,
  AutomationRun,
  AutomationRunStatus,
} from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import { listNodeRuns, recordNodeRun, updateAutomationRun } from '../../db/repositories/automation.js'
import { dispatchAction } from './actions.js'
import { evaluateCondition } from './conditions.js'

/** A graph that walks 200 nodes is a loop, not a workflow. */
const MAX_STEPS = 200

export interface RunOutcome {
  runId: string
  status: AutomationRunStatus
  /** Nodes executed *by this call* — empty when the run was already finished. */
  executedNodes: string[]
  error?: string
}

const TERMINAL: AutomationRunStatus[] = ['completed', 'failed', 'cancelled']

function nextFromOutput(output: Record<string, unknown>): string | null {
  const next = output.next
  return typeof next === 'string' && next ? next : null
}

export async function executeAutomationRun(
  tenantId: string,
  automation: Automation,
  run: AutomationRun,
  actor: Actor,
): Promise<RunOutcome> {
  // A finished run is finished. This is what makes replaying a trigger a
  // no-op rather than a second set of e-mails.
  if (TERMINAL.includes(run.status)) {
    return { runId: run.id, status: run.status, executedNodes: [] }
  }

  const nodes = new Map<string, AutomationNode>(automation.graph.nodes.map((node) => [node.id, node]))
  const priorRuns = await withTenant(tenantId, (tx) => listNodeRuns(tx, tenantId, run.id))
  const completed = new Map(priorRuns.map((nodeRun) => [nodeRun.nodeId, nodeRun]))

  const context: Record<string, unknown> = { ...run.context }
  const executedNodes: string[] = []

  let currentId: string | null = run.currentNodeId ?? automation.graph.entryNodeId
  let steps = 0

  while (currentId && steps < MAX_STEPS) {
    steps += 1
    const node = nodes.get(currentId)

    if (!node) {
      await finish(tenantId, run.id, 'failed', `Unknown node \`${currentId}\`.`)
      return { runId: run.id, status: 'failed', executedNodes, error: 'unknown node' }
    }

    // Already executed in an earlier attempt: follow the edge it recorded,
    // never the edge the graph would choose now.
    const prior = completed.get(node.id)
    if (prior) {
      currentId = nextFromOutput(prior.output)
      continue
    }

    if (node.kind === 'delay') {
      const parked = await park(tenantId, run, node)
      if (parked) return { runId: run.id, status: 'waiting', executedNodes }
    }

    let output: Record<string, unknown>
    try {
      output = await evaluateNode(node, context, { tenantId, runId: run.id, actor })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Node failed.'
      await withTenant(tenantId, (tx) =>
        recordNodeRun(tx, tenantId, {
          runId: run.id,
          nodeId: node.id,
          kind: node.kind,
          status: 'failed',
          error: message.slice(0, 500),
        }),
      )
      await finish(tenantId, run.id, 'failed', message.slice(0, 500))
      return { runId: run.id, status: 'failed', executedNodes, error: message }
    }

    // Written after the effect, so a crash between the two leaves the node
    // unrecorded — which is the safe direction only because every effectful
    // action is separately keyed.
    const recorded = await withTenant(tenantId, (tx) =>
      recordNodeRun(tx, tenantId, {
        runId: run.id,
        nodeId: node.id,
        kind: node.kind,
        status: 'completed',
        output,
      }),
    )

    // `null` means another worker recorded this node first. It owns the rest
    // of the run; this one steps aside rather than racing it to the end.
    if (!recorded) return { runId: run.id, status: 'running', executedNodes }

    executedNodes.push(node.id)
    currentId = nextFromOutput(output)
  }

  if (currentId) {
    await finish(tenantId, run.id, 'failed', 'Automation exceeded the maximum number of steps.')
    return { runId: run.id, status: 'failed', executedNodes, error: 'step limit reached' }
  }

  await finish(tenantId, run.id, 'completed')
  return { runId: run.id, status: 'completed', executedNodes }
}

/**
 * Park the run if the delay has not elapsed.
 *
 * Returns true when the caller must stop. A resumed run arrives with
 * `resumeAt` in the past and this returns false, so the delay node records and
 * execution continues.
 */
async function park(tenantId: string, run: AutomationRun, node: AutomationNode): Promise<boolean> {
  const seconds = node.delaySeconds ?? 0
  if (seconds <= 0) return false

  const alreadyParkedHere = run.currentNodeId === node.id && run.resumeAt !== null
  if (alreadyParkedHere && new Date(run.resumeAt!).getTime() <= Date.now()) return false

  const resumeAt = alreadyParkedHere ? new Date(run.resumeAt!) : new Date(Date.now() + seconds * 1000)
  await withTenant(tenantId, (tx) =>
    updateAutomationRun(tx, tenantId, run.id, { status: 'waiting', currentNodeId: node.id, resumeAt }),
  )
  return true
}

async function evaluateNode(
  node: AutomationNode,
  context: Record<string, unknown>,
  scope: { tenantId: string; runId: string; actor: Actor },
): Promise<Record<string, unknown>> {
  switch (node.kind) {
    case 'trigger':
      return { next: node.next }

    case 'delay':
      return { next: node.next, delaySeconds: node.delaySeconds ?? 0 }

    case 'condition': {
      const passed = node.condition ? evaluateCondition(node.condition, context) : false
      // A false condition ends the run. It is not a failure — "this contact
      // did not qualify" is the answer the graph was asking for.
      return { next: passed ? node.next : null, passed }
    }

    case 'branch': {
      const taken = node.branches.find((branch) => evaluateCondition(branch.when, context))
      return { next: taken?.next ?? node.next, branch: taken?.key ?? null }
    }

    case 'action': {
      if (!node.action) return { next: node.next, skipped: true }
      const result = await dispatchAction(node.action, {
        tenantId: scope.tenantId,
        runId: scope.runId,
        nodeId: node.id,
        actor: scope.actor,
        context,
      })
      return { ...result, next: node.next }
    }

    default:
      return { next: null }
  }
}

async function finish(
  tenantId: string,
  runId: string,
  status: AutomationRunStatus,
  error?: string,
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    updateAutomationRun(tx, tenantId, runId, {
      status,
      currentNodeId: null,
      resumeAt: null,
      error,
      finished: true,
    }),
  )
}
