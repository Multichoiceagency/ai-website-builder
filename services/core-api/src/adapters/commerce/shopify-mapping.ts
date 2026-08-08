import {
  cartSchema,
  collectionSchema,
  customerSummarySchema,
  money,
  orderSchema,
  orderSummarySchema,
  productSchema,
  productSummarySchema,
  zeroMoney,
  type Collection,
  type CreateProductInput,
  type CustomerSummary,
  type Money,
  type Order,
  type OrderStatus,
  type OrderSummary,
  type Product,
  type ProductStatus,
  type ProductSummary,
  type ProductVariant,
} from '@platform/schemas'

/**
 * Shopify Admin REST shapes → platform types (ADR-0006).
 * Only imported from `shopify.ts`.
 */

export interface ShopifyMoneySet {
  shop_money?: { amount?: string; currency_code?: string }
  amount?: string
  currency_code?: string
}

export interface ShopifyVariant {
  id: number | string
  product_id?: number | string
  title: string
  sku?: string | null
  barcode?: string | null
  price: string
  compare_at_price?: string | null
  inventory_quantity?: number
  weight?: number
  weight_unit?: string
  option1?: string | null
  option2?: string | null
  option3?: string | null
  position?: number
}

export interface ShopifyProduct {
  id: number | string
  title: string
  handle: string
  body_html?: string | null
  status: string
  image?: { src?: string; alt?: string | null } | null
  images?: { src: string; alt?: string | null }[]
  options?: { name: string; values?: string[] }[]
  variants?: ShopifyVariant[]
  created_at: string
  updated_at: string
}

export interface ShopifyCollection {
  id: number | string
  title: string
  handle: string
  body_html?: string | null
  updated_at?: string
  products_count?: number
}

export interface ShopifyCustomer {
  id: number | string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  orders_count?: number
  total_spent?: string
  currency?: string
  created_at: string
  updated_at?: string
}

export interface ShopifyLineItem {
  id: number | string
  variant_id?: number | string | null
  product_id?: number | string | null
  title: string
  variant_title?: string | null
  sku?: string | null
  quantity: number
  price: string
}

export interface ShopifyOrder {
  id: number | string
  name?: string
  email?: string | null
  financial_status?: string
  fulfillment_status?: string | null
  currency: string
  total_price: string
  subtotal_price?: string
  total_tax?: string
  total_discounts?: string
  total_shipping_price_set?: ShopifyMoneySet
  line_items?: ShopifyLineItem[]
  customer?: ShopifyCustomer | null
  created_at: string
  updated_at?: string
  cancelled_at?: string | null
}

function sid(value: number | string): string {
  return String(value)
}

function parseMoney(amount: string | undefined, currency: string): Money {
  const parsed = Number.parseFloat(amount ?? '0')
  const safe = Number.isFinite(parsed) ? parsed : 0
  return money(Math.round(safe * 100), currency || 'EUR')
}

function gramsFromShopify(weight?: number, unit?: string): number {
  if (!weight || weight <= 0) return 0
  const u = (unit ?? 'kg').toLowerCase()
  if (u === 'g') return Math.round(weight)
  if (u === 'oz') return Math.round(weight * 28.3495)
  if (u === 'lb') return Math.round(weight * 453.592)
  return Math.round(weight * 1000)
}

export function fromShopifyProductStatus(status: string): ProductStatus {
  if (status === 'active') return 'active'
  if (status === 'archived') return 'archived'
  return 'draft'
}

export function toShopifyProductStatus(status: ProductStatus): string {
  if (status === 'active') return 'active'
  if (status === 'archived') return 'archived'
  return 'draft'
}

export function toProductSummary(product: ShopifyProduct, currency = 'EUR'): ProductSummary {
  const variants = product.variants ?? []
  const prices = variants.map((variant) => parseMoney(variant.price, currency).amount)
  const lowest = prices.length ? Math.min(...prices) : null
  return productSummarySchema.parse({
    id: sid(product.id),
    title: product.title,
    handle: product.handle || sid(product.id),
    status: fromShopifyProductStatus(product.status),
    priceFrom: lowest === null ? null : money(lowest, currency),
    variantCount: variants.length,
    inventoryQuantity: variants.reduce((sum, variant) => sum + (variant.inventory_quantity ?? 0), 0),
    image: product.image?.src
      ? { url: product.image.src, alt: product.image.alt ?? '' }
      : product.images?.[0]?.src
        ? { url: product.images[0].src, alt: product.images[0].alt ?? '' }
        : null,
    updatedAt: product.updated_at,
  })
}

export function toProduct(product: ShopifyProduct, currency = 'EUR'): Product {
  const options = (product.options ?? [])
    .filter((option) => option.name.toLowerCase() !== 'title')
    .map((option) => ({
      name: option.name,
      values: option.values?.length ? option.values : ['Default'],
    }))

  const variants: ProductVariant[] = (product.variants ?? []).map((variant, index) => {
    const optionValues: Record<string, string> = {}
    const names = options.map((entry) => entry.name)
    if (names[0] && variant.option1) optionValues[names[0]] = variant.option1
    if (names[1] && variant.option2) optionValues[names[1]] = variant.option2
    if (names[2] && variant.option3) optionValues[names[2]] = variant.option3
    return {
      id: sid(variant.id),
      productId: sid(product.id),
      title: variant.title || 'Default',
      sku: variant.sku ?? null,
      barcode: variant.barcode ?? null,
      price: parseMoney(variant.price, currency),
      compareAtPrice: variant.compare_at_price ? parseMoney(variant.compare_at_price, currency) : null,
      optionValues,
      weightGrams: gramsFromShopify(variant.weight, variant.weight_unit),
      inventoryQuantity: variant.inventory_quantity ?? 0,
      position: variant.position ?? index,
    }
  })

  return productSchema.parse({
    ...toProductSummary(product, currency),
    description: product.body_html ?? '',
    taxRateBps: 0,
    options,
    images: (product.images ?? []).map((image) => ({ url: image.src, alt: image.alt ?? '' })),
    variants,
    collectionIds: [],
    createdAt: product.created_at,
  })
}

