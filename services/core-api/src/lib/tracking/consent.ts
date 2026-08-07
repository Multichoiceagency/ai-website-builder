import type { Consent, TrackingConsentCategory } from '@platform/schemas'

/**
 * The consent engine (§27).
 *
 * The rule this file exists to enforce: **server-side collection respects
 * consent exactly like client-side collection.** Moving a hit from the browser
 * to our server changes who makes the request, not what the visitor agreed to.
 * Without this, "server-side tracking" quietly becomes "consent bypass".
 */

export interface ConsentDecision {
  allowed: boolean
  /** Null when allowed; otherwise the sentence the delivery ledger records. */
  reason: string | null
}

/**
 * Note on `personalization`: it is carried on every event and stored with it,
 * but it gates *personalization* features (audiences, recommendations, on-site
 * variation), not delivery to a measurement destination. Nothing here reads it,
 * deliberately — a destination that needed it would declare a category for it.
 */
export function decideConsent(category: TrackingConsentCategory, consent: Consent): ConsentDecision {
  if (category === 'none') return { allowed: true, reason: null }

  if (category === 'analytics') {
    return consent.analytics
      ? { allowed: true, reason: null }
      : { allowed: false, reason: 'Visitor did not grant analytics consent.' }
  }

  return consent.marketing
    ? { allowed: true, reason: null }
    : { allowed: false, reason: 'Visitor did not grant marketing consent.' }
}
