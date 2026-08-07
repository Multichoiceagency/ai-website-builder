import { TRACKING_CONVERSION_EVENTS, type TrackingEvent, type TrackingTouch } from '@platform/schemas'
import type { NormalizedTrackingEvent } from './destination.js'

/**
 * Normalization: one interpretation of an event, computed once.
 *
 * Every destination and every attribution model reads the touch and channel
 * produced here. Deriving them per adapter is how a platform ends up reporting
 * `Google` in one table and `google` in another.
 */

/**
 * The GA convention for "this visit carries no acquisition information".
 * Exported because "is this touch worth overwriting a stored campaign with?"
 * is a question the attribution writes have to ask, and it must be asked
 * against the same sentinel this file produces.
 */
export const DIRECT_SOURCE = '(direct)'
const NO_MEDIUM = '(none)'
const NOT_SET = '(not set)'

const CONVERSION_EVENTS: ReadonlySet<string> = new Set(TRACKING_CONVERSION_EVENTS)

/** Lowercase, collapse whitespace, cap length. Applied to every campaign field. */
function normalizeTag(value: string | undefined, max = 200): string {
  if (!value) return ''
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, max)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Which network a click id implies.
 *
 * Ordered by how specific the id is. A click id is stronger evidence than a
 * UTM because the ad platform wrote it and the visitor cannot have pasted it
 * from a colleague's link — but an explicit UTM still wins for `campaign`,
 * which the click id does not carry.
 */
const CLICK_ID_CHANNELS: { key: string; source: string; medium: string }[] = [
  { key: 'gclid', source: 'google', medium: 'cpc' },
  { key: 'gbraid', source: 'google', medium: 'cpc' },
  { key: 'wbraid', source: 'google', medium: 'cpc' },
  { key: 'msclkid', source: 'bing', medium: 'cpc' },
  { key: 'fbclid', source: 'facebook', medium: 'paid_social' },
  { key: 'ttclid', source: 'tiktok', medium: 'paid_social' },
]

function collectClickIds(event: TrackingEvent): Record<string, string> {
  const ids = event.context.clickIds ?? {}
  const collected: Record<string, string> = {}

  for (const [key, value] of Object.entries(ids)) {
    if (typeof value === 'string' && value.trim()) collected[key] = value.trim().slice(0, 200)
  }

  return collected
}

/**
 * Resolve where this visit came from.
 *
 * Precedence: explicit UTMs, then click ids, then the referring host, then
 * direct. That order is deliberate — a marketer who tagged a link said
 * something on purpose, and we do not overrule them with an inferred channel.
 */
export function resolveTouch(event: TrackingEvent): TrackingTouch {
  const utm = event.context.utm ?? {}
  const clickIds = collectClickIds(event)

  let source = normalizeTag(utm.source)
  let medium = normalizeTag(utm.medium)

  if (!source) {
    const match = CLICK_ID_CHANNELS.find((candidate) => clickIds[candidate.key])
    if (match) {
      source = match.source
      medium = medium || match.medium
    }
  }

  if (!source) {
    const referrerHost = hostOf(event.context.referrer ?? '')
    const currentHost = hostOf(event.context.url)
    // A referrer inside the same site is navigation, not acquisition.
    if (referrerHost && referrerHost !== currentHost) {
      source = referrerHost
      medium = medium || 'referral'
    }
  }

  if (!source) {
    source = DIRECT_SOURCE
    medium = medium || NO_MEDIUM
  }

  return {
    source,
    medium: medium || NOT_SET,
    campaign: normalizeTag(utm.campaign),
    term: normalizeTag(utm.term),
    content: normalizeTag(utm.content),
    clickIds,
    landingUrl: event.context.url.slice(0, 2048),
    referrer: (event.context.referrer ?? '').slice(0, 2048),
    occurredAt: event.occurredAt,
  }
}

export function channelOf(touch: Pick<TrackingTouch, 'source' | 'medium'>): string {
  return `${touch.source || DIRECT_SOURCE} / ${touch.medium || NO_MEDIUM}`
}

export function normalizeEvent(event: TrackingEvent): NormalizedTrackingEvent {
  const touch = resolveTouch(event)

  return {
    event,
    touch,
    channel: channelOf(touch),
    // A negative or non-finite value is a client bug, not a conversion worth
    // that much money. Drop it rather than shipping it to an ad platform.
    value: typeof event.value === 'number' && Number.isFinite(event.value) && event.value >= 0 ? event.value : null,
    currency: event.currency ? event.currency.toUpperCase() : null,
    isConversion: CONVERSION_EVENTS.has(event.name),
    attributed: touch.source !== DIRECT_SOURCE,
  }
}
