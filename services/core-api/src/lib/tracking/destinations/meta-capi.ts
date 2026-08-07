import { createHash } from 'node:crypto'
import {
  DESTINATION_TIMEOUT_MS,
  DestinationDeliveryError,
  type DestinationSendResult,
  type NormalizedTrackingEvent,
  type TrackingDestination,
} from '../destination.js'

/**
 * Meta Conversions API.
 *
 * Meta matches server events to people using identifiers we must hash before
 * sending: e-mail, phone, external id. The hashing here is not decoration — an
 * unhashed identifier in a request body is a personal-data transfer we did not
 * agree to make, so nothing leaves this file in the clear and no request body
 * is ever logged.
 *
 * `event_id` is sent verbatim: it is Meta's deduplication key and it is the
 * same id the browser pixel used, which is the whole point of the shared id
 * (§25).
 */

const API_VERSION = 'v21.0'

/**
 * Meta's vocabulary is title-case and only partly overlaps ours. Anything
 * unmapped is sent under its own name as a custom event rather than dropped —
 * a customer's `quote_requested` is still worth measuring even though Meta has
 * no standard event for it.
 */
const EVENT_NAMES: Record<string, string> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  view_item_list: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  add_payment_info: 'AddPaymentInfo',
  purchase: 'Purchase',
  lead: 'Lead',
  qualified_lead: 'Lead',
  form_submit: 'Lead',
  quote_requested: 'Lead',
  appointment_booked: 'Schedule',
  phone_click: 'Contact',
  whatsapp_click: 'Contact',
}

interface MetaCredentials {
  pixelId: string
  accessToken: string
  testEventCode: string | undefined
}

function readCredentials(): MetaCredentials | null {
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!pixelId || !accessToken) return null
  return { pixelId, accessToken, testEventCode: process.env.META_TEST_EVENT_CODE }
}

/** Meta requires lowercase, trimmed, SHA-256 hex. Normalize before hashing or nothing matches. */
function hashed(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return createHash('sha256').update(normalized).digest('hex')
}

/** Phone numbers match only in E.164-ish form: digits, no punctuation. */
function hashedPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return null
  return createHash('sha256').update(digits).digest('hex')
}

export class MetaCapiDestination implements TrackingDestination {
  readonly id = 'meta_capi' as const
  readonly label = 'Meta Conversions API'
  readonly consent = 'marketing' as const

  isConfigured(): boolean {
    return readCredentials() !== null
  }

  async send(normalized: NormalizedTrackingEvent): Promise<DestinationSendResult> {
    const credentials = readCredentials()
    if (!credentials) return { status: 'skipped', reason: 'Meta CAPI is not configured on this environment.' }

    const { event } = normalized
    const fbclid = normalized.touch.clickIds.fbclid
    const occurredAtMs = new Date(event.occurredAt).getTime()

    const userData: Record<string, string> = {}
    const email = hashed(event.properties.email)
    const phone = hashedPhone(event.properties.phone)
    const externalId = hashed(event.userId ?? event.anonymousId)

    if (email) userData.em = email
    if (phone) userData.ph = phone
    if (externalId) userData.external_id = externalId
    if (event.context.userAgent) userData.client_user_agent = event.context.userAgent
    // Meta's click cookie format. Reconstructing it from the click id is what
    // lets a server event match a click when the browser cookie is unavailable.
    if (fbclid) userData.fbc = `fb.1.${occurredAtMs}.${fbclid}`

    const body = {
      data: [
        {
          event_name: EVENT_NAMES[event.name] ?? event.name,
          event_time: Math.floor(occurredAtMs / 1000),
          event_id: event.eventId,
          event_source_url: event.context.url,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            ...(normalized.value !== null ? { value: normalized.value } : {}),
            ...(normalized.currency ? { currency: normalized.currency } : {}),
            ...(typeof event.properties.content_ids === 'object' ? { content_ids: event.properties.content_ids } : {}),
          },
        },
      ],
      ...(credentials.testEventCode ? { test_event_code: credentials.testEventCode } : {}),
    }

    const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${credentials.pixelId}/events`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credentials.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DESTINATION_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new DestinationDeliveryError(this.id, response.status, await response.text().catch(() => ''))
    }

    const payload = (await response.json().catch(() => ({}))) as { events_received?: number }
    if (payload.events_received === 0) {
      throw new DestinationDeliveryError(this.id, 200, 'Meta accepted the request but received no events.')
    }

    return { status: 'delivered' }
  }
}
