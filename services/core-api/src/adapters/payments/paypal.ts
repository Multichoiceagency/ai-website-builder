import type { Money, PaymentSession, ProviderStatus } from '@platform/schemas'
import {
  PaymentUnconfiguredError,
  type CreatePaymentInput,
  type PaymentContext,
  type PaymentProvider,
} from './types.js'

/**
 * PayPal Commerce Platform stub — listed in the dashboard so merchants can
 * prepare credentials. Checkout stays on configured Stripe/Mollie/manual until
 * client id + secret are set (tenant Payments secrets or platform env) and this
 * adapter is completed.
 */
export class PaypalPaymentProvider implements PaymentProvider {
  readonly id = 'paypal'
  readonly #clientId: string
  readonly #clientSecret: string

  constructor(
    clientId = process.env.PAYPAL_CLIENT_ID ?? '',
    clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? '',
  ) {
    this.#clientId = clientId.trim()
    this.#clientSecret = clientSecret.trim()
  }

  status(): ProviderStatus {
    const configured = Boolean(this.#clientId && this.#clientSecret)
    return {
      id: this.id,
      configured,
      capabilities: ['redirect', 'capture', 'refund'],
      // Merchant-facing: never expose env var names in the dashboard.
      reason: configured ? null : 'PayPal needs setup — open Payments to install.',
    }
  }

  async createSession(_ctx: PaymentContext, _input: CreatePaymentInput): Promise<PaymentSession> {
    throw new PaymentUnconfiguredError(
      this.id,
      'PayPal checkout is not ready yet — use Stripe or Mollie for now.',
    )
  }

  async capture(_ctx: PaymentContext, session: PaymentSession): Promise<PaymentSession> {
    throw new PaymentUnconfiguredError(this.id, 'PayPal capture is not available.')
  }

  async refund(_ctx: PaymentContext, session: PaymentSession, _amount: Money): Promise<PaymentSession> {
    throw new PaymentUnconfiguredError(this.id, 'PayPal refund is not available.')
  }
}
