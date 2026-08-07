/**
 * First-party identity.
 *
 * Both ids live in first-party cookies written by this script, not by a third
 * party: that is what keeps them readable to our own server, survivable across
 * pages, and unaffected by third-party cookie blocking.
 */

export const ANONYMOUS_COOKIE = '_pl_aid'
export const SESSION_COOKIE = '_pl_sid'
/** 13 months — the common ceiling for a first-party analytics identifier. */
const ANONYMOUS_MAX_AGE_SECONDS = 60 * 60 * 24 * 395

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  for (const part of document.cookie.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== name) continue
    return decodeURIComponent(part.slice(separator + 1))
  }

  return null
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number, domain?: string): void {
  if (typeof document === 'undefined') return

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${Math.floor(maxAgeSeconds)}`,
    'samesite=lax',
  ]
  if (domain) parts.push(`domain=${domain}`)
  if (typeof location !== 'undefined' && location.protocol === 'https:') parts.push('secure')

  document.cookie = parts.join('; ')
}

/**
 * `crypto.randomUUID` where it exists, a random fallback where it does not —
 * this runs on whatever browser the customer's visitor brought, and an id that
 * throws is an event that never arrives.
 */
export function newId(): string {
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()

  if (cryptoApi?.getRandomValues) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`
}

export function readOrCreateAnonymousId(domain?: string): string {
  const existing = readCookie(ANONYMOUS_COOKIE)
  if (existing && existing.length >= 8) {
    // Refresh the expiry on every visit, so an active visitor is not silently
    // split into two people after thirteen months.
    writeCookie(ANONYMOUS_COOKIE, existing, ANONYMOUS_MAX_AGE_SECONDS, domain)
    return existing
  }

  const created = newId()
  writeCookie(ANONYMOUS_COOKIE, created, ANONYMOUS_MAX_AGE_SECONDS, domain)
  return created
}

interface SessionCookie {
  id: string
  /** The campaign that started it, so a new campaign can start a new session. */
  campaign: string
}

function serializeSession(session: SessionCookie): string {
  return `${session.id}~${session.campaign}`
}

function parseSession(raw: string | null): SessionCookie | null {
  if (!raw) return null
  const separator = raw.indexOf('~')
  const id = separator === -1 ? raw : raw.slice(0, separator)
  if (id.length < 8) return null
  return { id, campaign: separator === -1 ? '' : raw.slice(separator + 1) }
}

/**
 * Resolve the current session, starting a new one when the visitor has been
 * idle past the timeout *or* has arrived on a different campaign.
 *
 * The campaign rule matters: without it a visitor who clicks an ad an hour
 * after browsing organically keeps the organic session, and the ad that paid
 * for the visit never gets credited (§28).
 */
export function readOrCreateSessionId(campaign: string, timeoutMinutes: number, domain?: string): string {
  const existing = parseSession(readCookie(SESSION_COOKIE))
  const isSameJourney = existing !== null && (campaign === '' || campaign === existing.campaign)

  const session: SessionCookie = isSameJourney
    ? { id: existing.id, campaign: existing.campaign }
    : { id: newId(), campaign }

  // Written on every event, which is what makes the timeout a sliding one.
  writeCookie(SESSION_COOKIE, serializeSession(session), timeoutMinutes * 60, domain)
  return session.id
}
