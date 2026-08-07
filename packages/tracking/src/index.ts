/**
 * `@platform/tracking` — the first-party browser SDK (§23).
 *
 * ```ts
 * const tracker = createTracker({ siteId, tenantId, consent: { analytics: true } })
 * tracker.track('lead', { form: 'contact' })
 * ```
 *
 * It writes its own first-party cookies, captures the campaign that brought
 * the visitor in, holds events until consent is known, batches them, and hands
 * the last batch to `sendBeacon` on the way out. Everything it sends is
 * re-validated by the gateway — this end of the boundary is untrusted by
 * design (ADR-0002).
 */

import { Tracker } from './tracker.js'
import type { TrackerConfig } from './types.js'

export { Tracker } from './tracker.js'
export { ANONYMOUS_COOKIE, SESSION_COOKIE } from './storage.js'
export type {
  TrackerConfig,
  TrackingClickIds,
  TrackingConsent,
  TrackingContext,
  TrackingEventPayload,
  TrackingUtm,
  TrackOptions,
} from './types.js'

/** Build a tracker and start it. The common case, in one call. */
export function createTracker(config: TrackerConfig): Tracker {
  const tracker = new Tracker(config)
  tracker.start()
  return tracker
}
