import {
  money,
  zeroMoney,
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
  fromProductStatus,
  toCart,
  toCollection,
  toCustomerSummary,
  toMedusaAmount,
  toOrder,
  toOrderSummary,
  toProduct,
  toProductSummary,
  type MedusaCart,
  type MedusaCollection,
  type MedusaCustomer,
  type MedusaOrder,
  type MedusaProduct,
} from './medusa-mapping.js'
import {
  CommerceProviderError,
  CommerceUnconfiguredError,
  CommerceUnsupportedError,
  type CommerceContext,
  type CommerceProvider,
  type Paginated,
} from './types.js'

/**
 * Medusa, behind the platform's commerce contract (ADR-0006).
 *
 * **This directory is the only place in the platform that knows Medusa exists.**
 * `handle`, `variants[].prices[]`, `thumbnail`, `display_id`, the `/admin` and
 * `/store` split, `x-medusa-access-token`, Medusa's decimal amounts — all of it
 * stops here (the shapes themselves live in `medusa-mapping.ts`). Everything
 * above this line speaks `Product`, `Cart`, `Order`.
 *
 * There is deliberately no Medusa SDK dependency. An SDK would drag Medusa's
 * type system into the build, and the first time it appeared in an import
 * outside this directory the abstraction would already be lost.
 *
 * Where Medusa's model genuinely differs from ours — its inventory module, its
 * shipping options, its promotion engine — the method says so with
 * `CommerceUnsupportedError` instead of pretending. ADR-0006 calls that cost
 * "explicit and contained"; this is what containing it looks like.
 */
export class MedusaCommerceProvider implements CommerceProvider {
  readonly id = 'medusa'
  readonly #baseUrl: string
  readonly #apiKey: string

