import { createHash, randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import type { IntegrationProvider } from './types.js'

/**
 * Google OAuth 2.0 (§16, §17, §18).
 *
 * Authorization-code flow with PKCE. `access_type=offline` + `prompt=consent`
 * are both required to receive a refresh token.
 *
 * One workspace Google connection asks for every product permission we need:
 * Business Profile, Search Console, Analytics, Ads, and Gmail send for campaigns.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

/**
 * Human-readable consent catalogue. Keep this as the single source of truth for
 * authorize URLs, Settings copy, and signup-with-Google.
 */
export const GOOGLE_SCOPE_CATALOG = [
  {
    scope: 'openid',
    label: 'Sign in',
    purpose: 'Verify your Google account.',
  },
  {
    scope: 'email',
    label: 'E-mail address',
    purpose: 'Read your Google account e-mail for workspace identity.',
  },
  {
    scope: 'profile',
    label: 'Profile',
    purpose: 'Read your name for the workspace profile.',
  },
  {
    scope: 'https://www.googleapis.com/auth/business.manage',
    label: 'Google Business Profile',
    purpose: 'Manage listings, posts, hours, photos and review replies.',
  },
  {
    scope: 'https://www.googleapis.com/auth/webmasters',
    label: 'Search Console',
    purpose: 'Read performance and manage property access for SEO.',
  },
  {
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    label: 'Google Analytics',
    purpose: 'Read GA4 traffic and conversion reports.',
  },
  {
    scope: 'https://www.googleapis.com/auth/adwords',
    label: 'Google Ads',
    purpose: 'Manage and report on Google Ads campaigns.',
  },
  {
    scope: 'https://www.googleapis.com/auth/gmail.send',
    label: 'Gmail (send)',
    purpose: 'Send marketing and transactional e-mail from your Gmail account.',
  },
] as const

export const GOOGLE_SCOPES = GOOGLE_SCOPE_CATALOG.map((entry) => entry.scope)

export interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
}

export interface GoogleAccount {
  id: string
  email: string
  name: string
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

/**
 * Why the integration cannot be used, in words a user can act on. Returns null
 * when it is usable.
 */
export function googleConfigurationProblem(): string | null {
  if (!env.GOOGLE_CLIENT_ID) return 'GOOGLE_CLIENT_ID is not set.'
  if (!env.GOOGLE_CLIENT_SECRET) return 'GOOGLE_CLIENT_SECRET is not set.'

  if (!env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    return 'GOOGLE_CLIENT_ID does not look like an OAuth client ID — it should end in .apps.googleusercontent.com.'
  }

  if (env.GOOGLE_CLIENT_SECRET.startsWith('AIza')) {
    return 'GOOGLE_CLIENT_SECRET looks like an API key (it starts with "AIza"), not an OAuth client secret. Create Credentials → OAuth client ID → Web application; its secret starts with "GOCSPX-".'
  }

  return null
}

/** Catalog entry for the Integration Gateway. Meta and others join later. */
export const GoogleIntegrationProvider: IntegrationProvider = {
  id: 'google',
  name: 'Google',
  isConfigured: isGoogleConfigured,
  configurationProblem: googleConfigurationProblem,
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthorizeUrl(input: { state: string; challenge: string }): string {
  const url = new URL(AUTH_ENDPOINT)
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', env.GOOGLE_OAUTH_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '))
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  return url.toString()
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

async function postToken(body: Record<string, string>): Promise<GoogleTokens> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })

  const payload = (await response.json()) as TokenResponse
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Token exchange failed (${response.status}).`)
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null,
    scopes: payload.scope ? payload.scope.split(/\s+/).filter(Boolean) : [...GOOGLE_SCOPES],
  }
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string = env.GOOGLE_OAUTH_REDIRECT_URI,
): Promise<GoogleTokens> {
  return postToken({
    code,
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  })
}

/** Alias used by Sign-In with Google (different redirect URI than integrations). */
export async function exchangeCodeForRedirect(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  return exchangeCode(code, codeVerifier, redirectUri)
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const tokens = await postToken({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  })
  return { ...tokens, refreshToken }
}

export async function fetchAccount(accessToken: string): Promise<GoogleAccount> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`Could not read the Google account (${response.status}).`)

  const payload = (await response.json()) as { sub: string; email?: string; name?: string }
  return { id: payload.sub, email: payload.email ?? '', name: payload.name ?? payload.email ?? '' }
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Business Profile
// ---------------------------------------------------------------------------

export interface GoogleBusinessLocation {
  name: string
  title: string
  storefrontAddress?: {
    addressLines?: string[]
    locality?: string
    postalCode?: string
    administrativeArea?: string
    regionCode?: string
  }
  phoneNumbers?: { primaryPhone?: string }
  websiteUri?: string
  categories?: { primaryCategory?: { displayName?: string } }
  regularHours?: {
    periods?: {
      openDay?: string
      openTime?: { hours?: number; minutes?: number }
      closeDay?: string
      closeTime?: { hours?: number; minutes?: number }
    }[]
  }
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Google API ${response.status}: ${detail.slice(0, 300)}`)
  }
  return (await response.json()) as T
}

export async function listBusinessAccounts(accessToken: string): Promise<{ name: string; accountName: string }[]> {
  const data = await getJson<{ accounts?: { name: string; accountName?: string }[] }>(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    accessToken,
  )
  return (data.accounts ?? []).map((account) => ({
    name: account.name,
    accountName: account.accountName ?? account.name,
  }))
}

export async function listBusinessLocations(
  accessToken: string,
  accountName: string,
): Promise<GoogleBusinessLocation[]> {
  const fields = 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,regularHours'
  const data = await getJson<{ locations?: GoogleBusinessLocation[] }>(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=${fields}&pageSize=100`,
    accessToken,
  )
  return data.locations ?? []
}

export function connectionHasScope(granted: string[] | null | undefined, needed: string): boolean {
  if (!granted?.length) return false
  if (granted.includes(needed)) return true
  // Broad webmasters implies readonly.
  if (needed.endsWith('.readonly')) {
    const full = needed.replace(/\.readonly$/, '')
    return granted.includes(full)
  }
  return false
}
