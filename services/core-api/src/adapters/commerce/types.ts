import type {
  AddLineItemInput,
  Cart,
  Checkout,
  Collection,
  CompleteCheckoutInput,
  CreateCollectionInput,
  CreateDiscountInput,
  CreateLocationInput,
  CreateProductInput,
  CreateRefundInput,
  CreateShippingRateInput,
  Customer,
  CustomerQuery,
  CustomerSummary,
  Discount,
  InventoryLevel,
  InventoryLocation,
  Order,
  OrderQuery,
  OrderStatus,
  OrderSummary,
  PaginationMeta,
  Product,
  ProductQuery,
  ProductSummary,
  Refund,
  SetInventoryInput,
  ShippingRate,
  StartCheckoutInput,
  UpdateDiscountInput,
  UpdateProductInput,
  ProviderStatus,
  CreateCartInput,
} from '@platform/schemas'

/**
 * The platform's commerce contract (ADR-0006).
 *
 * This interface and every type in its signature are **ours**. Medusa is one
 * implementation of it, Postgres is another, and a third will be someone we
 * have not heard of yet. Nothing outside `src/adapters/commerce/` may know
 * which one is in play, and no vendor's field name may appear in this file.
 *
 * The consequence that matters: the dashboard builds one product table, not a
 * MedusaProductTable and a ShopifyProductTable.
 */

/** Who is asking, in the only terms an adapter needs. */
export interface CommerceContext {
  tenantId: string
  /** For order timeline entries and refund attribution. */
  actorLabel: string
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

/** A capability the selected provider genuinely cannot offer. */
export class CommerceUnsupportedError extends Error {
  constructor(providerId: string, capability: string) {
    super(`The ${providerId} commerce provider does not support ${capability}.`)
    this.name = 'CommerceUnsupportedError'
  }
}

/** A provider that has no credentials was asked to do something. */
export class CommerceUnconfiguredError extends Error {
  constructor(providerId: string, reason: string) {
    super(`The ${providerId} commerce provider is not configured: ${reason}`)
    this.name = 'CommerceUnconfiguredError'
  }
}

/** The vendor answered, but not in a way we can map. */
export class CommerceProviderError extends Error {
  constructor(providerId: string, message: string, readonly status?: number) {
    super(`${providerId}: ${message}`)
    this.name = 'CommerceProviderError'
  }
}

export interface CommerceProvider {
  readonly id: string

  /** Never throws. An unconfigured provider is a state to report, not a fault. */
  status(): ProviderStatus

  // region Catalog
  listProducts(ctx: CommerceContext, query: ProductQuery): Promise<Paginated<ProductSummary>>
  getProduct(ctx: CommerceContext, productId: string): Promise<Product | null>
  createProduct(ctx: CommerceContext, input: CreateProductInput): Promise<Product>
  updateProduct(ctx: CommerceContext, productId: string, patch: UpdateProductInput): Promise<Product | null>
  deleteProduct(ctx: CommerceContext, productId: string): Promise<boolean>

  listCollections(ctx: CommerceContext): Promise<Collection[]>
  createCollection(ctx: CommerceContext, input: CreateCollectionInput): Promise<Collection>
  // endregion

  // region Inventory
  listLocations(ctx: CommerceContext): Promise<InventoryLocation[]>
  createLocation(ctx: CommerceContext, input: CreateLocationInput): Promise<InventoryLocation>
  listInventory(ctx: CommerceContext, variantId: string): Promise<InventoryLevel[]>
  setInventory(ctx: CommerceContext, variantId: string, input: SetInventoryInput): Promise<InventoryLevel>
  // endregion

  // region Carts and checkout
  createCart(ctx: CommerceContext, input: CreateCartInput): Promise<Cart>
  getCart(ctx: CommerceContext, cartId: string): Promise<Cart | null>
  addLineItem(ctx: CommerceContext, cartId: string, input: AddLineItemInput): Promise<Cart>
  /** Quantity zero removes the line — one call for both, like every basket UI. */
  updateLineItem(ctx: CommerceContext, cartId: string, itemId: string, quantity: number): Promise<Cart>
  applyDiscountCode(ctx: CommerceContext, cartId: string, code: string): Promise<Cart>
  removeDiscountCode(ctx: CommerceContext, cartId: string, code: string): Promise<Cart>

  startCheckout(ctx: CommerceContext, cartId: string, input: StartCheckoutInput): Promise<Checkout>
  completeCheckout(ctx: CommerceContext, cartId: string, input: CompleteCheckoutInput): Promise<Order>
  // endregion

  // region Orders
  listOrders(ctx: CommerceContext, query: OrderQuery): Promise<Paginated<OrderSummary>>
  getOrder(ctx: CommerceContext, orderId: string): Promise<Order | null>
  transitionOrder(ctx: CommerceContext, orderId: string, status: OrderStatus, note: string): Promise<Order | null>
  /** Take the money that checkout only authorised. Moves the order to `paid`. */
  capturePayment(ctx: CommerceContext, orderId: string): Promise<Order | null>
  createRefund(ctx: CommerceContext, orderId: string, input: CreateRefundInput): Promise<Refund>
  // endregion

  // region Customers
  listCustomers(ctx: CommerceContext, query: CustomerQuery): Promise<Paginated<CustomerSummary>>
  getCustomer(ctx: CommerceContext, customerId: string): Promise<Customer | null>
  // endregion

  // region Discounts
  listDiscounts(ctx: CommerceContext): Promise<Discount[]>
  createDiscount(ctx: CommerceContext, input: CreateDiscountInput): Promise<Discount>
  updateDiscount(ctx: CommerceContext, discountId: string, patch: UpdateDiscountInput): Promise<Discount | null>
  deleteDiscount(ctx: CommerceContext, discountId: string): Promise<boolean>
  // endregion

  // region Shipping configuration
  listShippingRates(ctx: CommerceContext): Promise<ShippingRate[]>
  createShippingRate(ctx: CommerceContext, input: CreateShippingRateInput): Promise<ShippingRate>
  deleteShippingRate(ctx: CommerceContext, rateId: string): Promise<boolean>
  // endregion
}
