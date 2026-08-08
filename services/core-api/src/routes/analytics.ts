import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  TRACKING_CONVERSION_EVENTS,
  analyticsBreakdownDimensionSchema,
  trackingEventNameSchema,
  uuidSchema,
  type AnalyticsAttributionModelReport,
  type AnalyticsAttributionReport,
  type AnalyticsBreakdown,
  type AnalyticsBreakdownDimension,
  type AnalyticsBreakdownRow,
  type AnalyticsDestinationDiscrepancy,
  type AnalyticsFunnelStep,
  type AnalyticsJourney,
  type AnalyticsJourneyReport,
  type AnalyticsJourneyTouch,
  type AnalyticsMetric,
  type AnalyticsOverview,
  type AnalyticsRange,
  type AnalyticsTrackingHealth,
  type TrackingAttributionModel,
  type TrackingEventName,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import {
  breakdownBy,
  countEventsByName,
  countRecordedEvents,
  dailyTraffic,
  funnelVisitors,
  hourlyEventVolume,
  listConversionJourneys,
  summarizeDeliveryReasons,
  summarizeTraffic,
  sumRevenueByCurrency,
  topPages,
  type AnalyticsWindow,
  type BreakdownRow,
  type JourneyTouchRow,
} from '../db/repositories/analytics.js'
import { countConversions, listConversionTouches } from '../db/repositories/tracking.js'
import {
  ATTRIBUTION_MODELS,
  attributeByDimension,
  groupJourneys,
  touchWeights,
} from '../lib/analytics/attribution-dimensions.js'
import { buildLivePresence } from '../lib/analytics/live-presence.js'
import { recommendFromLivePresence } from '../lib/ai/live-recommendations.js'
import { ok } from '../lib/response.js'
import { attribute, channelOf, trackingRouter } from '../lib/tracking/index.js'
import { listGa4Properties, runGa4Overview, runGa4Series, runGa4Breakdown, isGa4Configured } from '../lib/analytics/ga4-data.js'
import { hasGoogleConnection } from '../lib/integrations/google-token.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Analytics, attribution and tracking operations (§21, §26, §28).
 *
 * Every number these endpoints return is an aggregate over the tracking tables.
 * Where a figure cannot be derived from what was actually collected, the
 * response says so — a null `changePct` for an empty baseline, a named
 * unconfigured destination, an explicit `unattributed` count — rather than
 * filling the gap with something plausible. That restraint is the product:
 * these screens exist to make measurement trustworthy, and one invented figure
 * costs more trust than ten missing ones.
 */

const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 180
const DEFAULT_LOOKBACK_DAYS = 30
const BREAKDOWN_LIMIT = 12
const TOP_PAGES_LIMIT = 12
const JOURNEY_LIMIT = 25
const ATTRIBUTION_CONVERSION_CAP = 5000
const DEFAULT_HEALTH_HOURS = 24

const rangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(MAX_RANGE_DAYS).default(DEFAULT_RANGE_DAYS),
  siteId: uuidSchema.optional(),
})

const attributionQuerySchema = rangeQuerySchema.extend({
  lookbackDays: z.coerce.number().int().min(1).max(365).default(DEFAULT_LOOKBACK_DAYS),
  /** Comma-separated event names; defaults to everything an ad platform counts. */
  events: z.string().max(500).optional(),
})

const journeyQuerySchema = attributionQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(JOURNEY_LIMIT),
})

const healthQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(24 * 30).default(DEFAULT_HEALTH_HOURS),
  siteId: uuidSchema.optional(),
})

/**
 * The funnel (§21).
 *
 * Stages are membership, not path order: a visitor counts towards a stage if
 * they fired one of its events, whether or not they passed the stage above.
 * A strict sequential funnel would need per-visitor event ordering that the
 * stages below do not enforce, and reporting one anyway would be inventing a
 * journey. The UI carries the same caveat.
 */
const FUNNEL_STAGES: readonly {
  key: string
  label: string
  events: readonly TrackingEventName[]
}[] = [
  { key: 'visited', label: 'Visited a page', events: ['page_view'] },
  {
    key: 'explored',
    label: 'Looked at a service or product',
    events: ['service_view', 'view_item', 'view_item_list', 'select_item'],
  },
  {
    key: 'started',
    label: 'Started a form or a cart',
    events: ['form_start', 'add_to_cart', 'begin_checkout'],
  },
  {
    key: 'committed',
    label: 'Submitted or reached payment',
    events: ['form_submit', 'add_shipping_info', 'add_payment_info'],
  },
  { key: 'converted', label: 'Converted', events: [...TRACKING_CONVERSION_EVENTS] },
]

