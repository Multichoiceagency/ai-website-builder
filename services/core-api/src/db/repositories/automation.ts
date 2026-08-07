/**
 * Automation persistence: the stored graph, its runs, and the per-node run
 * state that makes a run resumable.
 *
 * Two writes here carry the whole idempotency guarantee, and both delegate it
 * to a unique index rather than to a check-then-act in application code:
 *
 *   * `claimAutomationRun`  — one run per (tenant, automation, trigger key)
 *   * `claimNodeRun`        — one execution per (run, node)
 *
 * A second delivery of the same trigger therefore *resumes* rather than
 * restarts, and a node that already ran is never dispatched again.
 */
import {
  automationNodeRunSchema,
  automationRunSchema,
  automationSchema,
  type Automation,
  type AutomationGraph,
  type AutomationNodeKind,
  type AutomationNodeRun,
  type AutomationNodeRunStatus,
  type AutomationRun,
  type AutomationRunStatus,
  type AutomationStatus,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

// region Automations

interface AutomationRow {
  id: string
  source_flow_id: string | null
  name: string
  description: string
  status: AutomationStatus
  trigger_event: string
  graph: unknown
  version: number
  run_count?: string | number
  last_run_at?: Date | null
  created_at: Date
  updated_at: Date
}

function toAutomation(row: AutomationRow): Automation {
  return automationSchema.parse({
    id: row.id,
    sourceFlowId: row.source_flow_id,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerEvent: row.trigger_event,
    graph: readJson<Record<string, unknown>>(row.graph, { entryNodeId: '', nodes: [] }),
    version: Number(row.version),
    runCount: Number(row.run_count ?? 0),
    lastRunAt: row.last_run_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

const AUTOMATION_SELECT = (tx: Tx) => tx`
  a.id, a.source_flow_id, a.name, a.description, a.status, a.trigger_event, a.graph, a.version,
  a.created_at, a.updated_at,
  (SELECT count(*) FROM automation_runs r WHERE r.automation_id = a.id) AS run_count,
  (SELECT max(r.started_at) FROM automation_runs r WHERE r.automation_id = a.id) AS last_run_at
`

export async function listAutomations(tx: Tx, tenantId: string): Promise<Automation[]> {
  const rows = await tx<AutomationRow[]>`
    SELECT ${AUTOMATION_SELECT(tx)} FROM automations a
    WHERE a.tenant_id = ${tenantId}
    ORDER BY a.created_at DESC
    LIMIT 200
  `
  return rows.map(toAutomation)
}

export async function findAutomationById(tx: Tx, tenantId: string, id: string): Promise<Automation | null> {
  const [row] = await tx<AutomationRow[]>`
    SELECT ${AUTOMATION_SELECT(tx)} FROM automations a
    WHERE a.tenant_id = ${tenantId} AND a.id = ${id}
    LIMIT 1
  `
  return row ? toAutomation(row) : null
}

/** Active automations listening for one event. The dispatch path's only read. */
export async function listAutomationsForEvent(
  tx: Tx,
  tenantId: string,
  event: string,
): Promise<Automation[]> {
  const rows = await tx<AutomationRow[]>`
    SELECT ${AUTOMATION_SELECT(tx)} FROM automations a
    WHERE a.tenant_id = ${tenantId} AND a.status = 'active' AND a.trigger_event = ${event}
    LIMIT 50
  `
  return rows.map(toAutomation)
}

export async function insertAutomation(
  tx: Tx,
  tenantId: string,
  input: {
    name: string
    description?: string
    status?: AutomationStatus
    triggerEvent?: string
    graph: AutomationGraph
  },
): Promise<Automation> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO automations (tenant_id, name, description, status, trigger_event, graph)
    VALUES (
      ${tenantId}, ${input.name}, ${input.description ?? ''}, ${input.status ?? 'draft'},
      ${input.triggerEvent ?? ''}, ${jsonParam(tx, input.graph)}
    )
    RETURNING id
  `
  const automation = await findAutomationById(tx, tenantId, row!.id)
  return automation!
}

/**
 * Editing the graph bumps `version`. Runs already in flight keep executing the
 * graph they started with — a run that changes shape halfway through is a run
 * nobody can explain afterwards.
 */
export async function updateAutomation(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: {
    name?: string
    description?: string
    status?: AutomationStatus
    triggerEvent?: string
    graph?: AutomationGraph
  },
): Promise<Automation | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE automations SET
      name          = COALESCE(${patch.name ?? null}::text, name),
      description   = COALESCE(${patch.description ?? null}::text, description),
      status        = COALESCE(${patch.status ?? null}::text, status),
      trigger_event = COALESCE(${patch.triggerEvent ?? null}::text, trigger_event),
      graph         = COALESCE(${patch.graph ? jsonParam(tx, patch.graph) : null}::jsonb, graph),
      version       = version + ${patch.graph ? 1 : 0}
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING id
  `
  return rows.length ? findAutomationById(tx, tenantId, id) : null
}

/**
 * Store the compiled form of an e-mail flow.
 *
 * Upsert on the flow id: enabling a flow twice, or editing it and enabling it
 * again, replaces the graph rather than accumulating automations that all fire
 * on the same event.
 */
export async function upsertFlowAutomation(
  tx: Tx,
  tenantId: string,
  input: {
    flowId: string
    name: string
    description: string
    status: AutomationStatus
    triggerEvent: string
    graph: AutomationGraph
  },
): Promise<Automation> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO automations (tenant_id, source_flow_id, name, description, status, trigger_event, graph)
    VALUES (
      ${tenantId}, ${input.flowId}, ${input.name}, ${input.description},
      ${input.status}, ${input.triggerEvent}, ${jsonParam(tx, input.graph)}
    )
    ON CONFLICT (tenant_id, source_flow_id) WHERE source_flow_id IS NOT NULL DO UPDATE SET
      name          = EXCLUDED.name,
      description   = EXCLUDED.description,
      status        = EXCLUDED.status,
      trigger_event = EXCLUDED.trigger_event,
      graph         = EXCLUDED.graph,
      version       = automations.version + 1
    RETURNING id
  `
  const automation = await findAutomationById(tx, tenantId, row!.id)
  return automation!
}

export async function deleteAutomation(tx: Tx, tenantId: string, id: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM automations WHERE tenant_id = ${tenantId} AND id = ${id} RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Runs

interface RunRow {
  id: string
  automation_id: string
  automation_name?: string | null
  status: AutomationRunStatus
  trigger_key: string
  trigger_event: string
  context: unknown
  current_node_id: string | null
  resume_at: Date | null
  error: string
  started_at: Date
  finished_at: Date | null
}

function toRun(row: RunRow, nodeRuns: AutomationNodeRun[] = []): AutomationRun {
  return automationRunSchema.parse({
    id: row.id,
    automationId: row.automation_id,
    automationName: row.automation_name ?? '',
    status: row.status,
    triggerKey: row.trigger_key,
    triggerEvent: row.trigger_event,
    context: readJson<Record<string, unknown>>(row.context, {}),
    currentNodeId: row.current_node_id,
    resumeAt: row.resume_at,
    error: row.error,
    nodeRuns,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  })
}

/**
 * Get the run for this trigger, creating it only if it does not exist.
 *
 * `created: false` means this exact trigger has been seen before. The caller
 * resumes that run — it does not start a parallel one, and it does not re-send
 * anything the run already did.
 */
export async function claimAutomationRun(
  tx: Tx,
  tenantId: string,
  input: {
    automationId: string
    triggerKey: string
    triggerEvent?: string
    context?: Record<string, unknown>
    entryNodeId: string
  },
): Promise<{ run: AutomationRun; created: boolean }> {
  const inserted = await tx<RunRow[]>`
    INSERT INTO automation_runs (
      tenant_id, automation_id, status, trigger_key, trigger_event, context, current_node_id
    )
    VALUES (
      ${tenantId}, ${input.automationId}, 'running', ${input.triggerKey},
      ${input.triggerEvent ?? ''}, ${jsonParam(tx, input.context ?? {})}, ${input.entryNodeId}
    )
    ON CONFLICT (tenant_id, automation_id, trigger_key) DO NOTHING
    RETURNING *
  `
  if (inserted.length) return { run: toRun(inserted[0]!), created: true }

  const [existing] = await tx<RunRow[]>`
    SELECT * FROM automation_runs
    WHERE tenant_id = ${tenantId} AND automation_id = ${input.automationId}
      AND trigger_key = ${input.triggerKey}
    LIMIT 1
  `
  const nodeRuns = await listNodeRuns(tx, tenantId, existing!.id)
  return { run: toRun(existing!, nodeRuns), created: false }
}

export async function findAutomationRunById(tx: Tx, tenantId: string, id: string): Promise<AutomationRun | null> {
  const [row] = await tx<RunRow[]>`
    SELECT r.*, a.name AS automation_name
    FROM automation_runs r
    JOIN automations a ON a.id = r.automation_id
    WHERE r.tenant_id = ${tenantId} AND r.id = ${id}
    LIMIT 1
  `
  if (!row) return null
  return toRun(row, await listNodeRuns(tx, tenantId, id))
}

export async function listAutomationRuns(
  tx: Tx,
  tenantId: string,
  filter: { automationId?: string; limit?: number } = {},
): Promise<AutomationRun[]> {
  const rows = await tx<RunRow[]>`
    SELECT r.*, a.name AS automation_name
    FROM automation_runs r
    JOIN automations a ON a.id = r.automation_id
    WHERE r.tenant_id = ${tenantId}
      AND (${filter.automationId ?? null}::uuid IS NULL OR r.automation_id = ${filter.automationId ?? null})
    ORDER BY r.started_at DESC
    LIMIT ${filter.limit ?? 50}
  `
  return rows.map((row) => toRun(row))
}

export async function updateAutomationRun(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: {
    status?: AutomationRunStatus
    currentNodeId?: string | null
    resumeAt?: Date | null
    error?: string
    context?: Record<string, unknown>
    finished?: boolean
  },
): Promise<void> {
  // `null` is a meaningful value for both `current_node_id` (the run ended)
  // and `resume_at` (the run woke up), so COALESCE cannot express "leave it
  // alone" here — an explicit "was this key supplied?" flag can.
  const setNode = patch.currentNodeId !== undefined
  const setResume = patch.resumeAt !== undefined

  await tx`
    UPDATE automation_runs SET
      status          = COALESCE(${patch.status ?? null}::text, status),
      current_node_id = CASE WHEN ${setNode}::boolean THEN ${patch.currentNodeId ?? null}::text ELSE current_node_id END,
      resume_at       = CASE WHEN ${setResume}::boolean THEN ${patch.resumeAt ?? null}::timestamptz ELSE resume_at END,
      error           = COALESCE(${patch.error ?? null}::text, error),
      context         = COALESCE(${patch.context ? jsonParam(tx, patch.context) : null}::jsonb, context),
      finished_at     = CASE WHEN ${patch.finished === true}::boolean THEN now() ELSE finished_at END
    WHERE tenant_id = ${tenantId} AND id = ${id}
  `
}

/** Runs parked by a delay node whose wake-up time has passed. */
export async function listResumableRuns(tx: Tx, tenantId: string, limit = 50): Promise<AutomationRun[]> {
  const rows = await tx<RunRow[]>`
    SELECT r.*, a.name AS automation_name
    FROM automation_runs r
    JOIN automations a ON a.id = r.automation_id
    WHERE r.tenant_id = ${tenantId} AND r.status = 'waiting' AND r.resume_at <= now()
    ORDER BY r.resume_at ASC
    LIMIT ${limit}
  `
  return rows.map((row) => toRun(row))
}

// endregion

// region Node runs

interface NodeRunRow {
  id: string
  run_id: string
  node_id: string
  kind: AutomationNodeKind
  status: AutomationNodeRunStatus
  output: unknown
  error: string
  finished_at: Date
}

function toNodeRun(row: NodeRunRow): AutomationNodeRun {
  return automationNodeRunSchema.parse({
    id: row.id,
    runId: row.run_id,
    nodeId: row.node_id,
    kind: row.kind,
    status: row.status,
    output: readJson<Record<string, unknown>>(row.output, {}),
    error: row.error,
    finishedAt: row.finished_at,
  })
}

export async function listNodeRuns(tx: Tx, tenantId: string, runId: string): Promise<AutomationNodeRun[]> {
  const rows = await tx<NodeRunRow[]>`
    SELECT * FROM automation_node_runs
    WHERE tenant_id = ${tenantId} AND run_id = ${runId}
    ORDER BY finished_at ASC
  `
  return rows.map(toNodeRun)
}

/**
 * Record that a node executed.
 *
 * Returns `null` when a row already exists for this (run, node) — the signal
 * that the node ran in an earlier attempt and must not run again. The row is
 * written *after* the action succeeds but inside the same transaction, so a
 * crash between the two is impossible.
 */
export async function recordNodeRun(
  tx: Tx,
  tenantId: string,
  input: {
    runId: string
    nodeId: string
    kind: AutomationNodeKind
    status: AutomationNodeRunStatus
    output?: Record<string, unknown>
    error?: string
  },
): Promise<AutomationNodeRun | null> {
  const rows = await tx<NodeRunRow[]>`
    INSERT INTO automation_node_runs (tenant_id, run_id, node_id, kind, status, output, error)
    VALUES (
      ${tenantId}, ${input.runId}, ${input.nodeId}, ${input.kind}, ${input.status},
      ${jsonParam(tx, input.output ?? {})}, ${input.error ?? ''}
    )
    ON CONFLICT (run_id, node_id) DO NOTHING
    RETURNING *
  `
  return rows.length ? toNodeRun(rows[0]!) : null
}

// endregion
