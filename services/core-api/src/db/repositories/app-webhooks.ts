import {
  appWebhookDeliverySchema,
  appWebhookSubscriptionSchema,
  type AppWebhookDelivery,
  type AppWebhookSubscription,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

/**
 * Webhook persistence (§89).
 *
 * The signing secret is deliberately never part of the mapped DTO. Two shapes
 * exist for a reason: `AppWebhookSubscription` is what the API returns, and
 * `DispatchTarget` is what the dispatcher needs — the secret only ever travels
 * on the second one, and that one never reaches a route response.
 */

// region Subscriptions

interface SubscriptionRow {
  id: string
  tenant_id: string
  app_id: string
  installation_id: string
  event_name: string
  target_url: string
  active: boolean
  failure_count: number
  last_delivered_at: Date | null
  created_at: Date
}

const SUBSCRIPTION_COLUMNS = [
  'id',
  'tenant_id',
  'app_id',
  'installation_id',
  'event_name',
  'target_url',
  'active',
  'failure_count',
  'last_delivered_at',
  'created_at',
]

function toSubscription(row: SubscriptionRow): AppWebhookSubscription {
  return appWebhookSubscriptionSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    appId: row.app_id,
    installationId: row.installation_id,
    event: row.event_name,
    targetUrl: row.target_url,
    active: row.active,
    failureCount: row.failure_count,
    createdAt: row.created_at,
    lastDeliveredAt: row.last_delivered_at,
  })
}

export async function listSubscriptions(
  tx: Tx,
  tenantId: string,
  filter: { installationId?: string } = {},
): Promise<AppWebhookSubscription[]> {
  const rows = await tx<SubscriptionRow[]>`
    SELECT ${tx(SUBSCRIPTION_COLUMNS)} FROM app_webhook_subscriptions
    WHERE tenant_id = ${tenantId}
      ${filter.installationId ? tx`AND installation_id = ${filter.installationId}` : tx``}
    ORDER BY created_at DESC
  `
  return rows.map(toSubscription)
}

export async function findSubscriptionById(
  tx: Tx,
  tenantId: string,
  subscriptionId: string,
): Promise<AppWebhookSubscription | null> {
  const [row] = await tx<SubscriptionRow[]>`
    SELECT ${tx(SUBSCRIPTION_COLUMNS)} FROM app_webhook_subscriptions
    WHERE tenant_id = ${tenantId} AND id = ${subscriptionId} LIMIT 1
  `
  return row ? toSubscription(row) : null
}

export async function insertSubscription(
  tx: Tx,
  input: {
    tenantId: string
    appId: string
    appSlug: string
    installationId: string
    event: string
    targetUrl: string
    secret: string
  },
): Promise<AppWebhookSubscription> {
  const [row] = await tx<SubscriptionRow[]>`
    INSERT INTO app_webhook_subscriptions
      (tenant_id, app_id, app_slug, installation_id, event_name, target_url, signing_secret)
    VALUES (
      ${input.tenantId}, ${input.appId}, ${input.appSlug}, ${input.installationId},
      ${input.event}, ${input.targetUrl}, ${input.secret}
    )
    RETURNING ${tx(SUBSCRIPTION_COLUMNS)}
  `
  return toSubscription(row!)
}

