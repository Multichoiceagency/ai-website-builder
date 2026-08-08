import { env } from '../../config/env.js'
import {
  createPkcePair,
  exchangeCodeForRedirect,
  fetchAccount,
  GOOGLE_SCOPES,
  googleConfigurationProblem,
  isGoogleConfigured,
  type GoogleAccount,
  type GoogleTokens,
} from '../integrations/google.js'

/**
 * Sign-In / Sign-Up with Google for the dashboard.
 *
 * Requests the same workspace Google scopes as the Integration Gateway
 * (Business Profile, Search Console, Analytics, Ads, Gmail send) so a new
 * account can land already connected — one consent, not a second “Connect
 * Google” step. Google shows each permission on its consent screen.
 *
 * Uses GOOGLE_AUTH_REDIRECT_URI (separate from the integrations callback).
 */

/** Identity + every workspace Google API the product needs on day one. */
export const GOOGLE_AUTH_SCOPES = GOOGLE_SCOPES

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

export function googleAuthRedirectUri(): string {
  return (
    env.GOOGLE_AUTH_REDIRECT_URI
    || `${new URL(env.GOOGLE_OAUTH_REDIRECT_URI).origin}/api/v1/auth/google/callback`
  )
}

export function isGoogleAuthConfigured(): boolean {
  return isGoogleConfigured()
}

export function googleAuthConfigurationProblem(): string | null {
  return googleConfigurationProblem()
}

export function buildGoogleAuthAuthorizeUrl(input: {
  state: string
  challenge: string
  /** Register forces consent so we reliably receive a refresh token. */
  mode?: 'login' | 'register'
}): string {
  const url = new URL(AUTH_ENDPOINT)
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', googleAuthRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_AUTH_SCOPES.join(' '))
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  // Offline + consent: we store the grant as the workspace Google connection.
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', input.mode === 'login' ? 'select_account consent' : 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  return url.toString()
}

export { createPkcePair, fetchAccount, GOOGLE_SCOPES }
export type { GoogleAccount, GoogleTokens }

export async function exchangeGoogleAuthCode(
  code: string,
  codeVerifier: string,
): Promise<GoogleTokens> {
  return exchangeCodeForRedirect(code, codeVerifier, googleAuthRedirectUri())
}
