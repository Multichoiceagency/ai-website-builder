import {
  paymentSettingsSchema,
  type PaymentSettings,
  type ProviderStatus,
} from '@platform/schemas'
import { MolliePaymentProvider } from '../../adapters/payments/mollie.js'
import { ManualPaymentProvider } from '../../adapters/payments/manual.js'
import { PaypalPaymentProvider } from '../../adapters/payments/paypal.js'
import { StripePaymentProvider } from '../../adapters/payments/stripe.js'
import type { PaymentProvider } from '../../adapters/payments/types.js'
import { withTenant } from '../../db/client.js'
import {
  findSecretValue,
  findSettingsDocument,
  listSecretStates,
} from '../../db/repositories/settings.js'

/**
 * Prefer per-tenant payment credentials (Commerce → Payments secrets), fall
 * back to platform `.env`. Status and checkout must agree — otherwise the
 * install UI looks broken after a merchant pastes keys.
 */

export type PaymentConfigSource = 'tenant' | 'env' | null

export interface ResolvedPayments {
  settings: PaymentSettings
  providers: PaymentProvider[]
  statuses: ProviderStatus[]
  active: PaymentProvider
  source: PaymentConfigSource
  apiKeyConfigured: boolean
}

function envConfigured(id: string): boolean {
  switch (id) {
    case 'mollie':
      return Boolean(process.env.MOLLIE_API_KEY?.trim())
    case 'stripe':
      return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
    case 'paypal':
      return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim())
    case 'manual':
      return true
    default:
      return false
  }
}

function buildProviders(input: {
  providerId: string
  apiKey: string | null
  publishableKey: string | null
}): PaymentProvider[] {
  const tenantKey = input.apiKey?.trim() || ''
  const tenantPublishable = input.publishableKey?.trim() || ''
  const useTenant = Boolean(tenantKey)

  const mollieKey =
    useTenant && input.providerId === 'mollie' ? tenantKey : process.env.MOLLIE_API_KEY ?? ''
  const stripeKey =
    useTenant && input.providerId === 'stripe' ? tenantKey : process.env.STRIPE_SECRET_KEY ?? ''

  const paypalClientId =
    useTenant && input.providerId === 'paypal'
      ? tenantPublishable || process.env.PAYPAL_CLIENT_ID || ''
      : process.env.PAYPAL_CLIENT_ID ?? ''
  const paypalSecret =
    useTenant && input.providerId === 'paypal'
      ? tenantKey || process.env.PAYPAL_CLIENT_SECRET || ''
      : process.env.PAYPAL_CLIENT_SECRET ?? ''

  return [
    new MolliePaymentProvider(mollieKey),
    new StripePaymentProvider(stripeKey),
    new PaypalPaymentProvider(paypalClientId, paypalSecret),
    new ManualPaymentProvider(),
  ]
}

function pickActive(providers: PaymentProvider[], preferredId: string): PaymentProvider {
  const preferred = providers.find((provider) => provider.id === preferredId)
  if (preferred?.status().configured) return preferred
  return providers.find((provider) => provider.status().configured) ?? providers[providers.length - 1]!
}

export async function resolveTenantPayments(tenantId: string): Promise<ResolvedPayments> {
  const { settings, apiKey, publishableKey, apiKeyConfigured } = await withTenant(tenantId, async (tx) => {
    const stored = await findSettingsDocument(tx, tenantId, 'commerce', 'payments')
    const parsed = paymentSettingsSchema.safeParse(stored?.value ?? {})
    const settings = parsed.success ? parsed.data : paymentSettingsSchema.parse({})
    const secrets = await listSecretStates(tx, tenantId, 'commerce', 'payments')
    const apiKeyConfigured = secrets.some((row) => row.field === 'apiKey' && row.configured)
    const publishableConfigured = secrets.some((row) => row.field === 'publishableKey' && row.configured)
    const apiKey = apiKeyConfigured
      ? await findSecretValue(tx, tenantId, 'commerce', 'payments', 'apiKey')
      : null
    const publishableKey = publishableConfigured
      ? await findSecretValue(tx, tenantId, 'commerce', 'payments', 'publishableKey')
      : null
    return { settings, apiKey, publishableKey, apiKeyConfigured }
  })

  const providers = buildProviders({
    providerId: settings.providerId,
    apiKey,
    publishableKey,
  })
  const statuses = providers.map((provider) => provider.status())
  const active = pickActive(providers, settings.providerId)

  const tenantOwnsActive =
    apiKeyConfigured &&
    settings.providerId === active.id &&
    ['mollie', 'stripe', 'paypal'].includes(active.id)

  let source: PaymentConfigSource = null
  if (tenantOwnsActive) source = 'tenant'
  else if (envConfigured(active.id) && active.id !== 'manual') source = 'env'
  else if (active.id === 'manual') source = null

  return {
    settings,
    providers,
    statuses,
    active,
    source,
    apiKeyConfigured,
  }
}
