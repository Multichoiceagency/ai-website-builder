import type { Money, PaymentSession, PaymentStatus, ProviderStatus } from '@platform/schemas'
import { PaymentUnconfiguredError, type CreatePaymentInput, type PaymentContext, type PaymentProvider } from './types.js'

/**
 * Stripe, behind the platform's payment contract.
 *
 * Everything Stripe-shaped lives in this file: the endpoint, the form encoding,
 * the intent status vocabulary, the lower-cased currency. Callers see a
 * `PaymentSession` and nothing else.
 *
 * No SDK — the three calls we need are form posts, and a dependency that ships
 * a vendor's type system into the build is exactly what ADR-0006 exists to
 * prevent. The secret key is read from the environment and never logged.
 */

const API_BASE = 'https://api.stripe.com/v1'

/** Stripe's intent lifecycle, mapped onto ours. */
function toPaymentStatus(intentStatus: string): PaymentStatus {
  switch (intentStatus) {
    case 'requires_capture':
      return 'authorized'
    case 'succeeded':
      return 'captured'
    case 'canceled':
      return 'failed'
    default:
      return 'requires_action'
  }
}

interface StripeIntent {
  id: string
  status: string
  next_action?: { redirect_to_url?: { url?: string } } | null
}

export class StripePaymentProvider implements PaymentProvider {
  readonly id = 'stripe'
  readonly #secretKey: string

  constructor(secretKey = process.env.STRIPE_SECRET_KEY ?? '') {
    this.#secretKey = secretKey.trim()
  }

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: this.#secretKey.length > 0,
      capabilities: ['authorize', 'capture', 'refund', 'redirect'],
      // Merchant-facing: never expose env var names in the dashboard.
      reason: this.#secretKey ? null : 'Stripe needs setup — open Payments to install.',
    }
  }

  async createSession(_ctx: PaymentContext, input: CreatePaymentInput): Promise<PaymentSession> {
    const intent = await this.#post<StripeIntent>('/payment_intents', {
      amount: String(input.amount.amount),
      currency: input.amount.currency.toLowerCase(),
      capture_method: 'manual',
      receipt_email: input.email,
      description: input.description,
      'metadata[reference]': input.reference,
    })

    return this.#toSession(intent, input.amount)
  }

  async capture(_ctx: PaymentContext, session: PaymentSession): Promise<PaymentSession> {
    const reference = this.#requireReference(session)
    const intent = await this.#post<StripeIntent>(`/payment_intents/${reference}/capture`, {})
    return this.#toSession(intent, session.amount)
  }

  async refund(_ctx: PaymentContext, session: PaymentSession, amount: Money): Promise<PaymentSession> {
    const reference = this.#requireReference(session)
    await this.#post('/refunds', { payment_intent: reference, amount: String(amount.amount) })
    return { ...session, status: 'refunded', amount }
  }

  #requireReference(session: PaymentSession): string {
    if (!session.providerReference) {
      throw new PaymentUnconfiguredError(this.id, 'Stripe session is missing a provider reference.')
    }
    return session.providerReference
  }

  #toSession(intent: StripeIntent, amount: Money): PaymentSession {
    return {
      id: intent.id,
      providerId: this.id,
      status: toPaymentStatus(intent.status),
      amount,
      providerReference: intent.id,
      redirectUrl: intent.next_action?.redirect_to_url?.url ?? null,
    }
  }

  async #post<T>(path: string, body: Record<string, string>): Promise<T> {
    if (!this.#secretKey) {
      console.warn('[stripe] Refusing request: secret key is not set.')
      throw new PaymentUnconfiguredError(
        this.id,
        'Stripe needs setup — open Payments to install.',
      )
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.#secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      // The body can echo request parameters, so only the status is surfaced.
      throw new Error(`Stripe refused the request (HTTP ${response.status}).`)
    }
    return (await response.json()) as T
  }
}
