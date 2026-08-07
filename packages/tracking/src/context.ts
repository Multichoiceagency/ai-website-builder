import { readCookie, writeCookie } from './storage.js'
import type { TrackingClickIds, TrackingContext, TrackingUtm } from './types.js'

/**
 * Campaign capture.
 *
 * UTMs and click ids appear on the landing URL and are gone by the second
 * page. They are therefore captured once and stored for the rest of the visit —
 * otherwise every conversion on a multi-page journey looks direct, which is
 * the single most common way attribution quietly breaks.
 */

const TOUCH_COOKIE = '_pl_touch'
/** Long enough to outlive the visit, short enough not to be a profile. */
const TOUCH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid'] as const

interface StoredTouch {
  utm: TrackingUtm
  clickIds: TrackingClickIds
}

function readParams(): StoredTouch {
  const utm: TrackingUtm = {}
  const clickIds: TrackingClickIds = {}

  if (typeof location === 'undefined') return { utm, clickIds }

  const params = new URLSearchParams(location.search)
  const assign = (key: keyof TrackingUtm) => {
    const value = params.get(`utm_${key}`)
    if (value) utm[key] = value.slice(0, 200)
  }

  assign('source')
  assign('medium')
  assign('campaign')
  assign('term')
  assign('content')

  for (const key of CLICK_ID_KEYS) {
    const value = params.get(key)
    if (value) clickIds[key] = value.slice(0, 200)
  }

  return { utm, clickIds }
}

function readStored(): StoredTouch {
  const raw = readCookie(TOUCH_COOKIE)
  if (!raw) return { utm: {}, clickIds: {} }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTouch>
    return { utm: parsed.utm ?? {}, clickIds: parsed.clickIds ?? {} }
  } catch {
    return { utm: {}, clickIds: {} }
  }
}

function hasAnything(touch: StoredTouch): boolean {
  return Object.keys(touch.utm).length > 0 || Object.keys(touch.clickIds).length > 0
}

/**
 * The touch for this visit: what is on the URL now, or what was on it when the
 * visit started. A fresh campaign always replaces a stored one — the newest
 * click is the one the visitor actually acted on.
 */
export function resolveTouch(domain?: string): StoredTouch {
  const fromUrl = readParams()

  if (hasAnything(fromUrl)) {
    writeCookie(TOUCH_COOKIE, JSON.stringify(fromUrl), TOUCH_MAX_AGE_SECONDS, domain)
    return fromUrl
  }

  return readStored()
}

/** The campaign key sessions are split on. Click ids count: they are a paid visit. */
export function campaignKey(touch: StoredTouch): string {
  const clickId = CLICK_ID_KEYS.map((key) => touch.clickIds[key]).find(Boolean)
  return touch.utm.campaign ?? touch.utm.source ?? clickId ?? ''
}

export function buildContext(touch: StoredTouch): TrackingContext {
  const context: TrackingContext = {
    url: typeof location === 'undefined' ? '' : location.href.slice(0, 2048),
  }

  if (typeof document !== 'undefined' && document.referrer) {
    context.referrer = document.referrer.slice(0, 2048)
  }
  if (typeof navigator !== 'undefined') {
    context.userAgent = navigator.userAgent.slice(0, 1024)
    context.locale = navigator.language.slice(0, 16)
  }
  if (Object.keys(touch.utm).length) context.utm = touch.utm
  if (Object.keys(touch.clickIds).length) context.clickIds = touch.clickIds

  return context
}
