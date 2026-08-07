import {
  cartSchema,
  collectionSchema,
  customerSummarySchema,
  money,
  orderSummarySchema,
  productSchema,
  productSummarySchema,
  zeroMoney,
  type Cart,
  type Collection,
  type CustomerSummary,
  type Money,
  type Order,
  type OrderStatus,
  type OrderSummary,
  type Product,
  type ProductStatus,
  type ProductSummary,
} from '@platform/schemas'

/**
 * Medusa's shapes, and the only functions allowed to know them.
 *
 * Everything in this file is one half of a translation: Medusa's field names,
 * status vocabularies and number format on one side, the platform's types on
 * the other. `medusa.ts` handles transport and the interface; this handles
 * meaning. Neither is imported anywhere outside `src/adapters/commerce/`
 * (ADR-0006).
 */

// region Medusa response shapes

export interface MedusaPrice {
  amount: number
  currency_code: string
}

export interface MedusaVariant {
  id: string
  title: string
  sku: string | null
  barcode: string | null
  weight: number | null
  prices?: MedusaPrice[]
  inventory_quantity?: number
  options?: { option?: { title?: string }; value: string }[]
}

export interface MedusaProduct {
  id: string
  title: string
  handle: string
  description: string | null
  status: string
  thumbnail: string | null
  images?: { url: string }[]
  options?: { title: string; values?: ({ value: string } | string)[] }[]
  variants?: MedusaVariant[]
  collection_id?: string | null
  created_at: string
  updated_at: string
}

export interface MedusaCollection {
  id: string
  title: string
  handle: string
  created_at: string
  products?: unknown[]
}

export interface MedusaLineItem {
  id: string
  variant_id: string
  product_id: string
  title: string
  subtitle?: string | null
  variant_title?: string | null
  variant_sku?: string | null
  quantity: number
  unit_price: number
  total?: number
}

export interface MedusaCart {
  id: string
  email: string | null
  customer_id: string | null
  currency_code: string
  items?: MedusaLineItem[]
  subtotal?: number
  discount_total?: number
  shipping_total?: number
  tax_total?: number
  total?: number
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface MedusaOrder {
  id: string
  display_id: number
  email: string
  customer_id: string | null
  currency_code: string
  status: string
  fulfillment_status?: string
  payment_status?: string
  items?: MedusaLineItem[]
  total?: number
  refunded_total?: number
  created_at: string
}

export interface MedusaCustomer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
}

// endregion

// region Primitives

/**
 * Medusa v2 states prices in major units (`19.99`), the platform in minor units
 * (`1999`). Converting in exactly two functions is a large part of why this
 * adapter exists — a decimal that escapes into the platform becomes a rounding
 * bug in every total downstream.
 */
export function toMoney(
  amount: number | string | null | undefined,
  currencyCode: string | undefined,
): Money {
  const currency = (currencyCode ?? 'eur').toUpperCase()
  if (amount === null || amount === undefined) return zeroMoney(currency)
  return money(Math.round(Number(amount) * 100), currency)
}

export function toMedusaAmount(value: Money): number {
  return value.amount / 100
}

/** Medusa's product status vocabulary, narrowed to ours. */
export function toProductStatus(status: string | undefined): ProductStatus {
  if (status === 'published') return 'active'
  if (status === 'archived') return 'archived'
  return 'draft'
}

export function fromProductStatus(status: ProductStatus): string {
  return status === 'active' ? 'published' : status
}

// endregion

// region Catalog

export function toProductSummary(product: MedusaProduct): ProductSummary {
  const prices = (product.variants ?? []).flatMap((variant) => variant.prices ?? [])
  const cheapest = prices.length
    ? prices.reduce((best, price) => (price.amount < best.amount ? price : best))
    : null

  return productSummarySchema.parse({
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: toProductStatus(product.status),
    priceFrom: cheapest ? toMoney(cheapest.amount, cheapest.currency_code) : null,
    variantCount: product.variants?.length ?? 0,
    inventoryQuantity: (product.variants ?? []).reduce(
      (sum, variant) => sum + (variant.inventory_quantity ?? 0),
      0,
    ),
    image: product.thumbnail ? { url: product.thumbnail, alt: product.title } : null,
    updatedAt: product.updated_at,
  })
}

export function toProduct(product: MedusaProduct): Product {
  return productSchema.parse({
    ...toProductSummary(product),
    description: product.description ?? '',
    // Medusa keeps tax rates in its tax module, per region, not on the product.
    // Reporting zero is honest: this provider's totals come from Medusa, so the
    // platform never recomputes the tax itself.
    taxRateBps: 0,
    options: (product.options ?? []).map((option) => ({
      name: option.title,
      values: (option.values ?? []).map((value) => (typeof value === 'string' ? value : value.value)),
    })),
    images: (product.images ?? []).map((image) => ({ url: image.url, alt: product.title })),
    variants: (product.variants ?? []).map((variant, index) => {
      const price = variant.prices?.[0]
      return {
        id: variant.id,
        productId: product.id,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: toMoney(price?.amount, price?.currency_code),
        compareAtPrice: null,
        optionValues: Object.fromEntries(
          (variant.options ?? []).map((option) => [option.option?.title ?? '', option.value]),
        ),
        weightGrams: variant.weight ?? 0,
        inventoryQuantity: variant.inventory_quantity ?? 0,
        position: index,
      }
    }),
    collectionIds: product.collection_id ? [product.collection_id] : [],
    createdAt: product.created_at,
  })
}

