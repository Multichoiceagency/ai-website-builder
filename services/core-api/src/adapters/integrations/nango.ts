/**
 * Nango adapter (ADR-0006) — OAuth broker for workspace connectors.
 *
 * `@nangohq/node` may only be imported from this file. Callers use the helpers
 * below; dashboard Sign-In with Google stays on `lib/auth/google-auth.ts`.
 *
 * Connectors (Connectors modal + Settings → Integrations) go through Nango
 * Connect sessions when `NANGO_SECRET_KEY` is set. Google still has a legacy
 * native PKCE path when Nango is absent.
 */
import { Nango } from '@nangohq/node'
import { env } from '../../config/env.js'

const NANGO_PLACEHOLDER_TOKEN = 'nango-managed'

export type ConnectorCategory =
  | 'google'
  | 'ecommerce'
  | 'marketing'
  | 'messaging'
  | 'productivity'
  | 'ai'
  | 'analytics'

export interface ConnectorDefinition {
  /** Stable id stored on `integration_connections.provider`. */
  id: string
  /** Nango unique key (defaults to `id`; override via env for Google). */
  nangoIntegrationId: string
  name: string
  description: string
  category: ConnectorCategory
}

/**
 * Catalog shown in Connectors. Each entry maps to a Nango integration unique
 * key you create in the Nango UI (same id unless overridden).
 */
export const CONNECTOR_CATALOG: ConnectorDefinition[] = [
  {
    id: 'google',
    nangoIntegrationId: env.NANGO_GOOGLE_INTEGRATION_ID,
    name: 'Google',
    description:
      'Business Profile, Search Console, Analytics, Ads, and Gmail send for campaigns.',
    category: 'google',
  },
  {
    id: 'slack',
    nangoIntegrationId: 'slack',
    name: 'Slack',
    description: 'Notify channels when leads, orders, or support tickets need attention.',
    category: 'messaging',
  },
  {
    id: 'stripe',
    nangoIntegrationId: 'stripe',
    name: 'Stripe',
    description: 'Payments and subscription billing for commerce checkouts.',
    category: 'ecommerce',
  },
  {
    id: 'shopify',
    nangoIntegrationId: 'shopify',
    name: 'Shopify',
    description: 'Sync products and orders from an existing Shopify store.',
    category: 'ecommerce',
  },
  {
    id: 'woocommerce',
    nangoIntegrationId: 'woocommerce',
    name: 'WooCommerce',
    description: 'Connect a WordPress / WooCommerce shop via REST API.',
    category: 'ecommerce',
  },
  {
    id: 'bigcommerce',
    nangoIntegrationId: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Connect BigCommerce catalogue and orders (adapter on roadmap).',
    category: 'ecommerce',
  },
  {
    id: 'hubspot',
    nangoIntegrationId: 'hubspot',
    name: 'HubSpot',
    description: 'CRM contacts, deals, and marketing lists.',
    category: 'productivity',
  },
  {
    id: 'meta',
    nangoIntegrationId: 'facebook',
    name: 'Meta',
    description: 'Facebook & Instagram ads and Pages for growth campaigns.',
    category: 'marketing',
  },
  {
    id: 'mailchimp',
    nangoIntegrationId: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email audiences and campaign sync.',
    category: 'marketing',
  },
  {
    id: 'notion',
    nangoIntegrationId: 'notion',
    name: 'Notion',
    description: 'Pull content and databases into your workspace.',
    category: 'productivity',
  },
  {
    id: 'airtable',
    nangoIntegrationId: 'airtable',
    name: 'Airtable',
    description: 'Bases as a source for catalogs, forms, and CRM tables.',
    category: 'productivity',
  },
  {
    id: 'linkedin',
    nangoIntegrationId: 'linkedin',
    name: 'LinkedIn',
    description: 'Company pages and ads for B2B growth.',
    category: 'marketing',
  },
  {
    id: 'salesforce',
    nangoIntegrationId: 'salesforce',
    name: 'Salesforce',
    description: 'CRM accounts, opportunities, and lead sync.',
    category: 'productivity',
  },
  {
    id: 'intercom',
    nangoIntegrationId: 'intercom',
    name: 'Intercom',
    description: 'Support conversations and customer messaging.',
    category: 'messaging',
  },
  {
    id: 'zendesk',
    nangoIntegrationId: 'zendesk',
    name: 'Zendesk',
    description: 'Helpdesk tickets and customer support workflows.',
    category: 'messaging',
  },
  {
    id: 'pipedrive',
    nangoIntegrationId: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales pipeline deals and activities.',
    category: 'productivity',
  },
  {
    id: 'klaviyo',
    nangoIntegrationId: 'klaviyo',
    name: 'Klaviyo',
    description: 'Ecommerce email and SMS marketing audiences.',
    category: 'marketing',
  },
  {
    id: 'google-calendar',
    nangoIntegrationId: 'google-calendar',
    name: 'Google Calendar',
    description: 'Bookings and appointment availability for services.',
    category: 'google',
  },
  {
    id: 'gmail',
    nangoIntegrationId: 'google-mail',
    name: 'Gmail',
    description: 'Send campaign and transactional mail via Gmail.',
    category: 'google',
  },
  {
    id: 'whatsapp',
    nangoIntegrationId: 'whatsapp-business',
    name: 'WhatsApp Business',
    description: 'WhatsApp Business messaging for CRM and support.',
    category: 'messaging',
  },
  {
    id: 'tiktok-ads',
    nangoIntegrationId: 'tiktok-ads',
    name: 'TikTok Ads',
    description: 'TikTok advertising campaigns and audiences.',
    category: 'marketing',
  },
  {
    id: 'x',
    nangoIntegrationId: 'twitter',
    name: 'X (Twitter)',
    description: 'Organic posts and ads for social growth.',
    category: 'marketing',
  },
]

