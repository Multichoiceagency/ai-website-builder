import {
  TRACKING_CONVERSION_EVENTS,
  trackingDeliveryStatusSchema,
  trackingDestinationIdSchema,
  trackingEventNameSchema,
  type AnalyticsBreakdownDimension,
  type AnalyticsDeliveryReason,
  type AnalyticsEventCount,
  type AnalyticsSeriesPoint,
  type AnalyticsTopPage,
  type AnalyticsVolumePoint,
  type TrackingEventName,
} from '@platform/schemas'
import type { Tx } from '../client.js'

/**
 * All analytics SQL (ADR-0005). Every function takes a tenant-bound
 * transaction handle and still writes its own `tenant_id` clause: the clause is
 * the belt, row-level security is the braces (ADR-0004).
 *
 * There is no analytics store. Every figure below is an aggregate over
 * `tracking_events`, `tracking_sessions` and `tracking_deliveries`, which is
 * what makes each one traceable back to individual rows the customer can see in
 * the event debugger.
 */

// region Shared window

export interface AnalyticsWindow {
  /** Inclusive lower bound on `occurred_at`. */
  from: string
  /** Exclusive upper bound on `occurred_at`. */
  to: string
  siteId?: string
}

/**
 * Events with the session that produced them.
 *
 * A `LEFT JOIN`, not an inner one: an event whose session row is missing is a
 * data anomaly, and dropping it would quietly shrink every total on the
 * overview. It surfaces as `(unknown)` instead.
 */
const UNKNOWN_SOURCE = '(unknown)'

const CONVERSION_NAMES: readonly string[] = TRACKING_CONVERSION_EVENTS

// endregion

// region Overview totals (§21)

export interface TrafficTotals {
  visitors: number
  sessions: number
  pageViews: number
  leads: number
  conversions: number
}

/**
 * Headline counts for one window.
 *
 * Visitors and sessions are distinct counts over the events in the window
 * rather than over `tracking_sessions.started_at`, so every metric on the
 * overview answers the same question — "what happened between these two
 * timestamps" — instead of two subtly different ones.
 */
export async function summarizeTraffic(tx: Tx, tenantId: string, window: AnalyticsWindow): Promise<TrafficTotals> {
  const [row] = await tx<
    { visitors: string; sessions: string; page_views: string; leads: string; conversions: string }[]
  >`
    SELECT
      count(DISTINCT anonymous_id)                                       AS visitors,
      count(DISTINCT session_id)                                         AS sessions,
      count(*) FILTER (WHERE name = 'page_view')                         AS page_views,
      count(*) FILTER (WHERE name = 'lead')                              AS leads,
      count(*) FILTER (WHERE name IN ${tx(CONVERSION_NAMES as string[])}) AS conversions
    FROM tracking_events
    WHERE tenant_id = ${tenantId}
      AND occurred_at >= ${window.from}
      AND occurred_at < ${window.to}
      ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
  `

  return {
    visitors: Number(row?.visitors ?? 0),
    sessions: Number(row?.sessions ?? 0),
    pageViews: Number(row?.page_views ?? 0),
    leads: Number(row?.leads ?? 0),
    conversions: Number(row?.conversions ?? 0),
  }
}

export interface RevenueSliceRow {
  currency: string | null
  amount: number
  orders: number
}

/**
 * Purchase revenue, grouped by currency and never across it.
 *
 * A single `sum(value)` over mixed currencies produces a number that is wrong
 * in every one of them. The caller picks a primary currency and reports the
 * rest beside it.
 */
export async function sumRevenueByCurrency(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
): Promise<RevenueSliceRow[]> {
  const rows = await tx<{ currency: string | null; amount: string | null; orders: string }[]>`
    SELECT currency, sum(COALESCE(value, 0)) AS amount, count(*) AS orders
    FROM tracking_events
    WHERE tenant_id = ${tenantId}
      AND name = 'purchase'
      AND occurred_at >= ${window.from}
      AND occurred_at < ${window.to}
      ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
    GROUP BY currency
    ORDER BY sum(COALESCE(value, 0)) DESC
  `

  return rows.map((row) => ({
    currency: row.currency,
    amount: row.amount === null ? 0 : Number(row.amount),
    orders: Number(row.orders),
  }))
}

