import { z } from 'zod'
import { isoTimestampSchema, slugSchema } from './common.js'

/**
 * Opaque commerce resource id.
 * Platform / Medusa use UUIDs; Shopify / WooCommerce use numeric (or gid) strings.
 * Kept under 128 chars so route params stay predictable.
 */
export const commerceIdSchema = z.string().trim().min(1).max(128)
export type CommerceId = z.infer<typeof commerceIdSchema>

/**
 * Commerce contracts (§12, §13). Owned by the commerce phase.
 *
 * These are *our* shapes. Medusa — or whatever replaces it — implements the
 * `CommerceProvider` interface against them and maps its own field names inside
 * its adapter (ADR-0006). Nothing here may be named after a vendor, and no
 * vendor's shape may reach this file.
 */

// region Money

/**
 * ISO-4217, upper-cased. A currency is part of every amount because an integer
 * without one is not a price — it is a number that happens to look like one.
 */
export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/, 'must be an ISO-4217 currency code')
  .transform((value) => value.toUpperCase())

/**
 * Money is **integer minor units** — cents, never euros; 1999, never 19.99.
 *
 * Floats cannot represent 0.1, so a float total is wrong by construction and
 * the error compounds over line items, discounts and refunds. The schema
 * rejects a non-integer rather than rounding it, so a float can never enter the
 * system quietly.
 */
export const moneySchema = z.object({
  amount: z.number().int('amount must be an integer number of minor units (cents)'),
  currency: currencyCodeSchema,
})
export type Money = z.infer<typeof moneySchema>

export function money(amount: number, currency: string): Money {
  return moneySchema.parse({ amount, currency })
}

