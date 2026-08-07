import type { TrackingCollectResponse, TrackingCollectResult, TrackingEvent } from '@platform/schemas'
import type { Tx } from '../../db/client.js'
import { findSiteById } from '../../db/repositories/sites.js'
import {
  insertTrackingEvent,
  recordDeliveries,
  upsertIdentity,
  upsertSession,
} from '../../db/repositories/tracking.js'
import { normalizeEvent } from './normalize.js'
import type { TrackingRouter } from './router.js'

/**
 * The tracking gateway (§22–§28).
 *
 *   validate → consent → normalize → stitch identity & attribution
 *           → persist → fan out to destinations → record what happened
 *
 * Validation happened at the route boundary; everything after it happens here,
 * in that order, for a reason:
 *
 * - **Persist before fan-out**, because the persisted row is the deduplication
 *   check. A duplicate that reached the destinations before we noticed is a
 *   double-counted conversion, and no destination lets us take it back.
 * - **Stitch before delivery**, so the touch an adapter sends is the same one
 *   attribution will later credit.
 */

export interface CollectInput {
  tenantId: string
  events: TrackingEvent[]
  router: TrackingRouter
}

export async function collectTrackingEvents(tx: Tx, input: CollectInput): Promise<TrackingCollectResponse> {
  const results: TrackingCollectResult[] = []
  // One batch usually names one site. Resolving it once per batch keeps the
  // ownership check from becoming N queries.
  const siteOwnership = new Map<string, boolean>()

  for (const event of input.events) {
    let owned = siteOwnership.get(event.siteId)
    if (owned === undefined) {
      // A foreign key alone would not catch this: referential integrity checks
      // are not filtered by row-level security, so a site id belonging to
      // another tenant would satisfy the constraint. This is the check that
      // stops one tenant writing events onto another's site (ADR-0004).
      owned = (await findSiteById(tx, input.tenantId, event.siteId)) !== null
      siteOwnership.set(event.siteId, owned)
    }

    if (!owned) {
      results.push({
        eventId: event.eventId,
        status: 'rejected',
        reason: 'Unknown site for this workspace.',
        deliveries: [],
      })
      continue
    }

    const normalized = normalizeEvent(event)

    const trackingEventId = await insertTrackingEvent(tx, {
      tenantId: input.tenantId,
      siteId: event.siteId,
      eventId: event.eventId,
      name: event.name,
      occurredAt: event.occurredAt,
      sessionId: event.sessionId,
      anonymousId: event.anonymousId,
      userId: event.userId,
      consent: event.consent,
      context: event.context,
      value: normalized.value,
      currency: normalized.currency,
      properties: event.properties,
    })

    if (trackingEventId === null) {
      // The twin already arrived. It carried the same id, so it also already
      // produced its own delivery rows — sending again is the double count
      // the shared id exists to prevent (§25).
      results.push({
        eventId: event.eventId,
        status: 'duplicate',
        reason: 'This event id was already collected.',
        deliveries: [],
      })
      continue
    }

    const newSession = await upsertSession(tx, {
      tenantId: input.tenantId,
      siteId: event.siteId,
      sessionId: event.sessionId,
      anonymousId: event.anonymousId,
      occurredAt: event.occurredAt,
      touch: normalized.touch,
    })

    await upsertIdentity(tx, {
      tenantId: input.tenantId,
      siteId: event.siteId,
      anonymousId: event.anonymousId,
      userId: event.userId,
      occurredAt: event.occurredAt,
      touch: normalized.touch,
      newSession,
      attributed: normalized.attributed,
    })

    const outcomes = await input.router.deliver(normalized)
    await recordDeliveries(tx, input.tenantId, trackingEventId, outcomes)

    results.push({
      eventId: event.eventId,
      status: 'accepted',
      reason: null,
      deliveries: outcomes.map((outcome) => ({
        destination: outcome.destination,
        status: outcome.status,
        reason: outcome.reason,
      })),
    })
  }

  return {
    received: input.events.length,
    accepted: results.filter((result) => result.status === 'accepted').length,
    duplicates: results.filter((result) => result.status === 'duplicate').length,
    rejected: results.filter((result) => result.status === 'rejected').length,
    results,
  }
}
