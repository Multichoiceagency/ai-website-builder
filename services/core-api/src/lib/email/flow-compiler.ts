/**
 * Compiling an e-mail flow into an automation graph.
 *
 * A flow is a stored definition (§30) and an automation is a stored graph
 * (§31) — but there is only one executor in this service, and there should be.
 * Every property Phase 6a promises about automation runs (resumable, one
 * execution per node, one e-mail per step however many times a trigger fires)
 * is a property of that executor, so a flow gets them by becoming one rather
 * than by having a second runner written to the same specification.
 *
 * The flow row stays the thing a user reads and edits. This output is derived,
 * and regenerated whenever the flow is enabled.
 */
import {
  automationGraphSchema,
  type AutomationGraph,
  type AutomationNode,
  type EmailFlow,
} from '@platform/schemas'

/** Node ids are derived from step ids, so a recompile is stable and diffable. */
function delayNodeId(stepId: string): string {
  return `wait_${stepId}`.slice(0, 64)
}

function sendNodeId(stepId: string): string {
  return `send_${stepId}`.slice(0, 64)
}

/**
 * `trigger → (delay → send)*`.
 *
 * Delays are relative to the previous step, which is what makes them a chain
 * of nodes rather than a set of absolute offsets the runner would have to
 * reconcile after a restart.
 */
export function compileFlowToGraph(flow: EmailFlow): AutomationGraph {
  const nodes: AutomationNode[] = []

  const entryId = 'flow_start'
  const steps = flow.steps

  const firstTarget = steps.length
    ? steps[0]!.delaySeconds > 0
      ? delayNodeId(steps[0]!.id)
      : sendNodeId(steps[0]!.id)
    : null

  nodes.push({
    id: entryId,
    kind: 'trigger',
    label: flow.name,
    event: flow.triggerEvent || undefined,
    branches: [],
    next: firstTarget,
  })

  for (const [index, step] of steps.entries()) {
    const nextStep = steps[index + 1]
    const nextTarget = nextStep
      ? nextStep.delaySeconds > 0
        ? delayNodeId(nextStep.id)
        : sendNodeId(nextStep.id)
      : null

    if (step.delaySeconds > 0) {
      nodes.push({
        id: delayNodeId(step.id),
        kind: 'delay',
        label: `Wait before ${step.id}`,
        delaySeconds: step.delaySeconds,
        branches: [],
        next: sendNodeId(step.id),
      })
    }

    nodes.push({
      id: sendNodeId(step.id),
      kind: 'action',
      label: step.subject,
      branches: [],
      action: {
        type: 'email.send',
        // Flows always mail the contact the trigger carried. A flow that could
        // mail an arbitrary address would be a campaign wearing a disguise.
        to: 'contact',
        templateKey: step.templateKey,
        subject: step.subject,
        bodyHtml: step.bodyHtml,
        bodyText: step.bodyText,
      },
      next: nextTarget,
    })
  }

  // Parsed rather than returned raw: a compiled graph goes through the same
  // validation a hand-written one does, dangling-edge check included.
  return automationGraphSchema.parse({ entryNodeId: entryId, nodes })
}
