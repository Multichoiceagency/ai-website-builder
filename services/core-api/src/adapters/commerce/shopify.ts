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
} from '@platform/schemas'
import {
  toCollection,
  toCustomerSummary,
  toOrder,
  toOrderSummary,
  toProduct,
  toProductSummary,
  toShopifyProductPayload,
  type ShopifyCollection,
  type ShopifyCustomer,
  type ShopifyOrder,
  type ShopifyProduct,
} from './shopify-mapping.js'
import {
  CommerceProviderError,
  CommerceUnconfiguredError,
  CommerceUnsupportedError,
  type CommerceContext,
  type CommerceProvider,
  type Paginated,
} from './types.js'

/**
 * Shopify Admin REST behind CommerceProvider (ADR-0006).
 *
 * Auth: `X-Shopify-Access-Token` (custom app / Admin API token).
 * Store: `{shop}.myshopify.com` or full https URL.
 *
 * Carts / checkout / discounts / shipping-rate config stay on Shopify —
 * this adapter is for catalogue + order ops in our dashboard.
 */
export class ShopifyCommerceProvider implements CommerceProvider {
  readonly id = 'shopify'
  readonly #shop: string
  readonly #accessToken: string
  readonly #apiVersion: string
  readonly #currency: string

  constructor(
    shop = process.env.SHOPIFY_SHOP ?? '',
    accessToken = process.env.SHOPIFY_ACCESS_TOKEN ?? '',
    apiVersion = process.env.SHOPIFY_API_VERSION ?? '2024-10',
    currency = process.env.SHOPIFY_CURRENCY ?? 'EUR',
  ) {
    this.#shop = normalizeShopifyShop(shop)
    this.#accessToken = accessToken.trim()
    this.#apiVersion = apiVersion.trim() || '2024-10'
    this.#currency = currency.trim().toUpperCase() || 'EUR'
  }

  status(): ProviderStatus {
    const configured = Boolean(this.#shop && this.#accessToken)
    return {
      id: this.id,
      configured,
      capabilities: ['products', 'collections', 'orders', 'customers'],
      reason: configured
        ? null
        : 'Connect a Shopify store: shop domain + Admin API access token under Commerce → Connection.',
    }
  }

  // region Catalog

  async listProducts(ctx: CommerceContext, query: ProductQuery): Promise<Paginated<ProductSummary>> {
    const params = new URLSearchParams({
      limit: String(query.limit),
      status: query.status === 'active' ? 'active' : query.status === 'archived' ? 'archived' : 'any',
    })
    if (query.search) params.set('title', query.search)
    const data = await this.#get<{ products: ShopifyProduct[] }>(ctx, `/products.json?${params}`)
    const items = (data.products ?? []).map((product) => toProductSummary(product, this.#currency))
    return { items, meta: { page: query.page, limit: query.limit, total: items.length } }
  }

  async getProduct(ctx: CommerceContext, productId: string): Promise<Product | null> {
    try {
      const data = await this.#get<{ product: ShopifyProduct }>(ctx, `/products/${productId}.json`)
      return data.product ? toProduct(data.product, this.#currency) : null
    } catch (error) {
      if (error instanceof CommerceProviderError && error.status === 404) return null
      throw error
    }
  }

  async createProduct(ctx: CommerceContext, input: CreateProductInput): Promise<Product> {
    const payload = toShopifyProductPayload(input)
    const data = await this.#post<{ product: ShopifyProduct }>(ctx, '/products.json', payload)
    return toProduct(data.product, this.#currency)
  }

  async updateProduct(
    ctx: CommerceContext,
    productId: string,
    patch: UpdateProductInput,
  ): Promise<Product | null> {
    const current = await this.getProduct(ctx, productId)
    if (!current) return null
    const merged: CreateProductInput = {
      title: patch.title ?? current.title,
      handle: patch.handle ?? current.handle,
      description: patch.description ?? current.description,
      status: patch.status ?? current.status,
      options: patch.options ?? current.options,
      images: patch.images ?? current.images,
      variants: (patch.variants ?? current.variants).map((variant) => ({
        title: variant.title,
        sku: variant.sku ?? undefined,
        barcode: variant.barcode ?? undefined,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        optionValues: variant.optionValues,
        weightGrams: variant.weightGrams,
      })),
      collectionIds: patch.collectionIds ?? current.collectionIds,
    }
    const payload = toShopifyProductPayload(merged)
    ;(payload.product as Record<string, unknown>).id = Number(productId) || productId
    const data = await this.#put<{ product: ShopifyProduct }>(ctx, `/products/${productId}.json`, payload)
    return toProduct(data.product, this.#currency)
  }

  async deleteProduct(ctx: CommerceContext, productId: string): Promise<boolean> {
    await this.#delete(ctx, `/products/${productId}.json`)
    return true
  }

  async listCollections(ctx: CommerceContext): Promise<Collection[]> {
    const data = await this.#get<{ custom_collections: ShopifyCollection[] }>(
      ctx,
      '/custom_collections.json?limit=250',
    )
    return (data.custom_collections ?? []).map(toCollection)
  }

  async createCollection(ctx: CommerceContext, input: CreateCollectionInput): Promise<Collection> {
    const data = await this.#post<{ custom_collection: ShopifyCollection }>(ctx, '/custom_collections.json', {
      custom_collection: {
        title: input.title,
        handle: input.handle,
        body_html: input.description ?? '',
      },
    })
    return toCollection(data.custom_collection)
  }

  // endregion

  // region Unsupported / remote-owned

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

  async createCart(_ctx: CommerceContext, _input: CreateCartInput): Promise<Cart> {
    throw new CommerceUnsupportedError(this.id, 'carts (use Shopify storefront checkout)')
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

  // endregion

  // region Orders / customers

  async listOrders(ctx: CommerceContext, query: OrderQuery): Promise<Paginated<OrderSummary>> {
    const params = new URLSearchParams({ limit: String(query.limit), status: 'any' })
    if (query.search) params.set('name', query.search)
    const data = await this.#get<{ orders: ShopifyOrder[] }>(ctx, `/orders.json?${params}`)
    let items = (data.orders ?? []).map(toOrderSummary)
    if (query.status) items = items.filter((order) => order.status === query.status)
    return { items, meta: { page: query.page, limit: query.limit, total: items.length } }
  }

  async getOrder(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    try {
      const data = await this.#get<{ order: ShopifyOrder }>(ctx, `/orders/${orderId}.json`)
      return data.order ? toOrder(data.order) : null
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
    if (status === 'cancelled') {
      await this.#post(ctx, `/orders/${orderId}/cancel.json`, {})
      return this.getOrder(ctx, orderId)
    }
    if (status === 'fulfilled') {
      const order = await this.getOrder(ctx, orderId)
      if (!order) return null
      await this.#post(ctx, `/orders/${orderId}/fulfillments.json`, {
        fulfillment: { notify_customer: false },
      })
      return this.getOrder(ctx, orderId)
    }
    throw new CommerceUnsupportedError(this.id, `order transition to ${status}`)
  }

  async capturePayment(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    await this.#post(ctx, `/orders/${orderId}/transactions.json`, {
      transaction: { kind: 'capture' },
    })
    return this.getOrder(ctx, orderId)
  }

  async createRefund(
    ctx: CommerceContext,
    orderId: string,
    input: CreateRefundInput,
  ): Promise<Refund> {
    const data = await this.#post<{ refund: { id: number | string; created_at: string } }>(
      ctx,
      `/orders/${orderId}/refunds.json`,
      {
        refund: {
          notify: false,
          note: input.reason ?? '',
          transactions: [
            {
              amount: (input.amount.amount / 100).toFixed(2),
              kind: 'refund',
              gateway: 'manual',
            },
          ],
        },
      },
    )
    return {
      id: String(data.refund.id),
      orderId,
      amount: input.amount,
      reason: input.reason ?? '',
      createdBy: ctx.actorLabel,
      createdAt: data.refund.created_at ?? new Date().toISOString(),
    }
  }