export async function deleteSubscription(tx: Tx, tenantId: string, subscriptionId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM app_webhook_subscriptions
    WHERE tenant_id = ${tenantId} AND id = ${subscriptionId}
    RETURNING id
  `
  return rows.length > 0
}

/** Uninstalling silences delivery without destroying the delivery history. */
export async function deactivateSubscriptionsForInstallation(
  tx: Tx,
  tenantId: string,
  installationId: string,
): Promise<number> {
  const rows = await tx<{ id: string }[]>`
    UPDATE app_webhook_subscriptions SET active = false
    WHERE tenant_id = ${tenantId} AND installation_id = ${installationId} AND active
    RETURNING id
  `
  return rows.length
}

// endregion

// region Deliveries

export interface DispatchTarget {
  deliveryId: string
  subscriptionId: string
  eventId: string
  eventName: string
  targetUrl: string
  /** Never mapped into an API response. See the note at the top of this file. */
  secret: string
  payload: Record<string, unknown>
  attempts: number
  maxAttempts: number
}

interface DeliveryRow {
  id: string
  subscription_id: string
  event_id: string
  event_name: string
  status: string
  attempts: number
  max_attempts: number
  next_attempt_at: Date | null
  last_status_code: number | null
  last_error: string | null
  created_at: Date
  delivered_at: Date | null
}

const DELIVERY_COLUMNS = [
  'id',
  'subscription_id',
  'event_id',
  'event_name',
  'status',
  'attempts',
  'max_attempts',
  'next_attempt_at',
  'last_status_code',
  'last_error',
  'created_at',
  'delivered_at',
]

function toDelivery(row: DeliveryRow): AppWebhookDelivery {
  return appWebhookDeliverySchema.parse({
    id: row.id,
    subscriptionId: row.subscription_id,
    event: row.event_name,
    eventId: row.event_id,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    lastStatusCode: row.last_status_code,
    lastError: row.last_error,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  })
}

/**
 * Fan one event out to every active subscription for it.
 *
 * `INSERT … SELECT` rather than a read followed by inserts: the subscription
 * list and the delivery rows are then guaranteed to be consistent even if a
 * subscription is created concurrently.
 */
export async function enqueueDeliveries(
  tx: Tx,
  input: {
    tenantId: string
    eventId: string
    eventName: string
    payload: Record<string, unknown>
    maxAttempts: number
  },
): Promise<number> {
  const rows = await tx<{ id: string }[]>`
    INSERT INTO app_webhook_deliveries (tenant_id, subscription_id, event_id, event_name, payload, max_attempts)
    SELECT ${input.tenantId}, s.id, ${input.eventId}, ${input.eventName},
           ${jsonParam(tx, input.payload)}, ${input.maxAttempts}
    FROM app_webhook_subscriptions s
    WHERE s.tenant_id = ${input.tenantId} AND s.event_name = ${input.eventName} AND s.active
    RETURNING id
  `
  return rows.length
}

export async function listDeliveries(
  tx: Tx,
  tenantId: string,
  subscriptionId: string,
  limit: number,
): Promise<AppWebhookDelivery[]> {
  const rows = await tx<DeliveryRow[]>`
    SELECT ${tx(DELIVERY_COLUMNS)} FROM app_webhook_deliveries
    WHERE tenant_id = ${tenantId} AND subscription_id = ${subscriptionId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows.map(toDelivery)
}

export async function findDeliveryById(
  tx: Tx,
  tenantId: string,
  deliveryId: string,
): Promise<AppWebhookDelivery | null> {
  const [row] = await tx<DeliveryRow[]>`
    SELECT ${tx(DELIVERY_COLUMNS)} FROM app_webhook_deliveries
    WHERE tenant_id = ${tenantId} AND id = ${deliveryId} LIMIT 1
  `
  return row ? toDelivery(row) : null
}

/**
 * Take the deliveries that are due, marking them as attempted in the same
 * statement. `FOR UPDATE SKIP LOCKED` is what makes a second worker safe: it
 * takes different rows instead of waiting for the first one.
 */
export async function claimDueDeliveries(tx: Tx, tenantId: string, limit: number): Promise<DispatchTarget[]> {
  const rows = await tx<
    {
      id: string
      subscription_id: string
      event_id: string
      event_name: string
      payload: unknown
      attempts: number
      max_attempts: number
      target_url: string
      signing_secret: string
    }[]
  >`
    WITH due AS (
      SELECT d.id
      FROM app_webhook_deliveries d
      JOIN app_webhook_subscriptions s ON s.id = d.subscription_id
      WHERE d.tenant_id = ${tenantId}
        AND d.status IN ('pending', 'failed')
        AND d.next_attempt_at <= now()
        AND s.active
      ORDER BY d.next_attempt_at ASC
      LIMIT ${limit}
      FOR UPDATE OF d SKIP LOCKED
    )
    UPDATE app_webhook_deliveries d
    SET attempts = d.attempts + 1
    FROM due, app_webhook_subscriptions s
    WHERE d.id = due.id AND s.id = d.subscription_id
    RETURNING d.id, d.subscription_id, d.event_id, d.event_name, d.payload, d.attempts,
              d.max_attempts, s.target_url, s.signing_secret
  `

  return rows.map((row) => ({
    deliveryId: row.id,
    subscriptionId: row.subscription_id,
    eventId: row.event_id,
    eventName: row.event_name,
    targetUrl: row.target_url,
    secret: row.signing_secret,
    payload: readJson<Record<string, unknown>>(row.payload, {}),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
  }))
}

export async function markDelivered(
  tx: Tx,
  tenantId: string,
  deliveryId: string,
  statusCode: number,
): Promise<void> {
  await tx`
    UPDATE app_webhook_deliveries
    SET status = 'delivered', delivered_at = now(), last_status_code = ${statusCode}, last_error = NULL
    WHERE tenant_id = ${tenantId} AND id = ${deliveryId}
  `
  await tx`
    UPDATE app_webhook_subscriptions s
    SET failure_count = 0, last_delivered_at = now()
    FROM app_webhook_deliveries d
    WHERE d.id = ${deliveryId} AND s.id = d.subscription_id AND s.tenant_id = ${tenantId}
  `
}

/**
 * Record a failed attempt and schedule the next one.
 *
 * Backoff is computed in SQL from the attempt count so a retry cannot be
 * scheduled twice by two workers reading the same row.
 */
export async function markAttemptFailed(
  tx: Tx,
  tenantId: string,
  deliveryId: string,
  input: { statusCode: number | null; error: string; backoffSeconds: number },
): Promise<void> {
  await tx`
    UPDATE app_webhook_deliveries
    SET status = CASE WHEN attempts >= max_attempts THEN 'exhausted' ELSE 'failed' END,
        last_status_code = ${input.statusCode},
        last_error = ${input.error.slice(0, 500)},
        next_attempt_at = now() + make_interval(secs => ${input.backoffSeconds})
    WHERE tenant_id = ${tenantId} AND id = ${deliveryId}
  `
  await tx`
    UPDATE app_webhook_subscriptions s
    SET failure_count = s.failure_count + 1
    FROM app_webhook_deliveries d
    WHERE d.id = ${deliveryId} AND s.id = d.subscription_id AND s.tenant_id = ${tenantId}
  `
}

/** Replay: reset the attempt budget and make the delivery due again. */
export async function requeueDelivery(tx: Tx, tenantId: string, deliveryId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE app_webhook_deliveries
    SET status = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL
    WHERE tenant_id = ${tenantId} AND id = ${deliveryId}
    RETURNING id
  `
  return rows.length > 0
}

// endregion
