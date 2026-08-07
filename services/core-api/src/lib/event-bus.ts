import { randomUUID } from 'node:crypto'
import type { Actor, DomainEvent, DomainEventName } from '@platform/schemas'

export type EventHandler = (event: DomainEvent) => Promise<void> | void

export interface EventBus {
  publish(event: DomainEvent): Promise<void>
  subscribe(name: DomainEventName, handler: EventHandler): void
}

/**
 * Phase 1 transport (ADR-0008). Handlers are written as if they were remote —
 * idempotent, keyed by event id, no shared state with the publisher — so
 * swapping in Redis Streams later changes nothing but this class.
 *
 * A failing handler is logged and swallowed: a subscriber must never be able to
 * fail the request that produced the event.
 */
export class InProcessEventBus implements EventBus {
  readonly #handlers = new Map<DomainEventName, EventHandler[]>()

  constructor(private readonly onHandlerError: (error: unknown, event: DomainEvent) => void = () => {}) {}

  subscribe(name: DomainEventName, handler: EventHandler): void {
    const existing = this.#handlers.get(name)
    if (existing) existing.push(handler)
    else this.#handlers.set(name, [handler])
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.#handlers.get(event.name)
    if (!handlers?.length) return

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event)
        } catch (error) {
          this.onHandlerError(error, event)
        }
      }),
    )
  }
}

/** Build a well-formed event without repeating the envelope at every call site. */
export function buildEvent(input: {
  name: DomainEventName
  tenantId: string | null
  actor: Actor
  resource?: { type: string; id: string }
  payload?: Record<string, unknown>
}): DomainEvent {
  return {
    id: randomUUID(),
    name: input.name,
    version: 1,
    tenantId: input.tenantId,
    occurredAt: new Date().toISOString(),
    actor: input.actor,
    resource: input.resource ?? null,
    payload: input.payload ?? {},
  }
}

export const eventBus = new InProcessEventBus((error, event) => {
  console.error(`event handler failed for ${event.name} (${event.id}):`, error)
})
