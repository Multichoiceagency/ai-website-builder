import { z } from 'zod'

/**
 * Configuration is validated once, at boot. A service that starts with a
 * missing secret and fails on the first request is worse than one that refuses
 * to start at all.
 *
 * Values come from the environment only — never from a committed file.
 *
 * Coolify (and similar hosts) often inject optional keys as empty strings.
 * Treat blank values as absent so optional fields stay optional.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const optionalNonEmpty = z.preprocess(emptyToUndefined, z.string().min(1).optional())
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  POSTGRES_HOST: z.string().min(1).default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5433),
  POSTGRES_DB: z.string().min(1).default('platform'),

  /** Owner role. Migrations only — it is the table owner and bypasses RLS. */
  POSTGRES_USER: z.string().min(1).default('postgres'),
  POSTGRES_PASSWORD: z.string().min(1),

  /** Runtime role. RLS is enforced against it. See ADR-0004. */
  APP_DB_USER: z.string().min(1).default('app_user'),
  APP_DB_PASSWORD: z.string().min(1),

  CORE_API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORE_API_HOST: z.string().default('0.0.0.0'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(300).default(604_800),
  SESSION_COOKIE_NAME: z.string().default('platform_session'),

  /**
   * Which Gemini model the AI gateway asks for. Optional: absent means the
   * provider's own default. Validated here only so that an empty or blank
   * setting is refused at boot instead of silently meaning "default" — the
   * provider reads it from the environment at call time, like the API keys.
   */
  GEMINI_MODEL: optionalNonEmpty,

  /** Places (New), Geocoding, PageSpeed — platform API key, not OAuth. */
  GOOGLE_API_KEY: optionalNonEmpty,

  // Optional WhatsApp gateway (OpenWA). Absent = support desk UI works, send/AI disabled.
  OPENWA_BASE_URL: optionalUrl,
  OPENWA_API_KEY: optionalNonEmpty,
  OPENWA_WEBHOOK_SECRET: optionalNonEmpty,

  // Optional: absent means "Google is not connected on this installation",
  // which the capabilities endpoint reports rather than crashing the service.
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  GOOGLE_OAUTH_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:4000/api/v1/integrations/google/callback'),
  /** Sign-In / Sign-Up with Google (dashboard auth). Separate from integrations. */
  GOOGLE_AUTH_REDIRECT_URI: optionalUrl,

  /** Self-hosted or cloud Nango (OAuth broker). Absent = legacy Google PKCE path. */
  NANGO_SECRET_KEY: optionalNonEmpty,
  NANGO_HOST: z.string().url().default('http://localhost:3003'),
  NANGO_WEBHOOK_SECRET: optionalNonEmpty,
  /** Integration id configured in the Nango UI for Google (Business / GSC / GA). */
  NANGO_GOOGLE_INTEGRATION_ID: z.string().min(1).default('google'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
})

function loadEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    // Names only. Never log values — see the global logging rule.
    throw new Error(`Invalid environment configuration:\n${problems}\n\nCopy .env.example to .env and fill it in.`)
  }
  return parsed.data
}

export const env = loadEnv()

export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
