import type { ProviderStatus, ShippingQuote } from '@platform/schemas'
import { CarrierShippingProvider } from './carrier.js'
import { TableRateShippingProvider } from './table-rate.js'
import type { ShippingContext, ShippingProvider, ShippingQuoteRequest } from './types.js'

export * from './types.js'

const providers: readonly ShippingProvider[] = Object.freeze([
  new CarrierShippingProvider(),
  new TableRateShippingProvider(),
])

export function shippingProviders(): readonly ShippingProvider[] {
  return providers
}

export function shippingProviderStatuses(): ProviderStatus[] {
  return providers.map((provider) => provider.status())
}

/**
 * Every provider's quotes, merged.
 *
 * Unlike payments, shipping is not exclusive: a merchant may offer their own
 * pickup option alongside live carrier rates. A provider that fails is skipped
 * rather than allowed to empty the checkout.
 */
export async function quoteShipping(
  ctx: ShippingContext,
  request: ShippingQuoteRequest,
): Promise<ShippingQuote[]> {
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await provider.quote(ctx, request)
      } catch (error) {
        console.error(`shipping provider ${provider.id} failed to quote:`, error)
        return []
      }
    }),
  )

  return results.flat().sort((a, b) => a.price.amount - b.price.amount)
}
