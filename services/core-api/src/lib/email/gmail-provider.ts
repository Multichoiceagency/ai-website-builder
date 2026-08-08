/**
 * Gmail API transport for campaign / transactional mail (ADR-0006).
 *
 * Uses the workspace Google OAuth token (`gmail.send`). Prefer this over SMTP
 * when the tenant has connected Google with that scope.
 */
import { EmailDeliveryError, type EmailProvider, type EmailSendResult, type OutgoingEmail } from './provider.js'

function encodeRfc2822(message: OutgoingEmail): string {
  const from = message.fromName
    ? `"${message.fromName.replace(/"/g, '')}" <${message.from}>`
    : message.from
  const to = message.toName
    ? `"${message.toName.replace(/"/g, '')}" <${message.to}>`
    : message.to
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    message.replyTo ? `Reply-To: ${message.replyTo}` : null,
    `Subject: ${message.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="boundary_${message.messageKey}"`,
    `Message-ID: <${message.messageKey}@platform.local>`,
    '',
    `--boundary_${message.messageKey}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    message.text,
    '',
    `--boundary_${message.messageKey}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    message.html,
    '',
    `--boundary_${message.messageKey}--`,
  ].filter((line) => line !== null)

  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url')
}

export class GmailEmailProvider implements EmailProvider {
  readonly name = 'gmail' as const
  readonly configured = true

  constructor(private readonly accessToken: string) {}

  async send(message: OutgoingEmail): Promise<EmailSendResult> {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ raw: encodeRfc2822(message) }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new EmailDeliveryError(
        `Gmail send failed (${response.status}): ${detail.slice(0, 200) || response.statusText}`,
      )
    }

    const payload = (await response.json()) as { id?: string }
    return {
      provider: 'gmail',
      providerMessageId: payload.id ?? message.messageKey,
    }
  }
}
