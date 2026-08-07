import { googleBusinessStatusSchema, type GoogleBusinessStatus } from '@platform/schemas'
import { env } from '../../config/env.js'
import { googleConfigurationProblem } from '../../lib/integrations/google.js'
import type { AdsConnection } from './types.js'

/**
 * Google Business Profile (§19).
 *
 * Not an ad network, so it does not implement `AdsProvider` — but it lives in
 * the same adapter directory because it shares Google's OAuth client and
 * because local ads read their location data from it. The rest of the platform
 * only ever sees `GoogleBusinessStatus`.
 *
 * Connecting Business Profile is a *separate consent* from signing in with
 * Google and from connecting Google Ads (ADR-0009). Reading a company's
 * listings, replying to its reviews and spending its ad budget are three
 * different permissions, and the user grants them one at a time.
 *
 * Tokens live in `integration_connections` (provider `google`) via the
 * Integration Gateway — not in `ads_connections`.
 */

/**
 * Business Profile is not one API. Each of these must be enabled on the Google
 * Cloud project *and* has its own quota; a missing one fails at call time with
 * a permission error that looks nothing like "you forgot to enable an API",
 * which is why the list is spelled out for the operator rather than summarized.
 */
export const GOOGLE_BUSINESS_REQUIRED_APIS = [
  'My Business Account Management API (mybusinessaccountmanagement.googleapis.com)',
  'My Business Business Information API (mybusinessbusinessinformation.googleapis.com)',
  'My Business Verifications API (mybusinessverifications.googleapis.com)',
  'Business Profile Performance API (businessprofileperformance.googleapis.com)',
  'My Business Q&A API (mybusinessqanda.googleapis.com)',
  'Google My Business API (mybusiness.googleapis.com) — reviews and posts',
]

/**
 * One coarse scope covers all of Business Profile; Google offers nothing
 * narrower, so connecting it grants read *and* write over listings, posts and
 * review replies. That is worth saying out loud in the UI rather than burying.
 */
export const GOOGLE_BUSINESS_SCOPES = ['https://www.googleapis.com/auth/business.manage']

/**
 * Access to the Business Profile APIs is not self-service: Google gates it
 * behind an application per Cloud project, reviewed manually.
 */
export const GOOGLE_BUSINESS_ACCESS_NOTE =
  'Google reviews every project that requests Business Profile API access. Approval is manual and takes days, not minutes.'

export function missingGoogleBusinessConfiguration(): string[] {
  const missing: string[] = []
  if (!env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID')
  if (!env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET')
  return missing
}

/**
 * The honest connection state.
 *
 * `locations` stays empty unless a real connection returned real listings. A
 * placeholder location on this screen would be indistinguishable from a
 * customer's actual shop, which is the sort of thing that ends up in a printed
 * report.
 */
export function googleBusinessStatus(
  connection: AdsConnection | null,
  locations: GoogleBusinessStatus['locations'] = [],
): GoogleBusinessStatus {
  const missing = missingGoogleBusinessConfiguration()
  const problem = googleConfigurationProblem()
  const configured = problem === null
  // The Integration Gateway always requests `business.manage` with the Google
  // connector, so a stored `google` connection is a Business Profile grant.
  const connected = configured && connection !== null

  const reason = problem
    ? [problem, GOOGLE_BUSINESS_ACCESS_NOTE].join(' ').slice(0, 300)
    : !connected
      ? 'No Google Business Profile is connected to this workspace yet.'
      : null

  return googleBusinessStatusSchema.parse({
    configured,
    connected,
    available: configured && connected,
    reason,
    missingConfiguration: missing,
    requiredApis: GOOGLE_BUSINESS_REQUIRED_APIS,
    requiredScopes: GOOGLE_BUSINESS_SCOPES,
    locations: connected ? locations : [],
  })
}
