import type { ProviderStatus } from '@platform/schemas'
import { ManualPaymentProvider } from './manual.js'
import { MolliePaymentProvider } from './mollie.js'
import { PaypalPaymentProvider } from './paypal.js'
import { StripePaymentProvider } from './stripe.js'
import type { PaymentProvider } from './types.js'

export * from './types.js'

/**
 * Payment provider selection.
 *
 * Preference: Mollie (EU / iDEAL) → Stripe → PayPal (when configured) → manual.
 * Manual is always the floor so merchants can take orders before any gateway.
 */
const providers: readonly PaymentProvider[] = Object.freeze([
  new MolliePaymentProvider(),
  new StripePaymentProvider(),
  new PaypalPaymentProvider(),
  new ManualPaymentProvider(),
])

export function paymentProviders(): readonly PaymentProvider[] {
  return providers
}

export function paymentProviderStatuses(): ProviderStatus[] {
  return providers.map((provider) => provider.status())
}

/** The provider a checkout will actually use right now. */
export function activePaymentProvider(): PaymentProvider {
  return providers.find((provider) => provider.status().configured) ?? providers[providers.length - 1]!
}

export function paymentProviderById(id: string): PaymentProvider | null {
  return providers.find((provider) => provider.id === id) ?? null
}
