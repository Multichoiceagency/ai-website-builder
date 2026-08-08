import {
  type AddLineItemInput,
  type Cart,
  type Checkout,
  type Collection,
  type CompleteCheckoutInput,
  type CreateCartInput,
  type CreateCollectionInput,
  type CreateDiscountInput,
  type CreateLocationInput,
  type CreateProductInput,
  type CreateRefundInput,
  type CreateShippingRateInput,
  type Customer,
  type CustomerQuery,
  type CustomerSummary,
  type Discount,
  type InventoryLevel,
  type InventoryLocation,
  type Order,
  type OrderQuery,
  type OrderStatus,
  type OrderSummary,
  type Product,
  type ProductQuery,
  type ProductSummary,
  type ProviderStatus,
  type Refund,
  type SetInventoryInput,
  type ShippingRate,
  type StartCheckoutInput,
  type UpdateDiscountInput,
  type UpdateProductInput,
  collectionSchema,
  customerSummarySchema,
  money,
  orderSchema,
  orderSummarySchema,
  productSchema,
  productSummarySchema,
  zeroMoney,
} from '@platform/schemas'
import {
  CommerceProviderError,
  CommerceUnconfiguredError,
  CommerceUnsupportedError,
  type CommerceContext,
  type CommerceProvider,
  type Paginated,
} from './types.js'

/**
 * WooCommerce REST API v3 behind CommerceProvider (ADR-0006).
 *
 * Auth: HTTP Basic with Consumer Key + Consumer Secret over HTTPS
 * (developer.woocommerce.com REST authentication).
 */

interface WooProduct {
  id: number
  name: string
  slug: string
  description?: string
  short_description?: string
  status: string
  price?: string
  regular_price?: string
  sale_price?: string
  sku?: string
  stock_quantity?: number | null
  images?: { src: string; alt?: string }[]
  categories?: { id: number; name: string; slug: string }[]
  attributes?: { name: string; options?: string[] }[]
  variations?: number[]
  date_created_gmt?: string
  date_modified_gmt?: string
}

interface WooCategory {
  id: number
  name: string
  slug: string
  description?: string
  count?: number
}

interface WooOrder {
  id: number
  number?: string
  status: string
  currency: string
  total: string
  discount_total?: string
  shipping_total?: string
  total_tax?: string
  billing?: { email?: string; first_name?: string; last_name?: string }
  line_items?: {
    id: number
    name: string
    product_id: number
    variation_id?: number
    quantity: number
    price: number
    sku?: string
    total: string
  }[]
  customer_id?: number
  date_created_gmt?: string
  date_modified_gmt?: string
}

interface WooCustomer {
  id: number
  email: string
  first_name?: string
  last_name?: string
  billing?: { phone?: string }
  orders_count?: number
  total_spent?: string
  date_created_gmt?: string
}

function parseMoney(amount: string | number | undefined, currency: string) {
  const parsed = typeof amount === 'number' ? amount : Number.parseFloat(amount ?? '0')
  const safe = Number.isFinite(parsed) ? parsed : 0
  return money(Math.round(safe * 100), currency || 'EUR')
}

function fromWooProductStatus(status: string): Product['status'] {
  if (status === 'publish') return 'active'
  if (status === 'private' || status === 'pending') return 'draft'
  return 'draft'
}

function toWooProductStatus(status: Product['status']): string {
  if (status === 'active') return 'publish'
  if (status === 'archived') return 'private'
  return 'draft'
}

function fromWooOrderStatus(status: string): OrderStatus {
  if (status === 'cancelled' || status === 'failed') return 'cancelled'
  if (status === 'refunded') return 'refunded'
  if (status === 'completed') return 'fulfilled'
  if (status === 'processing') return 'paid'
  return 'pending'
}

export class WooCommerceCommerceProvider implements CommerceProvider {
  readonly id = 'woocommerce'
  readonly #baseUrl: string
  readonly #consumerKey: string
  readonly #consumerSecret: string
  readonly #currency: string

  constructor(
    storeUrl = process.env.WOOCOMMERCE_STORE_URL ?? '',
    consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY ?? '',
    consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET ?? '',
    currency = process.env.WOOCOMMERCE_CURRENCY ?? 'EUR',
  ) {
    this.#baseUrl = normalizeWooUrl(storeUrl)
    this.#consumerKey = consumerKey.trim()
    this.#consumerSecret = consumerSecret.trim()
    this.#currency = currency.trim().toUpperCase() || 'EUR'
  }

