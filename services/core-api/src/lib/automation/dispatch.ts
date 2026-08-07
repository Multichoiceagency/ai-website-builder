/**
 * Getting events into automations.
 *
 * Automations subscribe to the same typed domain-event stream every other
 * module reads (§8) rather than being called directly from the code that
 * caused the change. The CRM does not know automations exist, which is the
 * only reason a tenant can add one without a deploy.
 */
import type { Actor, DomainEvent, DomainEventName } from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import { claimAutomationRun, findAutomationById, listAutomationsForEvent } from '../../db/repositories/automation.js'
import { eventBus } from '../event-bus.js'
import { executeAutomationRun, type RunOutcome } from './runner.js'

/**
 * The events an automation may listen for today. A curated list rather than
 * "every event": each one has a documented context shape that graph conditions
 * can rely on.
 */
export const AUTOMATION_TRIGGER_EVENTS: DomainEventName[] = [
  'lead.created',
  'lead.qualified',
  'deal.won',
  'order.placed',
  'payment.captured',
  'checkout.started',
  'cart.created',
  'email.campaign_sent',
]

const SYSTEM_ACTOR: Actor = { type: 'system', id: null, label: 'automation' }

/**
 * Start (or resume) an automation for one trigger.
 *
 * `triggerKey` is the de-duplication key. Call this twice with the same key
 * and the second call finds the finished run and returns without executing
 * anything — the property the idempotency test pins down.
 */
export async function triggerAutomation(
  tenantId: string,
  automationId: string,
  input: { triggerKey: string; triggerEvent?: string; context?: Record<string, unknown> },
  actor: Actor = SYSTEM_ACTOR,
): Promise<RunOutcome | null> {
  const prepared = await withTenant(tenantId, async (tx) => {
    const automation = await findAutomationById(tx, tenantId, automationId)
    if (!automation) return null

    const { run } = await claimAutomationRun(tx, tenantId, {
      automationId,
      triggerKey: input.triggerKey,
      triggerEvent: input.triggerEvent ?? automation.triggerEvent,
      context: input.context ?? {},
      entryNodeId: automation.graph.entryNodeId,
    })

    return { automation, run }
  })
  if (!prepared) return null

  return executeAutomationRun(tenantId, prepared.automation, prepared.run, actor)
}

/** The context every graph condition can address. Flat, on purpose. */
function contextFromEvent(event: DomainEvent): Record<string, unknown> {
  const payload = event.payload as Record<string, unknown>

  return {
    event: event.name,
    occurredAt: event.occurredAt,
    resourceId: event.resource?.id ?? null,
    resourceType: event.resource?.type ?? null,
    ...payload,
  }
}

export async function dispatchEventToAutomations(event: DomainEvent): Promise<void> {
  if (!event.tenantId) return

  const automations = await withTenant(event.tenantId, (tx) =>
    listAutomationsForEvent(tx, event.tenantId!, event.name),
  )
  if (!automations.length) return

  const context = contextFromEvent(event)

  for (const automation of automations) {
    // The event id is the trigger key: a redelivered event is the same event,
    // and must not produce a second run.
    await triggerAutomation(event.tenantId, automation.id, {
      triggerKey: event.id,
      triggerEvent: event.name,
      context,
    })
  }
}

let subscribed = false

/**
 * Wire the dispatcher onto the bus. Idempotent, because registering the API
 * more than once in a process (tests do) must not mean handling every event
 * twice.
 */
export function subscribeAutomationsToEvents(): void {
  if (subscribed) return
  subscribed = true

  for (const name of AUTOMATION_TRIGGER_EVENTS) {
    eventBus.subscribe(name, (event) => dispatchEventToAutomations(event))
  }
}