export function isNangoConfigured(): boolean {
  return Boolean(env.NANGO_SECRET_KEY)
}

export function nangoConfigurationProblem(): string | null {
  if (!env.NANGO_SECRET_KEY) {
    return 'Nango is not configured — add the Nango secret key under Settings → Integrations.'
  }
  return null
}

function client(): Nango {
  if (!env.NANGO_SECRET_KEY) {
    throw new Error('Nango is not configured (NANGO_SECRET_KEY).')
  }
  return new Nango({
    secretKey: env.NANGO_SECRET_KEY,
    host: env.NANGO_HOST,
  })
}

export function nangoPlaceholderToken(): string {
  return NANGO_PLACEHOLDER_TOKEN
}

export function connectorById(providerId: string): ConnectorDefinition | undefined {
  return CONNECTOR_CATALOG.find((entry) => entry.id === providerId)
}

export function connectorByNangoKey(nangoKey: string): ConnectorDefinition | undefined {
  return CONNECTOR_CATALOG.find(
    (entry) => entry.nangoIntegrationId === nangoKey || entry.id === nangoKey,
  )
}

export function nangoIntegrationIdFor(providerId: string): string {
  const entry = connectorById(providerId)
  if (!entry) throw new Error(`Unknown connector: ${providerId}`)
  return entry.nangoIntegrationId
}

/** @deprecated Prefer `nangoIntegrationIdFor('google')`. */
export function nangoGoogleIntegrationId(): string {
  return nangoIntegrationIdFor('google')
}

export async function listNangoIntegrationKeys(): Promise<Set<string>> {
  const nango = client()
  const { configs } = await nango.listIntegrations()
  return new Set((configs ?? []).map((entry) => entry.unique_key).filter(Boolean))
}

