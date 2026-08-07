import {
  lineItemSchema,
  orderSchema,
  orderSummarySchema,
  orderTimelineEntrySchema,
  refundSchema,
  type AppliedDiscount,
  type CartStatus,
  type CommerceAddress,
  type LineItem,
  type Order,
  type OrderQuery,
  type OrderStatus,
  type OrderSummary,
  type OrderTimelineEntry,
  type PaymentStatus,
  type Refund,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { readAmount, readCount, readMoney } from '../money.js'

/**
 * Carts, orders, the order timeline and refunds (ADR-0005).
 *
 * A cart is live: its totals are derived on every read, because a discount can
 * expire while someone is standing in the basket. An order is a snapshot: its
 * totals are columns, because what a customer paid must not change when the
 * catalogue does.
 */

// region Carts

export interface CartRecord {
  id: string
  status: CartStatus
  currency: string
  email: string | null
  customerId: string | null
  discountCodes: string[]
  shippingRateId: string | null
  shippingAddress: CommerceAddress | null
  billingAddress: CommerceAddress | null
  createdAt: Date
  updatedAt: Date
}

export interface CartItemRecord {
  id: string
  variantId: string
  productId: string
  title: string
  variantTitle: string
  sku: string | null
  quantity: number
  unitPriceAmount: number
  currency: string
  taxRateBps: number
}

interface CartRow {
  id: string
  status: CartStatus
  currency: string
  email: string | null
  customer_id: string | null
  discount_codes: unknown
  shipping_rate_id: string | null
  shipping_address: unknown
  billing_address: unknown
  created_at: Date
  updated_at: Date
}

function toCartRecord(row: CartRow): CartRecord {
  return {
    id: row.id,
    status: row.status,
    currency: row.currency,
    email: row.email,
    customerId: row.customer_id,
    discountCodes: readJson<string[]>(row.discount_codes, []),
    shippingRateId: row.shipping_rate_id,
    shippingAddress: readJson<CommerceAddress | null>(row.shipping_address, null),
    billingAddress: readJson<CommerceAddress | null>(row.billing_address, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const CART_COLUMNS = [
  'id',
  'status',
  'currency',
  'email',
  'customer_id',
  'discount_codes',
  'shipping_rate_id',
  'shipping_address',
  'billing_address',
  'created_at',
  'updated_at',
]

export async function insertCart(
  tx: Tx,
  input: { tenantId: string; currency: string; email: string | null; customerId: string | null },
): Promise<CartRecord> {
  const [row] = await tx<CartRow[]>`
    INSERT INTO commerce_carts (tenant_id, currency, email, customer_id)
    VALUES (${input.tenantId}, ${input.currency}, ${input.email}, ${input.customerId})
    RETURNING ${tx(CART_COLUMNS)}
  `
  return toCartRecord(row!)
}

export async function findCartById(tx: Tx, tenantId: string, cartId: string): Promise<CartRecord | null> {
  const [row] = await tx<CartRow[]>`
    SELECT ${tx(CART_COLUMNS)} FROM commerce_carts
    WHERE tenant_id = ${tenantId} AND id = ${cartId} LIMIT 1
  `
  return row ? toCartRecord(row) : null
}

export async function updateCart(
  tx: Tx,
  tenantId: string,
  cartId: string,
  patch: {
    status?: CartStatus
    email?: string | null
    customerId?: string | null
    discountCodes?: string[]
    shippingRateId?: string | null
    shippingAddress?: CommerceAddress | null
    billingAddress?: CommerceAddress | null
  },
): Promise<CartRecord | null> {
  const [row] = await tx<CartRow[]>`
    UPDATE commerce_carts SET
      status           = COALESCE(${patch.status ?? null}::text, status),
      email            = COALESCE(${patch.email ?? null}::text, email),
      customer_id      = COALESCE(${patch.customerId ?? null}::uuid, customer_id),
      discount_codes   = COALESCE(${patch.discountCodes ? jsonParam(tx, patch.discountCodes) : null}::jsonb, discount_codes),
      shipping_rate_id = ${patch.shippingRateId === undefined ? tx`shipping_rate_id` : tx`${patch.shippingRateId}::uuid`},
      shipping_address = COALESCE(${patch.shippingAddress ? jsonParam(tx, patch.shippingAddress) : null}::jsonb, shipping_address),
      billing_address  = COALESCE(${patch.billingAddress ? jsonParam(tx, patch.billingAddress) : null}::jsonb, billing_address)
    WHERE tenant_id = ${tenantId} AND id = ${cartId}
    RETURNING ${tx(CART_COLUMNS)}
  `
  return row ? toCartRecord(row) : null
}

interface CartItemRow {
  id: string
  variant_id: string
  product_id: string
  title: string
  variant_title: string
  sku: string | null
  quantity: number
  unit_price_amount: string
  currency: string
  tax_rate_bps: number
}

function toCartItemRecord(row: CartItemRow): CartItemRecord {
  return {
    id: row.id,
    variantId: row.variant_id,
    productId: row.product_id,
    title: row.title,
    variantTitle: row.variant_title,
    sku: row.sku,
    quantity: row.quantity,
    unitPriceAmount: readAmount(row.unit_price_amount),
    currency: row.currency,
    taxRateBps: row.tax_rate_bps,
  }
}

const CART_ITEM_COLUMNS = [
  'id',
  'variant_id',
  'product_id',
  'title',
  'variant_title',
  'sku',
  'quantity',
  'unit_price_amount',
  'currency',
  'tax_rate_bps',
]

export async function listCartItems(tx: Tx, tenantId: string, cartId: string): Promise<CartItemRecord[]> {
  const rows = await tx<CartItemRow[]>`
    SELECT ${tx(CART_ITEM_COLUMNS)} FROM commerce_cart_items
    WHERE tenant_id = ${tenantId} AND cart_id = ${cartId}
    ORDER BY created_at ASC
  `
  return rows.map(toCartItemRecord)
}

/**
 * Adding the same variant twice raises the quantity instead of creating a
 * second line — the unique constraint makes that the only possible outcome, and
 * the upsert makes it the intended one.
 */
export async function upsertCartItem(
  tx: Tx,
  input: {
    tenantId: string
    cartId: string
    variantId: string
    productId: string
    title: string
    variantTitle: string
    sku: string | null
    quantity: number
    unitPriceAmount: number
    currency: string
    taxRateBps: number
  },
): Promise<void> {
  await tx`
    INSERT INTO commerce_cart_items (
      tenant_id, cart_id, variant_id, product_id, title, variant_title, sku,
      quantity, unit_price_amount, currency, tax_rate_bps
    )
    VALUES (
      ${input.tenantId}, ${input.cartId}, ${input.variantId}, ${input.productId}, ${input.title},
      ${input.variantTitle}, ${input.sku}, ${input.quantity}, ${input.unitPriceAmount},
      ${input.currency}, ${input.taxRateBps}
    )
    ON CONFLICT (cart_id, variant_id) DO UPDATE
      SET quantity = commerce_cart_items.quantity + EXCLUDED.quantity
  `
}

export async function setCartItemQuantity(
  tx: Tx,
  tenantId: string,
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE commerce_cart_items SET quantity = ${quantity}
    WHERE tenant_id = ${tenantId} AND cart_id = ${cartId} AND id = ${itemId}
    RETURNING id
  `
  return rows.length > 0
}

export async function deleteCartItem(
  tx: Tx,
  tenantId: string,
  cartId: string,
  itemId: string,
): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM commerce_cart_items
    WHERE tenant_id = ${tenantId} AND cart_id = ${cartId} AND id = ${itemId}
    RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Order numbers

/**
 * The next order number for a tenant.
 *
 * `max(number) + 1` races: two checkouts in the same millisecond read the same
 * maximum and one of them loses to the unique constraint. An upsert with
 * `RETURNING` takes a row lock and hands out each number exactly once.
 */
export async function nextOrderNumber(tx: Tx, tenantId: string): Promise<number> {
  const [row] = await tx<{ value: string }[]>`
    INSERT INTO commerce_counters (tenant_id, name, value)
    VALUES (${tenantId}, 'order_number', 1001)
    ON CONFLICT (tenant_id, name) DO UPDATE SET value = commerce_counters.value + 1
    RETURNING value
  `
  return readCount(row!.value)
}

// endregion

// region Orders

interface OrderRow {
  id: string
  number: number
  status: OrderStatus
  cart_id: string | null
  customer_id: string | null
  email: string
  currency: string
  subtotal_amount: string
  discount_amount: string
  shipping_amount: string
  tax_amount: string
  total_amount: string
  refunded_amount: string
  applied_discounts: unknown
  shipping_address: unknown
  billing_address: unknown
  shipping_method: string
  payment_provider_id: string | null
  payment_status: PaymentStatus | null
  placed_at: Date
  updated_at: Date
  item_count: number
}

interface OrderItemRow {
  id: string
  variant_id: string
  product_id: string
  title: string
  variant_title: string
  sku: string | null
  quantity: number
  unit_price_amount: string
  currency: string
  tax_rate_bps: number
  line_total_amount: string
}

function toOrderSummary(row: OrderRow): OrderSummary {
  return orderSummarySchema.parse({
    id: row.id,
    number: row.number,
    status: row.status,
    email: row.email,
    customerId: row.customer_id,
    currency: row.currency,
    total: readMoney(row.total_amount, row.currency),
    refundedTotal: readMoney(row.refunded_amount, row.currency),
    itemCount: readCount(row.item_count),
    placedAt: row.placed_at,
  })
}

function toLineItem(row: OrderItemRow): LineItem {
  return lineItemSchema.parse({
    id: row.id,
    variantId: row.variant_id,
    productId: row.product_id,
    title: row.title,
    variantTitle: row.variant_title,
    sku: row.sku,
    quantity: row.quantity,
    unitPrice: readMoney(row.unit_price_amount, row.currency),
    taxRateBps: row.tax_rate_bps,
    lineTotal: readMoney(row.line_total_amount, row.currency),
  })
}

const ORDER_SELECT = (tx: Tx) => tx`
  o.id, o.number, o.status, o.cart_id, o.customer_id, o.email, o.currency,
  o.subtotal_amount, o.discount_amount, o.shipping_amount, o.tax_amount, o.total_amount,
  o.refunded_amount, o.applied_discounts, o.shipping_address, o.billing_address,
  o.shipping_method, o.payment_provider_id, o.payment_status, o.placed_at, o.updated_at,
  (SELECT coalesce(sum(oi.quantity), 0) FROM commerce_order_items oi WHERE oi.order_id = o.id) AS item_count
`

export async function listOrders(
  tx: Tx,
  tenantId: string,
  query: OrderQuery,
): Promise<{ items: OrderSummary[]; total: number }> {
  const term = query.search ? `%${query.search}%` : null
  // Rebuilt per statement: a postgres.js fragment belongs to one query.
  const where = () => tx`
    o.tenant_id = ${tenantId}
    ${query.status ? tx`AND o.status = ${query.status}` : tx``}
    ${query.customerId ? tx`AND o.customer_id = ${query.customerId}` : tx``}
    ${term ? tx`AND (o.email ILIKE ${term} OR CAST(o.number AS text) LIKE ${term})` : tx``}
  `

  const rows = await tx<OrderRow[]>`
    SELECT ${ORDER_SELECT(tx)} FROM commerce_orders o
    WHERE ${where()}
    ORDER BY o.placed_at DESC
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `

  const [counted] = await tx<{ total: string }[]>`
    SELECT count(*) AS total FROM commerce_orders o WHERE ${where()}
  `

  return { items: rows.map(toOrderSummary), total: readCount(counted?.total) }
}

export async function listOrdersForCustomer(
  tx: Tx,
  tenantId: string,
  customerId: string,
): Promise<OrderSummary[]> {
  const rows = await tx<OrderRow[]>`
    SELECT ${ORDER_SELECT(tx)} FROM commerce_orders o
    WHERE o.tenant_id = ${tenantId} AND o.customer_id = ${customerId}
    ORDER BY o.placed_at DESC
    LIMIT 50
  `
  return rows.map(toOrderSummary)
}

async function assembleOrder(tx: Tx, tenantId: string, row: OrderRow): Promise<Order> {
  const [items, timeline, refunds] = await Promise.all([
    listOrderItems(tx, tenantId, row.id),
    listOrderTimeline(tx, tenantId, row.id),
    listRefunds(tx, tenantId, row.id),
  ])

  return orderSchema.parse({
    ...toOrderSummary(row),
    cartId: row.cart_id,
    items,
    totals: {
      subtotal: readMoney(row.subtotal_amount, row.currency),
      discountTotal: readMoney(row.discount_amount, row.currency),
      shippingTotal: readMoney(row.shipping_amount, row.currency),
      taxTotal: readMoney(row.tax_amount, row.currency),
      total: readMoney(row.total_amount, row.currency),
    },
    appliedDiscounts: readJson<AppliedDiscount[]>(row.applied_discounts, []),
    shippingAddress: readJson<CommerceAddress | null>(row.shipping_address, null),
    billingAddress: readJson<CommerceAddress | null>(row.billing_address, null),
    shippingMethod: row.shipping_method,
    paymentProviderId: row.payment_provider_id,
    paymentStatus: row.payment_status,
    timeline,
    refunds,
    updatedAt: row.updated_at,
  })
}

export async function findOrderById(tx: Tx, tenantId: string, orderId: string): Promise<Order | null> {
  const [row] = await tx<OrderRow[]>`
    SELECT ${ORDER_SELECT(tx)} FROM commerce_orders o
    WHERE o.tenant_id = ${tenantId} AND o.id = ${orderId} LIMIT 1
  `
  return row ? assembleOrder(tx, tenantId, row) : null
}

export async function listOrderItems(tx: Tx, tenantId: string, orderId: string): Promise<LineItem[]> {
  const rows = await tx<OrderItemRow[]>`
    SELECT id, variant_id, product_id, title, variant_title, sku, quantity,
           unit_price_amount, currency, tax_rate_bps, line_total_amount
    FROM commerce_order_items
    WHERE tenant_id = ${tenantId} AND order_id = ${orderId}
    ORDER BY title ASC
  `
  return rows.map(toLineItem)
}

export interface InsertOrderInput {
  tenantId: string
  number: number
  cartId: string | null
  customerId: string | null
  email: string
  currency: string
  subtotalAmount: number
  discountAmount: number
  shippingAmount: number
  taxAmount: number
  totalAmount: number
  appliedDiscounts: AppliedDiscount[]
  shippingAddress: CommerceAddress | null
  billingAddress: CommerceAddress | null
  shippingMethod: string
  paymentProviderId: string | null
  paymentStatus: PaymentStatus | null
  paymentReference: string | null
  items: {
    variantId: string
    productId: string
    title: string
    variantTitle: string
    sku: string | null
    quantity: number
    unitPriceAmount: number
    currency: string
    taxRateBps: number
    lineTotalAmount: number
  }[]
}

export async function insertOrder(tx: Tx, input: InsertOrderInput): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO commerce_orders (
      tenant_id, number, cart_id, customer_id, email, currency,
      subtotal_amount, discount_amount, shipping_amount, tax_amount, total_amount,
      applied_discounts, shipping_address, billing_address, shipping_method,
      payment_provider_id, payment_status, payment_reference
    )
    VALUES (
      ${input.tenantId}, ${input.number}, ${input.cartId}, ${input.customerId}, ${input.email},
      ${input.currency}, ${input.subtotalAmount}, ${input.discountAmount}, ${input.shippingAmount},
      ${input.taxAmount}, ${input.totalAmount}, ${jsonParam(tx, input.appliedDiscounts)},
      ${input.shippingAddress ? jsonParam(tx, input.shippingAddress) : null},
      ${input.billingAddress ? jsonParam(tx, input.billingAddress) : null},
      ${input.shippingMethod}, ${input.paymentProviderId}, ${input.paymentStatus},
      ${input.paymentReference}
    )
    RETURNING id
  `

  const orderId = row!.id

  for (const item of input.items) {
    await tx`
      INSERT INTO commerce_order_items (
        tenant_id, order_id, variant_id, product_id, title, variant_title, sku,
        quantity, unit_price_amount, currency, tax_rate_bps, line_total_amount
      )
      VALUES (
        ${input.tenantId}, ${orderId}, ${item.variantId}, ${item.productId}, ${item.title},
        ${item.variantTitle}, ${item.sku}, ${item.quantity}, ${item.unitPriceAmount},
        ${item.currency}, ${item.taxRateBps}, ${item.lineTotalAmount}
      )
    `
  }

  return orderId
}

export async function updateOrderStatus(
  tx: Tx,
  tenantId: string,
  orderId: string,
  status: OrderStatus,
): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE commerce_orders SET status = ${status}
    WHERE tenant_id = ${tenantId} AND id = ${orderId}
    RETURNING id
  `
  return rows.length > 0
}

export async function updateOrderPayment(
  tx: Tx,
  tenantId: string,
  orderId: string,
  payment: { providerId: string; status: PaymentStatus; reference: string | null },
): Promise<void> {
  await tx`
    UPDATE commerce_orders SET
      payment_provider_id = ${payment.providerId},
      payment_status      = ${payment.status},
      payment_reference   = ${payment.reference}
    WHERE tenant_id = ${tenantId} AND id = ${orderId}
  `
}

// endregion

// region Timeline and refunds

export async function insertOrderEvent(
  tx: Tx,
  input: { tenantId: string; orderId: string; status: OrderStatus; note: string; actorLabel: string },
): Promise<void> {
  await tx`
    INSERT INTO commerce_order_events (tenant_id, order_id, status, note, actor_label)
    VALUES (${input.tenantId}, ${input.orderId}, ${input.status}, ${input.note}, ${input.actorLabel})
  `
}

export async function listOrderTimeline(
  tx: Tx,
  tenantId: string,
  orderId: string,
): Promise<OrderTimelineEntry[]> {
  const rows = await tx<
    { id: string; status: OrderStatus; note: string; actor_label: string; created_at: Date }[]
  >`
    SELECT id, status, note, actor_label, created_at FROM commerce_order_events
    WHERE tenant_id = ${tenantId} AND order_id = ${orderId}
    ORDER BY created_at ASC
  `
  return rows.map((row) =>
    orderTimelineEntrySchema.parse({
      id: row.id,
      status: row.status,
      note: row.note,
      actorLabel: row.actor_label,
      createdAt: row.created_at,
    }),
  )
}

export async function insertRefund(
  tx: Tx,
  input: {
    tenantId: string
    orderId: string
    amount: number
    currency: string
    reason: string
    createdBy: string
  },
): Promise<Refund> {
  const [row] = await tx<
    { id: string; order_id: string; amount: string; currency: string; reason: string; created_by: string; created_at: Date }[]
  >`
    INSERT INTO commerce_refunds (tenant_id, order_id, amount, currency, reason, created_by)
    VALUES (${input.tenantId}, ${input.orderId}, ${input.amount}, ${input.currency}, ${input.reason}, ${input.createdBy})
    RETURNING id, order_id, amount, currency, reason, created_by, created_at
  `

  // The check constraint on the column is what actually guarantees refunds
  // never exceed the order total; this update is simply how the total moves.
  await tx`
    UPDATE commerce_orders SET refunded_amount = refunded_amount + ${input.amount}
    WHERE tenant_id = ${input.tenantId} AND id = ${input.orderId}
  `

  return refundSchema.parse({
    id: row!.id,
    orderId: row!.order_id,
    amount: readMoney(row!.amount, row!.currency),
    reason: row!.reason,
    createdBy: row!.created_by,
    createdAt: row!.created_at,
  })
}

export async function listRefunds(tx: Tx, tenantId: string, orderId: string): Promise<Refund[]> {
  const rows = await tx<
    { id: string; order_id: string; amount: string; currency: string; reason: string; created_by: string; created_at: Date }[]
  >`
    SELECT id, order_id, amount, currency, reason, created_by, created_at
    FROM commerce_refunds
    WHERE tenant_id = ${tenantId} AND order_id = ${orderId}
    ORDER BY created_at DESC
  `
  return rows.map((row) =>
    refundSchema.parse({
      id: row.id,
      orderId: row.order_id,
      amount: readMoney(row.amount, row.currency),
      reason: row.reason,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }),
  )
}

// endregion
