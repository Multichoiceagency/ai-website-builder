import {
  customerSummarySchema,
  discountSchema,
  type CommerceAddress,
  type CustomerQuery,
  type CustomerSummary,
  type Discount,
  type DiscountType,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { readCount, readMoney, readOptionalMoney } from '../money.js'

/**
 * Customers and discounts (ADR-0005).
 *
 * Lifetime value is computed from the orders, never stored on the customer: a
 * cached total is a total that disagrees with the order list the moment a
 * refund lands.
 */

// region Customers

interface CustomerRow {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  default_address: unknown
  orders_count: number
  lifetime_value: string | null
  currency: string | null
  last_order_at: Date | null
  created_at: Date
}

function toCustomerSummary(row: CustomerRow): CustomerSummary {
  return customerSummarySchema.parse({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    ordersCount: readCount(row.orders_count),
    lifetimeValue: readMoney(row.lifetime_value ?? 0, row.currency ?? 'EUR'),
    lastOrderAt: row.last_order_at,
    createdAt: row.created_at,
  })
}

/**
 * Order statistics per customer.
 *
 * Cancelled orders count for nothing, refunds are subtracted, and a customer
 * who has ordered in two currencies is summed in the currency of their most
 * recent order rather than having unlike amounts added together.
 */
const CUSTOMER_STATS = (tx: Tx) => tx`
  LEFT JOIN LATERAL (
    SELECT count(*) AS orders_count,
           max(o.placed_at) AS last_order_at,
           (
             SELECT o2.currency FROM commerce_orders o2
             WHERE o2.customer_id = c.id ORDER BY o2.placed_at DESC LIMIT 1
           ) AS currency
    FROM commerce_orders o
    WHERE o.customer_id = c.id AND o.status <> 'cancelled'
  ) stats ON true
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(o.total_amount - o.refunded_amount), 0) AS lifetime_value
    FROM commerce_orders o
    WHERE o.customer_id = c.id AND o.status <> 'cancelled' AND o.currency = stats.currency
  ) value ON true
`

const CUSTOMER_SELECT = (tx: Tx) => tx`
  c.id, c.email, c.first_name, c.last_name, c.phone, c.default_address, c.created_at,
  stats.orders_count, stats.last_order_at, stats.currency, value.lifetime_value
`

export async function listCustomers(
  tx: Tx,
  tenantId: string,
  query: CustomerQuery,
): Promise<{ items: CustomerSummary[]; total: number }> {
  const term = query.search ? `%${query.search}%` : null
  // Rebuilt per statement: a postgres.js fragment belongs to one query.
  const where = () => tx`
    c.tenant_id = ${tenantId}
    ${term ? tx`AND (c.email ILIKE ${term} OR c.first_name ILIKE ${term} OR c.last_name ILIKE ${term})` : tx``}
  `

  const rows = await tx<CustomerRow[]>`
    SELECT ${CUSTOMER_SELECT(tx)}
    FROM commerce_customers c
    ${CUSTOMER_STATS(tx)}
    WHERE ${where()}
    ORDER BY stats.last_order_at DESC NULLS LAST, c.created_at DESC
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `

  const [counted] = await tx<{ total: string }[]>`
    SELECT count(*) AS total FROM commerce_customers c WHERE ${where()}
  `

  return { items: rows.map(toCustomerSummary), total: readCount(counted?.total) }
}

export async function findCustomerById(
  tx: Tx,
  tenantId: string,
  customerId: string,
): Promise<{ summary: CustomerSummary; defaultAddress: CommerceAddress | null } | null> {
  const [row] = await tx<CustomerRow[]>`
    SELECT ${CUSTOMER_SELECT(tx)}
    FROM commerce_customers c
    ${CUSTOMER_STATS(tx)}
    WHERE c.tenant_id = ${tenantId} AND c.id = ${customerId}
    LIMIT 1
  `
  if (!row) return null

  return {
    summary: toCustomerSummary(row),
    defaultAddress: readJson<CommerceAddress | null>(row.default_address, null),
  }
}

/**
 * The customer record a checkout attaches to.
 *
 * Identity is the e-mail address within a tenant, so a returning shopper keeps
 * one order history instead of accumulating a new "customer" per purchase.
 */
export async function findOrCreateCustomer(
  tx: Tx,
  input: { tenantId: string; email: string; address?: CommerceAddress | null },
): Promise<string> {
  const email = input.email.trim().toLowerCase()

  const [row] = await tx<{ id: string }[]>`
    INSERT INTO commerce_customers (tenant_id, email, default_address)
    VALUES (${input.tenantId}, ${email}, ${input.address ? jsonParam(tx, input.address) : null})
    ON CONFLICT (tenant_id, email) DO UPDATE SET
      default_address = COALESCE(EXCLUDED.default_address, commerce_customers.default_address)
    RETURNING id
  `
  return row!.id
}

// endregion

// region Discounts

interface DiscountRow {
  id: string
  code: string
  type: DiscountType
  percentage_bps: number | null
  amount_value: string | null
  amount_currency: string | null
  minimum_subtotal_value: string | null
  minimum_subtotal_currency: string | null
  stackable: boolean
  priority: number
  usage_limit: number | null
  usage_count: number
  starts_at: Date | null
  ends_at: Date | null
  active: boolean
  created_at: Date
}

function toDiscount(row: DiscountRow): Discount {
  return discountSchema.parse({
    id: row.id,
    code: row.code,
    type: row.type,
    percentageBps: row.percentage_bps,
    amount: readOptionalMoney(row.amount_value, row.amount_currency),
    minimumSubtotal: readOptionalMoney(row.minimum_subtotal_value, row.minimum_subtotal_currency),
    stackable: row.stackable,
    priority: row.priority,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: row.active,
    createdAt: row.created_at,
  })
}

const DISCOUNT_COLUMNS = [
  'id',
  'code',
  'type',
  'percentage_bps',
  'amount_value',
  'amount_currency',
  'minimum_subtotal_value',
  'minimum_subtotal_currency',
  'stackable',
  'priority',
  'usage_limit',
  'usage_count',
  'starts_at',
  'ends_at',
  'active',
  'created_at',
]

export async function listDiscounts(tx: Tx, tenantId: string): Promise<Discount[]> {
  const rows = await tx<DiscountRow[]>`
    SELECT ${tx(DISCOUNT_COLUMNS)} FROM commerce_discounts
    WHERE tenant_id = ${tenantId}
    ORDER BY active DESC, priority ASC, code ASC
  `
  return rows.map(toDiscount)
}

export async function findDiscountById(tx: Tx, tenantId: string, discountId: string): Promise<Discount | null> {
  const [row] = await tx<DiscountRow[]>`
    SELECT ${tx(DISCOUNT_COLUMNS)} FROM commerce_discounts
    WHERE tenant_id = ${tenantId} AND id = ${discountId} LIMIT 1
  `
  return row ? toDiscount(row) : null
}

/** Codes are matched case-insensitively; nobody types `SUMMER25` twice the same. */
export async function findDiscountByCode(tx: Tx, tenantId: string, code: string): Promise<Discount | null> {
  const [row] = await tx<DiscountRow[]>`
    SELECT ${tx(DISCOUNT_COLUMNS)} FROM commerce_discounts
    WHERE tenant_id = ${tenantId} AND upper(code) = upper(${code}) LIMIT 1
  `
  return row ? toDiscount(row) : null
}

export async function findDiscountsByCodes(tx: Tx, tenantId: string, codes: string[]): Promise<Discount[]> {
  if (codes.length === 0) return []

  const rows = await tx<DiscountRow[]>`
    SELECT ${tx(DISCOUNT_COLUMNS)} FROM commerce_discounts
    WHERE tenant_id = ${tenantId} AND upper(code) IN ${tx(codes.map((code) => code.toUpperCase()))}
  `
  return rows.map(toDiscount)
}

export interface InsertDiscountInput {
  tenantId: string
  code: string
  type: DiscountType
  percentageBps: number | null
  amountValue: number | null
  amountCurrency: string | null
  minimumSubtotalValue: number | null
  minimumSubtotalCurrency: string | null
  stackable: boolean
  priority: number
  usageLimit: number | null
  startsAt: string | null
  endsAt: string | null
  active: boolean
}

export async function insertDiscount(tx: Tx, input: InsertDiscountInput): Promise<Discount> {
  const [row] = await tx<DiscountRow[]>`
    INSERT INTO commerce_discounts (
      tenant_id, code, type, percentage_bps, amount_value, amount_currency,
      minimum_subtotal_value, minimum_subtotal_currency, stackable, priority,
      usage_limit, starts_at, ends_at, active
    )
    VALUES (
      ${input.tenantId}, ${input.code.toUpperCase()}, ${input.type}, ${input.percentageBps},
      ${input.amountValue}, ${input.amountCurrency}, ${input.minimumSubtotalValue},
      ${input.minimumSubtotalCurrency}, ${input.stackable}, ${input.priority},
      ${input.usageLimit}, ${input.startsAt}, ${input.endsAt}, ${input.active}
    )
    RETURNING ${tx(DISCOUNT_COLUMNS)}
  `
  return toDiscount(row!)
}

export async function updateDiscount(
  tx: Tx,
  tenantId: string,
  discountId: string,
  patch: {
    stackable?: boolean
    priority?: number
    usageLimit?: number | null
    startsAt?: string | null
    endsAt?: string | null
    active?: boolean
  },
): Promise<Discount | null> {
  const [row] = await tx<DiscountRow[]>`
    UPDATE commerce_discounts SET
      stackable   = COALESCE(${patch.stackable ?? null}::boolean, stackable),
      priority    = COALESCE(${patch.priority ?? null}::int, priority),
      usage_limit = ${patch.usageLimit === undefined ? tx`usage_limit` : tx`${patch.usageLimit}::int`},
      starts_at   = ${patch.startsAt === undefined ? tx`starts_at` : tx`${patch.startsAt}::timestamptz`},
      ends_at     = ${patch.endsAt === undefined ? tx`ends_at` : tx`${patch.endsAt}::timestamptz`},
      active      = COALESCE(${patch.active ?? null}::boolean, active)
    WHERE tenant_id = ${tenantId} AND id = ${discountId}
    RETURNING ${tx(DISCOUNT_COLUMNS)}
  `
  return row ? toDiscount(row) : null
}

export async function deleteDiscount(tx: Tx, tenantId: string, discountId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM commerce_discounts WHERE tenant_id = ${tenantId} AND id = ${discountId} RETURNING id
  `
  return rows.length > 0
}

/**
 * Record that a discount was used, once per order.
 *
 * The redemption row is what makes `usage_count` auditable — a bare counter
 * cannot answer "which orders consumed this code?", which is the first thing
 * anyone asks when a limited campaign runs out early.
 */
export async function recordDiscountRedemption(
  tx: Tx,
  input: { tenantId: string; discountId: string; orderId: string; amountOff: number; currency: string },
): Promise<void> {
  const inserted = await tx<{ id: string }[]>`
    INSERT INTO commerce_discount_redemptions (tenant_id, discount_id, order_id, amount_off, currency)
    VALUES (${input.tenantId}, ${input.discountId}, ${input.orderId}, ${input.amountOff}, ${input.currency})
    ON CONFLICT (discount_id, order_id) DO NOTHING
    RETURNING id
  `

  if (inserted.length > 0) {
    await tx`
      UPDATE commerce_discounts SET usage_count = usage_count + 1
      WHERE tenant_id = ${input.tenantId} AND id = ${input.discountId}
    `
  }
}

// endregion
