import { Ga4Destination } from './destinations/ga4.js'
import { GoogleAdsDestination } from './destinations/google-ads.js'
import { InternalDestination } from './destinations/internal.js'
import { MetaCapiDestination } from './destinations/meta-capi.js'
import { TrackingRouter } from './router.js'

/**
 * The assembled tracking stack.
 *
 * The internal store is first and always on; the vendors follow and each one
 * reports itself unconfigured when this installation has no credentials for
 * it. The platform therefore runs with zero tracking credentials — collection,
 * consent, attribution and the event debugger all work out of the box, and
 * adding a GA4 secret improves the picture rather than switching it on.
 */
export const trackingRouter = new TrackingRouter([
  new InternalDestination(),
  new Ga4Destination(),
  new GoogleAdsDestination(),
  new MetaCapiDestination(),
])

export { collectTrackingEvents } from './gateway.js'
export { attribute } from './attribution.js'
export { channelOf, normalizeEvent, resolveTouch } from './normalize.js'
export { decideConsent } from './consent.js'
export { TrackingRouter } from './router.js'
export type { DeliveryOutcome, DestinationDescription } from './router.js'
export type { NormalizedTrackingEvent, TrackingDestination } from './destination.js'
