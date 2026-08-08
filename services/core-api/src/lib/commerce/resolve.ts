import {
  commerceEngineSettingsSchema,
  type CommerceEngineId,
  type CommerceEngineSettings,
  type ProviderStatus,
} from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import {
  findSecretValue,
  findSettingsDocument,
  listSecretStates,
} from '../../db/repositories/settings.js'
import { MedusaCommerceProvider } from '../../adapters/commerce/medusa.js'
import { PostgresCommerceProvider } from '../../adapters/commerce/postgres.js'
import { ShopifyCommerceProvider } from '../../adapters/commerce/shopify.js'
import { WooCommerceCommerceProvider } from '../../adapters/commerce/woocommerce.js'
import type { CommerceProvider } from '../../adapters/commerce/types.js'

/**
 * Resolve which CommerceProvider backs a tenant (ADR-0006).
 *
 * Priority: tenant Commerce → Connection settings + secrets, then env-level
 * Medusa / Shopify / Woo, else platform Postgres.
 */

export type CommerceConfigSource = 'tenant' | 'env' | 'platform'

export interface ResolvedCommerce {
  settings: CommerceEngineSettings
  active: CommerceProvider
  engines: ProviderStatus[]
  source: CommerceConfigSource
}

function envShopify(): ShopifyCommerceProvider {
  return new ShopifyCommerceProvider(
    process.env.SHOPIFY_SHOP ?? '',
    process.env.SHOPIFY_ACCESS_TOKEN ?? '',
    process.env.SHOPIFY_API_VERSION ?? '2024-10',
    process.env.SHOPIFY_CURRENCY ?? 'EUR',
  )
}

function envWoo(): WooCommerceCommerceProvider {
  return new WooCommerceCommerceProvider(
    process.env.WOOCOMMERCE_STORE_URL ?? '',
    process.env.WOOCOMMERCE_CONSUMER_KEY ?? '',
    process.env.WOOCOMMERCE_CONSUMER_SECRET ?? '',
    process.env.WOOCOMMERCE_CURRENCY ?? 'EUR',
  )
}

function envMedusa(): MedusaCommerceProvider {
  return new MedusaCommerceProvider(process.env.MEDUSA_URL ?? '', process.env.MEDUSA_API_KEY ?? '')
}