/**
 * Resolve a window and the equal-length window before it.
 *
 * Resolved once, on the server, so the comparison is always against exactly the
 * range that produced the current numbers.
 */
function resolveRange(days: number): AnalyticsRange {
  const to = new Date()
  const span = days * 24 * 60 * 60 * 1000
  const from = new Date(to.getTime() - span)
  const previousFrom = new Date(from.getTime() - span)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    days,
    previousFrom: previousFrom.toISOString(),
    previousTo: from.toISOString(),
  }
}

/**
 * `changePct` is null — not zero, not 100 — when the previous period was empty.
 * "Up 100% from nothing" is a sentence a measurement product should refuse to
 * say.
 */
function metric(current: number, previous: number): AnalyticsMetric {
  if (previous === 0) return { current, previous, changePct: null }
  return { current, previous, changePct: Math.round(((current - previous) / previous) * 1000) / 10 }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

function parseEventNames(raw: string | undefined): TrackingEventName[] {
  if (!raw) return [...TRACKING_CONVERSION_EVENTS]

  // An unknown name is dropped rather than rejected: the report is a read, and
  // a typo should produce an empty table, not a 400 in the middle of a screen.
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((name) => {
      const parsed = trackingEventNameSchema.safeParse(name)
      return parsed.success ? [parsed.data] : []
    })
}

function labelFor(row: BreakdownRow, dimension: AnalyticsBreakdownDimension): { key: string; label: string } {
  switch (dimension) {
    case 'source':
      return { key: row.source, label: row.source }
    case 'medium':
      return { key: row.medium, label: row.medium }
    case 'campaign':
      return { key: row.campaign || '(no campaign)', label: row.campaign || '(no campaign)' }
    case 'landing_page':
      return { key: row.landingPath, label: row.landingPath }
    case 'channel':
    default: {
      const channel = channelOf(row)
      return { key: channel, label: channel }
    }
  }
}

function toBreakdownRow(row: BreakdownRow, dimension: AnalyticsBreakdownDimension): AnalyticsBreakdownRow {
  const { key, label } = labelFor(row, dimension)
  return {
    key,
    label,
    sessions: row.sessions,
    visitors: row.visitors,
    conversions: row.conversions,
    revenue: Math.round(row.revenue * 100) / 100,
    conversionRate: row.sessions === 0 ? null : row.conversions / row.sessions,
  }
}

const analyticsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Live presence for the 3D globe — active sessions + avatar pins + tips.
   */
  app.get('/live', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(
      z.object({
        siteId: uuidSchema.optional(),
        windowMinutes: z.coerce.number().int().min(1).max(60).default(15),
        ai: z
          .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')])
          .optional()
          .transform((value) => value === '1' || value === 'true'),
      }),
      request.query ?? {},
      'live query',
    )

    let presence = await withTenant(context.tenantId, (tx) =>
      buildLivePresence(tx, context.tenantId, {
        siteId: query.siteId,
        windowMinutes: query.windowMinutes,
      }),
    )

    if (query.ai) {
      presence = {
        ...presence,
        recommendations: await recommendFromLivePresence(presence),
      }
    }

    return reply.send(ok(presence))
  })

  /**
   * The overview (§21): what happened, against what happened before.
   */
  app.get('/overview', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(rangeQuerySchema, request.query, 'analytics range')

    const range = resolveRange(query.days)
    const current: AnalyticsWindow = { from: range.from, to: range.to, siteId: query.siteId }
    const previous: AnalyticsWindow = {
      from: range.previousFrom,
      to: range.previousTo,
      siteId: query.siteId,
    }

    const overview = await withTenant(context.tenantId, async (tx): Promise<AnalyticsOverview> => {
      const [totals, previousTotals, revenueSlices, previousRevenueSlices] = await Promise.all([
        summarizeTraffic(tx, context.tenantId, current),
        summarizeTraffic(tx, context.tenantId, previous),
        sumRevenueByCurrency(tx, context.tenantId, current),
        sumRevenueByCurrency(tx, context.tenantId, previous),
      ])

      // The reporting currency is the one with the most revenue behind it.
      // Everything else is reported beside the headline instead of being added
      // to it — a total that mixes EUR and USD is wrong in both.
      const primary = revenueSlices[0] ?? null
      const currency = primary?.currency ?? null
      const previousPrimary = previousRevenueSlices.find((slice) => slice.currency === currency) ?? null

      const revenue = primary?.amount ?? 0
      const orders = primary?.orders ?? 0
      const previousRevenue = previousPrimary?.amount ?? 0
      const previousOrders = previousPrimary?.orders ?? 0

      const dimensions: AnalyticsBreakdownDimension[] = [
        'channel',
        'source',
        'medium',
        'campaign',
        'landing_page',
      ]

      const [series, previousSeries, pages, funnelCounts, eventCounts, breakdownResults] = await Promise.all([
        dailyTraffic(tx, context.tenantId, current, currency),
        dailyTraffic(tx, context.tenantId, previous, currency),
        topPages(tx, context.tenantId, current, TOP_PAGES_LIMIT),
        funnelVisitors(tx, context.tenantId, current, FUNNEL_STAGES),
        countEventsByName(tx, context.tenantId, current),
        Promise.all(
          dimensions.map((dimension) =>
            breakdownBy(tx, context.tenantId, current, dimension, {
              limit: BREAKDOWN_LIMIT,
              currency,
            }).then((result) => ({ dimension, result })),
          ),
        ),
      ])

      const breakdowns: AnalyticsBreakdown[] = breakdownResults.map(({ dimension, result }) => ({
        dimension,
        rows: result.rows.map((row) => toBreakdownRow(row, dimension)),
        remainingRows: Math.max(0, result.totalRows - result.rows.length),
      }))

      const firstStage = FUNNEL_STAGES[0]
      const startVisitors = firstStage ? (funnelCounts[firstStage.key] ?? 0) : 0

      const funnel: AnalyticsFunnelStep[] = FUNNEL_STAGES.map((stage, index) => {
        const visitors = funnelCounts[stage.key] ?? 0
        const previousStage = FUNNEL_STAGES[index - 1]
        const previousVisitors = previousStage ? (funnelCounts[previousStage.key] ?? 0) : null

        return {
          key: stage.key,
          label: stage.label,
          events: [...stage.events],
          visitors,
          rateFromStart: startVisitors === 0 ? null : visitors / startVisitors,
          rateFromPrevious:
            previousVisitors === null || previousVisitors === 0 ? null : visitors / previousVisitors,
        }
      })

      return {
        range,
        siteId: query.siteId ?? null,
        metrics: {
          visitors: metric(totals.visitors, previousTotals.visitors),
          sessions: metric(totals.sessions, previousTotals.sessions),
          pageViews: metric(totals.pageViews, previousTotals.pageViews),
          leads: metric(totals.leads, previousTotals.leads),
          conversions: metric(totals.conversions, previousTotals.conversions),
          conversionRate: metric(
            ratio(totals.conversions, totals.sessions),
            ratio(previousTotals.conversions, previousTotals.sessions),
          ),
          revenue: metric(Math.round(revenue * 100) / 100, Math.round(previousRevenue * 100) / 100),
          orders: metric(orders, previousOrders),
          averageOrderValue: metric(
            Math.round(ratio(revenue, orders) * 100) / 100,
            Math.round(ratio(previousRevenue, previousOrders) * 100) / 100,
          ),
        },
        currency,
        otherCurrencies: revenueSlices.slice(1),
        series,
        previousSeries,
        breakdowns,
        topPages: pages,
        funnel,
        eventCounts,
      }
    })

    return reply.send(ok(overview))
  })

  /**
   * Attribution (§28): the same journeys under all three models, side by side.
   *
   * The model totals come from the shared attribution helper; the per-dimension
   * comparison reads the same journeys through the same weighting. Showing the
   * models next to each other rather than one at a time is deliberate — the
   * disagreement between first-click and last-click is the most useful thing
   * attribution has to say, and a single-model view hides exactly that.
   */
  app.get('/attribution', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(attributionQuerySchema, request.query, 'attribution query')

    const range = resolveRange(query.days)
    const names = parseEventNames(query.events)
    const criteria = {
      siteId: query.siteId,
      names,
      from: range.from,
      to: range.to,
      lookbackDays: query.lookbackDays,
    }

    const report = await withTenant(context.tenantId, async (tx): Promise<AnalyticsAttributionReport> => {
      const [touches, totals, journeyRows] = await Promise.all([
        listConversionTouches(tx, context.tenantId, criteria),
        countConversions(tx, context.tenantId, criteria),
        listConversionJourneys(tx, context.tenantId, {
          ...criteria,
          limit: ATTRIBUTION_CONVERSION_CAP,
        }),
      ])

      const models: AnalyticsAttributionModelReport[] = ATTRIBUTION_MODELS.map(
        (model: TrackingAttributionModel) => {
          const attributed = attribute(model, touches)
          return {
            model,
            totalConversions: totals.conversions,
            totalValue: Math.round(totals.value * 100) / 100,
            attributedConversions: attributed.attributedConversions,
            // Named rather than hidden: a conversion whose visitor has no
            // session on record cannot be credited, and rows that quietly omit
            // it make every channel look better than it is.
            unattributed: Math.max(0, totals.conversions - attributed.attributedConversions),
            rows: attributed.rows,
          }
        },
      )

      const journeys = groupJourneys(journeyRows)
      const dimensions: AnalyticsBreakdownDimension[] = [
        'channel',
        'source',
        'medium',
        'campaign',
        'landing_page',
      ]

      const currency = journeyRows.find((row) => row.conversionCurrency)?.conversionCurrency ?? null

      return {
        range,
        siteId: query.siteId ?? null,
        lookbackDays: query.lookbackDays,
        events: names,
        currency,
        totalConversions: totals.conversions,
        totalValue: Math.round(totals.value * 100) / 100,
        unattributed: Math.max(0, totals.conversions - journeys.length),
        models,
        dimensions: dimensions.map((dimension) => ({
          dimension,
          rows: attributeByDimension(journeys, dimension),
        })),
      }
    })

    return reply.send(ok(report))
  })

  /**
   * Individual customer journeys (§28).
   *
   * The aggregate tables answer "which channel"; this answers "what actually
   * happened to this person", which is the view that makes an attribution model
   * arguable instead of magic. Each touch carries the credit every model would
   * give it.
   */
  app.get('/journeys', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(journeyQuerySchema, request.query, 'journey query')

    const range = resolveRange(query.days)
    const names = parseEventNames(query.events)
    const criteria = {
      siteId: query.siteId,
      names,
      from: range.from,
      to: range.to,
      lookbackDays: query.lookbackDays,
    }

    const report = await withTenant(context.tenantId, async (tx): Promise<AnalyticsJourneyReport> => {
      const [rows, totals] = await Promise.all([
        listConversionJourneys(tx, context.tenantId, { ...criteria, limit: query.limit }),
        countConversions(tx, context.tenantId, criteria),
      ])

      const journeys: AnalyticsJourney[] = groupJourneys(rows).map((touches) => {
        const head = touches[0]!
        const weights = {
          first_click: touchWeights('first_click', touches.length),
          last_click: touchWeights('last_click', touches.length),
          linear: touchWeights('linear', touches.length),
        }

        const firstTouchAt = touches[0]!.startedAt.getTime()
        const convertedAt = head.occurredAt.getTime()

        return {
          conversionId: head.conversionId,
          event: head.event,
          occurredAt: head.occurredAt.toISOString(),
          anonymousId: head.anonymousId,
          userId: head.userId,
          value: head.conversionValue,
          currency: head.conversionCurrency,
          hoursToConvert:
            touches.length > 1
              ? Math.round(((convertedAt - firstTouchAt) / (60 * 60 * 1000)) * 10) / 10
              : null,
          touches: touches.map((touch, index): AnalyticsJourneyTouch => ({
            sessionId: touch.sessionId,
            channel: channelOf(touch),
            source: touch.source,
            medium: touch.medium,
            campaign: touch.campaign,
            landingPath: touch.landingPath,
            startedAt: touch.startedAt.toISOString(),
            firstClick: weights.first_click[index] ?? 0,
            lastClick: weights.last_click[index] ?? 0,
            linear: Math.round((weights.linear[index] ?? 0) * 1000) / 1000,
          })),
        }
      })

      return {
        range,
        lookbackDays: query.lookbackDays,
        events: names,
        totalConversions: totals.conversions,
        journeys,
      }
    })

    return reply.send(ok(report))
  })

  /**
   * The operational view (§26): our recorded count against what each
   * destination accepted, and the reasons for every gap.
   *
   * A number that disagrees with GA4 is only alarming when nothing explains it.
   * `recorded - delivered` is decomposed here into skipped, failed and
   * not-configured, each carrying the sentence written at the time.
   */
  app.get('/tracking', async (request, reply) => {
    const context = requireTenant(request, 'tracking:read')
    const query = parseOrThrow(healthQuerySchema, request.query, 'tracking health query')

    const to = new Date()
    const from = new Date(to.getTime() - query.hours * 60 * 60 * 1000)
    const window: AnalyticsWindow = {
      from: from.toISOString(),
      to: to.toISOString(),
      siteId: query.siteId,
    }

    const health = await withTenant(context.tenantId, async (tx): Promise<AnalyticsTrackingHealth> => {
      const [recorded, reasons, eventCounts, volume] = await Promise.all([
        countRecordedEvents(tx, context.tenantId, window),
        summarizeDeliveryReasons(tx, context.tenantId, { from: window.from, to: window.to }),
        countEventsByName(tx, context.tenantId, window),
        hourlyEventVolume(tx, context.tenantId, window),
      ])

      // Every destination the platform knows about appears, including the ones
      // this installation has no credentials for. An empty row that says "not
      // configured" answers the question; a missing row invites a guess.
      const destinations: AnalyticsDestinationDiscrepancy[] = trackingRouter.describe().map((destination) => {
        const forDestination = reasons.filter((entry) => entry.destination === destination.id)
        const countOf = (status: string) =>
          forDestination
            .filter((entry) => entry.status === status)
            .reduce((total, entry) => total + entry.count, 0)

        const delivered = countOf('delivered')
        const lastDelivered = forDestination
          .filter((entry) => entry.status === 'delivered' && entry.lastAt)
          .map((entry) => entry.lastAt!)
          .sort()
          .at(-1)

        const lastFailure = forDestination
          .filter((entry) => entry.status === 'failed')
          .sort((a, b) => String(a.lastAt).localeCompare(String(b.lastAt)))
          .at(-1)

        return {
          id: destination.id,
          label: destination.label,
          consent: destination.consent,
          configured: destination.configured,
          recorded,
          delivered,
          failed: countOf('failed'),
          skipped: countOf('skipped'),
          notConfigured: countOf('not_configured'),
          discrepancy: recorded - delivered,
          lastDeliveredAt: lastDelivered ?? null,
          lastError: lastFailure?.reason ?? null,
        }
      })

      return {
        windowHours: query.hours,
        from: window.from,
        to: window.to,
        siteId: query.siteId ?? null,
        recordedEvents: recorded,
        destinations,
        consentSkips: reasons.filter((entry) => entry.status === 'skipped'),
        failures: reasons.filter((entry) => entry.status === 'failed'),
        eventCounts,
        volume,
      }
    })

    return reply.send(ok(health))
  })

  /** GA4 Data API — observed sessions for a property the tenant granted via OAuth. */
  app.get('/ga4/status', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const connected = isGa4Configured() ? await hasGoogleConnection(context.tenantId) : false
    return reply.send(
      ok({
        configured: isGa4Configured(),
        connected,
        reason: !isGa4Configured()
          ? 'Google OAuth is not configured on this environment.'
          : connected
            ? 'Google is connected. List properties and run an overview.'
            : 'Connect Google under Settings → Integrations.',
      }),
    )
  })

  app.get('/ga4/properties', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const properties = await listGa4Properties(context.tenantId)
    return reply.send(ok({ properties }))
  })

  app.get('/ga4/overview', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(
      z.object({
        property: z.string().min(1).max(120),
        days: z.coerce.number().int().min(1).max(90).default(28),
      }),
      request.query ?? {},
      'query',
    )
    const metrics = await runGa4Overview(context.tenantId, query.property, query.days)
    return reply.send(ok({ property: query.property, days: query.days, metrics }))
  })

  app.get('/ga4/series', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(
      z.object({
        property: z.string().min(1).max(120),
        days: z.coerce.number().int().min(1).max(90).default(28),
      }),
      request.query ?? {},
      'query',
    )
    const series = await runGa4Series(context.tenantId, query.property, query.days)
    return reply.send(ok({ property: query.property, days: query.days, series }))
  })

  app.get('/ga4/breakdown', async (request, reply) => {
    const context = requireTenant(request, 'analytics:read')
    const query = parseOrThrow(
      z.object({
        property: z.string().min(1).max(120),
        days: z.coerce.number().int().min(1).max(90).default(28),
        dimension: z.enum(['country', 'sessionSource', 'deviceCategory', 'landingPage']).default('country'),
      }),
      request.query ?? {},
      'query',
    )
    const rows = await runGa4Breakdown(context.tenantId, query.property, query.dimension, query.days)
    return reply.send(ok({ property: query.property, days: query.days, dimension: query.dimension, rows }))
  })
}

export default analyticsRoutes
