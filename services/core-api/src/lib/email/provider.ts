/**
 * The platform's e-mail capability, defined as a platform-owned interface
 * (ADR-0006).
 *
 * Callers depend on this and on `packages/schemas` types. No route, worker or
 * component knows whether the message left over SMTP, went to a log line, or
 * will one day go to a transactional API — swapping that is one new file in
 * this directory.
 */

export interface OutgoingEmail {
  to: string
  toName?: string
  from: string
  fromName?: string
  replyTo?: string
  subject: string
  html: string
  text: string
  /** Reused as the `Message-ID` local part, so a send is traceable end to end. */
  messageKey: string
}

export interface EmailSendResult {
  /** Which implementation handled it — recorded on every message row. */
  provider: string
  providerMessageId: string
}

export interface EmailProvider {
  readonly name: 'smtp' | 'console' | 'gmail'
  /**
   * True when this installation can actually deliver mail. False is a valid,
   * expected answer: the API reports it rather than pretending a send worked.
   */
  readonly configured: boolean
  send(message: OutgoingEmail): Promise<EmailSendResult>
}

/** Thrown when a provider could not deliver. Never carries credentials. */
export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailDeliveryError'
  }
}