export function toCollection(collection: MedusaCollection, description = ''): Collection {
  return collectionSchema.parse({
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    description,
    productCount: collection.products?.length ?? 0,
    createdAt: collection.created_at,
  })
}

// endregion

// region Carts

export function toCart(cart: MedusaCart): Cart {
  const items = (cart.items ?? []).map((item) => ({
    id: item.id,
    variantId: item.variant_id,
    productId: item.product_id,
    title: item.title,
    variantTitle: item.variant_title ?? item.subtitle ?? '',
    sku: item.variant_sku ?? null,
    quantity: item.quantity,
    unitPrice: toMoney(item.unit_price, cart.currency_code),
    taxRateBps: 0,
    lineTotal: toMoney(item.total ?? item.unit_price * item.quantity, cart.currency_code),
  }))

  return cartSchema.parse({
    id: cart.id,
    status: cart.completed_at ? 'completed' : 'open',
    currency: cart.currency_code.toUpperCase(),
    email: cart.email,
    customerId: cart.customer_id,
    items,
    discountCodes: [],
    appliedDiscounts: [],
    shippingRateId: null,
    // Medusa computes the totals; the platform does not second-guess them,
    // because two pricing engines on one cart is how a shop starts charging a
    // number nobody agreed to.
    totals: {
      subtotal: toMoney(cart.subtotal, cart.currency_code),
      discountTotal: toMoney(cart.discount_total, cart.currency_code),
      shippingTotal: toMoney(cart.shipping_total, cart.currency_code),
      taxTotal: toMoney(cart.tax_total, cart.currency_code),
      total: toMoney(cart.total, cart.currency_code),
    },
    createdAt: cart.created_at,
    updatedAt: cart.updated_at,
  })
}

// endregion

// region Orders

/** Three Medusa status fields collapsed into the platform's one. */
export function toOrderStatus(order: MedusaOrder): OrderStatus {
  if (order.status === 'canceled') return 'cancelled'
  if (order.payment_status === 'refunded') return 'refunded'
  if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'shipped') {
    return 'fulfilled'
  }
  if (order.payment_status === 'captured') return 'paid'
  return 'pending'
}

export function toOrderSummary(order: MedusaOrder): OrderSummary {
  return orderSummarySchema.parse({
    id: order.id,
    number: order.display_id,
    status: toOrderStatus(order),
    email: order.email,
    customerId: order.customer_id,
    currency: order.currency_code.toUpperCase(),
    total: toMoney(order.total, order.currency_code),
    refundedTotal: toMoney(order.refunded_total, order.currency_code),
    itemCount: (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    placedAt: order.created_at,
  })
}

export function toOrder(order: MedusaOrder, providerId: string): Order {
  const summary = toOrderSummary(order)
  const items = (order.items ?? []).map((item) => ({
    id: item.id,
    variantId: item.variant_id,
    productId: item.product_id,
    title: item.title,
    variantTitle: item.variant_title ?? '',
    sku: item.variant_sku ?? null,
    quantity: item.quantity,
    unitPrice: toMoney(item.unit_price, order.currency_code),
    taxRateBps: 0,
    lineTotal: toMoney(item.total ?? item.unit_price * item.quantity, order.currency_code),
  }))

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal.amount, 0)

  return {
    ...summary,
    cartId: null,
    items,
    totals: {
      subtotal: money(subtotal, summary.currency),
      discountTotal: zeroMoney(summary.currency),
      shippingTotal: zeroMoney(summary.currency),
      taxTotal: zeroMoney(summary.currency),
      total: summary.total,
    },
    appliedDiscounts: [],
    shippingAddress: null,
    billingAddress: null,
    shippingMethod: '',
    paymentProviderId: providerId,
    paymentStatus: order.payment_status === 'captured' ? 'captured' : 'requires_action',
    // Medusa keeps its history in its own event log; one honest synthetic entry
    // beats a timeline we would have to invent.
    timeline: [
      {
        id: order.id,
        status: summary.status,
        note: 'Imported from the commerce provider.',
        actorLabel: providerId,
        createdAt: order.created_at,
      },
    ],
    refunds: [],
    updatedAt: order.created_at,
  }
}

// endregion

// region Customers

export function toCustomerSummary(customer: MedusaCustomer): CustomerSummary {
  return customerSummarySchema.parse({
    id: customer.id,
    email: customer.email,
    firstName: customer.first_name ?? '',
    lastName: customer.last_name ?? '',
    phone: customer.phone ?? '',
    ordersCount: 0,
    lifetimeValue: zeroMoney('EUR'),
    lastOrderAt: null,
    createdAt: customer.created_at,
  })
}

// endregion
