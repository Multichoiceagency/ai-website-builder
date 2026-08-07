import {
  DOMAIN_EVENT_NAMES,
  WEBHOOK_DELIVERY_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  type DomainEvent,
} from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import {
  claimDueDeliveries,
  enqueueDeliveries,
  markAttemptFailed,
  markDelivered,
  type DispatchTarget,
} from '../../db/repositories/app-webhooks.js'
import type { EventBus } from '../event-bus.js'
import { currentTimestamp, signPayload } from './signature.js'

/**
 * Signed webhook delivery with retry (§89).
 *
 * Delivery is persisted before it is attempted, so a crash between "event
 * happened" and "app was told" leaves a row to retry rather than a gap. Every
 * attempt is recorded; nothing is delivered silently and nothing is dropped
 * silently.
 */

const REQUEST_TIMEOUT_MS = 8_000
const BASE_BACKOFF_SECONDS = 30
const MAX_BACKOFF_SECONDS = 3_600
const MAX_DELIVERIES_PER_FLUSH = 25

/** 30s, 1m, 2m, 4m, 8m — capped. Enough to ride out a deploy, not a weekend. */
export function backoffSeconds(attempt: number): number {
  const exponent = Math.max(0, attempt - 1)
  return Math.min(BASE_BACKOFF_SECONDS * 2 ** exponent, MAX_BACKOFF_SECONDS)
}

/** Exactly what the app receives, and exactly what the signature covers. */
export function deliveryBody(target: DispatchTarget): string {
  return JSON.stringify({
    id: target.eventId,
    event: target.eventName,
    deliveryId: target.deliveryId,
    data: target.payload,
  })
}

export function deliveryHeaders(target: DispatchTarget, timestamp: string, signature: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    [WEBHOOK_SIGNATURE_HEADER]: signature,
    [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
    [WEBHOOK_EVENT_HEADER]: target.eventName,
    [WEBHOOK_DELIVERY_HEADER]: target.deliveryId,
  }
}

/**
 * Persist one delivery per active subscription. Returns how many were queued,
 * which is what the caller logs — never the subscriptions themselves.
 */
export async function fanoutEvent(event: DomainEvent): Promise<number> {
  if (!event.tenantId) return 0

  return withTenant(event.tenantId, (tx) =>
    enqueueDeliveries(tx, {
      tenantId: event.tenantId!,
      eventId: event.id,
      eventName: event.name,
      payload: { ...event.payload, resource: event.resource, occurredAt: event.occurredAt },
      maxAttempts: WEBHOOK_MAX_ATTEMPTS,
    }),
  )
}

export interface FlushResult {
  attempted: number
  delivered: number
  failed: number
}

/**
 * Attempt every delivery that is due for one tenant.
 *
 * Each attempt gets its own transaction. A slow endpoint must not hold a
 * transaction open across an outbound HTTP call, and one failing app must not
 * roll back another app's successful delivery.
 */
export async function flushDeliveries(tenantId: string, limit = MAX_DELIVERIES_PER_FLUSH): Promise<FlushResult> {
  const targets = await withTenant(tenantId, (tx) => claimDueDeliveries(tx, tenantId, limit))

  let delivered = 0
  let failed = 0

  for (const target of targets) {
    const ok = await attemptDelivery(tenantId, target)
    if (ok) delivered += 1
    else failed += 1
  }

  return { attempted: targets.length, delivered, failed }
}

async function attemptDelivery(tenantId: string, target: DispatchTarget): Promise<boolean> {
  const body = deliveryBody(target)
  const timestamp = currentTimestamp()
  const signature = signPayload(target.secret, timestamp, body)

  try {
    const response = await fetch(target.targetUrl, {
      method: 'POST',
      headers: deliveryHeaders(target, timestamp, signature),
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.ok) {
      await withTenant(tenantId, (tx) => markDelivered(tx, tenantId, target.deliveryId, response.status))
      return true
    }

    await withTenant(tenantId, (tx) =>
      markAttemptFailed(tx, tenantId, target.deliveryId, {
        statusCode: response.status,
        error: `endpoint responded ${response.status}`,
        backoffSeconds: backoffSeconds(target.attempts),
      }),
    )
    return false
  } catch (error) {
    await withTenant(tenantId, (tx) =>
      markAttemptFailed(tx, tenantId, target.deliveryId, {
        statusCode: null,
        error: error instanceof Error ? error.message : 'delivery failed',
        backoffSeconds: backoffSeconds(target.attempts),
      }),
    )
    return false
  }
}

let registered = false

/**
 * Subscribe the webhook fanout to every domain event.
 *
 * Registration is idempotent because the plugin that calls it can be built more
 * than once in a test run, and a doubly-registered handler would deliver every
 * event twice.
 */
export function registerWebhookFanout(bus: EventBus, onError: (error: unknown) => void = () => {}): void {
  if (registered) return
  registered = true

  for (const name of DOMAIN_EVENT_NAMES) {
    bus.subscribe(name, async (event) => {
      try {
        const queued = await fanoutEvent(event)
        if (queued === 0 || !event.tenantId) return
        // Not awaited: an app's endpoint must never be able to slow down the
        // request that produced the event.
        void flushDeliveries(event.tenantId).catch(onError)
      } catch (error) {
        onError(error)
      }
    })
  }
}