/**
 * A zero-filled daily series.
 *
 * `generate_series` on the left of the join is what makes a quiet Sunday a zero
 * instead of a missing point — a line chart that silently closes the gap
 * reports traffic that never happened.
 */
export async function dailyTraffic(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
  currency: string | null,
): Promise<AnalyticsSeriesPoint[]> {
  const rows = await tx<
    {
      day: Date
      visitors: string
      sessions: string
      page_views: string
      leads: string
      conversions: string
      revenue: string | null
    }[]
  >`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', ${window.from}::timestamptz),
        date_trunc('day', ${window.to}::timestamptz - interval '1 microsecond'),
        interval '1 day'
      ) AS day
    ),
    events AS (
      SELECT
        date_trunc('day', occurred_at) AS day,
        anonymous_id,
        session_id,
        name,
        value,
        currency
      FROM tracking_events
      WHERE tenant_id = ${tenantId}
        AND occurred_at >= ${window.from}
        AND occurred_at < ${window.to}
        ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
    )
    SELECT
      days.day,
      count(DISTINCT e.anonymous_id)                                       AS visitors,
      count(DISTINCT e.session_id)                                         AS sessions,
      count(e.name) FILTER (WHERE e.name = 'page_view')                    AS page_views,
      count(e.name) FILTER (WHERE e.name = 'lead')                         AS leads,
      count(e.name) FILTER (WHERE e.name IN ${tx(CONVERSION_NAMES as string[])}) AS conversions,
      sum(COALESCE(e.value, 0)) FILTER (
        WHERE e.name = 'purchase'
          AND ${currency === null ? tx`e.currency IS NULL` : tx`e.currency = ${currency}`}
      ) AS revenue
    FROM days
    LEFT JOIN events e ON e.day = days.day
    GROUP BY days.day
    ORDER BY days.day ASC
  `

  return rows.map((row) => ({
    date: row.day.toISOString().slice(0, 10),
    visitors: Number(row.visitors),
    sessions: Number(row.sessions),
    pageViews: Number(row.page_views),
    leads: Number(row.leads),
    conversions: Number(row.conversions),
    revenue: row.revenue === null ? 0 : Number(row.revenue),
  }))
}

// endregion

// region Breakdowns (§21)

export interface BreakdownRow {
  source: string
  medium: string
  campaign: string
  landingPath: string
  sessions: number
  visitors: number
  conversions: number
  revenue: number
}

/**
 * The grouping expression for each dimension.
 *
 * Chosen from a closed set of literal SQL fragments — the dimension arrives
 * from a Zod enum and still never reaches the statement as text.
 *
 * `landing_url` is stored whole; the path is what a marketer compares across
 * campaigns, so scheme, host and query string come off in SQL, before the
 * `GROUP BY` rather than after it.
 */
function dimensionColumns(tx: Tx, dimension: AnalyticsBreakdownDimension) {
  switch (dimension) {
    case 'source':
      return tx`COALESCE(NULLIF(s.source, ''), ${UNKNOWN_SOURCE}) AS source, '' AS medium, '' AS campaign, '' AS landing_path`
    case 'medium':
      return tx`'' AS source, COALESCE(NULLIF(s.medium, ''), ${UNKNOWN_SOURCE}) AS medium, '' AS campaign, '' AS landing_path`
    case 'campaign':
      return tx`'' AS source, '' AS medium, COALESCE(s.campaign, '') AS campaign, '' AS landing_path`
    case 'landing_page':
      return tx`'' AS source, '' AS medium, '' AS campaign,
        COALESCE(
          NULLIF(split_part(regexp_replace(s.landing_url, '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/]*', ''), '?', 1), ''),
          '/'
        ) AS landing_path`
    case 'channel':
    default:
      return tx`COALESCE(NULLIF(s.source, ''), ${UNKNOWN_SOURCE}) AS source, COALESCE(NULLIF(s.medium, ''), ${UNKNOWN_SOURCE}) AS medium, '' AS campaign, '' AS landing_path`
  }
}

