import type { CommerceStatus } from '@platform/schemas'
import { paymentProviderStatuses } from '../payments/index.js'
import { shippingProviderStatuses } from '../shipping/index.js'
import { MedusaCommerceProvider } from './medusa.js'
import { PostgresCommerceProvider } from './postgres.js'
import type { CommerceProvider } from './types.js'

export * from './types.js'

/**
 * Commerce provider selection (ADR-0006).
 *
 * A configured Medusa instance wins; otherwise the platform's own
 * implementation runs. Selection happens once, here, at runtime — which is the
 * whole point: swapping the commerce engine is a change to this function, not
 * to a route, a repository or a Vue component.
 */
export function createCommerceProvider(): CommerceProvider {
  const medusa = new MedusaCommerceProvider()
  return medusa.status().configured ? medusa : new PostgresCommerceProvider()
}

export const commerceProvider: CommerceProvider = createCommerceProvider()

/** Everything the dashboard needs to tell a merchant which seams are filled. */
export function commerceStatus(): CommerceStatus {
  return {
    commerce: commerceProvider.status(),
    payments: paymentProviderStatuses(),
    shipping: shippingProviderStatuses(),
  }
}