  async listCustomers(ctx: CommerceContext, query: CustomerQuery): Promise<Paginated<CustomerSummary>> {
    const params = new URLSearchParams({ limit: String(query.limit) })
    if (query.search) params.set('query', query.search)
    const data = await this.#get<{ customers: ShopifyCustomer[] }>(ctx, `/customers.json?${params}`)
    const items = (data.customers ?? []).map(toCustomerSummary)
    return { items, meta: { page: query.page, limit: query.limit, total: items.length } }
  }

  async getCustomer(ctx: CommerceContext, customerId: string): Promise<Customer | null> {
    try {
      const data = await this.#get<{ customer: ShopifyCustomer }>(ctx, `/customers/${customerId}.json`)
      if (!data.customer) return null
      const summary = toCustomerSummary(data.customer)
      return { ...summary, defaultAddress: null, orders: [] }
    } catch (error) {
      if (error instanceof CommerceProviderError && error.status === 404) return null
      throw error
    }
  }

  // endregion

  // region HTTP

  #assertConfigured(): void {
    if (!this.#shop || !this.#accessToken) {
      throw new CommerceUnconfiguredError(
        this.id,
        'Set shop domain and Admin API access token under Commerce → Connection.',
      )
    }
  }

  #base(): string {
    return `https://${this.#shop}/admin/api/${this.#apiVersion}`
  }

  async #get<T>(ctx: CommerceContext, path: string): Promise<T> {
    return this.#request<T>(ctx, 'GET', path)
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
    const response = await fetch(`${this.#base()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Shopify-Access-Token': this.#accessToken,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new CommerceProviderError(
        this.id,
        text.slice(0, 240) || response.statusText,
        response.status,
      )
    }
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }
}

function normalizeShopifyShop(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''
  try {
    if (trimmed.includes('://')) return new URL(trimmed).hostname
  } catch {
    /* fall through */
  }
  return trimmed.replace(/\/+$/, '')
}
