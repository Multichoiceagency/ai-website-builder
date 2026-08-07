/**
 * Emitting a CRM domain event.
 *
 * The same two steps `routes/pages.ts` performs, in the same order: append to
 * the audit log inside its own tenant-bound transaction, then publish. A
 * subscriber therefore never sees an event whose cause is not yet durable.
 *
 * It lives here rather than in a route module because three route files emit
 * events and none of them should have to import another route to do it.
 */
import type { Actor, DomainEventName } from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import { recordAuditEvent } from '../../db/repositories/audit.js'
import { buildEvent, eventBus } from '../event-bus.js'

export async function emitCrmEvent(input: {
  name: DomainEventName
  tenantId: string
  actor: Actor
  resource?: { type: string; id: string }
  payload?: Record<string, unknown>
}): Promise<void> {
  const event = buildEvent(input)
  await withTenant(input.tenantId, (tx) => recordAuditEvent(tx, event))
  await eventBus.publish(event)
}
