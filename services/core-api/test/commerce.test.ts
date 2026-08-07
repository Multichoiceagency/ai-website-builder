import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  canTransitionOrder,
  money,
  moneySchema,
  type Discount,
} from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'
import { applyDiscounts, computeTaxTotal, computeTotals } from '../src/lib/commerce/pricing.js'
import { createCommerceProvider } from '../src/adapters/commerce/index.js'
import { MedusaCommerceProvider } from '../src/adapters/commerce/medusa.js'
import { paymentProviderStatuses } from '../src/adapters/payments/index.js'

/**
 * Phase 5 coverage.
 *
 * Two halves, deliberately:
 *
 * 1. Pure tests for the arithmetic and the state graph — the parts that must be
 *    right and that nobody should have to start a database to check.
 * 2. End-to-end tests through `app.inject()` for the parts that only exist
 *    below the mock line: RLS, the permission engine, the checkout transaction.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `commerce-test-${suffix}@platform.local`
const OTHER_EMAIL = `commerce-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let otherCookie = ''
let otherTenantId = ''

let productId = ''
let variantId = ''
let cartId = ''
let orderId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function headers() {
  return { cookie, 'x-tenant-id': tenantId }
}

/** A discount as the repository would hand it back, for the pure tests. */
function discount(overrides: Partial<Discount>): Discount {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'TEST',
    type: 'percentage',
    percentageBps: 1000,
    amount: null,
    stackable: true,
    priority: 100,
    minimumSubtotal: null,
    usageLimit: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    active: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN ${tx([EMAIL, OTHER_EMAIL])}`
  })
  await app.close()
  await closeDatabase()
})

// region Pure: money

describe('money', () => {
  it('refuses a non-integer amount instead of rounding it', () => {
    expect(() => money(19.99, 'EUR')).toThrow()
    expect(moneySchema.safeParse({ amount: 12.5, currency: 'EUR' }).success).toBe(false)
    expect(money(1999, 'EUR')).toEqual({ amount: 1999, currency: 'EUR' })
  })

  it('normalises the currency code', () => {
    expect(money(100, 'eur').currency).toBe('EUR')
    expect(() => money(100, 'EURO')).toThrow()
  })
})

// endregion

// region Pure: discount maths

describe('discount maths', () => {
  const subtotal = money(10_000, 'EUR')
  const shipping = money(495, 'EUR')

  it('takes a percentage off the subtotal', () => {
    const result = applyDiscounts(subtotal, shipping, [discount({ percentageBps: 1000 })])
    expect(result.discountTotal).toEqual(money(1000, 'EUR'))
    expect(result.shippingTotal).toEqual(shipping)
  })

  it('takes a fixed amount off', () => {
    const result = applyDiscounts(subtotal, shipping, [
      discount({ type: 'fixed', percentageBps: null, amount: money(1500, 'EUR') }),
    ])
    expect(result.discountTotal).toEqual(money(1500, 'EUR'))
  })

  it('zeroes the shipping for a free-shipping code', () => {
    const result = applyDiscounts(subtotal, shipping, [
      discount({ type: 'free_shipping', percentageBps: null }),
    ])
    expect(result.discountTotal).toEqual(money(0, 'EUR'))
    expect(result.shippingTotal).toEqual(money(0, 'EUR'))
  })

  it('stacks percentages against the original subtotal, not against each other', () => {
    const result = applyDiscounts(subtotal, shipping, [
      discount({ id: '00000000-0000-0000-0000-00000000000a', code: 'TEN', percentageBps: 1000 }),
      discount({ id: '00000000-0000-0000-0000-00000000000b', code: 'FIVE', percentageBps: 500 }),
    ])
    // 15% of 100,00 — not 10% then 5% of the remainder, which would be 14,50.
    expect(result.discountTotal).toEqual(money(1500, 'EUR'))
    expect(result.applied).toHaveLength(2)
  })

  it('lets a non-stackable discount win alone', () => {
    const result = applyDiscounts(subtotal, shipping, [
      discount({ id: '00000000-0000-0000-0000-00000000000a', code: 'STACK', percentageBps: 1000 }),
      discount({
        id: '00000000-0000-0000-0000-00000000000b',
        code: 'EXCLUSIVE',
        percentageBps: 2500,
        stackable: false,
      }),
    ])
    expect(result.applied).toHaveLength(1)
    expect(result.applied[0]?.code).toBe('EXCLUSIVE')
    expect(result.discountTotal).toEqual(money(2500, 'EUR'))
  })

  it('picks the most valuable of two exclusive discounts', () => {
    const result = applyDiscounts(subtotal, shipping, [
      discount({ id: '00000000-0000-0000-0000-00000000000a', code: 'SMALL', percentageBps: 500, stackable: false }),
      discount({ id: '00000000-0000-0000-0000-00000000000b', code: 'BIG', percentageBps: 3000, stackable: false }),
    ])
    expect(result.applied[0]?.code).toBe('BIG')
  })

  it('never discounts more than the cart is worth', () => {
    const result = applyDiscounts(money(1000, 'EUR'), shipping, [
      discount({ type: 'fixed', percentageBps: null, amount: money(9999, 'EUR') }),
    ])
    expect(result.discountTotal).toEqual(money(1000, 'EUR'))
  })

  it('ignores a discount below its minimum, an expired one and an exhausted one', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()

    const belowMinimum = applyDiscounts(money(1000, 'EUR'), shipping, [
      discount({ minimumSubtotal: money(5000, 'EUR') }),
    ])
    const expired = applyDiscounts(subtotal, shipping, [discount({ endsAt: yesterday })])
    const exhausted = applyDiscounts(subtotal, shipping, [discount({ usageLimit: 1, usageCount: 1 })])

    expect(belowMinimum.applied).toHaveLength(0)
    expect(expired.applied).toHaveLength(0)
    expect(exhausted.applied).toHaveLength(0)
  })

  it('ignores a fixed discount in another currency rather than converting it', () => {
    const result = applyDiscounts(subtotal, shipping, [
      discount({ type: 'fixed', percentageBps: null, amount: money(1000, 'USD') }),
    ])
    expect(result.discountTotal).toEqual(money(0, 'EUR'))
  })

  it('keeps every total an integer', () => {
    const { totals } = computeTotals({
      currency: 'EUR',
      lines: [{ lineTotal: money(3333, 'EUR'), taxRateBps: 2100 }],
      shipping: money(495, 'EUR'),
      discounts: [discount({ percentageBps: 3333 })],
    })

    for (const value of Object.values(totals)) {
      expect(Number.isInteger(value.amount)).toBe(true)
    }
    expect(totals.total.amount).toBe(3333 - totals.discountTotal.amount + 495)
  })

  it('extracts tax from a tax-inclusive total', () => {
    // 21% contained in €121,00 is €21,00.
    const tax = computeTaxTotal([{ lineTotal: money(12_100, 'EUR'), taxRateBps: 2100 }], money(0, 'EUR'))
    expect(tax).toEqual(money(2100, 'EUR'))
  })

  it('reduces the tax when a discount reduces the price', () => {
    const tax = computeTaxTotal(
      [{ lineTotal: money(12_100, 'EUR'), taxRateBps: 2100 }],
      money(6050, 'EUR'),
    )
    expect(tax).toEqual(money(1050, 'EUR'))
  })
})

// endregion

// region Pure: order state graph

describe('order state transitions', () => {
  it('allows only the moves the timeline can justify', () => {
    expect(canTransitionOrder('pending', 'paid')).toBe(true)
    expect(canTransitionOrder('pending', 'cancelled')).toBe(true)
    expect(canTransitionOrder('paid', 'fulfilled')).toBe(true)
    expect(canTransitionOrder('paid', 'refunded')).toBe(true)
  })

  it('refuses to move backwards or out of a terminal state', () => {
    expect(canTransitionOrder('pending', 'fulfilled')).toBe(false)
    expect(canTransitionOrder('fulfilled', 'paid')).toBe(false)
    expect(canTransitionOrder('cancelled', 'paid')).toBe(false)
    expect(canTransitionOrder('refunded', 'fulfilled')).toBe(false)
  })
})

// endregion

// region Pure: adapter selection

describe('provider selection (ADR-0006)', () => {
  it('reports Medusa as unconfigured when MEDUSA_URL is unset', () => {
    const medusa = new MedusaCommerceProvider('', '')
    const status = medusa.status()

    expect(status.id).toBe('medusa')
    expect(status.configured).toBe(false)
    expect(status.reason).toContain('MEDUSA_URL')
  })

  it('falls back to the platform provider, which works without any vendor', () => {
    const provider = createCommerceProvider()
    expect(provider.id).toBe(process.env.MEDUSA_URL ? 'medusa' : 'postgres')
    expect(provider.status().configured).toBe(true)
  })

  it('selects Medusa the moment a URL exists — nothing else changes', () => {
    const configured = new MedusaCommerceProvider('https://commerce.example.test', 'token')
    expect(configured.status().configured).toBe(true)
    expect(configured.status().reason).toBeNull()
  })

  it('always leaves one usable payment provider, gateways or not', () => {
    const statuses = paymentProviderStatuses()
    expect(statuses.some((status) => status.configured)).toBe(true)
    expect(statuses.map((status) => status.id)).toContain('manual')
  })
})

// endregion

// region End-to-end

describe('commerce API', () => {
  it('registers two separate workspaces', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: PASSWORD, name: 'Commerce', organizationName: `Commerce ${suffix}` },
    })
    expect(first.statusCode).toBe(201)
    tenantId = body(first).data.activeTenantId
    cookie = String(first.headers['set-cookie']).split(';')[0]!

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: OTHER_EMAIL,
        password: PASSWORD,
        name: 'Other',
        organizationName: `Other ${suffix}`,
      },
    })
    expect(second.statusCode).toBe(201)
    otherTenantId = body(second).data.activeTenantId
    otherCookie = String(second.headers['set-cookie']).split(';')[0]!
  })

  it('reports which providers are configured', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/commerce/status', headers: headers() })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.commerce.configured).toBe(true)
    expect(Array.isArray(body(response).data.payments)).toBe(true)
  })

  it('creates a product with an integer price', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commerce/products',
      headers: headers(),
      payload: {
        title: `Test Product ${suffix}`,
        status: 'active',
        taxRateBps: 2100,
        variants: [{ title: 'Default', sku: `SKU-${suffix}`, price: { amount: 2500, currency: 'EUR' } }],
      },
    })

    expect(response.statusCode).toBe(201)
    productId = body(response).data.id
    variantId = body(response).data.variants[0].id
    expect(body(response).data.variants[0].price).toEqual({ amount: 2500, currency: 'EUR' })
  })

  it('refuses a fractional price at the boundary', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commerce/products',
      headers: headers(),
      payload: {
        title: 'Float Product',
        variants: [{ title: 'Default', price: { amount: 25.5, currency: 'EUR' } }],
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('hides another workspace’s product behind a 404, not a 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/commerce/products/${productId}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(response.statusCode).toBe(404)
  })

  it('refuses an unauthenticated catalogue read', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/commerce/products' })
    expect(response.statusCode).toBe(401)
  })

  it('stocks the variant at a location', async () => {
    const location = await app.inject({
      method: 'POST',
      url: '/api/v1/commerce/locations',
      headers: headers(),
      payload: { name: 'Warehouse', code: `warehouse-${suffix}` },
    })
    expect(location.statusCode).toBe(201)

    const level = await app.inject({
      method: 'PUT',
      url: `/api/v1/commerce/variants/${variantId}/inventory`,
      headers: headers(),
      payload: { locationId: body(location).data.id, available: 10 },
    })

    expect(level.statusCode).toBe(200)
    expect(body(level).data.available).toBe(10)
  })

  it('builds a cart and recomputes its totals from the lines', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/commerce/carts',
      headers: headers(),
      payload: { currency: 'EUR' },
    })
    expect(created.statusCode).toBe(201)
    cartId = body(created).data.id

    const withItem = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/carts/${cartId}/items`,
      headers: headers(),
      payload: { variantId, quantity: 2 },
    })

    expect(withItem.statusCode).toBe(200)
    expect(body(withItem).data.totals.subtotal).toEqual({ amount: 5000, currency: 'EUR' })
    // 21% contained in €50,00.
    expect(body(withItem).data.totals.taxTotal.amount).toBe(868)
  })

  it('applies a discount code to the cart', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/commerce/discounts',
      headers: headers(),
      payload: { code: `TEN${suffix.toUpperCase()}`, type: 'percentage', percentageBps: 1000 },
    })
    expect(created.statusCode).toBe(201)

    const applied = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/carts/${cartId}/discounts`,
      headers: headers(),
      payload: { code: body(created).data.code },
    })

    expect(applied.statusCode).toBe(200)
    expect(body(applied).data.totals.discountTotal).toEqual({ amount: 500, currency: 'EUR' })
    expect(body(applied).data.totals.total).toEqual({ amount: 4500, currency: 'EUR' })
  })

  it('checks out and places an order', async () => {
    const checkout = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/carts/${cartId}/checkout`,
      headers: headers(),
      payload: { email: `shopper-${suffix}@example.test` },
    })
    expect(checkout.statusCode).toBe(200)
    expect(body(checkout).data.cart.totals.total.amount).toBe(4500)

    const placed = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/carts/${cartId}/complete`,
      headers: headers(),
      payload: {},
    })

    expect(placed.statusCode).toBe(201)
    orderId = body(placed).data.id
    expect(body(placed).data.status).toBe('pending')
    expect(body(placed).data.totals.total).toEqual({ amount: 4500, currency: 'EUR' })
    // The opening timeline entry exists from the first moment the order does.
    expect(body(placed).data.timeline).toHaveLength(1)
  })

  it('refuses to check the same cart out twice', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/carts/${cartId}/complete`,
      headers: headers(),
      payload: {},
    })
    expect(response.statusCode).toBe(409)
  })

  it('moved the stock when the order was placed', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/commerce/variants/${variantId}/inventory`,
      headers: headers(),
    })
    expect(body(response).data[0].available).toBe(8)
  })

  it('captures the payment and moves the order to paid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/orders/${orderId}/capture`,
      headers: headers(),
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.paymentStatus).toBe('captured')
    expect(body(response).data.status).toBe('paid')
  })

  it('refuses an illegal status transition', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/orders/${orderId}/transition`,
      headers: headers(),
      payload: { status: 'pending' },
    })
    expect(response.statusCode).toBe(409)
  })

  it('fulfils the order and records it on the timeline', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/orders/${orderId}/transition`,
      headers: headers(),
      payload: { status: 'fulfilled', note: 'Handed to the carrier.' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.status).toBe('fulfilled')
    expect(body(response).data.timeline.at(-1).note).toBe('Handed to the carrier.')
  })

  it('refunds part of the order without changing its status', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/orders/${orderId}/refunds`,
      headers: headers(),
      payload: { amount: { amount: 1000, currency: 'EUR' }, reason: 'Goodwill' },
    })
    expect(response.statusCode).toBe(201)

    const order = await app.inject({
      method: 'GET',
      url: `/api/v1/commerce/orders/${orderId}`,
      headers: headers(),
    })
    expect(body(order).data.status).toBe('fulfilled')
    expect(body(order).data.refundedTotal).toEqual({ amount: 1000, currency: 'EUR' })
  })

  it('refuses to refund more than is left', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/commerce/orders/${orderId}/refunds`,
      headers: headers(),
      payload: { amount: { amount: 99_999, currency: 'EUR' } },
    })
    expect(response.statusCode).toBe(400)
  })

  it('created a customer with a lifetime value net of the refund', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/commerce/customers',
      headers: headers(),
    })

    expect(response.statusCode).toBe(200)
    const customer = body(response).data.find((entry: { email: string }) =>
      entry.email.startsWith(`shopper-${suffix}`),
    )
    expect(customer.ordersCount).toBe(1)
    expect(customer.lifetimeValue).toEqual({ amount: 3500, currency: 'EUR' })
  })

  it('shows no orders to the other workspace', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/commerce/orders',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data).toHaveLength(0)
  })

  it('recorded every commerce event in the audit log', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/current/activity',
      headers: headers(),
    })

    const names = body(response).data.map((entry: { name: string }) => entry.name)
    expect(names).toContain('product.created')
    expect(names).toContain('cart.created')
    expect(names).toContain('checkout.started')
    expect(names).toContain('order.placed')
    expect(names).toContain('payment.captured')
    expect(names).toContain('refund.created')
  })
})

// endregion