  status(): ProviderStatus {
    const configured = Boolean(this.#baseUrl && this.#consumerKey && this.#consumerSecret)
    return {
      id: this.id,
      configured,
      capabilities: ['products', 'collections', 'orders', 'customers'],
      reason: configured
        ? null
        : 'Connect WooCommerce: store URL + REST consumer key/secret under Commerce → Connection.',
    }
  }

  async listProducts(ctx: CommerceContext, query: ProductQuery): Promise<Paginated<ProductSummary>> {
    const params = new URLSearchParams({
      page: String(query.page),
      per_page: String(query.limit),
    })
    if (query.search) params.set('search', query.search)
    if (query.status === 'active') params.set('status', 'publish')
    const { body, total } = await this.#getList<WooProduct>(ctx, `/products?${params}`)
    return {
      items: body.map((product) => this.#toSummary(product)),
      meta: { page: query.page, limit: query.limit, total },
    }
  }

  async getProduct(ctx: CommerceContext, productId: string): Promise<Product | null> {
    try {
      const product = await this.#get<WooProduct>(ctx, `/products/${productId}`)
      return this.#toProduct(product)
    } catch (error) {
      if (error instanceof CommerceProviderError && error.status === 404) return null
      throw error
    }
  }

  async createProduct(ctx: CommerceContext, input: CreateProductInput): Promise<Product> {
    const variant = input.variants[0]
    const created = await this.#post<WooProduct>(ctx, '/products', {
      name: input.title,
      slug: input.handle,
      description: input.description ?? '',
      status: toWooProductStatus(input.status ?? 'draft'),
      type: input.variants.length > 1 ? 'variable' : 'simple',
      regular_price: variant ? (variant.price.amount / 100).toFixed(2) : '0',
      sku: variant?.sku,
      manage_stock: true,
      stock_quantity: 25,
      images: (input.images ?? []).map((image) => ({ src: image.url, alt: image.alt })),
      attributes: (input.options ?? []).map((option) => ({
        name: option.name,
        visible: true,
        variation: true,
        options: option.values,
      })),
    })
    return this.#toProduct(created)
  }

  async updateProduct(
    ctx: CommerceContext,
    productId: string,
    patch: UpdateProductInput,
  ): Promise<Product | null> {
    const body: Record<string, unknown> = {}
    if (patch.title) body.name = patch.title
    if (patch.handle) body.slug = patch.handle
    if (patch.description !== undefined) body.description = patch.description
    if (patch.status) body.status = toWooProductStatus(patch.status)
    if (patch.variants?.[0]) body.regular_price = (patch.variants[0].price.amount / 100).toFixed(2)
    if (patch.images) body.images = patch.images.map((image) => ({ src: image.url, alt: image.alt }))
    const updated = await this.#put<WooProduct>(ctx, `/products/${productId}`, body)
    return this.#toProduct(updated)
  }

  async deleteProduct(ctx: CommerceContext, productId: string): Promise<boolean> {
    await this.#delete(ctx, `/products/${productId}?force=true`)
    return true
  }

  async listCollections(ctx: CommerceContext): Promise<Collection[]> {
    const { body } = await this.#getList<WooCategory>(ctx, '/products/categories?per_page=100')
    return body.map((category) =>
      collectionSchema.parse({
        id: String(category.id),
        title: category.name,
        handle: category.slug || String(category.id),
        description: category.description ?? '',
        productCount: category.count ?? 0,
        createdAt: new Date().toISOString(),
      }),
    )
  }