export async function createConnectSession(input: {
  tenantId: string
  userId: string
  email: string
  /** One or more Nango unique keys the Connect UI may offer. */
  allowedIntegrations: string[]
}): Promise<{ connectLink: string; expiresAt: string | null; token: string | null }> {
  if (!input.allowedIntegrations.length) {
    throw new Error('At least one Nango integration id is required.')
  }

  const nango = client()
  const { data } = await nango.createConnectSession({
    tags: {
      end_user_id: input.userId,
      end_user_email: input.email,
      organization_id: input.tenantId,
    },
    allowed_integrations: input.allowedIntegrations,
  })

  return {
    connectLink: data.connect_link,
    expiresAt: data.expires_at ?? null,
    token: 'token' in data ? (data as { token?: string }).token ?? null : null,
  }
}

/** @deprecated Prefer `createConnectSession` with allowedIntegrations. */
export async function createGoogleConnectSession(input: {
  tenantId: string
  userId: string
  email: string
}): Promise<{ connectLink: string; expiresAt: string | null; token: string | null }> {
  return createConnectSession({
    ...input,
    allowedIntegrations: [nangoIntegrationIdFor('google')],
  })
}

export async function getNangoAccessToken(
  nangoIntegrationId: string,
  connectionId: string,
): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  accountLabel: string
  externalAccountId: string
}> {
  const nango = client()
  const connection = await nango.getConnection(nangoIntegrationId, connectionId)
  const credentials = connection.credentials as {
    type?: string
    access_token?: string
    refresh_token?: string
    expires_at?: string | Date
    raw?: { scope?: string }
  }

  const accessToken = credentials.access_token ?? nangoPlaceholderToken()

  const expiresAt = credentials.expires_at ? new Date(credentials.expires_at) : null
  const scopes =
    typeof credentials.raw?.scope === 'string'
      ? credentials.raw.scope.split(/[\s,]+/).filter(Boolean)
      : []

  const meta =
    (connection as { connection_config?: Record<string, unknown>; metadata?: Record<string, unknown> })
      .connection_config
    ?? (connection as { metadata?: Record<string, unknown> }).metadata
    ?? {}
  const endUser = (connection as { end_user?: { email?: string } }).end_user
  const accountLabel =
    (typeof meta.email === 'string' && meta.email)
    || (typeof meta.account_label === 'string' && meta.account_label)
    || (typeof endUser?.email === 'string' && endUser.email)
    || connectionId

  return {
    accessToken,
    refreshToken: credentials.refresh_token ?? null,
    expiresAt,
    scopes,
    accountLabel,
    externalAccountId: connectionId,
  }
}

/** @deprecated Prefer `getNangoAccessToken(nangoIntegrationIdFor('google'), id)`. */
export async function getNangoGoogleAccessToken(connectionId: string) {
  return getNangoAccessToken(nangoIntegrationIdFor('google'), connectionId)
}

export async function deleteNangoConnection(
  nangoIntegrationId: string,
  connectionId: string,
): Promise<void> {
  const nango = client()
  await nango.deleteConnection(nangoIntegrationId, connectionId).catch(() => {})
}

export interface NangoAuthWebhook {
  type?: string
  operation?: string
  success?: boolean
  connectionId?: string
  providerConfigKey?: string
  provider?: string
  tags?: {
    end_user_id?: string
    end_user_email?: string
    organization_id?: string
  }
}

export function parseNangoAuthWebhook(body: unknown): NangoAuthWebhook | null {
  if (!body || typeof body !== 'object') return null
  return body as NangoAuthWebhook
}

export function isNangoAuthSuccess(payload: NangoAuthWebhook): boolean {
  if (payload.type !== 'auth' || payload.success !== true) return false
  if (payload.operation && payload.operation !== 'creation' && payload.operation !== 'override') {
    return false
  }
  return Boolean(payload.connectionId && (payload.providerConfigKey || payload.provider))
}

/** @deprecated Prefer `isNangoAuthSuccess` + `connectorByNangoKey`. */
export function isNangoGoogleAuthSuccess(payload: NangoAuthWebhook): boolean {
  if (!isNangoAuthSuccess(payload)) return false
  const key = payload.providerConfigKey ?? payload.provider ?? ''
  const connector = connectorByNangoKey(key)
  return connector?.id === 'google' || key === 'google'
}
