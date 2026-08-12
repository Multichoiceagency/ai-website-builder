import {
  DESTINATION_TIMEOUT_MS,
  DestinationDeliveryError,
  type DestinationSendResult,
  type NormalizedTrackingEvent,
  type TrackingDestination,
} from '../destination.js'

/**
 * Google Analytics 4, via the Measurement Protocol.
 *
 * Two things worth knowing about this vendor, because they shape the code:
 *
 * 1. **The Measurement Protocol has no deduplication.** GA4 will happily count
 *    a browser hit and its server-side twin as two events. Nothing in this
 *    adapter can prevent that; the gateway's `eventId` uniqueness is what does
 *    (§25). If that ever regresses, GA4 is where it shows up first.
 * 2. **It answers 204 to almost everything**, including a malformed body. A
 *    2xx here means "accepted for processing", not "recorded" — which is
 *    exactly why the delivery report shows counts rather than promises.
 *
 * Credentials come from the environment and are never logged.
 */

const ENDPOINT = 'https://www.google-analytics.com/mp/collect'

/** GA4 requires an engagement time for a session to be counted as engaged. */
const ENGAGEMENT_TIME_MSEC = 100

interface Ga4Credentials {
  measurementId: string
  apiSecret: string
}

function readCredentials(): Ga4Credentials | null {
  const measurementId = process.env.GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return null
  return { measurementId, apiSecret }
}

/** GA4 rejects parameter values that are not scalars, silently dropping the event. */
function scalarParams(properties: Record<string, unknown>): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') params[key] = value.slice(0, 100)
    else if (typeof value === 'number' && Number.isFinite(value)) params[key] = value
    else if (typeof value === 'boolean') params[key] = value
  }

  return params
}

export class Ga4Destination implements TrackingDestination {
  readonly id = 'ga4' as const
  readonly label = 'Google Analytics 4'
  readonly consent = 'analytics' as const

  isConfigured(): boolean {
    return readCredentials() !== null
  }

  async send(normalized: NormalizedTrackingEvent): Promise<DestinationSendResult> {
    const credentials = readCredentials()
    if (!credentials) return { status: 'skipped', reason: 'GA4 is not configured — add it under Settings.' }

    const { event } = normalized

    const body = {
      // GA4's client id is the visitor. Our anonymous id already is one, and
      // reusing it keeps the server-side stream joinable to the browser's.
      client_id: event.anonymousId,
      ...(event.userId ? { user_id: event.userId } : {}),
      timestamp_micros: new Date(event.occurredAt).getTime() * 1000,
      // Consent is enforced by the router, but this flag is what GA4 itself
      // uses to decide whether the hit may build advertising audiences.
      non_personalized_ads: !event.consent.marketing,
      events: [
        {
          name: event.name,
          params: {
            ...scalarParams(event.properties),
            session_id: event.sessionId,
            engagement_time_msec: ENGAGEMENT_TIME_MSEC,
            page_location: event.context.url,
            ...(event.context.referrer ? { page_referrer: event.context.referrer } : {}),
            ...(normalized.touch.campaign ? { campaign: normalized.touch.campaign } : {}),
            source: normalized.touch.source,
            medium: normalized.touch.medium,
            ...(normalized.value !== null ? { value: normalized.value } : {}),
            ...(normalized.currency ? { currency: normalized.currency } : {}),
          },
        },
      ],
    }

    const url = `${ENDPOINT}?measurement_id=${encodeURIComponent(credentials.measurementId)}&api_secret=${encodeURIComponent(credentials.apiSecret)}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DESTINATION_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DestinationDeliveryError(this.id, response.status, await response.text().catch(() => ''))
    }

    return { status: 'delivered' }
  }
}
