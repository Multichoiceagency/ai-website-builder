import {
  storedTrackingEventSchema,
  trackingDestinationIdSchema,
  trackingIdentitySchema,
  type StoredTrackingEvent,
  type TrackingDeliveryResult,
  type TrackingDeliveryStatus,
  type TrackingDestinationId,
  type TrackingEventName,
  type TrackingIdentity,
  type TrackingTouch,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

/**
 * All tracking SQL (ADR-0005). Every function takes a transaction handle that
 * has already been bound to a tenant, so the `WHERE tenant_id` clauses below
 * are the belt and row-level security is the braces (ADR-0004).
 */

// region Events

export interface TrackingEventInsert {
  tenantId: string
  siteId: string
  eventId: string
  name: TrackingEventName
  occurredAt: string
  sessionId: string
  anonymousId: string
  userId: string | null
  consent: Record<string, boolean>
  context: Record<string, unknown>
  value: number | null
  currency: string | null
  properties: Record<string, unknown>
}

/**
 * Insert unless this tenant has already seen the event id.
 *
 * `ON CONFLICT DO NOTHING` rather than a read-then-write check: two hits for
 * the same `eventId` can arrive concurrently (that is the normal case — the
 * browser beacon and the server-side twin race), and only the unique index
 * settles that race correctly.
 *
 * Returns `null` when the event was a duplicate.
 */
export async function insertTrackingEvent(tx: Tx, input: TrackingEventInsert): Promise<string | null> {
  const rows = await tx<{ id: string }[]>`
    INSERT INTO tracking_events (
      tenant_id, site_id, event_id, name, occurred_at, session_id, anonymous_id,
      user_id, consent, context, value, currency, properties
    )
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.eventId}, ${input.name}, ${input.occurredAt},
      ${input.sessionId}, ${input.anonymousId}, ${input.userId},
      ${jsonParam(tx, input.consent)}, ${jsonParam(tx, input.context)},
      ${input.value}, ${input.currency}, ${jsonParam(tx, input.properties)}
    )
    ON CONFLICT (tenant_id, event_id) DO NOTHING
    RETURNING id
  `
  return rows[0]?.id ?? null
}

interface StoredEventRow {
  id: string
  site_id: string
  event_id: string
  name: TrackingEventName
  occurred_at: Date
  received_at: Date
  session_id: string
  anonymous_id: string
  user_id: string | null
  consent: unknown
  context: unknown
  value: string | null
  currency: string | null
  properties: unknown
  deliveries: unknown
}

function toStoredEvent(row: StoredEventRow): StoredTrackingEvent {
  return storedTrackingEventSchema.parse({
    id: row.id,
    siteId: row.site_id,
    eventId: row.event_id,
    name: row.name,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    sessionId: row.session_id,
    anonymousId: row.anonymous_id,
    userId: row.user_id,
    consent: readJson<Record<string, unknown>>(row.consent, {}),
    context: readJson<Record<string, unknown>>(row.context, { url: '' }),
    // `numeric` crosses the wire as text so no precision is lost on the way;
    // it becomes a number here, at the boundary, exactly once.
    value: row.value === null ? null : Number(row.value),
    currency: row.currency,
    properties: readJson<Record<string, unknown>>(row.properties, {}),
    deliveries: readJson<TrackingDeliveryResult[]>(row.deliveries, []),
  })
}

export interface TrackingEventQuery {
  siteId?: string
  name?: TrackingEventName
  anonymousId?: string
  limit: number
}

/** The event debugger's feed: newest first, with every destination's verdict. */
export async function listTrackingEvents(
  tx: Tx,
  tenantId: string,
  query: TrackingEventQuery,
): Promise<StoredTrackingEvent[]> {
  const rows = await tx<StoredEventRow[]>`
    SELECT
      e.id, e.site_id, e.event_id, e.name, e.occurred_at, e.received_at, e.session_id,
      e.anonymous_id, e.user_id, e.consent, e.context, e.value, e.currency, e.properties,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('destination', d.destination, 'status', d.status, 'reason', d.reason)
          ORDER BY d.destination
        ) FILTER (WHERE d.id IS NOT NULL),
        '[]'::jsonb
      ) AS deliveries
    FROM tracking_events e
    LEFT JOIN tracking_deliveries d ON d.tracking_event_id = e.id
    WHERE e.tenant_id = ${tenantId}
      ${query.siteId ? tx`AND e.site_id = ${query.siteId}` : tx``}
      ${query.name ? tx`AND e.name = ${query.name}` : tx``}
      ${query.anonymousId ? tx`AND e.anonymous_id = ${query.anonymousId}` : tx``}
    GROUP BY e.id
    ORDER BY e.received_at DESC
    LIMIT ${query.limit}
  `
  return rows.map(toStoredEvent)
}

// endregion

// region Deliveries

export interface DeliveryInsert {
  destination: TrackingDestinationId
  status: TrackingDeliveryStatus
  reason: string | null
  latencyMs: number | null
}

/** One statement for the whole fan-out; a delivery report is not worth N round trips. */
export async function recordDeliveries(
  tx: Tx,
  tenantId: string,
  trackingEventId: string,
  deliveries: DeliveryInsert[],
): Promise<void> {
  if (!deliveries.length) return

  const rows = deliveries.map((delivery) => ({
    tenant_id: tenantId,
    tracking_event_id: trackingEventId,
    destination: delivery.destination,
    status: delivery.status,
    reason: delivery.reason,
    latency_ms: delivery.latencyMs,
  }))

  await tx`
    INSERT INTO tracking_deliveries ${tx(
      rows,
      'tenant_id',
      'tracking_event_id',
      'destination',
      'status',
      'reason',
      'latency_ms',
    )}
  `
}

export interface DestinationCounts {
  destination: TrackingDestinationId
  delivered: number
  failed: number
  skipped: number
  notConfigured: number
  lastDeliveredAt: Date | null
  lastError: string | null
}

/**
 * Counts per destination over a window. The UI puts these next to the
 * platform's own event count so a discrepancy with GA4 or Meta has a visible
 * cause rather than a support ticket (§26).
 */
export async function summarizeDeliveries(tx: Tx, tenantId: string, hours: number): Promise<DestinationCounts[]> {
  const rows = await tx<
    {
      destination: string
      delivered: string
      failed: string
      skipped: string
      not_configured: string
      last_delivered_at: Date | null
      last_error: string | null
    }[]
  >`
    SELECT
      destination,
      count(*) FILTER (WHERE status = 'delivered')      AS delivered,
      count(*) FILTER (WHERE status = 'failed')         AS failed,
      count(*) FILTER (WHERE status = 'skipped')        AS skipped,
      count(*) FILTER (WHERE status = 'not_configured') AS not_configured,
      max(created_at) FILTER (WHERE status = 'delivered') AS last_delivered_at,
      (array_agg(reason ORDER BY created_at DESC) FILTER (WHERE status = 'failed'))[1] AS last_error
    FROM tracking_deliveries
    WHERE tenant_id = ${tenantId}
      AND created_at >= now() - make_interval(hours => ${hours})
    GROUP BY destination
  `

  return rows.flatMap((row) => {
    const destination = trackingDestinationIdSchema.safeParse(row.destination)
    // A destination that was removed from the code still has rows in the
    // ledger. Report the ones we still know about rather than throwing.
    if (!destination.success) return []

    return [
      {
        destination: destination.data,
        delivered: Number(row.delivered),
        failed: Number(row.failed),
        skipped: Number(row.skipped),
        notConfigured: Number(row.not_configured),
        lastDeliveredAt: row.last_delivered_at,
        lastError: row.last_error,
      },
    ]
  })
}

// endregion

// region Sessions and identities (§28)

export interface TouchInput {
  source: string
  medium: string
  campaign: string
  term: string
  content: string
  clickIds: Record<string, string>
  landingUrl: string
  referrer: string
}

/**
 * Record the visit this event belongs to.
 *
 * Returns true when the session is new, which is the only moment a visitor's
 * session count may go up.
 *
 * `xmax = 0` distinguishes an insert from an update in an upsert: on a freshly
 * inserted row no transaction has ever deleted a previous version, so the
 * system column is zero.
 */
export async function upsertSession(
  tx: Tx,
  input: {
    tenantId: string
    siteId: string
    sessionId: string
    anonymousId: string
    occurredAt: string
    touch: TouchInput
  },
): Promise<boolean> {
  const [row] = await tx<{ inserted: boolean }[]>`
    INSERT INTO tracking_sessions (
      tenant_id, site_id, session_id, anonymous_id,
      source, medium, campaign, term, content, click_ids, landing_url, referrer,
      started_at, last_event_at, event_count
    )
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.sessionId}, ${input.anonymousId},
      ${input.touch.source}, ${input.touch.medium}, ${input.touch.campaign},
      ${input.touch.term}, ${input.touch.content}, ${jsonParam(tx, input.touch.clickIds)},
      ${input.touch.landingUrl}, ${input.touch.referrer},
      ${input.occurredAt}, ${input.occurredAt}, 1
    )
    ON CONFLICT (tenant_id, session_id) DO UPDATE SET
      last_event_at = GREATEST(tracking_sessions.last_event_at, EXCLUDED.last_event_at),
      started_at    = LEAST(tracking_sessions.started_at, EXCLUDED.started_at),
      event_count   = tracking_sessions.event_count + 1,
      -- Fill only what the session does not have yet: a second pageview
      -- arrives without UTMs and must not erase the campaign that started it.
      source        = CASE WHEN tracking_sessions.source   = '' THEN EXCLUDED.source   ELSE tracking_sessions.source END,
      medium        = CASE WHEN tracking_sessions.medium   = '' THEN EXCLUDED.medium   ELSE tracking_sessions.medium END,
      campaign      = CASE WHEN tracking_sessions.campaign = '' THEN EXCLUDED.campaign ELSE tracking_sessions.campaign END,
      term          = CASE WHEN tracking_sessions.term     = '' THEN EXCLUDED.term     ELSE tracking_sessions.term END,
      content       = CASE WHEN tracking_sessions.content  = '' THEN EXCLUDED.content  ELSE tracking_sessions.content END,
      click_ids     = CASE WHEN tracking_sessions.click_ids = '{}'::jsonb THEN EXCLUDED.click_ids ELSE tracking_sessions.click_ids END,
      landing_url   = CASE WHEN tracking_sessions.landing_url = '' THEN EXCLUDED.landing_url ELSE tracking_sessions.landing_url END,
      referrer      = CASE WHEN tracking_sessions.referrer    = '' THEN EXCLUDED.referrer    ELSE tracking_sessions.referrer END
    RETURNING (xmax = 0) AS inserted
  `
  return row?.inserted ?? false
}

/**
 * Record the visitor. `first_*` is written on insert and never touched again;
 * `last_*` moves forward only when the new touch actually carries attribution,
 * so a direct return visit does not overwrite the campaign that earned the
 * lead.
 */
export async function upsertIdentity(
  tx: Tx,
  input: {
    tenantId: string
    siteId: string
    anonymousId: string
    userId: string | null
    occurredAt: string
    touch: TouchInput
    newSession: boolean
    /** False for a direct visit, which must not erase a stored campaign. */
    attributed: boolean
  },
): Promise<void> {
  await tx`
    INSERT INTO tracking_identities (
      tenant_id, site_id, anonymous_id, user_id,
      first_source, first_medium, first_campaign, first_term, first_content,
      first_click_ids, first_landing_url, first_referrer, first_seen_at,
      last_source, last_medium, last_campaign, last_term, last_content,
      last_click_ids, last_landing_url, last_referrer, last_seen_at,
      session_count
    )
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.anonymousId}, ${input.userId},
      ${input.touch.source}, ${input.touch.medium}, ${input.touch.campaign},
      ${input.touch.term}, ${input.touch.content},
      ${jsonParam(tx, input.touch.clickIds)}, ${input.touch.landingUrl}, ${input.touch.referrer},
      ${input.occurredAt},
      ${input.touch.source}, ${input.touch.medium}, ${input.touch.campaign},
      ${input.touch.term}, ${input.touch.content},
      ${jsonParam(tx, input.touch.clickIds)}, ${input.touch.landingUrl}, ${input.touch.referrer},
      ${input.occurredAt},
      ${input.newSession ? 1 : 0}
    )
    ON CONFLICT (tenant_id, anonymous_id) DO UPDATE SET
      -- A known user id is never replaced by an anonymous hit.
      user_id       = COALESCE(EXCLUDED.user_id, tracking_identities.user_id),
      last_seen_at  = GREATEST(tracking_identities.last_seen_at, EXCLUDED.last_seen_at),
      session_count = tracking_identities.session_count + ${input.newSession ? 1 : 0},
      -- Last-touch moves only on a visit that carries acquisition information.
      -- Letting a direct return visit overwrite it is how a campaign that
      -- earned a lead disappears from the report that pays for it.
      last_source       = CASE WHEN ${input.attributed} THEN EXCLUDED.last_source       ELSE tracking_identities.last_source END,
      last_medium       = CASE WHEN ${input.attributed} THEN EXCLUDED.last_medium       ELSE tracking_identities.last_medium END,
      last_campaign     = CASE WHEN ${input.attributed} THEN EXCLUDED.last_campaign     ELSE tracking_identities.last_campaign END,
      last_term         = CASE WHEN ${input.attributed} THEN EXCLUDED.last_term         ELSE tracking_identities.last_term END,
      last_content      = CASE WHEN ${input.attributed} THEN EXCLUDED.last_content      ELSE tracking_identities.last_content END,
      last_click_ids    = CASE WHEN ${input.attributed} THEN EXCLUDED.last_click_ids    ELSE tracking_identities.last_click_ids END,
      last_landing_url  = CASE WHEN ${input.attributed} THEN EXCLUDED.last_landing_url  ELSE tracking_identities.last_landing_url END,
      last_referrer     = CASE WHEN ${input.attributed} THEN EXCLUDED.last_referrer     ELSE tracking_identities.last_referrer END
  `
}

interface IdentityRow {
  anonymous_id: string
  user_id: string | null
  first_source: string
  first_medium: string
  first_campaign: string
  first_term: string
  first_content: string
  first_click_ids: unknown
  first_landing_url: string
  first_referrer: string
  first_seen_at: Date
  last_source: string
  last_medium: string
  last_campaign: string
  last_term: string
  last_content: string
  last_click_ids: unknown
  last_landing_url: string
  last_referrer: string
  last_seen_at: Date
  session_count: number
}

function toTouch(
  row: IdentityRow,
  prefix: 'first' | 'last',
  occurredAt: Date,
): TrackingTouch {
  const pick = <T>(first: T, last: T) => (prefix === 'first' ? first : last)
  return {
    source: pick(row.first_source, row.last_source),
    medium: pick(row.first_medium, row.last_medium),
    campaign: pick(row.first_campaign, row.last_campaign),
    term: pick(row.first_term, row.last_term),
    content: pick(row.first_content, row.last_content),
    clickIds: readJson<Record<string, string>>(pick(row.first_click_ids, row.last_click_ids), {}),
    landingUrl: pick(row.first_landing_url, row.last_landing_url),
    referrer: pick(row.first_referrer, row.last_referrer),
    occurredAt: occurredAt.toISOString(),
  }
}

export async function findIdentity(tx: Tx, tenantId: string, anonymousId: string): Promise<TrackingIdentity | null> {
  const [row] = await tx<IdentityRow[]>`
    SELECT
      anonymous_id, user_id,
      first_source, first_medium, first_campaign, first_term, first_content,
      first_click_ids, first_landing_url, first_referrer, first_seen_at,
      last_source, last_medium, last_campaign, last_term, last_content,
      last_click_ids, last_landing_url, last_referrer, last_seen_at,
      session_count
    FROM tracking_identities
    WHERE tenant_id = ${tenantId} AND anonymous_id = ${anonymousId}
    LIMIT 1
  `
  if (!row) return null

  return trackingIdentitySchema.parse({
    anonymousId: row.anonymous_id,
    userId: row.user_id,
    firstTouch: toTouch(row, 'first', row.first_seen_at),
    lastTouch: toTouch(row, 'last', row.last_seen_at),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    sessionCount: Number(row.session_count),
  })
}

// endregion

// region Attribution join (§28)

/** One (conversion, session) pair. The model decides how the credit is split. */
export interface ConversionTouchRow {
  conversionId: string
  conversionValue: number
  source: string
  medium: string
  campaign: string
  startedAt: Date
}

export interface AttributionQuery {
  siteId?: string
  names: readonly TrackingEventName[]
  from: string
  to: string
  lookbackDays: number
}

/**
 * Every conversion in the window, joined to the sessions that could have
 * caused it: same visitor, started before the conversion, inside the lookback.
 *
 * Ordering is `(conversion, session start)` so the caller can apply first-,
 * last- and linear-click without re-sorting — and so all three models read the
 * same join rather than three subtly different ones.
 */
export async function listConversionTouches(
  tx: Tx,
  tenantId: string,
  query: AttributionQuery,
): Promise<ConversionTouchRow[]> {
  if (!query.names.length) return []

  const rows = await tx<
    {
      conversion_id: string
      conversion_value: string | null
      source: string
      medium: string
      campaign: string
      started_at: Date
    }[]
  >`
    WITH conversions AS (
      SELECT e.id, e.anonymous_id, e.occurred_at, e.value
      FROM tracking_events e
      WHERE e.tenant_id = ${tenantId}
        AND e.name IN ${tx(query.names as string[])}
        AND e.occurred_at >= ${query.from}
        AND e.occurred_at < ${query.to}
        ${query.siteId ? tx`AND e.site_id = ${query.siteId}` : tx``}
    )
    SELECT
      c.id AS conversion_id,
      c.value AS conversion_value,
      s.source, s.medium, s.campaign, s.started_at
    FROM conversions c
    JOIN tracking_sessions s
      ON s.tenant_id = ${tenantId}
     AND s.anonymous_id = c.anonymous_id
     AND s.started_at <= c.occurred_at
     AND s.started_at >= c.occurred_at - make_interval(days => ${query.lookbackDays})
    ORDER BY c.id, s.started_at ASC
  `

  return rows.map((row) => ({
    conversionId: row.conversion_id,
    conversionValue: row.conversion_value === null ? 0 : Number(row.conversion_value),
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
    startedAt: row.started_at,
  }))
}

/** Conversions in the window, so the report can name what it could not credit. */
export async function countConversions(
  tx: Tx,
  tenantId: string,
  query: AttributionQuery,
): Promise<{ conversions: number; value: number }> {
  if (!query.names.length) return { conversions: 0, value: 0 }

  const [row] = await tx<{ conversions: string; value: string | null }[]>`
    SELECT count(*) AS conversions, sum(COALESCE(value, 0)) AS value
    FROM tracking_events
    WHERE tenant_id = ${tenantId}
      AND name IN ${tx(query.names as string[])}
      AND occurred_at >= ${query.from}
      AND occurred_at < ${query.to}
      ${query.siteId ? tx`AND site_id = ${query.siteId}` : tx``}
  `

  return {
    conversions: Number(row?.conversions ?? 0),
    value: row?.value === null || row?.value === undefined ? 0 : Number(row.value),
  }
}

// endregion