  constructor(baseUrl = process.env.MEDUSA_URL ?? '', apiKey = process.env.MEDUSA_API_KEY ?? '') {
    this.#baseUrl = baseUrl.replace(/\/+$/, '')
    this.#apiKey = apiKey
  }

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: this.#baseUrl.length > 0,
      capabilities: ['products', 'collections', 'carts', 'orders', 'customers'],
      reason: this.#baseUrl
        ? null
        : 'MEDUSA_URL is not set on this installation; the platform provider is handling commerce.',
    }
  }

  // region Catalog

  async listProducts(ctx: CommerceContext, query: ProductQuery): Promise<Paginated<ProductSummary>> {
    const search = this.#pageParams(query.page, query.limit)
    if (query.search) search.set('q', query.search)
    if (query.status) search.set('status', fromProductStatus(query.status))
    if (query.collectionId) search.set('collection_id', query.collectionId)

    const response = await this.#get<{ products: MedusaProduct[]; count: number }>(
      ctx,
      `/admin/products?${search.toString()}`,
    )

    return {
      items: response.products.map(toProductSummary),
      meta: { total: response.count, page: query.page, limit: query.limit },
    }
  }

  async getProduct(ctx: CommerceContext, productId: string): Promise<Product | null> {
    const response = await this.#get<{ product: MedusaProduct } | null>(
      ctx,
      `/admin/products/${productId}`,
      { allowNotFound: true },
    )
    return response ? toProduct(response.product) : null
  }

  async createProduct(ctx: CommerceContext, input: CreateProductInput): Promise<Product> {
    const response = await this.#post<{ product: MedusaProduct }>(ctx, '/admin/products', {
      title: input.title,
      handle: input.handle,
      description: input.description ?? '',
      status: fromProductStatus(input.status),
      images: (input.images ?? []).map((image) => ({ url: image.url })),
      options: (input.options ?? []).map((option) => ({ title: option.name, values: option.values })),
      variants: input.variants.map((variant) => ({
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        weight: variant.weightGrams,
        prices: [
          { amount: toMedusaAmount(variant.price), currency_code: variant.price.currency.toLowerCase() },
        ],
        options: variant.optionValues ?? {},
      })),
    })

    return toProduct(response.product)
  }

  async updateProduct(
    ctx: CommerceContext,
    productId: string,
    patch: UpdateProductInput,
  ): Promise<Product | null> {
    const response = await this.#post<{ product: MedusaProduct }>(ctx, `/admin/products/${productId}`, {
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.handle === undefined ? {} : { handle: patch.handle }),
      ...(patch.description === undefined ? {} : { description: patch.description }),
      ...(patch.status === undefined ? {} : { status: fromProductStatus(patch.status) }),
      ...(patch.images === undefined ? {} : { images: patch.images.map((image) => ({ url: image.url })) }),
    })
    return toProduct(response.product)
  }

  async deleteProduct(ctx: CommerceContext, productId: string): Promise<boolean> {
    await this.#request(ctx, `/admin/products/${productId}`, { method: 'DELETE' })
    return true
  }

  async listCollections(ctx: CommerceContext): Promise<Collection[]> {
    const response = await this.#get<{ collections: MedusaCollection[] }>(ctx, '/admin/collections')
    return response.collections.map((collection) => toCollection(collection))
  }

  async createCollection(ctx: CommerceContext, input: CreateCollectionInput): Promise<Collection> {
    const response = await this.#post<{ collection: MedusaCollection }>(ctx, '/admin/collections', {
      title: input.title,
      handle: input.handle,
    })
    return toCollection(response.collection, input.description ?? '')
  }

  // endregion

  // region Inventory

  /**
   * Medusa models stock as inventory *items* linked to variants, then levels
   * per stock location — a second identifier we would have to store and keep in
   * sync. That is a real integration, not a mapping, so it is declared
   * unsupported until someone runs a Medusa instance to build it against.
   */
  async listLocations(_ctx: CommerceContext): Promise<InventoryLocation[]> {
    throw new CommerceUnsupportedError(this.id, 'inventory locations')
  }

  async createLocation(_ctx: CommerceContext, _input: CreateLocationInput): Promise<InventoryLocation> {
    throw new CommerceUnsupportedError(this.id, 'inventory locations')
  }

  async listInventory(_ctx: CommerceContext, _variantId: string): Promise<InventoryLevel[]> {
    throw new CommerceUnsupportedError(this.id, 'per-location inventory')
  }

  async setInventory(
    _ctx: CommerceContext,
    _variantId: string,
    _input: SetInventoryInput,
  ): Promise<InventoryLevel> {
    throw new CommerceUnsupportedError(this.id, 'per-location inventory')
  }

  // endregion

  // region Carts and checkout

  async createCart(ctx: CommerceContext, input: CreateCartInput): Promise<Cart> {
    const response = await this.#post<{ cart: MedusaCart }>(ctx, '/store/carts', {
      currency_code: input.currency.toLowerCase(),
      email: input.email,
      customer_id: input.customerId,
    })
    return toCart(response.cart)
  }

  async getCart(ctx: CommerceContext, cartId: string): Promise<Cart | null> {
    const response = await this.#get<{ cart: MedusaCart } | null>(ctx, `/store/carts/${cartId}`, {
      allowNotFound: true,
    })
    return response ? toCart(response.cart) : null
  }

  async addLineItem(ctx: CommerceContext, cartId: string, input: AddLineItemInput): Promise<Cart> {
    const response = await this.#post<{ cart: MedusaCart }>(ctx, `/store/carts/${cartId}/line-items`, {
      variant_id: input.variantId,
      quantity: input.quantity,
    })
    return toCart(response.cart)
  }

  async updateLineItem(
    ctx: CommerceContext,
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart> {
    if (quantity === 0) {
      const removed = await this.#request<{ parent: MedusaCart }>(
        ctx,
        `/store/carts/${cartId}/line-items/${itemId}`,
        { method: 'DELETE' },
      )
      return toCart(removed.parent)
    }

    const response = await this.#post<{ cart: MedusaCart }>(
      ctx,
      `/store/carts/${cartId}/line-items/${itemId}`,
      { quantity },
    )
    return toCart(response.cart)
  }

  async applyDiscountCode(ctx: CommerceContext, cartId: string, code: string): Promise<Cart> {
    const response = await this.#post<{ cart: MedusaCart }>(ctx, `/store/carts/${cartId}`, {
      promo_codes: [code],
    })
    return toCart(response.cart)
  }

  async removeDiscountCode(ctx: CommerceContext, cartId: string, _code: string): Promise<Cart> {
    const response = await this.#post<{ cart: MedusaCart }>(ctx, `/store/carts/${cartId}`, {
      promo_codes: [],
    })
    return toCart(response.cart)
  }

  async startCheckout(ctx: CommerceContext, cartId: string, input: StartCheckoutInput): Promise<Checkout> {
    const updated = await this.#post<{ cart: MedusaCart }>(ctx, `/store/carts/${cartId}`, {
      email: input.email,
    })

    return {
      cart: toCart(updated.cart),
      // Medusa owns shipping options and payment sessions for its own carts; the
      // platform's shipping and payment adapters stand down on purpose rather
      // than producing a second, competing set of prices.
      shippingQuotes: [],
      payment: null,
      paymentConfigured: false,
    }
  }

  async completeCheckout(
    ctx: CommerceContext,
    cartId: string,
    _input: CompleteCheckoutInput,
  ): Promise<Order> {
    const response = await this.#post<{ order?: MedusaOrder }>(
      ctx,
      `/store/carts/${cartId}/complete`,
      {},
    )

    if (!response.order) {
      throw new CommerceProviderError(this.id, 'the cart did not complete into an order.')
    }
    return toOrder(response.order, this.id)
  }

  // endregion

  // region Orders

  async listOrders(ctx: CommerceContext, query: OrderQuery): Promise<Paginated<OrderSummary>> {
    const search = this.#pageParams(query.page, query.limit)
    if (query.search) search.set('q', query.search)
    if (query.customerId) search.set('customer_id', query.customerId)

    const response = await this.#get<{ orders: MedusaOrder[]; count: number }>(
      ctx,
      `/admin/orders?${search.toString()}`,
    )

    return {
      items: response.orders.map(toOrderSummary),
      meta: { total: response.count, page: query.page, limit: query.limit },
    }
  }

  async getOrder(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    const response = await this.#get<{ order: MedusaOrder } | null>(ctx, `/admin/orders/${orderId}`, {
      allowNotFound: true,
    })
    return response ? toOrder(response.order, this.id) : null
  }

  async transitionOrder(
    ctx: CommerceContext,
    orderId: string,
    status: OrderStatus,
    _note: string,
  ): Promise<Order | null> {
    // Medusa has no single status field to set: fulfilment, payment and
    // cancellation are separate endpoints. Only cancellation maps cleanly.
    if (status !== 'cancelled') {
      throw new CommerceUnsupportedError(this.id, `transitioning an order to ${status}`)
    }

    await this.#post(ctx, `/admin/orders/${orderId}/cancel`, {})
    return this.getOrder(ctx, orderId)
  }

  async capturePayment(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    await this.#post(ctx, `/admin/orders/${orderId}/capture`, {})
    return this.getOrder(ctx, orderId)
  }

  async createRefund(ctx: CommerceContext, orderId: string, input: CreateRefundInput): Promise<Refund> {
    const response = await this.#post<{ refund?: { id: string; created_at: string } }>(
      ctx,
      `/admin/orders/${orderId}/refund`,
      { amount: toMedusaAmount(input.amount), reason: input.reason ?? 'other' },
    )

    return {
      id: response.refund?.id ?? orderId,
      orderId,
      amount: input.amount,
      reason: input.reason ?? '',
      createdBy: ctx.actorLabel,
      createdAt: response.refund?.created_at ?? new Date().toISOString(),
    }
  }

  // endregion

  // region Customers

  async listCustomers(ctx: CommerceContext, query: CustomerQuery): Promise<Paginated<CustomerSummary>> {
    const search = this.#pageParams(query.page, query.limit)
    if (query.search) search.set('q', query.search)

    const response = await this.#get<{ customers: MedusaCustomer[]; count: number }>(
      ctx,
      `/admin/customers?${search.toString()}`,
    )

    return {
      items: response.customers.map(toCustomerSummary),
      meta: { total: response.count, page: query.page, limit: query.limit },
    }
  }

  async getCustomer(ctx: CommerceContext, customerId: string): Promise<Customer | null> {
    const response = await this.#get<{ customer: MedusaCustomer } | null>(
      ctx,
      `/admin/customers/${customerId}`,
      { allowNotFound: true },
    )
    if (!response) return null

    const orders = await this.listOrders(ctx, { customerId, page: 1, limit: 50 })
    const currency = orders.items[0]?.currency ?? 'EUR'

    return {
      ...toCustomerSummary(response.customer),
      // Lifetime value is ours to compute either way: Medusa does not expose
      // one, and a merchant asking "what is this customer worth?" must get the
      // same number whichever provider is behind the screen.
      lifetimeValue: orders.items.reduce(
        (total, order) => money(total.amount + order.total.amount - order.refundedTotal.amount, currency),
        zeroMoney(currency),
      ),
      ordersCount: orders.meta.total,
      lastOrderAt: orders.items[0]?.placedAt ?? null,
      defaultAddress: null,
      orders: orders.items,
    }
  }

  // endregion

  // region Discounts and shipping

  /**
   * Medusa's promotion engine has its own rule model (campaigns, application
   * methods, target rules) that does not survive a lossy mapping onto our three
   * discount types and one stacking flag. Declaring it unsupported is more
   * honest than an adapter that silently drops rules a merchant set.
   */
  async listDiscounts(_ctx: CommerceContext): Promise<Discount[]> {
    throw new CommerceUnsupportedError(this.id, 'discount management')
  }

  async createDiscount(_ctx: CommerceContext, _input: CreateDiscountInput): Promise<Discount> {
    throw new CommerceUnsupportedError(this.id, 'discount management')
  }

  async updateDiscount(
    _ctx: CommerceContext,
    _discountId: string,
    _patch: UpdateDiscountInput,
  ): Promise<Discount | null> {
    throw new CommerceUnsupportedError(this.id, 'discount management')
  }

  async deleteDiscount(_ctx: CommerceContext, _discountId: string): Promise<boolean> {
    throw new CommerceUnsupportedError(this.id, 'discount management')
  }

  async listShippingRates(_ctx: CommerceContext): Promise<ShippingRate[]> {
    throw new CommerceUnsupportedError(this.id, 'shipping rate configuration')
  }

  async createShippingRate(
    _ctx: CommerceContext,
    _input: CreateShippingRateInput,
  ): Promise<ShippingRate> {
    throw new CommerceUnsupportedError(this.id, 'shipping rate configuration')
  }

  async deleteShippingRate(_ctx: CommerceContext, _rateId: string): Promise<boolean> {
    throw new CommerceUnsupportedError(this.id, 'shipping rate configuration')
  }

  // endregion

  // region Transport

  #pageParams(page: number, limit: number): URLSearchParams {
    return new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) })
  }

  async #request<T>(
    ctx: CommerceContext,
    path: string,
    init: RequestInit & { allowNotFound?: boolean } = {},
  ): Promise<T> {
    if (!this.#baseUrl) {
      throw new CommerceUnconfiguredError(this.id, 'MEDUSA_URL is not set.')
    }

    const response = await fetch(`${this.#baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        // The tenant travels as a header so one instance can serve many
        // workspaces. The platform never trusts it back: tenancy is re-derived
        // from the session on the way in (ADR-0004).
        'x-platform-tenant': ctx.tenantId,
        ...(this.#apiKey ? { 'x-medusa-access-token': this.#apiKey } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    })

    if (response.status === 404 && init.allowNotFound) return null as T
    if (!response.ok) {
      // The body can echo request parameters, so only the status is surfaced.
      throw new CommerceProviderError(this.id, `HTTP ${response.status}`, response.status)
    }
    if (response.status === 204) return null as T

    return (await response.json()) as T
  }

  #get<T>(ctx: CommerceContext, path: string, options: { allowNotFound?: boolean } = {}): Promise<T> {
    return this.#request<T>(ctx, path, { method: 'GET', allowNotFound: options.allowNotFound })
  }

  #post<T>(ctx: CommerceContext, path: string, body: unknown): Promise<T> {
    return this.#request<T>(ctx, path, { method: 'POST', body: JSON.stringify(body) })
  }

  // endregion
}