/**
 * Sessions, visitors, conversions and revenue for one dimension.
 *
 * Returns one extra row beyond `limit` so the caller can report how much was
 * left out instead of presenting a truncated table as if it were complete.
 */
export async function breakdownBy(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
  dimension: AnalyticsBreakdownDimension,
  options: { limit: number; currency: string | null },
): Promise<{ rows: BreakdownRow[]; totalRows: number }> {
  const rows = await tx<
    {
      source: string
      medium: string
      campaign: string
      landing_path: string
      sessions: string
      visitors: string
      conversions: string
      revenue: string | null
      total_rows: string
    }[]
  >`
    WITH scoped AS (
      SELECT
        e.anonymous_id,
        e.session_id,
        e.name,
        e.value,
        e.currency,
        ${dimensionColumns(tx, dimension)}
      FROM tracking_events e
      LEFT JOIN tracking_sessions s
        ON s.tenant_id = ${tenantId} AND s.session_id = e.session_id
      WHERE e.tenant_id = ${tenantId}
        AND e.occurred_at >= ${window.from}
        AND e.occurred_at < ${window.to}
        ${window.siteId ? tx`AND e.site_id = ${window.siteId}` : tx``}
    ),
    grouped AS (
      SELECT
        source, medium, campaign, landing_path,
        count(DISTINCT session_id)                                     AS sessions,
        count(DISTINCT anonymous_id)                                   AS visitors,
        count(*) FILTER (WHERE name IN ${tx(CONVERSION_NAMES as string[])}) AS conversions,
        sum(COALESCE(value, 0)) FILTER (
          WHERE name = 'purchase'
            AND ${options.currency === null ? tx`currency IS NULL` : tx`currency = ${options.currency}`}
        ) AS revenue
      FROM scoped
      GROUP BY source, medium, campaign, landing_path
    )
    SELECT grouped.*, (SELECT count(*) FROM grouped) AS total_rows
    FROM grouped
    ORDER BY sessions DESC, conversions DESC
    LIMIT ${options.limit}
  `

  return {
    rows: rows.map((row) => ({
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      landingPath: row.landing_path,
      sessions: Number(row.sessions),
      visitors: Number(row.visitors),
      conversions: Number(row.conversions),
      revenue: row.revenue === null ? 0 : Number(row.revenue),
    })),
    totalRows: Number(rows[0]?.total_rows ?? 0),
  }
}

/**
 * Most-viewed pages, by the URL the event carried.
 *
 * Reduced to a path for the same reason as landing pages: `/pricing` and
 * `/pricing?ref=x` are one page to everyone except a `GROUP BY`.
 */
