import type { TrackingConsentCategory, TrackingDestinationId, TrackingDeliveryStatus } from '@platform/schemas'
import { decideConsent } from './consent.js'
import type { NormalizedTrackingEvent, TrackingDestination } from './destination.js'

/**
 * The destination router (§22).
 *
 * Fan-out with two gates in front of every destination: does the visitor's
 * consent allow it, and does this installation have credentials for it. Both
 * answers are recorded, so "the conversion never reached Meta" always has a
 * cause on record instead of a theory.
 */

export interface DeliveryOutcome {
  destination: TrackingDestinationId
  status: TrackingDeliveryStatus
  reason: string | null
  latencyMs: number | null
}

export interface DestinationDescription {
  id: TrackingDestinationId
  label: string
  consent: TrackingConsentCategory
  configured: boolean
}

export class TrackingRouter {
  readonly #destinations: TrackingDestination[]

  constructor(destinations: TrackingDestination[]) {
    this.#destinations = destinations
  }

  /** Every destination the platform knows about, configured or not. */
  describe(): DestinationDescription[] {
    return this.#destinations.map((destination) => ({
      id: destination.id,
      label: destination.label,
      consent: destination.consent,
      configured: destination.isConfigured(),
    }))
  }

  /**
   * Deliver one event everywhere it is allowed to go.
   *
   * Destinations run in parallel and independently: a vendor that is down,
   * slow or misconfigured produces a `failed` row and nothing else. The
   * customer's request has already been persisted by the time we get here, so
   * there is no outcome in which a third party can fail it.
   */
  async deliver(event: NormalizedTrackingEvent): Promise<DeliveryOutcome[]> {
    return Promise.all(this.#destinations.map((destination) => this.#deliverOne(destination, event)))
  }

  async #deliverOne(destination: TrackingDestination, event: NormalizedTrackingEvent): Promise<DeliveryOutcome> {
    const consent = decideConsent(destination.consent, event.event.consent)
    if (!consent.allowed) {
      return { destination: destination.id, status: 'skipped', reason: consent.reason, latencyMs: null }
    }

    if (!destination.isConfigured()) {
      return {
        destination: destination.id,
        status: 'not_configured',
        reason: `No ${destination.label} credentials are configured — add them under Settings.`,
        latencyMs: null,
      }
    }

    const startedAt = Date.now()
    try {
      const result = await destination.send(event)
      return {
        destination: destination.id,
        status: result.status === 'delivered' ? 'delivered' : 'skipped',
        reason: result.status === 'skipped' ? result.reason : null,
        latencyMs: Date.now() - startedAt,
      }
    } catch (error) {
      return {
        destination: destination.id,
        status: 'failed',
        // The message, never the error object: adapters put vendor responses
        // in it and those can echo request contents.
        reason: error instanceof Error ? error.message.slice(0, 300) : 'Unknown delivery error.',
        latencyMs: Date.now() - startedAt,
      }
    }
  }
}
