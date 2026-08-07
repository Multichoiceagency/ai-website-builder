/**
 * Lead scoring.
 *
 * Deterministic and explainable on purpose. A salesperson who asks "why is
 * this a 70?" gets a list of reasons, not "the model said so" — and the same
 * submission always produces the same number, which is what makes the score
 * safe to sort a work queue by.
 */
import type { CrmAttribution } from '@platform/schemas'

export interface ScoredLead {
  score: number
  reasons: string[]
}

export interface ScoreInput {
  email?: string
  phone?: string
  message?: string
  companyName?: string
  attribution?: Partial<CrmAttribution>
}

/** Addresses that signal "I do not want to be contacted here". */
const DISPOSABLE_DOMAINS = ['mailinator.com', 'yopmail.com', 'guerrillamail.com', 'trashmail.com']

export function scoreLead(input: ScoreInput): ScoredLead {
  const reasons: string[] = []
  let score = 10

  const email = input.email?.trim().toLowerCase() ?? ''
  if (email) {
    score += 25
    reasons.push('e-mail address supplied')

    const domain = email.split('@')[1] ?? ''
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      score -= 25
      reasons.push('disposable e-mail domain')
    }
  }

  if (input.phone?.trim()) {
    score += 20
    reasons.push('phone number supplied')
  }

  if (input.companyName?.trim()) {
    score += 15
    reasons.push('company named')
  }

  const message = input.message?.trim() ?? ''
  if (message.length >= 120) {
    score += 20
    reasons.push('detailed message')
  } else if (message.length >= 20) {
    score += 10
    reasons.push('message written')
  }

  // Paid traffic that converted on the first visit is the strongest intent
  // signal a form submission carries.
  const attribution = input.attribution ?? {}
  if (attribution.gclid || attribution.fbclid) {
    score += 10
    reasons.push('arrived from a paid click')
  } else if (attribution.medium === 'organic') {
    score += 5
    reasons.push('arrived from organic search')
  }

  return { score: Math.max(0, Math.min(100, score)), reasons }
}
