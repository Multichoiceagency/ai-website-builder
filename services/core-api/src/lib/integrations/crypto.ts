import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { env } from '../../config/env.js'

/**
 * Encryption for third-party tokens at rest (§18, §60).
 *
 * AES-256-GCM: authenticated, so a tampered ciphertext fails to decrypt rather
 * than yielding attacker-chosen plaintext. The key is derived from
 * `SESSION_SECRET` — which means rotating that secret invalidates stored
 * tokens and forces a reconnect. That is the correct trade: a leaked secret
 * should cost reconnections, not remain useful to whoever leaked it.
 *
 * Format: `v1.<iv>.<authTag>.<ciphertext>`, all base64url.
 */

const VERSION = 'v1'
const IV_LENGTH = 12 // GCM standard
const KEY_LENGTH = 32

// Derived once. A fixed salt is acceptable here because the input is already a
// high-entropy secret, not a password.
const key = scryptSync(env.SESSION_SECRET, 'platform.integration-tokens', KEY_LENGTH)

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [VERSION, iv.toString('base64url'), authTag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

/**
 * Returns null rather than throwing on a malformed or tampered value, so a
 * corrupt row surfaces as "reconnect this integration" instead of a 500.
 */
export function decryptToken(encoded: string | null): string | null {
  if (!encoded) return null

  const parts = encoded.split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) return null

  try {
    const iv = Buffer.from(parts[1]!, 'base64url')
    const authTag = Buffer.from(parts[2]!, 'base64url')
    const ciphertext = Buffer.from(parts[3]!, 'base64url')

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