export function toShopifyProductPayload(input: CreateProductInput): Record<string, unknown> {
  const currency = input.variants[0]?.price.currency ?? 'EUR'
  return {
    product: {
      title: input.title,
      handle: input.handle,
      body_html: input.description ?? '',
      status: toShopifyProductStatus(input.status ?? 'draft'),
      options: (input.options ?? []).map((option) => ({ name: option.name, values: option.values })),
      variants: input.variants.map((variant) => ({
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: (variant.price.amount / 100).toFixed(2),
        compare_at_price:
          variant.compareAtPrice != null ? (variant.compareAtPrice.amount / 100).toFixed(2) : null,
        option1: Object.values(variant.optionValues ?? {})[0] ?? variant.title,
        option2: Object.values(variant.optionValues ?? {})[1],
        option3: Object.values(variant.optionValues ?? {})[2],
        weight: variant.weightGrams ? variant.weightGrams / 1000 : undefined,
        weight_unit: 'kg',
        inventory_management: 'shopify',
      })),
      images: (input.images ?? []).map((image) => ({ src: image.url, alt: image.alt })),
    },
    currency,
  }
}

export function toCollection(collection: ShopifyCollection): Collection {
  return collectionSchema.parse({
    id: sid(collection.id),
    title: collection.title,
    handle: collection.handle || sid(collection.id),
    description: collection.body_html ?? '',
    productCount: collection.products_count ?? 0,
    createdAt: collection.updated_at ?? new Date().toISOString(),
  })
}

export function toCustomerSummary(customer: ShopifyCustomer): CustomerSummary {
  return customerSummarySchema.parse({
    id: sid(customer.id),
    email: customer.email ?? '',
    firstName: customer.first_name ?? '',
    lastName: customer.last_name ?? '',
    phone: '',
    ordersCount: customer.orders_count ?? 0,
    lifetimeValue: parseMoney(customer.total_spent, customer.currency ?? 'EUR'),
    lastOrderAt: null,
    createdAt: customer.created_at,
  })
}

export function fromShopifyOrderStatus(order: ShopifyOrder): OrderStatus {
  if (order.cancelled_at) return 'cancelled'
  if (order.financial_status === 'refunded') return 'refunded'
  if (order.fulfillment_status === 'fulfilled') return 'fulfilled'
  if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') return 'paid'
  return 'pending'
}

export function toOrderSummary(order: ShopifyOrder): OrderSummary {
  const numeric = Number.parseInt(String(order.id).replace(/\D/g, '').slice(-9), 10)
  return orderSummarySchema.parse({
    id: sid(order.id),
    number: Number.isFinite(numeric) && numeric > 0 ? numeric : 1,
    status: fromShopifyOrderStatus(order),
    email: order.email ?? '',
    customerId: order.customer?.id != null ? sid(order.customer.id) : null,
    currency: order.currency,
    total: parseMoney(order.total_price, order.currency),
    refundedTotal: zeroMoney(order.currency),
    itemCount: (order.line_items ?? []).reduce((sum, line) => sum + line.quantity, 0),
    placedAt: order.created_at,
  })
}

export function toOrder(order: ShopifyOrder): Order {
  const currency = order.currency
  const items = (order.line_items ?? []).map((line) => {
    const unit = parseMoney(line.price, currency)
    return {
      id: sid(line.id),
      variantId: line.variant_id != null ? sid(line.variant_id) : '0',
      productId: line.product_id != null ? sid(line.product_id) : '0',
      title: line.title,
      variantTitle: line.variant_title ?? '',
      sku: line.sku ?? null,
      quantity: line.quantity,
      unitPrice: unit,
      taxRateBps: 0,
      lineTotal: money(unit.amount * line.quantity, currency),
    }
  })
  const summary = toOrderSummary(order)
  const shipping = parseMoney(
    order.total_shipping_price_set?.shop_money?.amount ?? order.total_shipping_price_set?.amount,
    currency,
  )
  return orderSchema.parse({
    ...summary,
    cartId: null,
    items,
    totals: {
      subtotal: parseMoney(order.subtotal_price, currency),
      discountTotal: parseMoney(order.total_discounts, currency),
      shippingTotal: shipping,
      taxTotal: parseMoney(order.total_tax, currency),
      total: summary.total,
    },
    appliedDiscounts: [],
    shippingAddress: null,
    billingAddress: null,
    shippingMethod: '',
    paymentProviderId: 'shopify',
    paymentStatus: order.financial_status === 'paid' ? 'captured' : 'requires_action',
    timeline: [],
    refunds: [],
    updatedAt: order.updated_at ?? order.created_at,
  })
}
