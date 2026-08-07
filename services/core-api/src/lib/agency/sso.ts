/**
 * SSO and SCIM plumbing.
 *
 * No identity provider is reachable from this environment, and this file does
 * not pretend otherwise. It validates and stores configuration, and it reports
 * `configured: false` until the shape is complete. There is deliberately no
 * code path that mints a session from an unverified assertion — a fake login is
 * worse than a missing one, because it looks like it works.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { ScimUserInput, UpsertSsoConfigInput } from '@platform/schemas'
import { BadRequestError } from '../errors.js'

/** The non-secret half of the configuration, ready for the `config` column. */
export function ssoConfigColumn(input: UpsertSsoConfigInput): Record<string, unknown> {
  return input.protocol === 'saml'
    ? { ...input.saml }
    : { ...input.oidc }
}

const SCIM_TOKEN_BYTES = 32

export interface GeneratedScimToken {
  /** Returned to the caller exactly once, then unrecoverable. */
  token: string
  hash: string
  lastFour: string
}

/**
 * Mint a provisioning token. Only the SHA-256 is stored, exactly as sessions
 * do — reading `scim_tokens` yields nothing that can provision a user.
 */
export function generateScimToken(): GeneratedScimToken {
  const token = `scim_${randomBytes(SCIM_TOKEN_BYTES).toString('base64url')}`
  return { token, hash: hashScimToken(token), lastFour: token.slice(-4) }
}

export function hashScimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare, for the rare places a hash is checked in process. */
export function scimTokenMatches(candidateHash: string, storedHash: string): boolean {
  const a = Buffer.from(candidateHash, 'utf8')
  const b = Buffer.from(storedHash, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const [scheme, value] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !value) return null
  return value.trim() || null
}

/** The primary e-mail SCIM sends, or the first one if none is flagged. */
export function primaryEmail(input: ScimUserInput): string {
  const primary = input.emails.find((entry) => entry.primary) ?? input.emails[0]
  if (!primary) throw new BadRequestError('A SCIM user must carry at least one e-mail address.')
  return primary.value
}

export function displayNameFor(input: ScimUserInput): string | null {
  if (input.displayName) return input.displayName
  const parts = [input.name?.givenName, input.name?.familyName].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}
