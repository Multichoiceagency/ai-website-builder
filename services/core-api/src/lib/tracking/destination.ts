import type {
  TrackingConsentCategory,
  TrackingDestinationId,
  TrackingEvent,
  TrackingTouch,
} from '@platform/schemas'

/**
 * The destination contract (§22, ADR-0006).
 *
 * Callers ask for "send this event"; they never learn that GA4 wants a
 * Measurement Protocol body and Meta wants a SHA-256 of an e-mail address.
 * A vendor's name and field names exist inside exactly one adapter under
 * `destinations/`.
 */

/**
 * An event after normalization: the validated event plus the touch and channel
 * derived from it once, so every adapter reads the same interpretation of
 * "where did this come from" instead of re-deriving it four ways.
 */
export interface NormalizedTrackingEvent {
  event: TrackingEvent
  touch: TrackingTouch
  /** `source / medium`, GA-style — `google / cpc`, `(direct) / (none)`. */
  channel: string
  value: number | null
  currency: string | null
  /** True when this event is one an ad platform will accept as a conversion. */
  isConversion: boolean
  /**
   * True when the touch actually says where the visitor came from. A direct
   * visit is not evidence that the previous campaign stopped working, so it
   * must not overwrite a stored last-touch (§28).
   */
  attributed: boolean
}

/**
 * What an adapter did. Throwing is the third outcome and means "failed" — the
 * router catches it, records it and moves on, because one vendor being down
 * must never fail the customer's request.
 */
export type DestinationSendResult = { status: 'delivered' } | { status: 'skipped'; reason: string }

export interface TrackingDestination {
  readonly id: TrackingDestinationId
  readonly label: string
  /** The consent this destination is gated on. Enforced by the router, not here. */
  readonly consent: TrackingConsentCategory

  /**
   * False when this installation has no credentials for the destination.
   *
   * Adapters report this honestly and never invent a fallback account: a
   * destination that silently sends nowhere is worse than one the dashboard
   * shows as unconfigured.
   */
  isConfigured(): boolean

  send(event: NormalizedTrackingEvent): Promise<DestinationSendResult>
}

/** Outbound calls are capped so a hanging vendor cannot hold a request open. */
export const DESTINATION_TIMEOUT_MS = 4000

/**
 * A vendor response that is not 2xx. Carries a short reason for the delivery
 * ledger — never the request body, which holds hashed user data.
 */
export class DestinationDeliveryError extends Error {
  constructor(destination: TrackingDestinationId, status: number, detail: string) {
    super(`${destination} responded ${status}: ${detail.slice(0, 200)}`)
    this.name = 'DestinationDeliveryError'
  }
}
