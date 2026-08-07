import { money, type ProviderStatus, type ShippingQuote } from '@platform/schemas'
import type { ShippingContext, ShippingProvider, ShippingQuoteRequest } from './types.js'

/**
 * Table rates — the merchant's own list of shipping options.
 *
 * Always configured, and correct for the shop that ships parcels itself with a
 * flat price and a free-over-€50 threshold, which is most of them. A carrier
 * integration replaces this provider; it does not replace the checkout.
 */
export class TableRateShippingProvider implements ShippingProvider {
  readonly id = 'table-rate'

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: true,
      capabilities: ['flat-rate', 'free-shipping-threshold', 'country-rules'],
      reason: null,
    }
  }

  async quote(_ctx: ShippingContext, request: ShippingQuoteRequest): Promise<ShippingQuote[]> {
    return request.rates
      .filter((rate) => rate.active)
      // An empty country list means "everywhere"; a non-empty one is a whitelist.
      .filter((rate) => rate.countries.length === 0 || (request.country ? rate.countries.includes(request.country) : true))
      .map((rate) => {
        const qualifiesForFree =
          rate.freeAboveSubtotal !== null &&
          rate.freeAboveSubtotal.currency === request.subtotal.currency &&
          request.subtotal.amount >= rate.freeAboveSubtotal.amount

        return {
          rateId: rate.id,
          name: rate.name,
          description: rate.description,
          price: qualifiesForFree ? money(0, rate.price.currency) : rate.price,
          providerId: this.id,
        }
      })
      .sort((a, b) => a.price.amount - b.price.amount)
  }
}
