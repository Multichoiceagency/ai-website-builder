# ADR-0008 — Typed event bus now, swappable transport later

**Status:** accepted

## Context

Analytics, tracking, CRM, SEO, email, automations and apps all need to react to
the same facts (`page.published`, `lead.created`, `order.placed`). Wiring them to
call each other produces a mesh that cannot be extended by third-party apps at
all.

But a message broker at Phase 1 is infrastructure we would operate before we have
consumers for it.

## Decision

Define the **contract** now, defer the **transport**.

`packages/schemas/src/events.ts` types every domain event: name, version, tenant,
occurred-at, actor, typed payload. Publishing goes through one `EventBus`
interface:

```ts
interface EventBus {
  publish(event: DomainEvent): Promise<void>
  subscribe(name: EventName, handler: EventHandler): void
}
```

Phase 1 ships `InProcessEventBus`, which dispatches to registered handlers and
persists an audit row. Handlers are already written as if they were remote:
idempotent, keyed by event id, no shared memory with the publisher.

When a second consumer process appears, we implement `RedisStreamsEventBus`
against the same interface. Nothing that publishes or subscribes changes.

Kafka is explicitly out of scope until throughput demands it — see the MVP
restrictions in the product spec.

## Consequences

- Event names and payloads are stable from day one, so the webhook platform and
  the App SDK can be built against them later without a breaking rename.
- Handlers written idempotently from the start survive at-least-once delivery.
- Cost: in-process delivery has no durability. Acceptable in Phase 1 because the
  only consumers are audit and analytics writes that happen in the same
  transaction-adjacent path; anything needing durability waits for the Redis
  implementation.
