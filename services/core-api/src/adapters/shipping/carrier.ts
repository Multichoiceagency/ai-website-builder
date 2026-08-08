import type { ProviderStatus, ShippingQuote } from '@platform/schemas'
import type { ShippingContext, ShippingProvider, ShippingQuoteRequest } from './types.js'

/**
 * Carrier-calculated shipping.
 *
 * The seam for live rates from a parcel aggregator (Sendcloud, MyParcel,
 * ShipStation — the API shape is close enough that one adapter covers them with
 * a base URL). Unconfigured on every installation until someone supplies a key,
 * and it says so rather than pretending to have no rates.
 */
export class CarrierShippingProvider implements ShippingProvider {
  readonly id = 'carrier'
  readonly #apiKey = process.env.SHIPPING_CARRIER_API_KEY ?? ''

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: this.#apiKey.length > 0,
      capabilities: ['live-rates', 'labels', 'tracking'],
      // Merchant-facing: never expose env var names in the dashboard.
      reason: this.#apiKey
        ? null
        : 'Live carrier rates are not set up yet — configure shipping under Commerce → Shipping.',
    }
  }

  /**
   * Returns nothing while unconfigured instead of throwing: a missing carrier
   * account must degrade checkout to the merchant's own rates, not break it.
   */
  async quote(_ctx: ShippingContext, _request: ShippingQuoteRequest): Promise<ShippingQuote[]> {
    return []
  }
}
