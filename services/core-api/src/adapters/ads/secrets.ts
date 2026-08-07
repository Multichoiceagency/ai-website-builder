import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '../../config/env.js'

/**
 * Encryption for third-party OAuth credentials at rest (ADR-0009).
 *
 * Ad-network tokens can spend money. They are stored encrypted, decrypted only
 * inside the adapter layer, and never serialized into an API response — the
 * dashboard sees a connection's *name*, never its token.
 *
 * ## Where the key comes from
 *
 * Derived from `SESSION_SECRET` with HKDF and a purpose-specific `info` string,
 * so the ads key is cryptographically independent of the session key even
 * though both descend from one configured secret. This avoids adding a new
 * required environment variable to every existing deployment.
 *
 * When credential-key rotation becomes a requirement — it will, the first time
 * an operator leaves — replace `deriveKey()` with a dedicated
 * `ADS_CREDENTIAL_KEY` and version the prefix below. The format already carries
 * a version tag so old ciphertexts stay readable through the change.
 */

const VERSION = 'v1'
const KEY_INFO = 'platform:ads:credentials:v1'
const KEY_SALT = 'platform:ads'
const IV_BYTES = 12
const TAG_BYTES = 16

function deriveKey(): Buffer {
  return Buffer.from(hkdfSync('sha256', Buffer.from(env.SESSION_SECRET, 'utf8'), Buffer.from(KEY_SALT, 'utf8'), Buffer.from(KEY_INFO, 'utf8'), 32))
}

/** `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

/**
 * Returns null for anything that does not decrypt cleanly rather than throwing.
 *
 * A credential that cannot be read is operationally identical to a credential
 * that is not there: the connection is unusable and the user has to reconnect.
 * Crashing a list endpoint over one corrupt row would hide that from them.
 */
export function decryptSecret(encoded: string | null): string | null {
  if (!encoded) return null

  const parts = encoded.split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) return null

  try {
    const iv = Buffer.from(parts[1]!, 'base64url')
    const tag = Buffer.from(parts[2]!, 'base64url')
    const ciphertext = Buffer.from(parts[3]!, 'base64url')
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null

    const decipher = createDecipheriv('aes-256-gcm', deriveKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

/**
 * Constant-time comparison for OAuth `state` values.
 *
 * The callback's `state` is attacker-supplied and gates which tenant a
 * connection lands on, so comparing it must not leak a prefix through timing.
 */
export function safeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
