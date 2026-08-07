import type { DestinationSendResult, NormalizedTrackingEvent, TrackingDestination } from '../destination.js'

/**
 * The platform's own store.
 *
 * Always configured, always on, and the only destination that is not a vendor:
 * it writes to `tracking_events`, which is also the deduplication key every
 * other destination depends on. That is why the write itself happens in the
 * gateway *before* fan-out rather than here — a duplicate must be detected
 * before anything is sent to Google or Meta, not after.
 *
 * This adapter exists so the destination list, the consent decision and the
 * delivery report treat the first-party store exactly like the rest. A
 * destination that is special-cased everywhere is a destination nobody can
 * reason about.
 */
export class InternalDestination implements TrackingDestination {
  readonly id = 'internal' as const
  readonly label = 'Platform analytics'
  readonly consent = 'none' as const

  isConfigured(): boolean {
    return true
  }

  async send(_event: NormalizedTrackingEvent): Promise<DestinationSendResult> {
    return { status: 'delivered' }
  }
}