export function zeroMoney(currency: string): Money {
  return money(0, currency)
}

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Cannot combine ${a} with ${b}.`)
    this.name = 'CurrencyMismatchError'
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency)
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return { amount: a.amount + b.amount, currency: a.currency }
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return { amount: a.amount - b.amount, currency: a.currency }
}

/** Rounds to the nearest minor unit — the result is always an integer. */
export function multiplyMoney(value: Money, factor: number): Money {
  return { amount: Math.round(value.amount * factor), currency: value.currency }
}

/** Never below zero. Used wherever a discount could otherwise invert a total. */
export function clampMoney(value: Money, min = 0): Money {
  return { amount: Math.max(value.amount, min), currency: value.currency }
}

/** Basis points: 2100 = 21%. Integers all the way down, for the same reason. */
export const basisPointsSchema = z.number().int().min(0).max(100_000)

// endregion

// region Catalog

export const productStatusSchema = z.enum(['draft', 'active', 'archived'])
export type ProductStatus = z.infer<typeof productStatusSchema>

export const productOptionSchema = z.object({
  name: z.string().min(1).max(60),
  values: z.array(z.string().min(1).max(80)).min(1).max(50),
})
export type ProductOption = z.infer<typeof productOptionSchema>

export const productImageSchema = z.object({
  url: z.string().max(2048),
  alt: z.string().max(200).default(''),
})
export type ProductImage = z.infer<typeof productImageSchema>

export const productVariantSchema = z.object({
  id: commerceIdSchema,
  productId: commerceIdSchema,
  title: z.string().min(1).max(200),
  sku: z.string().max(80).nullable().default(null),
  barcode: z.string().max(80).nullable().default(null),
  price: moneySchema,
  /** The "was" price. Null when the variant is not on offer. */
  compareAtPrice: moneySchema.nullable().default(null),
  /** `{ "Size": "L", "Colour": "Black" }` — keys come from the product options. */
  optionValues: z.record(z.string().max(60), z.string().max(80)).default({}),
  weightGrams: z.number().int().min(0).default(0),
  /** Sum of `available` across every location. Derived, never stored. */
  inventoryQuantity: z.number().int().default(0),
  position: z.number().int().min(0).default(0),
})
export type ProductVariant = z.infer<typeof productVariantSchema>

export const productSummarySchema = z.object({
  id: commerceIdSchema,
  title: z.string().min(1).max(200),
  handle: slugSchema,
  status: productStatusSchema,
  /** Lowest variant price. Null for a product with no variants yet. */
  priceFrom: moneySchema.nullable().default(null),
  variantCount: z.number().int().min(0).default(0),
  inventoryQuantity: z.number().int().default(0),
  image: productImageSchema.nullable().default(null),
  updatedAt: isoTimestampSchema,
})
export type ProductSummary = z.infer<typeof productSummarySchema>

export const productSchema = productSummarySchema.extend({
  description: z.string().max(20_000).default(''),
  /** Basis points. Prices are tax-inclusive, so this only splits the total. */
  taxRateBps: basisPointsSchema.default(0),
  options: z.array(productOptionSchema).max(3).default([]),
  images: z.array(productImageSchema).max(20).default([]),
  variants: z.array(productVariantSchema).default([]),
  collectionIds: z.array(commerceIdSchema).default([]),
  createdAt: isoTimestampSchema,
})
export type Product = z.infer<typeof productSchema>

export const createProductVariantInputSchema = z.object({
  title: z.string().min(1).max(200),
  sku: z.string().max(80).optional(),
  barcode: z.string().max(80).optional(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable().optional(),
  optionValues: z.record(z.string().max(60), z.string().max(80)).optional(),
  weightGrams: z.number().int().min(0).optional(),
})
export type CreateProductVariantInput = z.infer<typeof createProductVariantInputSchema>

export const createProductInputSchema = z.object({
  title: z.string().min(1).max(200),
  handle: slugSchema.optional(),
  description: z.string().max(20_000).optional(),
  status: productStatusSchema.default('draft'),
  taxRateBps: basisPointsSchema.optional(),
  options: z.array(productOptionSchema).max(3).optional(),
  images: z.array(productImageSchema).max(20).optional(),
  variants: z.array(createProductVariantInputSchema).min(1).max(100),
  collectionIds: z.array(commerceIdSchema).max(20).optional(),
})
export type CreateProductInput = z.infer<typeof createProductInputSchema>

export const updateProductInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    handle: slugSchema,
    description: z.string().max(20_000),
    status: productStatusSchema,
    taxRateBps: basisPointsSchema,
    options: z.array(productOptionSchema).max(3),
    images: z.array(productImageSchema).max(20),
    /** Replaces the variant set wholesale — send every variant you want kept. */
    variants: z.array(createProductVariantInputSchema.extend({ id: commerceIdSchema.optional() })).min(1).max(100),
    collectionIds: z.array(commerceIdSchema).max(20),
  })
  .partial()
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>

export const productQuerySchema = z.object({
  status: productStatusSchema.optional(),
  search: z.string().max(200).optional(),
  collectionId: commerceIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type ProductQuery = z.infer<typeof productQuerySchema>

export const collectionSchema = z.object({
  id: commerceIdSchema,
  title: z.string().min(1).max(200),
  handle: slugSchema,
  description: z.string().max(5000).default(''),
  productCount: z.number().int().min(0).default(0),
  createdAt: isoTimestampSchema,
})
export type Collection = z.infer<typeof collectionSchema>

export const createCollectionInputSchema = z.object({
  title: z.string().min(1).max(200),
  handle: slugSchema.optional(),
  description: z.string().max(5000).optional(),
})
export type CreateCollectionInput = z.infer<typeof createCollectionInputSchema>

// endregion

// region Inventory

export const inventoryLocationSchema = z.object({
  id: commerceIdSchema,
  name: z.string().min(1).max(200),
  code: slugSchema,
  isDefault: z.boolean().default(false),
  createdAt: isoTimestampSchema,
})
export type InventoryLocation = z.infer<typeof inventoryLocationSchema>

export const createLocationInputSchema = z.object({
  name: z.string().min(1).max(200),
  code: slugSchema.optional(),
  isDefault: z.boolean().default(false),
})
export type CreateLocationInput = z.infer<typeof createLocationInputSchema>

export const inventoryLevelSchema = z.object({
  variantId: commerceIdSchema,
  locationId: commerceIdSchema,
  locationName: z.string().max(200).default(''),
  available: z.number().int().default(0),
  /** Held by open carts and unfulfilled orders. Never negative. */
  reserved: z.number().int().min(0).default(0),
})
export type InventoryLevel = z.infer<typeof inventoryLevelSchema>

export const setInventoryInputSchema = z.object({
  locationId: commerceIdSchema,
  available: z.number().int().min(0),
})
export type SetInventoryInput = z.infer<typeof setInventoryInputSchema>

// endregion

// region Discounts

export const discountTypeSchema = z.enum(['percentage', 'fixed', 'free_shipping'])
export type DiscountType = z.infer<typeof discountTypeSchema>

export const discountSchema = z.object({
  id: commerceIdSchema,
  code: z.string().min(2).max(40),
  type: discountTypeSchema,
  /** Basis points for `percentage`. 1000 = 10%. */
  percentageBps: basisPointsSchema.nullable().default(null),
  /** Minor units for `fixed`. */
  amount: moneySchema.nullable().default(null),
  /**
   * Whether this may combine with others. One non-stackable discount wins
   * alone; several stackable discounts apply together. See `applyDiscounts`.
   */
  stackable: z.boolean().default(false),
  /** Lower runs first, and breaks ties when two exclusive discounts collide. */
  priority: z.number().int().min(0).max(1000).default(100),
  /** Cart subtotal the discount needs before it applies at all. */
  minimumSubtotal: moneySchema.nullable().default(null),
  usageLimit: z.number().int().min(1).nullable().default(null),
  usageCount: z.number().int().min(0).default(0),
  startsAt: isoTimestampSchema.nullable().default(null),
  endsAt: isoTimestampSchema.nullable().default(null),
  active: z.boolean().default(true),
  createdAt: isoTimestampSchema,
})
export type Discount = z.infer<typeof discountSchema>

export const createDiscountInputSchema = z
  .object({
    code: z.string().min(2).max(40),
    type: discountTypeSchema,
    percentageBps: basisPointsSchema.optional(),
    amount: moneySchema.optional(),
    stackable: z.boolean().default(false),
    priority: z.number().int().min(0).max(1000).default(100),
    minimumSubtotal: moneySchema.optional(),
    usageLimit: z.number().int().min(1).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    active: z.boolean().default(true),
  })
  // The value a discount needs depends on its type, so the shape is only valid
  // as a whole — a percentage without a percentage is not a discount.
  .refine((input) => input.type !== 'percentage' || input.percentageBps !== undefined, {
    message: 'a percentage discount needs percentageBps',
    path: ['percentageBps'],
  })
  .refine((input) => input.type !== 'fixed' || input.amount !== undefined, {
    message: 'a fixed discount needs an amount',
    path: ['amount'],
  })
export type CreateDiscountInput = z.infer<typeof createDiscountInputSchema>

export const updateDiscountInputSchema = z
  .object({
    stackable: z.boolean(),
    priority: z.number().int().min(0).max(1000),
    usageLimit: z.number().int().min(1).nullable(),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
    active: z.boolean(),
  })
  .partial()
export type UpdateDiscountInput = z.infer<typeof updateDiscountInputSchema>

/** What a single discount took off a specific cart, after the stacking rules. */
export const appliedDiscountSchema = z.object({
  discountId: commerceIdSchema,
  code: z.string().max(40),
  type: discountTypeSchema,
  amountOff: moneySchema,
  shippingOff: moneySchema,
})
export type AppliedDiscount = z.infer<typeof appliedDiscountSchema>

// endregion

// region Carts and totals

export const cartStatusSchema = z.enum(['open', 'completed', 'abandoned'])
export type CartStatus = z.infer<typeof cartStatusSchema>

export const lineItemSchema = z.object({
  id: commerceIdSchema,
  variantId: commerceIdSchema,
  productId: commerceIdSchema,
  title: z.string().max(200),
  variantTitle: z.string().max(200),
  sku: z.string().max(80).nullable().default(null),
  quantity: z.number().int().min(1).max(10_000),
  /** Captured when the item was added: a later price change must not move it. */
  unitPrice: moneySchema,
  taxRateBps: basisPointsSchema.default(0),
  lineTotal: moneySchema,
})
export type LineItem = z.infer<typeof lineItemSchema>

export const cartTotalsSchema = z.object({
  subtotal: moneySchema,
  discountTotal: moneySchema,
  shippingTotal: moneySchema,
  /** Included in `total`, not added to it — prices are tax-inclusive. */
  taxTotal: moneySchema,
  total: moneySchema,
})
export type CartTotals = z.infer<typeof cartTotalsSchema>

export const cartSchema = z.object({
  id: commerceIdSchema,
  status: cartStatusSchema,
  currency: currencyCodeSchema,
  email: z.string().max(320).nullable().default(null),
  customerId: commerceIdSchema.nullable().default(null),
  items: z.array(lineItemSchema).default([]),
  discountCodes: z.array(z.string().max(40)).default([]),
  appliedDiscounts: z.array(appliedDiscountSchema).default([]),
  shippingRateId: commerceIdSchema.nullable().default(null),
  totals: cartTotalsSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const createCartInputSchema = z.object({
  currency: currencyCodeSchema.default('EUR'),
  email: z.string().email().max(320).optional(),
  customerId: commerceIdSchema.optional(),
})
export type CreateCartInput = z.infer<typeof createCartInputSchema>

export const addLineItemInputSchema = z.object({
  variantId: commerceIdSchema,
  quantity: z.number().int().min(1).max(10_000).default(1),
})
export type AddLineItemInput = z.infer<typeof addLineItemInputSchema>

export const updateLineItemInputSchema = z.object({
  quantity: z.number().int().min(0).max(10_000),
})
export type UpdateLineItemInput = z.infer<typeof updateLineItemInputSchema>

// endregion

// region Addresses, shipping, payment

export const commerceAddressSchema = z.object({
  name: z.string().max(200).default(''),
  company: z.string().max(200).default(''),
  line1: z.string().max(200).default(''),
  line2: z.string().max(200).default(''),
  postalCode: z.string().max(20).default(''),
  city: z.string().max(120).default(''),
  region: z.string().max(120).default(''),
  /** ISO-3166-1 alpha-2. */
  country: z.string().length(2).default('NL'),
  phone: z.string().max(40).default(''),
})
export type CommerceAddress = z.infer<typeof commerceAddressSchema>

export const shippingRateSchema = z.object({
  id: commerceIdSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(300).default(''),
  price: moneySchema,
  /** Free above this subtotal. Null disables the threshold. */
  freeAboveSubtotal: moneySchema.nullable().default(null),
  /** Empty means "everywhere". */
  countries: z.array(z.string().length(2)).max(60).default([]),
  active: z.boolean().default(true),
})
export type ShippingRate = z.infer<typeof shippingRateSchema>

export const createShippingRateInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  price: moneySchema,
  freeAboveSubtotal: moneySchema.nullable().optional(),
  countries: z.array(z.string().length(2)).max(60).optional(),
  active: z.boolean().default(true),
})
export type CreateShippingRateInput = z.infer<typeof createShippingRateInputSchema>

/** A quote is a rate priced for one specific cart. */
export const shippingQuoteSchema = z.object({
  rateId: commerceIdSchema,
  name: z.string().max(120),
  description: z.string().max(300).default(''),
  price: moneySchema,
  providerId: z.string().max(60),
})
export type ShippingQuote = z.infer<typeof shippingQuoteSchema>

export const paymentStatusSchema = z.enum([
  'requires_action',
  'authorized',
  'captured',
  'failed',
  'refunded',
])
export type PaymentStatus = z.infer<typeof paymentStatusSchema>

/**
 * A payment attempt as *we* model it. A provider's session id lives in
 * `providerReference`; nothing outside a payment adapter reads it.
 */
export const paymentSessionSchema = z.object({
  id: z.string().max(200),
  providerId: z.string().max(60),
  status: paymentStatusSchema,
  amount: moneySchema,
  providerReference: z.string().max(200).nullable().default(null),
  /** Where the shopper must be sent to complete payment, when applicable. */
  redirectUrl: z.string().max(2048).nullable().default(null),
})
export type PaymentSession = z.infer<typeof paymentSessionSchema>

// endregion

// region Checkout and orders

export const startCheckoutInputSchema = z.object({
  email: z.string().email().max(320),
  shippingAddress: commerceAddressSchema.partial().optional(),
  billingAddress: commerceAddressSchema.partial().optional(),
  shippingRateId: commerceIdSchema.nullable().optional(),
})
export type StartCheckoutInput = z.infer<typeof startCheckoutInputSchema>

export const checkoutSchema = z.object({
  cart: cartSchema,
  shippingQuotes: z.array(shippingQuoteSchema).default([]),
  payment: paymentSessionSchema.nullable().default(null),
  /** False when no payment provider is configured — checkout still completes. */
  paymentConfigured: z.boolean().default(false),
})
export type Checkout = z.infer<typeof checkoutSchema>

export const completeCheckoutInputSchema = z.object({
  email: z.string().email().max(320).optional(),
  paymentSessionId: z.string().max(200).optional(),
})
export type CompleteCheckoutInput = z.infer<typeof completeCheckoutInputSchema>

export const orderStatusSchema = z.enum(['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

/**
 * The only legal moves. A status graph written down is a status graph that can
 * be tested; one scattered across route handlers is a status graph that drifts.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> =
  Object.freeze({
    pending: ['paid', 'cancelled'],
    paid: ['fulfilled', 'cancelled', 'refunded'],
    fulfilled: ['refunded'],
    cancelled: [],
    refunded: [],
  })

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to)
}

export const orderTimelineEntrySchema = z.object({
  id: commerceIdSchema,
  status: orderStatusSchema,
  note: z.string().max(500).default(''),
  actorLabel: z.string().max(200).default('system'),
  createdAt: isoTimestampSchema,
})
export type OrderTimelineEntry = z.infer<typeof orderTimelineEntrySchema>

export const refundSchema = z.object({
  id: commerceIdSchema,
  orderId: commerceIdSchema,
  amount: moneySchema,
  reason: z.string().max(300).default(''),
  createdBy: z.string().max(200).default('system'),
  createdAt: isoTimestampSchema,
})
export type Refund = z.infer<typeof refundSchema>

export const createRefundInputSchema = z.object({
  amount: moneySchema,
  reason: z.string().max(300).optional(),
})
export type CreateRefundInput = z.infer<typeof createRefundInputSchema>

export const orderSummarySchema = z.object({
  id: commerceIdSchema,
  number: z.number().int().min(1),
  status: orderStatusSchema,
  email: z.string().max(320),
  customerId: commerceIdSchema.nullable().default(null),
  currency: currencyCodeSchema,
  total: moneySchema,
  refundedTotal: moneySchema,
  itemCount: z.number().int().min(0).default(0),
  placedAt: isoTimestampSchema,
})
export type OrderSummary = z.infer<typeof orderSummarySchema>

export const orderSchema = orderSummarySchema.extend({
  cartId: commerceIdSchema.nullable().default(null),
  items: z.array(lineItemSchema).default([]),
  totals: cartTotalsSchema,
  appliedDiscounts: z.array(appliedDiscountSchema).default([]),
  shippingAddress: commerceAddressSchema.nullable().default(null),
  billingAddress: commerceAddressSchema.nullable().default(null),
  shippingMethod: z.string().max(120).default(''),
  paymentProviderId: z.string().max(60).nullable().default(null),
  paymentStatus: paymentStatusSchema.nullable().default(null),
  timeline: z.array(orderTimelineEntrySchema).default([]),
  refunds: z.array(refundSchema).default([]),
  updatedAt: isoTimestampSchema,
})
export type Order = z.infer<typeof orderSchema>

export const orderQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  customerId: commerceIdSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type OrderQuery = z.infer<typeof orderQuerySchema>

export const transitionOrderInputSchema = z.object({
  status: orderStatusSchema,
  note: z.string().max(500).optional(),
})
export type TransitionOrderInput = z.infer<typeof transitionOrderInputSchema>

// endregion

// region Customers

export const customerSummarySchema = z.object({
  id: commerceIdSchema,
  email: z.string().max(320),
  firstName: z.string().max(120).default(''),
  lastName: z.string().max(120).default(''),
  phone: z.string().max(40).default(''),
  ordersCount: z.number().int().min(0).default(0),
  /** Net of refunds. The number a merchant actually makes decisions on. */
  lifetimeValue: moneySchema,
  lastOrderAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type CustomerSummary = z.infer<typeof customerSummarySchema>

export const customerSchema = customerSummarySchema.extend({
  defaultAddress: commerceAddressSchema.nullable().default(null),
  orders: z.array(orderSummarySchema).default([]),
})
export type Customer = z.infer<typeof customerSchema>

export const customerQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type CustomerQuery = z.infer<typeof customerQuerySchema>

// endregion

// region Provider status

/**
 * What the dashboard shows instead of guessing. An unconfigured provider is a
 * normal state, not an error: the platform ships working commerce without any
 * vendor credential and reports honestly which seams are empty.
 */
export const providerStatusSchema = z.object({
  id: z.string().max(60),
  configured: z.boolean(),
  /** Free-form capability tags, e.g. `products`, `refunds`, `webhooks`. */
  capabilities: z.array(z.string().max(60)).default([]),
  /** Why it is unconfigured, in words a human can act on. */
  reason: z.string().max(300).nullable().default(null),
})
export type ProviderStatus = z.infer<typeof providerStatusSchema>

export const commerceStatusSchema = z.object({
  commerce: providerStatusSchema,
  /** Every known commerce engine (platform, Medusa, Shopify, Woo, …). */
  engines: z.array(providerStatusSchema).default([]),
  /** Active engine id for this tenant. */
  activeEngineId: z.string().max(60).default('platform'),
  /** Every known payment provider, configured or not. */
  payments: z.array(providerStatusSchema).default([]),
  shipping: z.array(providerStatusSchema).default([]),
})
export type CommerceStatus = z.infer<typeof commerceStatusSchema>

// endregion
