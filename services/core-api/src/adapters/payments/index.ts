import type { ProviderStatus } from '@platform/schemas'
import { ManualPaymentProvider } from './manual.js'
import { MolliePaymentProvider } from './mollie.js'
import { StripePaymentProvider } from './stripe.js'
import type { PaymentProvider } from './types.js'

export * from './types.js'

/**
 * Payment provider selection.
 *
 * Order is preference order: a configured gateway wins, and manual payment is
 * the floor that is always there. A platform that cannot take an order until
 * someone finishes a Stripe onboarding is a platform nobody can try.
 */
const providers: readonly PaymentProvider[] = Object.freeze([
  new MolliePaymentProvider(),
  new StripePaymentProvider(),
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