export async function topPages(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
  limit: number,
): Promise<AnalyticsTopPage[]> {
  const rows = await tx<{ path: string; views: string; visitors: string }[]>`
    SELECT
      COALESCE(
        NULLIF(
          split_part(regexp_replace(context ->> 'url', '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/]*', ''), '?', 1),
          ''
        ),
        '/'
      ) AS path,
      count(*)                     AS views,
      count(DISTINCT anonymous_id) AS visitors
    FROM tracking_events
    WHERE tenant_id = ${tenantId}
      AND name = 'page_view'
      AND occurred_at >= ${window.from}
      AND occurred_at < ${window.to}
      ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
    GROUP BY 1
    ORDER BY views DESC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    path: row.path,
    views: Number(row.views),
    visitors: Number(row.visitors),
  }))
}

/**
 * Distinct visitors per funnel stage.
 *
 * One pass over the window producing one count per stage, so every stage is
 * measured against exactly the same set of events.
 */
export async function funnelVisitors(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
  stages: readonly { key: string; events: readonly TrackingEventName[] }[],
): Promise<Record<string, number>> {
  if (!stages.length) return {}

  // A (stage, event name) mapping passed in as two parallel arrays. Counting
  // per name and adding the results up would over-count a visitor who fired
  // two events of the same stage, so the DISTINCT has to happen after the join
  // — which means the mapping has to be inside the statement.
  const stageKeys = stages.flatMap((stage) => stage.events.map(() => stage.key))
  const eventNames = stages.flatMap((stage) => stage.events.map((name) => name as string))

  const rows = await tx<{ stage_key: string; visitors: string }[]>`
    WITH stage_map AS (
      SELECT *
      FROM unnest(${stageKeys}::text[], ${eventNames}::text[]) AS m(stage_key, event_name)
    )
    SELECT m.stage_key, count(DISTINCT e.anonymous_id) AS visitors
    FROM stage_map m
    LEFT JOIN tracking_events e
      ON e.tenant_id = ${tenantId}
     AND e.name = m.event_name
     AND e.occurred_at >= ${window.from}
     AND e.occurred_at < ${window.to}
     ${window.siteId ? tx`AND e.site_id = ${window.siteId}` : tx``}
    GROUP BY m.stage_key
  `

  const counts: Record<string, number> = {}
  for (const stage of stages) counts[stage.key] = 0
  for (const row of rows) counts[row.stage_key] = Number(row.visitors)
  return counts
}

/** Every event name recorded in the window, with its volume. */
export async function countEventsByName(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
): Promise<AnalyticsEventCount[]> {
  const rows = await tx<{ name: string; count: string }[]>`
    SELECT name, count(*) AS count
    FROM tracking_events
    WHERE tenant_id = ${tenantId}
      AND occurred_at >= ${window.from}
      AND occurred_at < ${window.to}
      ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
    GROUP BY name
    ORDER BY count DESC
  `

  // A name that has left the contract still has rows. Report the ones we can
  // still describe rather than failing the whole screen on one legacy value.
  return rows.flatMap((row) => {
    const name = trackingEventNameSchema.safeParse(row.name)
    return name.success ? [{ name: name.data, count: Number(row.count) }] : []
  })
}

// endregion

// region Journeys and dimensional attribution (§28)

/** One (conversion, session) pair, carrying everything a journey view needs. */
export interface JourneyTouchRow {
  conversionId: string
  event: TrackingEventName
  occurredAt: Date
  anonymousId: string
  userId: string | null
  conversionValue: number
  conversionCurrency: string | null
  sessionId: string
  source: string
  medium: string
  campaign: string
  landingPath: string
  startedAt: Date
}

export interface JourneyQuery extends AnalyticsWindow {
  names: readonly TrackingEventName[]
  lookbackDays: number
  /** Cap on conversions, not on rows: a journey is never returned half-complete. */
  limit: number
}

/**
 * Recent conversions with every session that preceded them.
 *
 * The conversion cap is applied *before* the join, so a journey is either
 * returned with all of its touches or not at all — a truncated journey would
 * make first-touch look like the second visit.
 *
 * Ordering is `(conversion time desc, session start asc)`, which is both the
 * order the UI renders and the order the attribution weighting needs.
 */
export async function listConversionJourneys(
  tx: Tx,
  tenantId: string,
  query: JourneyQuery,
): Promise<JourneyTouchRow[]> {
  if (!query.names.length) return []

  const rows = await tx<
    {
      conversion_id: string
      event: string
      occurred_at: Date
      anonymous_id: string
      user_id: string | null
      conversion_value: string | null
      conversion_currency: string | null
      session_id: string
      source: string
      medium: string
      campaign: string
      landing_path: string
      started_at: Date
    }[]
  >`
    WITH conversions AS (
      SELECT e.id, e.name, e.occurred_at, e.anonymous_id, e.user_id, e.value, e.currency
      FROM tracking_events e
      WHERE e.tenant_id = ${tenantId}
        AND e.name IN ${tx(query.names as string[])}
        AND e.occurred_at >= ${query.from}
        AND e.occurred_at < ${query.to}
        ${query.siteId ? tx`AND e.site_id = ${query.siteId}` : tx``}
      ORDER BY e.occurred_at DESC
      LIMIT ${query.limit}
    )
    SELECT
      c.id            AS conversion_id,
      c.name          AS event,
      c.occurred_at,
      c.anonymous_id,
      c.user_id,
      c.value         AS conversion_value,
      c.currency      AS conversion_currency,
      s.session_id,
      s.source, s.medium, s.campaign,
      COALESCE(
        NULLIF(split_part(regexp_replace(s.landing_url, '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/]*', ''), '?', 1), ''),
        '/'
      ) AS landing_path,
      s.started_at
    FROM conversions c
    JOIN tracking_sessions s
      ON s.tenant_id = ${tenantId}
     AND s.anonymous_id = c.anonymous_id
     AND s.started_at <= c.occurred_at
     AND s.started_at >= c.occurred_at - make_interval(days => ${query.lookbackDays})
    ORDER BY c.occurred_at DESC, s.started_at ASC
  `

  return rows.flatMap((row) => {
    const event = trackingEventNameSchema.safeParse(row.event)
    if (!event.success) return []

    return [
      {
        conversionId: row.conversion_id,
        event: event.data,
        occurredAt: row.occurred_at,
        anonymousId: row.anonymous_id,
        userId: row.user_id,
        conversionValue: row.conversion_value === null ? 0 : Number(row.conversion_value),
        conversionCurrency: row.conversion_currency,
        sessionId: row.session_id,
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        landingPath: row.landing_path,
        startedAt: row.started_at,
      },
    ]
  })
}

// endregion

// region Tracking operations (§26)

/**
 * Delivery outcomes grouped by destination, status and the exact reason
 * recorded at the time.
 *
 * The reason is not re-derived here. It is the sentence the consent engine or
 * the adapter wrote into the ledger, which is the only version that is still
 * true if the rules change tomorrow.
 */
export async function summarizeDeliveryReasons(
  tx: Tx,
  tenantId: string,
  window: { from: string; to: string },
): Promise<AnalyticsDeliveryReason[]> {
  const rows = await tx<
    { destination: string; status: string; reason: string | null; count: string; last_at: Date }[]
  >`
    SELECT destination, status, reason, count(*) AS count, max(created_at) AS last_at
    FROM tracking_deliveries
    WHERE tenant_id = ${tenantId}
      AND created_at >= ${window.from}
      AND created_at < ${window.to}
    GROUP BY destination, status, reason
    ORDER BY count DESC
  `

  return rows.flatMap((row) => {
    const destination = trackingDestinationIdSchema.safeParse(row.destination)
    const status = trackingDeliveryStatusSchema.safeParse(row.status)
    if (!destination.success || !status.success) return []

    return [
      {
        destination: destination.data,
        status: status.data,
        reason: row.reason,
        count: Number(row.count),
        lastAt: row.last_at.toISOString(),
      },
    ]
  })
}

/** Events recorded in the window — the left-hand side of the discrepancy table. */
export async function countRecordedEvents(tx: Tx, tenantId: string, window: AnalyticsWindow): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*) AS count
    FROM tracking_events
    WHERE tenant_id = ${tenantId}
      AND received_at >= ${window.from}
      AND received_at < ${window.to}
      ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
  `
  return Number(row?.count ?? 0)
}

/** Hourly ingest volume, zero-filled, for the operational sparkline. */
export async function hourlyEventVolume(
  tx: Tx,
  tenantId: string,
  window: AnalyticsWindow,
): Promise<AnalyticsVolumePoint[]> {
  const rows = await tx<{ hour: Date; events: string }[]>`
    WITH hours AS (
      SELECT generate_series(
        date_trunc('hour', ${window.from}::timestamptz),
        date_trunc('hour', ${window.to}::timestamptz - interval '1 microsecond'),
        interval '1 hour'
      ) AS hour
    ),
    events AS (
      SELECT date_trunc('hour', received_at) AS hour
      FROM tracking_events
      WHERE tenant_id = ${tenantId}
        AND received_at >= ${window.from}
        AND received_at < ${window.to}
        ${window.siteId ? tx`AND site_id = ${window.siteId}` : tx``}
    )
    SELECT hours.hour, count(e.hour) AS events
    FROM hours
    LEFT JOIN events e ON e.hour = hours.hour
    GROUP BY hours.hour
    ORDER BY hours.hour ASC
  `

  return rows.map((row) => ({ hour: row.hour.toISOString(), events: Number(row.events) }))
}

// endregion
