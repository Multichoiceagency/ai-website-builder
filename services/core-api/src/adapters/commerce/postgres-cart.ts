import {
  cartSchema,
  money,
  zeroMoney,
  type Cart,
  type CommerceAddress,
  type Money,
} from '@platform/schemas'
import type { Tx } from '../../db/client.js'
import { findShippingRateById } from '../../db/repositories/commerce.js'
import {
  findCartById,
  listCartItems,
  type CartItemRecord,
  type CartRecord,
} from '../../db/repositories/commerce-orders.js'
import { ConflictError, NotFoundError } from '../../lib/errors.js'
import { computeTotals, lineTotalFor } from '../../lib/commerce/pricing.js'
import { findDiscountsByCodes } from '../../db/repositories/commerce-customers.js'
import { quoteShipping } from '../shipping/index.js'

/**
 * Turning cart rows into a priced `Cart`.
 *
 * A cart's money is never stored — it is recomputed from the lines, the live
 * discounts and the selected shipping rate on every read. That is what makes an
 * expired code stop working the moment it expires, and what guarantees a cart
 * can never disagree with its own contents.
 */

export function emptyAddress(): CommerceAddress {
  return {
    name: '',
    company: '',
    line1: '',
    line2: '',
    postalCode: '',
    city: '',
    region: '',
    country: 'NL',
    phone: '',
  }
}

/**
 * The selected rate, priced for this cart.
 *
 * Asking the shipping adapter rather than reading the column keeps the
 * free-over-threshold rule in exactly one place (ADR-0006).
 */
async function shippingFor(
  tx: Tx,
  tenantId: string,
  record: CartRecord,
  subtotal: Money,
): Promise<Money> {
  if (!record.shippingRateId) return zeroMoney(subtotal.currency)

  const rate = await findShippingRateById(tx, tenantId, record.shippingRateId)
  if (!rate) return zeroMoney(subtotal.currency)

  const [quote] = await quoteShipping(
    { tenantId },
    {
      subtotal,
      country: record.shippingAddress?.country ?? '',
      weightGrams: 0,
      rates: [rate],
    },
  )

  return quote?.price ?? rate.price
}

export async function assembleCart(
  tx: Tx,
  tenantId: string,
  record: CartRecord,
  items: CartItemRecord[],
): Promise<Cart> {
  const currency = record.currency

  const lines = items.map((item) => {
    const unitPrice = money(item.unitPriceAmount, item.currency)
    return {
      id: item.id,
      variantId: item.variantId,
      productId: item.productId,
      title: item.title,
      variantTitle: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice,
      taxRateBps: item.taxRateBps,
      lineTotal: lineTotalFor(unitPrice, item.quantity),
    }
  })

  const subtotal = money(
    lines.reduce((sum, line) => sum + line.lineTotal.amount, 0),
    currency,
  )

  const discounts = await findDiscountsByCodes(tx, tenantId, record.discountCodes)
  const shipping = await shippingFor(tx, tenantId, record, subtotal)

  const { totals, applied } = computeTotals({
    currency,
    lines: lines.map((line) => ({ lineTotal: line.lineTotal, taxRateBps: line.taxRateBps })),
    shipping,
    discounts,
  })

  return cartSchema.parse({
    id: record.id,
    status: record.status,
    currency,
    email: record.email,
    customerId: record.customerId,
    items: lines,
    discountCodes: record.discountCodes,
    appliedDiscounts: applied,
    shippingRateId: record.shippingRateId,
    totals,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

export async function loadCart(tx: Tx, tenantId: string, cartId: string): Promise<Cart | null> {
  const record = await findCartById(tx, tenantId, cartId)
  if (!record) return null
  return assembleCart(tx, tenantId, record, await listCartItems(tx, tenantId, cartId))
}

export async function reloadCart(tx: Tx, tenantId: string, cartId: string): Promise<Cart> {
  const cart = await loadCart(tx, tenantId, cartId)
  if (!cart) throw new NotFoundError('Cart')
  return cart
}

/** A cart that has already been checked out is not a cart any more. */
export async function requireOpenCart(tx: Tx, tenantId: string, cartId: string): Promise<CartRecord> {
  const record = await findCartById(tx, tenantId, cartId)
  if (!record) throw new NotFoundError('Cart')
  if (record.status !== 'open') throw new ConflictError('This cart has already been checked out.')
  return record
}
