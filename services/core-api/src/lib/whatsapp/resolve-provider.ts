import { whatsappSettingsSchema, type WhatsappSettings } from '@platform/schemas'
import { OpenWaWhatsappProvider, type OpenWaClientConfig } from '../../adapters/whatsapp/openwa.js'
import type { WhatsappProvider } from '../../adapters/whatsapp/types.js'
import { env } from '../../config/env.js'
import { withTenant } from '../../db/client.js'
import { findSecretValue, findSettingsDocument, listSecretStates } from '../../db/repositories/settings.js'

export type WhatsappConfigSource = 'tenant' | 'env'

export interface ResolvedWhatsappConnection {
  provider: WhatsappProvider
  source: WhatsappConfigSource | null
  settings: WhatsappSettings
  apiKeyConfigured: boolean
  webhookSecretConfigured: boolean
  webhookSecret: string | null
  baseUrl: string | null
  dashboardUrl: string | null
}

function envClientConfig(): OpenWaClientConfig | null {
  if (!env.OPENWA_BASE_URL || !env.OPENWA_API_KEY) return null
  return { baseUrl: env.OPENWA_BASE_URL, apiKey: env.OPENWA_API_KEY }
}

/**
 * Prefer per-tenant OpenWA credentials (settings), fall back to platform `.env`.
 */
export async function resolveTenantWhatsappConnection(tenantId: string): Promise<ResolvedWhatsappConnection> {
  const { settings, apiKey, webhookSecret, apiKeyConfigured, webhookSecretConfigured } = await withTenant(
    tenantId,
    async (tx) => {
      const stored = await findSettingsDocument(tx, tenantId, 'platform', 'whatsapp')
      const parsed = whatsappSettingsSchema.safeParse(stored?.value ?? {})
      const settings = parsed.success ? parsed.data : whatsappSettingsSchema.parse({})
      const secrets = await listSecretStates(tx, tenantId, 'platform', 'whatsapp')
      const apiKeyConfigured = secrets.some((row) => row.field === 'apiKey' && row.configured)
      const webhookSecretConfigured = secrets.some((row) => row.field === 'webhookSecret' && row.configured)
      const apiKey = apiKeyConfigured
        ? await findSecretValue(tx, tenantId, 'platform', 'whatsapp', 'apiKey')
        : null
      const webhookSecret = webhookSecretConfigured
        ? await findSecretValue(tx, tenantId, 'platform', 'whatsapp', 'webhookSecret')
        : null
      return { settings, apiKey, webhookSecret, apiKeyConfigured, webhookSecretConfigured }
    },
  )

  const tenantBase = settings.baseUrl.trim()
  if (tenantBase && apiKey) {
    const provider = new OpenWaWhatsappProvider({ baseUrl: tenantBase, apiKey })
    const dashboard = settings.dashboardUrl.trim() || tenantBase
    return {
      provider,
      source: 'tenant',
      settings,
      apiKeyConfigured: true,
      webhookSecretConfigured,
      webhookSecret: webhookSecret ?? null,
      baseUrl: tenantBase,
      dashboardUrl: dashboard,
    }
  }

  const platform = envClientConfig()
  if (platform) {
    const provider = new OpenWaWhatsappProvider(platform)
    return {
      provider,
      source: 'env',
      settings,
      apiKeyConfigured: true,
      webhookSecretConfigured: Boolean(env.OPENWA_WEBHOOK_SECRET) || webhookSecretConfigured,
      webhookSecret: webhookSecret ?? env.OPENWA_WEBHOOK_SECRET ?? null,
      baseUrl: platform.baseUrl,
      dashboardUrl: settings.dashboardUrl.trim() || platform.baseUrl,
    }
  }

  return {
    provider: new OpenWaWhatsappProvider(null),
    source: null,
    settings,
    apiKeyConfigured,
    webhookSecretConfigured,
    webhookSecret: webhookSecret ?? env.OPENWA_WEBHOOK_SECRET ?? null,
    baseUrl: tenantBase || null,
    dashboardUrl: settings.dashboardUrl.trim() || tenantBase || null,
  }
}

export async function resolveTenantWhatsappProvider(tenantId: string): Promise<WhatsappProvider> {
  const resolved = await resolveTenantWhatsappConnection(tenantId)
  return resolved.provider
}
