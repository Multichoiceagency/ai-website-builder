/**
 * The provider used when nothing is configured.
 *
 * It records what *would* have been sent and returns a synthetic id. That is
 * deliberately not a no-op: the message row, the campaign stats and the audit
 * trail are all still written, so the whole path is exercised in development
 * and in tests — only the socket is missing.
 *
 * It reports `configured: false`, which every surface passes straight through
 * to the user. A dashboard that says "sent" when nothing left the building is
 * the single worst thing this module could do.
 */
import type { EmailProvider, EmailSendResult, OutgoingEmail } from './provider.js'

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console' as const
  readonly configured = false

  readonly #sent: OutgoingEmail[] = []

  constructor(private readonly log: (line: string) => void = () => {}) {}

  /** What this provider "sent". Used by tests; never exposed over HTTP. */
  get sent(): readonly OutgoingEmail[] {
    return this.#sent
  }

  async send(message: OutgoingEmail): Promise<EmailSendResult> {
    this.#sent.push(message)
    // Recipient and subject only. A body can contain personal data, and a log
    // is the last place it should end up.
    this.log(`[email:console] would send "${message.subject}" to ${message.to}`)

    return { provider: this.name, providerMessageId: `console-${message.messageKey}` }
  }
}
