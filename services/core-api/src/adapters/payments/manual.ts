import { randomUUID } from 'node:crypto'
import type { Money, PaymentSession, ProviderStatus } from '@platform/schemas'
import type { CreatePaymentInput, PaymentContext, PaymentProvider } from './types.js'

/**
 * Manual payment — bank transfer, cash on collection, invoice on account.
 *
 * Always configured, because it needs nothing. That is the point: a merchant
 * can take orders on day one, before any gateway account exists, and adding
 * Stripe later changes the provider rather than the checkout.
 *
 * It records intent only. Money moving is something a human confirms, which is
 * why capture succeeds immediately and the order timeline is the record.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly id = 'manual'

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: true,
      capabilities: ['authorize', 'capture', 'refund'],
      reason: null,
    }
  }

  async createSession(_ctx: PaymentContext, input: CreatePaymentInput): Promise<PaymentSession> {
    return {
      id: `manual_${randomUUID()}`,
      providerId: this.id,
      status: 'authorized',
      amount: input.amount,
      providerReference: input.reference,
      redirectUrl: null,
    }
  }

  async capture(_ctx: PaymentContext, session: PaymentSession): Promise<PaymentSession> {
    return { ...session, status: 'captured' }
  }

  async refund(_ctx: PaymentContext, session: PaymentSession, amount: Money): Promise<PaymentSession> {
    return { ...session, status: 'refunded', amount }
  }
}
