import { createHash, randomBytes } from 'node:crypto'

/**
 * App credentials.
 *
 * The key follows `sessions.token_hash` exactly: we store SHA-256 and nothing
 * else, so a dump of `app_api_keys` yields no usable credential and the plain
 * value exists only in the single response that created it.
 *
 * The signing secret cannot follow that rule — verifying an HMAC requires the
 * secret itself — so it is stored recoverably and is reachable only through the
 * `resolve_app_api_key` SECURITY DEFINER function.
 */

export const APP_KEY_PREFIX = 'pak'

export interface GeneratedAppKey {
  /** Shown once. Never stored. */
  key: string
  keyHash: string
  /** Enough to identify a credential in a list, never enough to use it. */
  keyPrefix: string
  lastFour: string
  signingSecret: string
}

export function hashAppApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateAppApiKey(): GeneratedAppKey {
  const secretPart = randomBytes(24).toString('base64url')
  const key = `${APP_KEY_PREFIX}_${secretPart}`

  return {
    key,
    keyHash: hashAppApiKey(key),
    keyPrefix: key.slice(0, APP_KEY_PREFIX.length + 7),
    lastFour: key.slice(-4),
    signingSecret: randomBytes(32).toString('base64url'),
  }
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`
}

/** Safe to log and safe to show: identifies the credential, cannot be used. */
export function keyPrefixOf(key: string): string {
  return key.slice(0, APP_KEY_PREFIX.length + 7)
}
