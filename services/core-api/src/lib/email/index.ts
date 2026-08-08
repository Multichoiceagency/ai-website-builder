/**
 * The e-mail module's public face: one provider, resolved once, and the honest
 * status report that goes with it.
 */
import { emailProviderStatusSchema, type EmailProviderStatus } from '@platform/schemas'
import { canSendRealEmail, loadEmailConfig, type EmailConfig } from './config.js'
import { ConsoleEmailProvider } from './console-provider.js'
import type { EmailProvider } from './provider.js'
import { SmtpEmailProvider } from './smtp-provider.js'

export * from './provider.js'
export * from './render.js'
export { ConsoleEmailProvider } from './console-provider.js'
export { GmailEmailProvider } from './gmail-provider.js'
export { SmtpEmailProvider } from './smtp-provider.js'
export { loadEmailConfig, canSendRealEmail } from './config.js'
export type { EmailConfig } from './config.js'

let cached: { provider: EmailProvider; config: EmailConfig } | null = null

/**
 * The provider this installation uses.
 *
 * SMTP only when the credentials are complete *and* sending is permitted here
 * (production, or an explicit opt-in). Everything else falls through to the
 * console provider — which is why a development machine cannot mail a real
 * customer by accident.
 */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached.provider

  const config = loadEmailConfig()
  const provider: EmailProvider = canSendRealEmail(config)
    ? new SmtpEmailProvider(config)
    : new ConsoleEmailProvider()

  cached = { provider, config }
  return provider
}

export function getEmailConfig(): EmailConfig {
  if (!cached) getEmailProvider()
  return cached!.config
}

/** Tests swap the provider; nothing else should. */
export function setEmailProviderForTests(provider: EmailProvider, config?: EmailConfig): void {
  cached = { provider, config: config ?? loadEmailConfig() }
}

export function resetEmailProvider(): void {
  cached = null
}

/**
 * What the dashboard shows. `configured: false` with the missing setting names
 * is the useful answer — "e-mail is broken" is not.
 */
export function emailProviderStatus(): EmailProviderStatus {
  const provider = getEmailProvider()
  const config = getEmailConfig()

  return emailProviderStatusSchema.parse({
    provider: provider.name,
    configured: provider.configured,
    missing: provider.configured
      ? []
      : config.missing.length
        ? config.missing
        : ['EMAIL_ALLOW_SEND'],
    defaultFromEmail: config.fromAddress,
    defaultFromName: config.fromName,
  })
}
