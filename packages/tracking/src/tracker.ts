import { buildContext, campaignKey, resolveTouch } from './context.js'
import { newId, readOrCreateAnonymousId, readOrCreateSessionId } from './storage.js'
import { send } from './transport.js'
import type { TrackerConfig, TrackingConsent, TrackingEventPayload, TrackOptions } from './types.js'

const DEFAULT_ENDPOINT = '/api/v1/tracking/collect'
const DEFAULT_BATCH_SIZE = 10
const DEFAULT_FLUSH_INTERVAL_MS = 5000
const DEFAULT_SESSION_TIMEOUT_MINUTES = 30

const NO_CONSENT: TrackingConsent = { analytics: false, marketing: false, personalization: false }

/**
 * The browser tracker (§23).
 *
 * Three behaviours are worth knowing about before reading the code:
 *
 * - **Consent gates sending, not collecting.** Events raised before the
 *   visitor has answered the banner are held in memory and released by
 *   `setConsent`, or dropped if the answer is no. Dropping them at the call
 *   site instead would lose the page view that happened while the banner was
 *   still on screen — the one every funnel starts with.
 * - **Nothing is persisted before consent.** The held events live in a plain
 *   array; no cookie is written until there is something to write it for.
 * - **The event id is generated here.** It travels to every destination, so a
 *   server-side twin of this hit carrying the same id is counted once (§25).
 */
export class Tracker {
  readonly #config: Required<Pick<TrackerConfig, 'siteId' | 'tenantId'>> & TrackerConfig
  readonly #url: string
  #consent: TrackingConsent
  #queue: TrackingEventPayload[] = []
  /** Raised before consent was known. Released or discarded by `setConsent`. */
  #held: TrackingEventPayload[] = []
  #userId: string | null = null
  #timer: ReturnType<typeof setInterval> | null = null
  #started = false

  constructor(config: TrackerConfig) {
    this.#config = config
    this.#consent = { ...NO_CONSENT, ...config.consent }

    const endpoint = config.endpoint ?? DEFAULT_ENDPOINT
    const separator = endpoint.includes('?') ? '&' : '?'
    // `requireTenant` accepts the tenant from a header or the query string; a
    // beacon can only do the latter, so the SDK always uses the query string.
    this.#url = `${endpoint}${separator}tenantId=${encodeURIComponent(config.tenantId)}`
  }

  /** Attach lifecycle listeners and, unless told otherwise, send the first page view. */
  start(): void {
    if (this.#started || typeof window === 'undefined') return
    this.#started = true

    this.#timer = setInterval(() => void this.flush(), this.#config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS)

    // `visibilitychange` fires reliably on mobile where `beforeunload` does not.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush(true)
    })
    window.addEventListener('pagehide', () => void this.flush(true))

    if (this.#config.autoPageView !== false) {
      this.page()
      this.#watchHistory()
    }
  }

  /** Identify the person behind the cookie. Used for cross-device matching. */
  identify(userId: string | null): void {
    this.#userId = userId
  }

  /**
   * Update consent, then act on it: release what was held if the visitor said
   * yes, discard it if they said no. Discarding is not optional politeness —
   * an event held from before a refusal may not be sent afterwards (§27).
   */
  setConsent(consent: Partial<TrackingConsent>): void {
    this.#consent = { ...this.#consent, ...consent }

    const held = this.#held
    this.#held = []

    if (!this.#mayCollect()) return

    for (const event of held) {
      // The consent that ships is the consent as it is now, not as it was when
      // the event was raised.
      this.#queue.push({ ...event, consent: { ...this.#consent } })
    }
    void this.#maybeFlush()
  }

  consent(): TrackingConsent {
    return { ...this.#consent }
  }

  track(name: string, properties: Record<string, unknown> = {}, options: TrackOptions = {}): string {
    const touch = resolveTouch(this.#config.cookieDomain)

    const event: TrackingEventPayload = {
      eventId: options.eventId ?? newId(),
      name,
      occurredAt: new Date().toISOString(),
      siteId: this.#config.siteId,
      sessionId: readOrCreateSessionId(
        campaignKey(touch),
        this.#config.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES,
        this.#config.cookieDomain,
      ),
      anonymousId: readOrCreateAnonymousId(this.#config.cookieDomain),
      userId: this.#userId,
      consent: { ...this.#consent },
      context: buildContext(touch),
      properties,
    }

    if (options.value !== undefined) event.value = options.value
    if (options.currency) event.currency = options.currency

    if (this.#config.debug) console.info('[tracking]', name, event)

    if (this.#mayCollect()) this.#queue.push(event)
    else this.#held.push(event)

    void this.#maybeFlush()
    return event.eventId
  }

  page(properties: Record<string, unknown> = {}): string {
    return this.track('page_view', {
      title: typeof document === 'undefined' ? '' : document.title,
      path: typeof location === 'undefined' ? '' : location.pathname,
      ...properties,
    })
  }

  /**
   * Send whatever is queued.
   *
   * A failed batch is dropped rather than retried: the alternative is a queue
   * that grows on a broken endpoint and a browser that retries a conversion
   * forever. Delivery is reported server-side (§26), which is where a gap is
   * visible and actionable.
   */
  async flush(unloading = false): Promise<void> {
    if (!this.#queue.length) return

    const batch = this.#queue
    this.#queue = []

    const result = await send(this.#url, batch, unloading)
    if (this.#config.debug) console.info('[tracking] flushed', batch.length, result)
  }

  /** Detach listeners and timers. Called by framework integrations on teardown. */
  stop(): void {
    if (this.#timer !== null) clearInterval(this.#timer)
    this.#timer = null
    this.#started = false
  }

  #mayCollect(): boolean {
    if (this.#config.requireConsent === 'none') return true
    return this.#consent.analytics
  }

  async #maybeFlush(): Promise<void> {
    if (this.#queue.length >= (this.#config.batchSize ?? DEFAULT_BATCH_SIZE)) await this.flush()
  }

  /**
   * A single-page app changes the URL without a load event, so `pushState` and
   * `replaceState` are wrapped. Without this, an SPA reports exactly one page
   * view per visit.
   */
  #watchHistory(): void {
    const emit = () => {
      // After the router has painted, so `document.title` is the new page's.
      setTimeout(() => this.page(), 0)
    }

    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method]
      history[method] = function patched(this: History, ...args: Parameters<History['pushState']>) {
        const result = original.apply(this, args)
        emit()
        return result
      }
    }

    window.addEventListener('popstate', emit)
  }
}
