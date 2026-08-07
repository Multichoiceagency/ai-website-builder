import { createHmac, timingSafeEqual } from 'node:crypto'
import { SIGNATURE_TOLERANCE_SECONDS } from '@platform/schemas'

/**
 * HMAC-SHA256 over `${timestamp}.${rawBody}`.
 *
 * Identical to the platform's own implementation on purpose — an app author
 * should never have to re-derive the scheme from a header name, because that is
 * exactly where signature verification goes wrong.
 */

export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`
}

export function currentTimestamp(now: Date = new Date()): string {
  return String(Math.floor(now.getTime() / 1000))
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export interface VerifyWebhookInput {
  /** The secret shown once when the subscription was created. */
  secret: string
  /**
   * The body exactly as received. Not a re-serialised object: JSON round-trips
   * reorder keys and the signature will not match.
   */
  rawBody: string
  signature: string | undefined
  timestamp: string | undefined
  toleranceSeconds?: number
  now?: Date
}

/**
 * Verify an inbound platform webhook.
 *
 * Refuses an unsigned request, a request whose timestamp is outside the
 * tolerance window (which is what makes a captured delivery unreplayable), and
 * a mismatched digest.
 */
export function verifyWebhookSignature(input: VerifyWebhookInput): boolean {
  if (!input.signature || !input.timestamp) return false

  const seconds = Number(input.timestamp)
  if (!Number.isFinite(seconds)) return false

  const tolerance = input.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  if (Math.abs(nowSeconds - seconds) > tolerance) return false

  return equals(signPayload(input.secret, input.timestamp, input.rawBody), input.signature)
}
