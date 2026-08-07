/**
 * The wire shape this SDK sends.
 *
 * The authority is `trackingEventSchema` in `@platform/schemas`, which the
 * gateway validates every batch against. These are *structural mirrors* of it,
 * declared locally on purpose: this file ships to the browser inside a
 * customer's website, and a tracking script that drags a validation library
 * onto every page costs more than it is worth. The server validating is what
 * makes that safe — the SDK is the untrusted end of the boundary, not the
 * enforcing one (ADR-0002).
 *
 * If the schema changes, this file changes with it; the compile-time link is a
 * comment, so the tests in `services/core-api/test/tracking.test.ts` post a
 * literal SDK-shaped payload to keep the two honest.
 */

export interface TrackingConsent {
  analytics: boolean
  marketing: boolean
  personalization: boolean
}

export interface TrackingUtm {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export interface TrackingClickIds {
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  ttclid?: string
  msclkid?: string
}

export interface TrackingContext {
  url: string
  referrer?: string
  userAgent?: string
  locale?: string
  utm?: TrackingUtm
  clickIds?: TrackingClickIds
}

export interface TrackingEventPayload {
  eventId: string
  name: string
  occurredAt: string
  siteId: string
  sessionId: string
  anonymousId: string
  userId: string | null
  consent: TrackingConsent
  context: TrackingContext
  value?: number
  currency?: string
  properties: Record<string, unknown>
}

/** What `track()` accepts on top of the caller's own properties. */
export interface TrackOptions {
  value?: number
  currency?: string
  /** Reuse an id the caller already generated, so a server twin can dedupe against it. */
  eventId?: string
}

export interface TrackerConfig {
  /** The site these events belong to. */
  siteId: string
  /** Required: the collector reads it from the query string because a beacon cannot set headers. */
  tenantId: string
  /** Defaults to the first-party path on the current origin. */
  endpoint?: string
  /** Send a `page_view` on load and on every history navigation. Default true. */
  autoPageView?: boolean
  /** Consent known at construction. Anything unknown counts as not granted. */
  consent?: Partial<TrackingConsent>
  /**
   * What must be granted before anything is sent. `analytics` is the default
   * and the honest one; `none` is for installations with a lawful basis that
   * does not rest on consent, and is the caller's decision to defend.
   */
  requireConsent?: 'analytics' | 'none'
  /** Flush once this many events are queued. Default 10. */
  batchSize?: number
  /** Flush at least this often while the page is open. Default 5000ms. */
  flushIntervalMs?: number
  /** Minutes of inactivity that end a session. Default 30. */
  sessionTimeoutMinutes?: number
  /** Cookie domain, for tracking across subdomains. Defaults to the current host. */
  cookieDomain?: string
  /** Log what would be sent instead of guessing from the network tab. */
  debug?: boolean
}