  async createCollection(ctx: CommerceContext, input: CreateCollectionInput): Promise<Collection> {
    const created = await this.#post<WooCategory>(ctx, '/products/categories', {
      name: input.title,
      slug: input.handle,
      description: input.description ?? '',
    })
    return collectionSchema.parse({
      id: String(created.id),
      title: created.name,
      handle: created.slug || String(created.id),
      description: created.description ?? '',
      productCount: created.count ?? 0,
      createdAt: new Date().toISOString(),
    })
  }

  async listLocations(): Promise<InventoryLocation[]> {
    throw new CommerceUnsupportedError(this.id, 'inventory locations')
  }
  async createLocation(_ctx: CommerceContext, _input: CreateLocationInput): Promise<InventoryLocation> {
    throw new CommerceUnsupportedError(this.id, 'inventory locations')
  }
  async listInventory(): Promise<InventoryLevel[]> {
    throw new CommerceUnsupportedError(this.id, 'per-location inventory')
  }
  async setInventory(
    _ctx: CommerceContext,
    _variantId: string,
    _input: SetInventoryInput,
  ): Promise<InventoryLevel> {
    throw new CommerceUnsupportedError(this.id, 'per-location inventory')
  }

  async createCart(): Promise<Cart> {
    throw new CommerceUnsupportedError(this.id, 'carts (use WooCommerce checkout)')
  }
  async getCart(): Promise<Cart | null> {
    throw new CommerceUnsupportedError(this.id, 'carts')
  }
  async addLineItem(
    _ctx: CommerceContext,
    _cartId: string,
    _input: AddLineItemInput,
  ): Promise<Cart> {
    throw new CommerceUnsupportedError(this.id, 'carts')
  }
  async updateLineItem(): Promise<Cart> {
    throw new CommerceUnsupportedError(this.id, 'carts')
  }
  async applyDiscountCode(): Promise<Cart> {
    throw new CommerceUnsupportedError(this.id, 'carts')
  }
  async removeDiscountCode(): Promise<Cart> {
    throw new CommerceUnsupportedError(this.id, 'carts')
  }
  async startCheckout(
    _ctx: CommerceContext,
    _cartId: string,
    _input: StartCheckoutInput,
  ): Promise<Checkout> {
    throw new CommerceUnsupportedError(this.id, 'checkout')
  }
  async completeCheckout(
    _ctx: CommerceContext,
    _cartId: string,
    _input: CompleteCheckoutInput,
  ): Promise<Order> {
    throw new CommerceUnsupportedError(this.id, 'checkout')
  }

  async listDiscounts(): Promise<Discount[]> {
    throw new CommerceUnsupportedError(this.id, 'discount CRUD')
  }
  async createDiscount(_ctx: CommerceContext, _input: CreateDiscountInput): Promise<Discount> {
    throw new CommerceUnsupportedError(this.id, 'discount CRUD')
  }
  async updateDiscount(
    _ctx: CommerceContext,
    _discountId: string,
    _patch: UpdateDiscountInput,
  ): Promise<Discount | null> {
    throw new CommerceUnsupportedError(this.id, 'discount CRUD')
  }
  async deleteDiscount(): Promise<boolean> {
    throw new CommerceUnsupportedError(this.id, 'discount CRUD')
  }

  async listShippingRates(): Promise<ShippingRate[]> {
    throw new CommerceUnsupportedError(this.id, 'shipping-rate configuration')
  }
  async createShippingRate(
    _ctx: CommerceContext,
    _input: CreateShippingRateInput,
  ): Promise<ShippingRate> {
    throw new CommerceUnsupportedError(this.id, 'shipping-rate configuration')
  }
  async deleteShippingRate(): Promise<boolean> {
    throw new CommerceUnsupportedError(this.id, 'shipping-rate configuration')
  }

  async listOrders(ctx: CommerceContext, query: OrderQuery): Promise<Paginated<OrderSummary>> {
    const params = new URLSearchParams({
      page: String(query.page),
      per_page: String(query.limit),
    })
    if (query.search) params.set('search', query.search)
    const { body, total } = await this.#getList<WooOrder>(ctx, `/orders?${params}`)
    let items = body.map((order) => this.#toOrderSummary(order))
    if (query.status) items = items.filter((order) => order.status === query.status)
    return { items, meta: { page: query.page, limit: query.limit, total } }
  }

  async getOrder(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    try {
      const order = await this.#get<WooOrder>(ctx, `/orders/${orderId}`)
      return this.#toOrder(order)
    } catch (error) {
      if (error instanceof CommerceProviderError && error.status === 404) return null
      throw error
    }
  }

  async transitionOrder(
    ctx: CommerceContext,
    orderId: string,
    status: OrderStatus,
    _note: string,
  ): Promise<Order | null> {
    const map: Record<OrderStatus, string> = {
      pending: 'pending',
      paid: 'processing',
      fulfilled: 'completed',
      cancelled: 'cancelled',
      refunded: 'refunded',
    }
    await this.#put(ctx, `/orders/${orderId}`, { status: map[status] })
    return this.getOrder(ctx, orderId)
  }

  async capturePayment(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    return this.transitionOrder(ctx, orderId, 'paid', 'capture')
  }

  async createRefund(
    ctx: CommerceContext,
    orderId: string,
    input: CreateRefundInput,
  ): Promise<Refund> {
    const created = await this.#post<{ id: number; date_created_gmt?: string }>(
      ctx,
      `/orders/${orderId}/refunds`,
      {
        amount: (input.amount.amount / 100).toFixed(2),
        reason: input.reason ?? '',
      },
    )
    return {
      id: String(created.id),
      orderId,
      amount: input.amount,
      reason: input.reason ?? '',
      createdBy: ctx.actorLabel,
      createdAt: created.date_created_gmt
        ? new Date(`${created.date_created_gmt}Z`).toISOString()
        : new Date().toISOString(),
    }
  }

  async listCustomers(ctx: CommerceContext, query: CustomerQuery): Promise<Paginated<CustomerSummary>> {
    const params = new URLSearchParams({
      page: String(query.page),
      per_page: String(query.limit),
    })
    if (query.search) params.set('search', query.search)
    const { body, total } = await this.#getList<WooCustomer>(ctx, `/customers?${params}`)
    return {
      items: body.map((customer) => this.#toCustomer(customer)),
      meta: { page: query.page, limit: query.limit, total },
    }
  }

  async getCustomer(ctx: CommerceContext, customerId: string): Promise<Customer | null> {
    try {
      const customer = await this.#get<WooCustomer>(ctx, `/customers/${customerId}`)
      return { ...this.#toCustomer(customer), defaultAddress: null, orders: [] }
    } catch (error) {
      if (error instanceof CommerceProviderError && error.status === 404) return null
      throw error
    }
  }

  #toSummary(product: WooProduct): ProductSummary {
    const price = parseMoney(product.price || product.regular_price, this.#currency)
    return productSummarySchema.parse({
      id: String(product.id),
      title: product.name,
      handle: product.slug || String(product.id),
      status: fromWooProductStatus(product.status),
      priceFrom: price.amount > 0 ? price : null,
      variantCount: Math.max(1, product.variations?.length ?? 1),
      inventoryQuantity: product.stock_quantity ?? 0,
      image: product.images?.[0]
        ? { url: product.images[0].src, alt: product.images[0].alt ?? '' }
        : null,
      updatedAt: product.date_modified_gmt
        ? new Date(`${product.date_modified_gmt}Z`).toISOString()
        : new Date().toISOString(),
    })
  }

  #toProduct(product: WooProduct): Product {
    const price = parseMoney(product.regular_price || product.price, this.#currency)
    const compare = product.sale_price ? parseMoney(product.sale_price, this.#currency) : null
    return productSchema.parse({
      ...this.#toSummary(product),
      description: product.description || product.short_description || '',
      taxRateBps: 0,
      options: (product.attributes ?? []).map((attribute) => ({
        name: attribute.name,
        values: attribute.options?.length ? attribute.options : ['Default'],
      })),
      images: (product.images ?? []).map((image) => ({ url: image.src, alt: image.alt ?? '' })),
      variants: [
        {
          id: String(product.id),
          productId: String(product.id),
          title: 'Default',
          sku: product.sku || null,
          barcode: null,
          price,
          compareAtPrice: compare,
          optionValues: {},
          weightGrams: 0,
          inventoryQuantity: product.stock_quantity ?? 0,
          position: 0,
        },
      ],
      collectionIds: (product.categories ?? []).map((category) => String(category.id)),
      createdAt: product.date_created_gmt
        ? new Date(`${product.date_created_gmt}Z`).toISOString()
        : new Date().toISOString(),
    })
  }

  #toOrderSummary(order: WooOrder): OrderSummary {
    const number = Number.parseInt(order.number ?? String(order.id), 10)
    return orderSummarySchema.parse({
      id: String(order.id),
      number: Number.isFinite(number) && number > 0 ? number : order.id,
      status: fromWooOrderStatus(order.status),
      email: order.billing?.email ?? '',
      customerId: order.customer_id ? String(order.customer_id) : null,
      currency: order.currency,
      total: parseMoney(order.total, order.currency),
      refundedTotal: zeroMoney(order.currency),
      itemCount: (order.line_items ?? []).reduce((sum, line) => sum + line.quantity, 0),
      placedAt: order.date_created_gmt
        ? new Date(`${order.date_created_gmt}Z`).toISOString()
        : new Date().toISOString(),
    })
  }

  #toOrder(order: WooOrder): Order {
    const summary = this.#toOrderSummary(order)
    const items = (order.line_items ?? []).map((line) => {
      const unit = money(Math.round(line.price * 100), order.currency)
      return {
        id: String(line.id),
        variantId: String(line.variation_id || line.product_id),
        productId: String(line.product_id),
        title: line.name,
        variantTitle: '',
        sku: line.sku ?? null,
        quantity: line.quantity,
        unitPrice: unit,
        taxRateBps: 0,
        lineTotal: parseMoney(line.total, order.currency),
      }
    })
    return orderSchema.parse({
      ...summary,
      cartId: null,
      items,
      totals: {
        subtotal: money(
          items.reduce((sum, item) => sum + item.lineTotal.amount, 0),
          order.currency,
        ),
        discountTotal: parseMoney(order.discount_total, order.currency),
        shippingTotal: parseMoney(order.shipping_total, order.currency),
        taxTotal: parseMoney(order.total_tax, order.currency),
        total: summary.total,
      },
      appliedDiscounts: [],
      shippingAddress: null,
      billingAddress: null,
      shippingMethod: '',
      paymentProviderId: 'woocommerce',
      paymentStatus: summary.status === 'paid' || summary.status === 'fulfilled' ? 'captured' : 'requires_action',
      timeline: [],
      refunds: [],
      updatedAt: order.date_modified_gmt
        ? new Date(`${order.date_modified_gmt}Z`).toISOString()
        : summary.placedAt,
    })
  }

  #toCustomer(customer: WooCustomer): CustomerSummary {
    return customerSummarySchema.parse({
      id: String(customer.id),
      email: customer.email,
      firstName: customer.first_name ?? '',
      lastName: customer.last_name ?? '',
      phone: customer.billing?.phone ?? '',
      ordersCount: customer.orders_count ?? 0,
      lifetimeValue: parseMoney(customer.total_spent, this.#currency),
      lastOrderAt: null,
      createdAt: customer.date_created_gmt
        ? new Date(`${customer.date_created_gmt}Z`).toISOString()
        : new Date().toISOString(),
    })
  }

  #assertConfigured(): void {
    if (!this.#baseUrl || !this.#consumerKey || !this.#consumerSecret) {
      throw new CommerceUnconfiguredError(
        this.id,
        'Set store URL, consumer key and consumer secret under Commerce → Connection.',
      )
    }
  }

  #authHeader(): string {
    return `Basic ${Buffer.from(`${this.#consumerKey}:${this.#consumerSecret}`).toString('base64')}`
  }

  async #get<T>(ctx: CommerceContext, path: string): Promise<T> {
    return this.#request<T>(ctx, 'GET', path)
  }

  async #getList<T>(
    ctx: CommerceContext,
    path: string,
  ): Promise<{ body: T[]; total: number }> {
    this.#assertConfigured()
    const response = await fetch(`${this.#baseUrl}/wp-json/wc/v3${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: this.#authHeader() },
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CommerceProviderError(this.id, text.slice(0, 240) || response.statusText, response.status)
    }
    const totalHeader = response.headers.get('x-wp-total')
    const total = totalHeader ? Number(totalHeader) : 0
    const body = (await response.json()) as T[]
    return { body, total: Number.isFinite(total) ? total : body.length }
  }

  async #post<T>(ctx: CommerceContext, path: string, body: unknown): Promise<T> {
    return this.#request<T>(ctx, 'POST', path, body)
  }

  async #put<T>(ctx: CommerceContext, path: string, body: unknown): Promise<T> {
    return this.#request<T>(ctx, 'PUT', path, body)
  }

  async #delete(ctx: CommerceContext, path: string): Promise<void> {
    await this.#request(ctx, 'DELETE', path)
  }

  async #request<T>(
    _ctx: CommerceContext,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    this.#assertConfigured()
    const response = await fetch(`${this.#baseUrl}/wp-json/wc/v3${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: this.#authHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CommerceProviderError(this.id, text.slice(0, 240) || response.statusText, response.status)
    }
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }
}

function normalizeWooUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}
