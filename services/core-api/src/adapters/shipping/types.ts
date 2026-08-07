import type { Money, ProviderStatus, ShippingQuote, ShippingRate } from '@platform/schemas'

/**
 * The platform's shipping contract (ADR-0006, §76).
 *
 * A carrier integration answers the same question as a hand-maintained rate
 * table: "what can this cart be shipped with, and for how much?". Checkout asks
 * that question and never learns who answered.
 */

export interface ShippingContext {
  tenantId: string
}

export interface ShippingQuoteRequest {
  subtotal: Money
  /** ISO-3166-1 alpha-2. Empty when the shopper has not said yet. */
  country: string
  weightGrams: number
  /**
   * The tenant's configured rates, loaded by the caller. Passing them in keeps
   * the table-rate provider a pure function — and a carrier provider is free to
   * ignore them entirely.
   */
  rates: ShippingRate[]
}

export interface ShippingProvider {
  readonly id: string
  status(): ProviderStatus
  quote(ctx: ShippingContext, request: ShippingQuoteRequest): Promise<ShippingQuote[]>
}
