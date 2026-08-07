import {
  DESTINATION_TIMEOUT_MS,
  DestinationDeliveryError,
  type DestinationSendResult,
  type NormalizedTrackingEvent,
  type TrackingDestination,
} from '../destination.js'

/**
 * Google Ads offline conversion upload.
 *
 * Three constraints from the vendor drive this adapter:
 *
 * 1. **A conversion needs a click id.** Without `gclid`, `gbraid` or `wbraid`
 *    Google has nothing to attribute the conversion to, so an event without
 *    one is skipped rather than sent and rejected.
 * 2. **`orderId` is the deduplication key.** We send our `eventId`, which is
 *    the same id the browser tag used, so an in-browser conversion and this
 *    upload collapse into one conversion instead of two.
 * 3. **Auth is OAuth, not an API key.** The refresh token is exchanged for a
 *    short-lived access token which is cached until shortly before it expires;
 *    a token exchange per conversion would be both slow and rate-limited.
 */

const API_VERSION = 'v18'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
/** Refresh a minute early rather than discovering expiry mid-upload. */
const TOKEN_SAFETY_MARGIN_MS = 60_000

interface GoogleAdsCredentials {
  developerToken: string
  customerId: string
  conversionActionId: string
  clientId: string
  clientSecret: string
  refreshToken: string
  loginCustomerId: string | undefined
}

function readCredentials(): GoogleAdsCredentials | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '')
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

  if (!developerToken || !customerId || !conversionActionId || !clientId || !clientSecret || !refreshToken) {
    return null
  }

  return {
    developerToken,
    customerId,
    conversionActionId,
    clientId,
    clientSecret,
    refreshToken,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, ''),
  }
}

/** Google Ads wants `yyyy-mm-dd hh:mm:ss+00:00`, not ISO-8601. */
function adsTimestamp(iso: string): string {
  return `${new Date(iso).toISOString().slice(0, 19).replace('T', ' ')}+00:00`
}

export class GoogleAdsDestination implements TrackingDestination {
  readonly id = 'google_ads' as const
  readonly label = 'Google Ads'
  readonly consent = 'marketing' as const

  #accessToken: { value: string; expiresAt: number } | null = null

  isConfigured(): boolean {
    return readCredentials() !== null
  }

  async send(normalized: NormalizedTrackingEvent): Promise<DestinationSendResult> {
    const credentials = readCredentials()
    if (!credentials) return { status: 'skipped', reason: 'Google Ads is not configured on this environment.' }

    if (!normalized.isConversion) {
      return { status: 'skipped', reason: `${normalized.event.name} is not a conversion event.` }
    }

    const clickIds = normalized.touch.clickIds
    const gclid = clickIds.gclid
    const gbraid = clickIds.gbraid
    const wbraid = clickIds.wbraid

    if (!gclid && !gbraid && !wbraid) {
      return { status: 'skipped', reason: 'No Google click id on this conversion.' }
    }

    const accessToken = await this.#token(credentials)

    const body = {
      partialFailure: true,
      conversions: [
        {
          ...(gclid ? { gclid } : gbraid ? { gbraid } : { wbraid }),
          conversionAction: `customers/${credentials.customerId}/conversionActions/${credentials.conversionActionId}`,
          conversionDateTime: adsTimestamp(normalized.event.occurredAt),
          ...(normalized.value !== null ? { conversionValue: normalized.value } : {}),
          ...(normalized.currency ? { currencyCode: normalized.currency } : {}),
          // Shared with the browser tag — this is what stops double counting.
          orderId: normalized.event.eventId,
        },
      ],
    }

    const response = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${credentials.customerId}:uploadClickConversions`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'developer-token': credentials.developerToken,
          ...(credentials.loginCustomerId ? { 'login-customer-id': credentials.loginCustomerId } : {}),
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DESTINATION_TIMEOUT_MS),
      },
    )

    if (!response.ok) {
      throw new DestinationDeliveryError(this.id, response.status, await response.text().catch(() => ''))
    }

    // `partialFailure` means a 200 can still describe a rejected conversion.
    // Reporting that as delivered is how a tracking dashboard starts lying.
    const payload = (await response.json().catch(() => ({}))) as { partialFailureError?: { message?: string } }
    if (payload.partialFailureError?.message) {
      throw new DestinationDeliveryError(this.id, 200, payload.partialFailureError.message)
    }

    return { status: 'delivered' }
  }

  /** Exchange the refresh token, then reuse the access token until it nears expiry. */
  async #token(credentials: GoogleAdsCredentials): Promise<string> {
    const cached = this.#accessToken
    if (cached && cached.expiresAt - TOKEN_SAFETY_MARGIN_MS > Date.now()) return cached.value

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(DESTINATION_TIMEOUT_MS),
    })

    if (!response.ok) {
      // Status only. The body of a failed token exchange echoes the client id.
      throw new DestinationDeliveryError(this.id, response.status, 'OAuth token exchange failed.')
    }

    const payload = (await response.json()) as { access_token?: string; expires_in?: number }
    if (!payload.access_token) {
      throw new DestinationDeliveryError(this.id, 200, 'OAuth token exchange returned no access token.')
    }

    this.#accessToken = {
      value: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    }
    return payload.access_token
  }
}
