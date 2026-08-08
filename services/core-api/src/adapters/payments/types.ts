import type { Money, PaymentSession, ProviderStatus } from '@platform/schemas'

/**
 * The platform's payment contract (ADR-0006, §75).
 *
 * Stripe and Mollie are implementations. A route asks for "a payment session
 * for €49,90"; it never asks for a PaymentIntent or a Mollie payment, and it
 * never learns which of the two answered.
 */

export interface PaymentContext {
  tenantId: string
}

export interface CreatePaymentInput {
  amount: Money
  /** Our order or cart reference, echoed back by the provider's webhook. */
  reference: string
  email: string
  description: string
  /** Where the shopper returns after an off-site redirect. */
  returnUrl?: string
}

export class PaymentUnconfiguredError extends Error {
  constructor(providerId: string, reason: string) {
    // Merchant-facing: prefer the reason as-is when it already names the provider.
    // Never leak env var names (e.g. MOLLIE_API_KEY) into API error bodies.
    const trimmed = reason.trim()
    const named = /^[A-Z]/.test(trimmed) || trimmed.toLowerCase().includes(providerId)
    super(named ? trimmed : `${providerId} is not set up yet — ${trimmed}`)
    this.name = 'PaymentUnconfiguredError'
  }
}

export interface PaymentProvider {
  readonly id: string

  /** Never throws — an absent credential is a state, not a failure. */
  status(): ProviderStatus

  createSession(ctx: PaymentContext, input: CreatePaymentInput): Promise<PaymentSession>
  capture(ctx: PaymentContext, session: PaymentSession): Promise<PaymentSession>
  refund(ctx: PaymentContext, session: PaymentSession, amount: Money): Promise<PaymentSession>
}
