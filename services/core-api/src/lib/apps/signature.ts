import { createHmac, timingSafeEqual } from 'node:crypto'
import { SIGNATURE_TOLERANCE_SECONDS } from '@platform/schemas'

/**
 * HMAC-SHA256 request signing, used in both directions:
 *
 *   outbound — the platform signs a webhook so the app can prove it came from us
 *   inbound  — an app signs a gateway write so we can prove it came from them
 *
 * The signed material is `${timestamp}.${rawBody}`, not the body alone. Without
 * the timestamp in the digest, a captured signature stays valid forever and a
 * replay is indistinguishable from the original call.
 */

export type SignatureFailure = 'missing' | 'malformed' | 'stale' | 'mismatch'

export function signaturePayload(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`
}

export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(signaturePayload(timestamp, rawBody)).digest('hex')
  return `sha256=${digest}`
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  // Compare length first: timingSafeEqual throws on a mismatch, and the length
  // of a signature is not a secret.
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export interface VerifyInput {
  secret: string
  timestamp: string | undefined
  signature: string | undefined
  rawBody: string
  toleranceSeconds?: number
  now?: Date
}

export interface VerifyResult {
  ok: boolean
  reason?: SignatureFailure
}

/**
 * Refuses, in order: an unsigned request, a malformed timestamp, a timestamp
 * outside the tolerance window (the replay case), and finally a digest that
 * does not match.
 */
export function verifySignature(input: VerifyInput): VerifyResult {
  if (!input.signature || !input.timestamp) return { ok: false, reason: 'missing' }

  const seconds = Number(input.timestamp)
  if (!Number.isFinite(seconds)) return { ok: false, reason: 'malformed' }

  const tolerance = input.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  if (Math.abs(nowSeconds - seconds) > tolerance) return { ok: false, reason: 'stale' }

  const expected = signPayload(input.secret, input.timestamp, input.rawBody)
  return equals(expected, input.signature) ? { ok: true } : { ok: false, reason: 'mismatch' }
}

export function currentTimestamp(now: Date = new Date()): string {
  return String(Math.floor(now.getTime() / 1000))
}
