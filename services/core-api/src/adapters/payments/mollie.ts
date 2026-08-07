import type { Money, PaymentSession, PaymentStatus, ProviderStatus } from '@platform/schemas'
import { PaymentUnconfiguredError, type CreatePaymentInput, type PaymentContext, type PaymentProvider } from './types.js'

/**
 * Mollie, behind the platform's payment contract.
 *
 * Mollie speaks decimal strings ("49.90"), Stripe speaks integer cents, and the
 * platform speaks integer cents everywhere. The conversion is a two-line detail
 * *inside this adapter* — which is precisely the kind of thing that becomes a
 * rounding bug when a vendor's representation is allowed to spread.
 */

const API_BASE = 'https://api.mollie.com/v2'

/** Mollie's payment states, mapped onto ours. */
function toPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case 'authorized':
      return 'authorized'
    case 'paid':
      return 'captured'
    case 'failed':
    case 'canceled':
    case 'expired':
      return 'failed'
    default:
      return 'requires_action'
  }
}

/** 4990 → "49.90". Integer in, string out; no float ever holds the amount. */
function toDecimalString(amount: Money): string {
  const sign = amount.amount < 0 ? '-' : ''
  const absolute = Math.abs(amount.amount)
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

interface MolliePayment {
  id: string
  status: string
  _links?: { checkout?: { href?: string } }
}

export class MolliePaymentProvider implements PaymentProvider {
  readonly id = 'mollie'
  readonly #apiKey = process.env.MOLLIE_API_KEY ?? ''

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: this.#apiKey.length > 0,
      capabilities: ['redirect', 'capture', 'refund', 'ideal'],
      reason: this.#apiKey ? null : 'MOLLIE_API_KEY is not set on this installation.',
    }
  }

  async createSession(_ctx: PaymentContext, input: CreatePaymentInput): Promise<PaymentSession> {
    const payment = await this.#post<MolliePayment>('/payments', {
      amount: { currency: input.amount.currency, value: toDecimalString(input.amount) },
      description: input.description,
      redirectUrl: input.returnUrl ?? 'https://example.invalid/checkout/return',
      metadata: { reference: input.reference, email: input.email },
    })

    return {
      id: payment.id,
      providerId: this.id,
      status: toPaymentStatus(payment.status),
      amount: input.amount,
      providerReference: payment.id,
      redirectUrl: payment._links?.checkout?.href ?? null,
    }
  }

  /**
   * Mollie captures on the shopper's redirect; there is nothing for us to
   * trigger. We re-read the payment so the answer is the provider's, not ours.
   */
  async capture(_ctx: PaymentContext, session: PaymentSession): Promise<PaymentSession> {
    const reference = this.#requireReference(session)
    const payment = await this.#get<MolliePayment>(`/payments/${reference}`)
    return { ...session, status: toPaymentStatus(payment.status) }
  }

  async refund(_ctx: PaymentContext, session: PaymentSession, amount: Money): Promise<PaymentSession> {
    const reference = this.#requireReference(session)
    await this.#post(`/payments/${reference}/refunds`, {
      amount: { currency: amount.currency, value: toDecimalString(amount) },
    })
    return { ...session, status: 'refunded', amount }
  }

  #requireReference(session: PaymentSession): string {
    if (!session.providerReference) {
      throw new PaymentUnconfiguredError(this.id, 'the session carries no provider reference.')
    }
    return session.providerReference
  }

  async #request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.#apiKey) {
      throw new PaymentUnconfiguredError(this.id, 'MOLLIE_API_KEY is not set.')
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        'content-type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    })

    if (!response.ok) {
      throw new Error(`Mollie refused the request (HTTP ${response.status}).`)
    }
    return (await response.json()) as T
  }

  #get<T>(path: string): Promise<T> {
    return this.#request<T>(path, { method: 'GET' })
  }

  #post<T>(path: string, body: unknown): Promise<T> {
    return this.#request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  }
}
