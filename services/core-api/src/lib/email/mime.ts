/**
 * RFC 5322 / 2045 message construction.
 *
 * Kept separate from the transport so the wire format is testable without a
 * socket, and so a second transport does not re-derive it.
 */
import type { OutgoingEmail } from './provider.js'

const CRLF = '\r\n'
/** Printable US-ASCII. Anything outside it has to be encoded in a header. */
const ASCII_ONLY = /^[\x20-\x7e]*$/

/** RFC 2047 encoded-word. Needed for any header with a non-ASCII character. */
export function encodeHeaderValue(value: string): string {
  const collapsed = value.replace(/[\r\n]+/g, ' ').trim()
  if (ASCII_ONLY.test(collapsed)) return collapsed
  return `=?UTF-8?B?${Buffer.from(collapsed, 'utf8').toString('base64')}?=`
}

export function formatAddress(email: string, name?: string): string {
  if (!name?.trim()) return email
  return `${encodeHeaderValue(name)} <${email}>`
}

/** Base64 wrapped at 76 characters, as the MIME grammar requires. */
function base64Body(value: string): string {
  const encoded = Buffer.from(value, 'utf8').toString('base64')
  return (encoded.match(/.{1,76}/g) ?? []).join(CRLF)
}

/**
 * A `multipart/alternative` message: plain text first, HTML second. Clients
 * pick the last part they can render, and every client can render the first —
 * so a text body is not a nicety, it is the fallback that always works.
 */
export function buildMimeMessage(message: OutgoingEmail, hostname: string): string {
  const boundary = `_part_${message.messageKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}_${Date.now().toString(36)}`

  const headers = [
    `From: ${formatAddress(message.from, message.fromName)}`,
    `To: ${formatAddress(message.to, message.toName)}`,
    `Subject: ${encodeHeaderValue(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${message.messageKey}@${hostname}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  if (message.replyTo) headers.push(`Reply-To: ${message.replyTo}`)

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Body(message.text || stripHtml(message.html)),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Body(message.html || `<p>${escapeHtml(message.text)}</p>`),
    '',
    `--${boundary}--`,
    '',
  ].join(CRLF)
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** A readable plain-text fallback when the author only wrote HTML. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
