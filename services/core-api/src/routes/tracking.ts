import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  TRACKING_CONVERSION_EVENTS,
  trackingAttributionModelSchema,
  trackingCollectRequestSchema,
  trackingEventNameSchema,
  uuidSchema,
  type TrackingAttributionReport,
  type TrackingDestinationReport,
  type TrackingEventName,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import {
  countConversions,
  findIdentity,
  listConversionTouches,
  listTrackingEvents,
  summarizeDeliveries,
} from '../db/repositories/tracking.js'
import { attribute, collectTrackingEvents, trackingRouter } from '../lib/tracking/index.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Tracking routes (§22–§28).
 *
 * `/collect` is the gateway; the rest is the evidence it leaves behind, which
 * is the half of a tracking product people actually judge it on — a number
 * that disagrees with GA4 and no way to find out why is worse than no number.
 */

const DEFAULT_EVENT_LIMIT = 50
const DEFAULT_REPORT_HOURS = 24 * 7
const DEFAULT_ATTRIBUTION_DAYS = 30

const eventsQuerySchema = z.object({
  siteId: uuidSchema.optional(),
  name: trackingEventNameSchema.optional(),
  anonymousId: z.string().min(8).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(DEFAULT_EVENT_LIMIT),
})

const destinationsQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(24 * 90).default(DEFAULT_REPORT_HOURS),
})

const attributionQuerySchema = z.object({
  model: trackingAttributionModelSchema.default('last_click'),
  siteId: uuidSchema.optional(),
  days: z.coerce.number().int().min(1).max(365).default(DEFAULT_ATTRIBUTION_DAYS),
  lookbackDays: z.coerce.number().int().min(1).max(365).default(DEFAULT_ATTRIBUTION_DAYS),
  /** Comma-separated event names; defaults to everything an ad platform counts. */
  events: z.string().max(500).optional(),
})

const identityParamsSchema = z.object({ anonymousId: z.string().min(8).max(64) })

function parseEventNames(raw: string | undefined): TrackingEventName[] {
  if (!raw) return [...TRACKING_CONVERSION_EVENTS]

  const names = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  // An unknown name is dropped rather than rejected: the report is a read, and
  // a typo should show an empty row, not a 400 in the middle of a dashboard.
  return names.flatMap((name) => {
    const parsed = trackingEventNameSchema.safeParse(name)
    return parsed.success ? [parsed.data] : []
  })
}

const trackingRoutes: FastifyPluginAsync = async (app) => {
  /**
   * The collection endpoint (§22).
   *
   * Answers 200 with a per-event verdict rather than failing the batch: one
   * duplicate or one event naming an unknown site must not discard the other
   * forty-nine, and a beacon has nobody to retry for it.
   */
  app.post('/collect', async (request, reply) => {
    const context = requireTenant(request, 'tracking:write')
    const { events } = parseOrThrow(trackingCollectRequestSchema, request.body, 'tracking batch')

    const result = await withTenant(context.tenantId, (tx) =>
      collectTrackingEvents(tx, {
        tenantId: context.tenantId,
        events,
        router: trackingRouter,
      }),
    )

    // The delivery table is the durable consent ledger; this line is what makes
    // the same decision visible while debugging a live site (§27).
    const withheld = result.results.flatMap((entry) =>
      entry.deliveries.filter((delivery) => delivery.status === 'skipped').map((delivery) => delivery.destination),
    )
    if (withheld.length) {
      request.log.info(
        { tenantId: context.tenantId, withheld: [...new Set(withheld)] },
        'tracking: destinations skipped by consent or eligibility',
      )
    }

    return reply.send(ok(result))
  })

  /** The event debugger's feed (§26). */
  app.get('/events', async (request, reply) => {
    const context = requireTenant(request, 'tracking:read')
    const query = parseOrThrow(eventsQuerySchema, request.query, 'event query')

    const events = await withTenant(context.tenantId, (tx) =>
      listTrackingEvents(tx, context.tenantId, {
        siteId: query.siteId,
        name: query.name,
        anonymousId: query.anonymousId,
        limit: query.limit,
      }),
    )

    return reply.send(ok(events))
  })

  /**
   * Per-destination delivery counts (§26).
   *
   * Every destination the platform knows about appears, including the ones
   * this installation has no credentials for — an empty row that says
   * "not configured" answers the question; a missing row invites a guess.
   */
  app.get('/destinations', async (request, reply) => {
    const context = requireTenant(request, 'tracking:read')
    const { hours } = parseOrThrow(destinationsQuerySchema, request.query, 'destination query')

    const counts = await withTenant(context.tenantId, (tx) => summarizeDeliveries(tx, context.tenantId, hours))
    const byDestination = new Map(counts.map((entry) => [entry.destination, entry]))

    const destinations: TrackingDestinationReport[] = trackingRouter.describe().map((destination) => {
      const stats = byDestination.get(destination.id)
      return {
        id: destination.id,
        label: destination.label,
        consent: destination.consent,
        configured: destination.configured,
        delivered: stats?.delivered ?? 0,
        failed: stats?.failed ?? 0,
        skipped: stats?.skipped ?? 0,
        notConfigured: stats?.notConfigured ?? 0,
        lastDeliveredAt: stats?.lastDeliveredAt ? stats.lastDeliveredAt.toISOString() : null,
        lastError: stats?.lastError ?? null,
      }
    })

    return reply.send(ok({ windowHours: hours, destinations }))
  })

  /**
   * First-click, last-click and linear credit over the same session →
   * conversion join (§28). Switching models re-reads one dataset, so a
   * disagreement between them is the model's opinion and not two pipelines.
   */
  app.get('/attribution', async (request, reply) => {
    const context = requireTenant(request, 'tracking:read')
    const query = parseOrThrow(attributionQuerySchema, request.query, 'attribution query')

    const to = new Date()
    const from = new Date(to.getTime() - query.days * 24 * 60 * 60 * 1000)
    const names = parseEventNames(query.events)

    const criteria = {
      siteId: query.siteId,
      names,
      from: from.toISOString(),
      to: to.toISOString(),
      lookbackDays: query.lookbackDays,
    }

    const report = await withTenant(context.tenantId, async (tx): Promise<TrackingAttributionReport> => {
      const [touches, totals] = await Promise.all([
        listConversionTouches(tx, context.tenantId, criteria),
        countConversions(tx, context.tenantId, criteria),
      ])

      const attributed = attribute(query.model, touches)

      return {
        model: query.model,
        from: criteria.from,
        to: criteria.to,
        lookbackDays: query.lookbackDays,
        events: names,
        totalConversions: totals.conversions,
        totalValue: Math.round(totals.value * 100) / 100,
        // Reported rather than hidden: a conversion whose visitor has no
        // session on record cannot be credited, and rows that quietly omit it
        // make every channel look better than it is.
        unattributed: Math.max(0, totals.conversions - attributed.attributedConversions),
        rows: attributed.rows,
      }
    })

    return reply.send(ok(report))
  })

  /** First and last touch for one visitor — the "where did this lead come from" lookup. */
  app.get('/identities/:anonymousId', async (request, reply) => {
    const context = requireTenant(request, 'tracking:read')
    const { anonymousId } = parseOrThrow(identityParamsSchema, request.params, 'anonymous id')

    const identity = await withTenant(context.tenantId, (tx) => findIdentity(tx, context.tenantId, anonymousId))
    if (!identity) throw new NotFoundError('Visitor')

    return reply.send(ok(identity))
  })
}

export default trackingRoutes
