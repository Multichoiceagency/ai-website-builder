/**
 * E-mail configuration, read from the environment and nowhere else.
 *
 * Kept out of `config/env.ts` on purpose: SMTP is optional, and a service that
 * refuses to boot because nobody configured a mail server would be worse than
 * one that reports `configured: false` and keeps working. Every value comes
 * from `process.env`; none of them is ever logged.
 */
import { z } from 'zod'
import { isProduction } from '../../config/env.js'

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  /** Implicit TLS (port 465). Otherwise STARTTLS is negotiated on a plain port. */
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  SMTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),

  EMAIL_FROM_ADDRESS: z.string().max(320).optional(),
  EMAIL_FROM_NAME: z.string().max(160).default('Platform'),

  /**
   * The safety catch. Outside production, a fully configured SMTP server is
   * still not used unless this is explicitly set — a developer running the
   * seed data must not be able to mail real customers.
   */
  EMAIL_ALLOW_SEND: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
})

export interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
  timeoutMs: number
  fromAddress: string
  fromName: string
  allowSend: boolean
  /** Names of the settings that are missing. Names only — never values. */
  missing: string[]
}

const REQUIRED = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM_ADDRESS'] as const

export function loadEmailConfig(source: NodeJS.ProcessEnv = process.env): EmailConfig {
  const parsed = smtpSchema.safeParse(source)
  const values = parsed.success ? parsed.data : smtpSchema.parse({})

  const missing: string[] = REQUIRED.filter((key) => !source[key]?.trim())
  // An unparseable value is as good as an absent one, and reporting it by name
  // keeps the value itself out of every log and every API response.
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const name = String(issue.path[0] ?? '')
      if (name && !missing.includes(name)) missing.push(name)
    }
  }

  return {
    host: values.SMTP_HOST ?? '',
    port: values.SMTP_PORT,
    user: values.SMTP_USER ?? '',
    password: values.SMTP_PASSWORD ?? '',
    secure: values.SMTP_SECURE ?? false,
    timeoutMs: values.SMTP_TIMEOUT_MS,
    fromAddress: values.EMAIL_FROM_ADDRESS ?? '',
    fromName: values.EMAIL_FROM_NAME,
    allowSend: values.EMAIL_ALLOW_SEND ?? false,
    missing,
  }
}

/**
 * Whether real delivery is permitted. Complete credentials are necessary but
 * not sufficient: outside production the operator has to opt in as well.
 */
export function canSendRealEmail(config: EmailConfig): boolean {
  if (config.missing.length > 0) return false
  return isProduction || config.allowSend
}