function bigCommerceStub(): CommerceProvider {
  return {
    id: 'bigcommerce',
    status: () => ({
      id: 'bigcommerce',
      configured: false,
      capabilities: [],
      reason: 'BigCommerce adapter is on the roadmap — use Shopify, WooCommerce, Medusa, or Platform for now.',
    }),
    listProducts: async () => {
      throw new Error('bigcommerce not configured')
    },
    getProduct: async () => null,
    createProduct: async () => {
      throw new Error('bigcommerce not configured')
    },
    updateProduct: async () => null,
    deleteProduct: async () => false,
    listCollections: async () => [],
    createCollection: async () => {
      throw new Error('bigcommerce not configured')
    },
    listLocations: async () => [],
    createLocation: async () => {
      throw new Error('bigcommerce not configured')
    },
    listInventory: async () => [],
    setInventory: async () => {
      throw new Error('bigcommerce not configured')
    },
    createCart: async () => {
      throw new Error('bigcommerce not configured')
    },
    getCart: async () => null,
    addLineItem: async () => {
      throw new Error('bigcommerce not configured')
    },
    updateLineItem: async () => {
      throw new Error('bigcommerce not configured')
    },
    applyDiscountCode: async () => {
      throw new Error('bigcommerce not configured')
    },
    removeDiscountCode: async () => {
      throw new Error('bigcommerce not configured')
    },
    startCheckout: async () => {
      throw new Error('bigcommerce not configured')
    },
    completeCheckout: async () => {
      throw new Error('bigcommerce not configured')
    },
    listOrders: async () => ({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
    getOrder: async () => null,
    transitionOrder: async () => null,
    capturePayment: async () => null,
    createRefund: async () => {
      throw new Error('bigcommerce not configured')
    },
    listCustomers: async () => ({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
    getCustomer: async () => null,
    listDiscounts: async () => [],
    createDiscount: async () => {
      throw new Error('bigcommerce not configured')
    },
    updateDiscount: async () => null,
    deleteDiscount: async () => false,
    listShippingRates: async () => [],
    createShippingRate: async () => {
      throw new Error('bigcommerce not configured')
    },
    deleteShippingRate: async () => false,
  } as CommerceProvider
}

function buildEngines(input: {
  preferred: CommerceEngineId
  storeUrl: string
  apiKey: string | null
  apiSecret: string | null
  apiVersion: string
}): { engines: CommerceProvider[]; active: CommerceProvider; source: CommerceConfigSource } {
  const tenantKey = input.apiKey?.trim() || ''
  const tenantSecret = input.apiSecret?.trim() || ''
  const tenantUrl = input.storeUrl.trim()

  const shopify =
    input.preferred === 'shopify' && tenantKey && tenantUrl
      ? new ShopifyCommerceProvider(tenantUrl, tenantKey, input.apiVersion)
      : envShopify()

  const woo =
    input.preferred === 'woocommerce' && tenantKey && tenantSecret && tenantUrl
      ? new WooCommerceCommerceProvider(tenantUrl, tenantKey, tenantSecret)
      : envWoo()

  const medusa =
    input.preferred === 'medusa' && tenantUrl
      ? new MedusaCommerceProvider(tenantUrl, tenantKey)
      : envMedusa()

  const platform = new PostgresCommerceProvider()
  const bigcommerce = bigCommerceStub()

  const engines = [platform, medusa, shopify, woo, bigcommerce]

  const preferred = engines.find((engine) => engine.id === input.preferred)
  if (preferred?.status().configured) {
    const source: CommerceConfigSource =
      input.preferred === 'platform'
        ? 'platform'
        : tenantKey || (input.preferred === 'medusa' && tenantUrl)
          ? 'tenant'
          : 'env'
    return { engines, active: preferred, source }
  }

  const configured = engines.find((engine) => engine.id !== 'platform' && engine.status().configured)
  if (configured) {
    return { engines, active: configured, source: 'env' }
  }

  return { engines, active: platform, source: 'platform' }
}

export async function resolveTenantCommerce(tenantId: string): Promise<ResolvedCommerce> {
  const { settings, apiKey, apiSecret, storeUrlSecret } = await withTenant(tenantId, async (tx) => {
    const stored = await findSettingsDocument(tx, tenantId, 'commerce', 'engine')
    const parsed = commerceEngineSettingsSchema.safeParse(stored?.value ?? {})
    const settings = parsed.success ? parsed.data : commerceEngineSettingsSchema.parse({})
    const secrets = await listSecretStates(tx, tenantId, 'commerce', 'engine')
    const has = (field: string) => secrets.some((row) => row.field === field && row.configured)
    const apiKey = has('apiKey')
      ? await findSecretValue(tx, tenantId, 'commerce', 'engine', 'apiKey')
      : null
    const apiSecret = has('apiSecret')
      ? await findSecretValue(tx, tenantId, 'commerce', 'engine', 'apiSecret')
      : null
    const storeUrlSecret = has('storeUrl')
      ? await findSecretValue(tx, tenantId, 'commerce', 'engine', 'storeUrl')
      : null
    return { settings, apiKey, apiSecret, storeUrlSecret }
  })

  const storeUrl = storeUrlSecret?.trim() || settings.storeUrl
  const built = buildEngines({
    preferred: settings.providerId,
    storeUrl,
    apiKey,
    apiSecret,
    apiVersion: settings.apiVersion,
  })

  return {
    settings,
    active: built.active,
    engines: built.engines.map((engine) => engine.status()),
    source: built.source,
  }
}

/** Env-only selection for boot / tests without a tenant. */
export function resolveEnvCommerceProvider(): CommerceProvider {
  const medusa = envMedusa()
  if (medusa.status().configured) return medusa
  const shopify = envShopify()
  if (shopify.status().configured) return shopify
  const woo = envWoo()
  if (woo.status().configured) return woo
  return new PostgresCommerceProvider()
}
