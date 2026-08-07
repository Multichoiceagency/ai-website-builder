import {
  canTransitionOrder,
  customerSchema,
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
  type Money,
  type Order,
  type OrderQuery,
  type OrderStatus,
  type OrderSummary,
  type PaymentSession,
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
import { withTenant } from '../../db/client.js'
import {
  deleteProduct,
  deleteShippingRate,
  findProductById,
  findShippingRateById,
  findVariantForCart,
  insertCollection,
  insertLocation,
  insertProduct,
  insertShippingRate,
  listCollections,
  listInventory,
  listLocations,
  listProducts,
  listShippingRates,
  productHandleTaken,
  replaceVariants,
  setProductCollections,
  updateProductFields,
  upsertInventoryLevel,
  decrementInventory,
} from '../../db/repositories/commerce.js'
import {
  deleteDiscount,
  findCustomerById,
  findDiscountById,
  findDiscountByCode,
  findOrCreateCustomer,
  insertDiscount,
  listCustomers,
  listDiscounts,
  recordDiscountRedemption,
  updateDiscount,
} from '../../db/repositories/commerce-customers.js'
import {
  deleteCartItem,
  findOrderById,
  insertCart,
  insertOrder,
  insertOrderEvent,
  insertRefund,
  listCartItems,
  listOrders,
  listOrdersForCustomer,
  nextOrderNumber,
  setCartItemQuantity,
  updateCart,
  updateOrderPayment,
  updateOrderStatus,
  upsertCartItem,
} from '../../db/repositories/commerce-orders.js'
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js'
import { slugify, uniqueSlug } from '../../lib/slug.js'
import { activePaymentProvider, paymentProviderById } from '../payments/index.js'
import { quoteShipping } from '../shipping/index.js'
import {
  assembleCart,
  emptyAddress,
  loadCart,
  reloadCart,
  requireOpenCart,
} from './postgres-cart.js'
import type { CommerceContext, CommerceProvider, Paginated } from './types.js'

/**
 * The platform's own commerce implementation.
 *
 * This is what makes the module usable on the day it ships: no Medusa instance,
 * no vendor account, no third-party outage. It stores into the `commerce_*`
 * tables from migration 0005 and computes every total from the line items, so
 * a cart and its own contents can never disagree.
 *
 * It is an *implementation* of `CommerceProvider`, exactly like the Medusa one.
 * Neither is the foundation (ADR-0006).
 */

function meta(page: number, limit: number, total: number) {
  return { total, page, limit }
}

export class PostgresCommerceProvider implements CommerceProvider {
  readonly id = 'postgres'

  status(): ProviderStatus {
    return {
      id: this.id,
      configured: true,
      capabilities: [
        'products',
        'variants',
        'collections',
        'inventory',
        'carts',
        'checkout',
        'orders',
        'refunds',
        'customers',
        'discounts',
        'shipping-rates',
      ],
      reason: null,
    }
  }

  // region Catalog

  async listProducts(ctx: CommerceContext, query: ProductQuery): Promise<Paginated<ProductSummary>> {
    return withTenant(ctx.tenantId, async (tx) => {
      const { items, total } = await listProducts(tx, ctx.tenantId, query)
      return { items, meta: meta(query.page, query.limit, total) }
    })
  }

  async getProduct(ctx: CommerceContext, productId: string): Promise<Product | null> {
    return withTenant(ctx.tenantId, (tx) => findProductById(tx, ctx.tenantId, productId))
  }

  async createProduct(ctx: CommerceContext, input: CreateProductInput): Promise<Product> {
    const product = await withTenant(ctx.tenantId, async (tx) => {
      const handle = await uniqueSlug(input.handle ?? slugify(input.title), (candidate) =>
        productHandleTaken(tx, ctx.tenantId, candidate),
      )

      this.#assertOneCurrency(input.variants.map((variant) => variant.price))

      const productId = await insertProduct(tx, {
        tenantId: ctx.tenantId,
        title: input.title,
        handle,
        description: input.description ?? '',
        status: input.status,
        taxRateBps: input.taxRateBps ?? 0,
        options: input.options ?? [],
        images: input.images ?? [],
        variants: input.variants,
        collectionIds: input.collectionIds ?? [],
      })

      return findProductById(tx, ctx.tenantId, productId)
    })

    if (!product) throw new NotFoundError('Product')
    return product
  }

  async updateProduct(
    ctx: CommerceContext,
    productId: string,
    patch: UpdateProductInput,
  ): Promise<Product | null> {
    return withTenant(ctx.tenantId, async (tx) => {
      const existing = await findProductById(tx, ctx.tenantId, productId)
      if (!existing) return null

      if (patch.variants) this.#assertOneCurrency(patch.variants.map((variant) => variant.price))

      await updateProductFields(tx, ctx.tenantId, productId, {
        title: patch.title,
        handle: patch.handle,
        description: patch.description,
        status: patch.status,
        taxRateBps: patch.taxRateBps,
        options: patch.options,
        images: patch.images,
      })

      if (patch.variants) await replaceVariants(tx, ctx.tenantId, productId, patch.variants)
      if (patch.collectionIds) await setProductCollections(tx, ctx.tenantId, productId, patch.collectionIds)

      return findProductById(tx, ctx.tenantId, productId)
    })
  }

  async deleteProduct(ctx: CommerceContext, productId: string): Promise<boolean> {
    return withTenant(ctx.tenantId, (tx) => deleteProduct(tx, ctx.tenantId, productId))
  }

  async listCollections(ctx: CommerceContext): Promise<Collection[]> {
    return withTenant(ctx.tenantId, (tx) => listCollections(tx, ctx.tenantId))
  }

  async createCollection(ctx: CommerceContext, input: CreateCollectionInput): Promise<Collection> {
    return withTenant(ctx.tenantId, (tx) =>
      insertCollection(tx, {
        tenantId: ctx.tenantId,
        title: input.title,
        handle: input.handle ?? slugify(input.title),
        description: input.description ?? '',
      }),
    )
  }

  /**
   * One product, one currency.
   *
   * Multi-currency pricing is a real feature and this is not it — but silently
   * accepting a €-priced variant next to a $-priced one would produce a
   * subtotal that means nothing, so it is refused rather than approximated.
   */
  #assertOneCurrency(prices: Money[]): void {
    const currencies = new Set(prices.map((price) => price.currency))
    if (currencies.size > 1) {
      throw new BadRequestError('All variants of a product must share one currency.', {
        currencies: [...currencies],
      })
    }
  }

  // endregion

  // region Inventory

  async listLocations(ctx: CommerceContext): Promise<InventoryLocation[]> {
    return withTenant(ctx.tenantId, (tx) => listLocations(tx, ctx.tenantId))
  }

  async createLocation(ctx: CommerceContext, input: CreateLocationInput): Promise<InventoryLocation> {
    return withTenant(ctx.tenantId, async (tx) => {
      const existing = await listLocations(tx, ctx.tenantId)
      return insertLocation(tx, {
        tenantId: ctx.tenantId,
        name: input.name,
        code: input.code ?? slugify(input.name),
        // The first location a shop creates is its default, whatever it says.
        isDefault: input.isDefault || existing.length === 0,
      })
    })
  }

  async listInventory(ctx: CommerceContext, variantId: string): Promise<InventoryLevel[]> {
    return withTenant(ctx.tenantId, (tx) => listInventory(tx, ctx.tenantId, variantId))
  }

  async setInventory(
    ctx: CommerceContext,
    variantId: string,
    input: SetInventoryInput,
  ): Promise<InventoryLevel> {
    return withTenant(ctx.tenantId, (tx) =>
      upsertInventoryLevel(tx, {
        tenantId: ctx.tenantId,
        variantId,
        locationId: input.locationId,
        available: input.available,
      }),
    )
  }

  // endregion

  // region Carts

  async createCart(ctx: CommerceContext, input: CreateCartInput): Promise<Cart> {
    return withTenant(ctx.tenantId, async (tx) => {
      const record = await insertCart(tx, {
        tenantId: ctx.tenantId,
        currency: input.currency,
        email: input.email ?? null,
        customerId: input.customerId ?? null,
      })
      return assembleCart(tx, ctx.tenantId, record, [])
    })
  }

  async getCart(ctx: CommerceContext, cartId: string): Promise<Cart | null> {
    return withTenant(ctx.tenantId, (tx) => loadCart(tx, ctx.tenantId, cartId))
  }

  async addLineItem(ctx: CommerceContext, cartId: string, input: AddLineItemInput): Promise<Cart> {
    return withTenant(ctx.tenantId, async (tx) => {
      const cart = await requireOpenCart(tx, ctx.tenantId, cartId)

      const variant = await findVariantForCart(tx, ctx.tenantId, input.variantId)
      if (!variant) throw new NotFoundError('Variant')

      if (variant.currency !== cart.currency) {
        throw new BadRequestError(
          `This cart is in ${cart.currency}; the product is priced in ${variant.currency}.`,
        )
      }

      await upsertCartItem(tx, {
        tenantId: ctx.tenantId,
        cartId,
        variantId: variant.variantId,
        productId: variant.productId,
        title: variant.productTitle,
        variantTitle: variant.variantTitle,
        sku: variant.sku,
        quantity: input.quantity,
        // Snapshot. Repricing a basket under someone's hands is not a feature.
        unitPriceAmount: variant.priceAmount,
        currency: variant.currency,
        taxRateBps: variant.taxRateBps,
      })

      return reloadCart(tx, ctx.tenantId, cartId)
    })
  }

  async updateLineItem(
    ctx: CommerceContext,
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart> {
    return withTenant(ctx.tenantId, async (tx) => {
      await requireOpenCart(tx, ctx.tenantId, cartId)

      const changed =
        quantity === 0
          ? await deleteCartItem(tx, ctx.tenantId, cartId, itemId)
          : await setCartItemQuantity(tx, ctx.tenantId, cartId, itemId, quantity)

      if (!changed) throw new NotFoundError('Line item')
      return reloadCart(tx, ctx.tenantId, cartId)
    })
  }

  async applyDiscountCode(ctx: CommerceContext, cartId: string, code: string): Promise<Cart> {
    return withTenant(ctx.tenantId, async (tx) => {
      const cart = await requireOpenCart(tx, ctx.tenantId, cartId)

      const discount = await findDiscountByCode(tx, ctx.tenantId, code)
      if (!discount) throw new NotFoundError('Discount code')
      if (!discount.active) throw new BadRequestError('That discount code is no longer active.')

      const normalized = discount.code.toUpperCase()
      if (cart.discountCodes.includes(normalized)) {
        throw new ConflictError('That discount code is already applied.')
      }

      await updateCart(tx, ctx.tenantId, cartId, {
        discountCodes: [...cart.discountCodes, normalized],
      })
      return reloadCart(tx, ctx.tenantId, cartId)
    })
  }

  async removeDiscountCode(ctx: CommerceContext, cartId: string, code: string): Promise<Cart> {
    return withTenant(ctx.tenantId, async (tx) => {
      const cart = await requireOpenCart(tx, ctx.tenantId, cartId)
      await updateCart(tx, ctx.tenantId, cartId, {
        discountCodes: cart.discountCodes.filter((entry) => entry !== code.toUpperCase()),
      })
      return reloadCart(tx, ctx.tenantId, cartId)
    })
  }

  // endregion

  // region Checkout

  async startCheckout(
    ctx: CommerceContext,
    cartId: string,
    input: StartCheckoutInput,
  ): Promise<Checkout> {
    return withTenant(ctx.tenantId, async (tx) => {
      const record = await requireOpenCart(tx, ctx.tenantId, cartId)
      const items = await listCartItems(tx, ctx.tenantId, cartId)
      if (items.length === 0) throw new BadRequestError('This cart is empty.')

      await updateCart(tx, ctx.tenantId, cartId, {
        email: input.email,
        shippingAddress: input.shippingAddress ? { ...emptyAddress(), ...input.shippingAddress } : undefined,
        billingAddress: input.billingAddress ? { ...emptyAddress(), ...input.billingAddress } : undefined,
        shippingRateId: input.shippingRateId,
      })

      const cart = await reloadCart(tx, ctx.tenantId, cartId)
      const rates = await listShippingRates(tx, ctx.tenantId)

      const shippingQuotes = await quoteShipping(
        { tenantId: ctx.tenantId },
        {
          subtotal: cart.totals.subtotal,
          country: input.shippingAddress?.country ?? record.shippingAddress?.country ?? '',
          weightGrams: 0,
          rates,
        },
      )

      const payments = activePaymentProvider()
      const paymentStatus = payments.status()

      const payment = await payments.createSession(
        { tenantId: ctx.tenantId },
        {
          amount: cart.totals.total,
          reference: cart.id,
          email: input.email,
          description: `Order for ${input.email}`,
        },
      )

      return { cart, shippingQuotes, payment, paymentConfigured: paymentStatus.configured }
    })
  }

  /**
   * Turn a cart into an order.
   *
   * One transaction: the order, its lines, the opening timeline entry, the
   * stock movement, the discount redemptions and closing the cart either all
   * happen or none do. A half-placed order is the worst possible state for a
   * shop to be in.
   */
  async completeCheckout(
    ctx: CommerceContext,
    cartId: string,
    input: CompleteCheckoutInput,
  ): Promise<Order> {
    const orderId = await withTenant(ctx.tenantId, async (tx) => {
      const record = await requireOpenCart(tx, ctx.tenantId, cartId)
      const items = await listCartItems(tx, ctx.tenantId, cartId)
      if (items.length === 0) throw new BadRequestError('This cart is empty.')

      const email = input.email ?? record.email
      if (!email) throw new BadRequestError('An e-mail address is required to place an order.')

      const cart = await assembleCart(tx, ctx.tenantId, record, items)
      const customerId = await findOrCreateCustomer(tx, {
        tenantId: ctx.tenantId,
        email,
        address: record.shippingAddress,
      })

      const rate = record.shippingRateId
        ? await findShippingRateById(tx, ctx.tenantId, record.shippingRateId)
        : null

      const provider = activePaymentProvider()
      const number = await nextOrderNumber(tx, ctx.tenantId)

      const newOrderId = await insertOrder(tx, {
        tenantId: ctx.tenantId,
        number,
        cartId,
        customerId,
        email,
        currency: cart.currency,
        subtotalAmount: cart.totals.subtotal.amount,
        discountAmount: cart.totals.discountTotal.amount,
        shippingAmount: cart.totals.shippingTotal.amount,
        taxAmount: cart.totals.taxTotal.amount,
        totalAmount: cart.totals.total.amount,
        appliedDiscounts: cart.appliedDiscounts,
        shippingAddress: record.shippingAddress,
        billingAddress: record.billingAddress ?? record.shippingAddress,
        shippingMethod: rate?.name ?? '',
        paymentProviderId: provider.id,
        paymentStatus: 'requires_action',
        paymentReference: input.paymentSessionId ?? null,
        items: items.map((item) => ({
          variantId: item.variantId,
          productId: item.productId,
          title: item.title,
          variantTitle: item.variantTitle,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          currency: item.currency,
          taxRateBps: item.taxRateBps,
          lineTotalAmount: item.unitPriceAmount * item.quantity,
        })),
      })

      await insertOrderEvent(tx, {
        tenantId: ctx.tenantId,
        orderId: newOrderId,
        status: 'pending',
        note: 'Order placed.',
        actorLabel: ctx.actorLabel,
      })

      for (const item of items) {
        await decrementInventory(tx, ctx.tenantId, item.variantId, item.quantity)
      }

      for (const applied of cart.appliedDiscounts) {
        await recordDiscountRedemption(tx, {
          tenantId: ctx.tenantId,
          discountId: applied.discountId,
          orderId: newOrderId,
          amountOff: applied.amountOff.amount + applied.shippingOff.amount,
          currency: cart.currency,
        })
      }

      await updateCart(tx, ctx.tenantId, cartId, { status: 'completed' })
      return newOrderId
    })

    const order = await this.getOrder(ctx, orderId)
    if (!order) throw new NotFoundError('Order')
    return order
  }

  // endregion

  // region Orders

  async listOrders(ctx: CommerceContext, query: OrderQuery): Promise<Paginated<OrderSummary>> {
    return withTenant(ctx.tenantId, async (tx) => {
      const { items, total } = await listOrders(tx, ctx.tenantId, query)
      return { items, meta: meta(query.page, query.limit, total) }
    })
  }

  async getOrder(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    return withTenant(ctx.tenantId, (tx) => findOrderById(tx, ctx.tenantId, orderId))
  }

  async transitionOrder(
    ctx: CommerceContext,
    orderId: string,
    status: OrderStatus,
    note: string,
  ): Promise<Order | null> {
    return withTenant(ctx.tenantId, async (tx) => {
      const order = await findOrderById(tx, ctx.tenantId, orderId)
      if (!order) return null

      if (!canTransitionOrder(order.status, status)) {
        throw new ConflictError(`An order cannot go from ${order.status} to ${status}.`, {
          from: order.status,
          to: status,
        })
      }

      await updateOrderStatus(tx, ctx.tenantId, orderId, status)
      await insertOrderEvent(tx, {
        tenantId: ctx.tenantId,
        orderId,
        status,
        note,
        actorLabel: ctx.actorLabel,
      })

      return findOrderById(tx, ctx.tenantId, orderId)
    })
  }

  async capturePayment(ctx: CommerceContext, orderId: string): Promise<Order | null> {
    const captured = await withTenant(ctx.tenantId, async (tx) => {
      const order = await findOrderById(tx, ctx.tenantId, orderId)
      if (!order) return null
      if (order.paymentStatus === 'captured') return order

      const provider = paymentProviderById(order.paymentProviderId ?? '') ?? activePaymentProvider()
      const session = await provider.capture({ tenantId: ctx.tenantId }, this.#sessionFor(order, provider.id))

      await updateOrderPayment(tx, ctx.tenantId, orderId, {
        providerId: provider.id,
        status: session.status,
        reference: session.providerReference,
      })

      // A captured payment moves the order to `paid` — but only from a state
      // the status graph allows, so a cancelled order cannot be revived by a
      // late webhook.
      if (session.status === 'captured' && canTransitionOrder(order.status, 'paid')) {
        await updateOrderStatus(tx, ctx.tenantId, orderId, 'paid')
        await insertOrderEvent(tx, {
          tenantId: ctx.tenantId,
          orderId,
          status: 'paid',
          note: `Payment captured via ${provider.id}.`,
          actorLabel: ctx.actorLabel,
        })
      }

      return findOrderById(tx, ctx.tenantId, orderId)
    })

    return captured
  }

  async createRefund(
    ctx: CommerceContext,
    orderId: string,
    input: CreateRefundInput,
  ): Promise<Refund> {
    return withTenant(ctx.tenantId, async (tx) => {
      const order = await findOrderById(tx, ctx.tenantId, orderId)
      if (!order) throw new NotFoundError('Order')

      if (input.amount.currency !== order.currency) {
        throw new BadRequestError(`This order was paid in ${order.currency}.`)
      }
      if (input.amount.amount <= 0) {
        throw new BadRequestError('A refund must be greater than zero.')
      }

      const refundable = order.total.amount - order.refundedTotal.amount
      if (input.amount.amount > refundable) {
        throw new BadRequestError('A refund cannot exceed what is left on the order.', {
          refundable,
        })
      }

      const refund = await insertRefund(tx, {
        tenantId: ctx.tenantId,
        orderId,
        amount: input.amount.amount,
        currency: input.amount.currency,
        reason: input.reason ?? '',
        createdBy: ctx.actorLabel,
      })

      // Only a full refund changes the order's status; a partial one is
      // recorded against an order that is still, factually, paid.
      const fullyRefunded = order.refundedTotal.amount + input.amount.amount >= order.total.amount
      if (fullyRefunded && canTransitionOrder(order.status, 'refunded')) {
        await updateOrderStatus(tx, ctx.tenantId, orderId, 'refunded')
        await insertOrderEvent(tx, {
          tenantId: ctx.tenantId,
          orderId,
          status: 'refunded',
          note: input.reason ?? 'Fully refunded.',
          actorLabel: ctx.actorLabel,
        })
      }

      return refund
    })
  }

  #sessionFor(order: Order, providerId: string): PaymentSession {
    return {
      id: order.id,
      providerId,
      status: order.paymentStatus ?? 'requires_action',
      amount: order.total,
      providerReference: order.id,
      redirectUrl: null,
    }
  }

  // endregion

  // region Customers

  async listCustomers(ctx: CommerceContext, query: CustomerQuery): Promise<Paginated<CustomerSummary>> {
    return withTenant(ctx.tenantId, async (tx) => {
      const { items, total } = await listCustomers(tx, ctx.tenantId, query)
      return { items, meta: meta(query.page, query.limit, total) }
    })
  }

  async getCustomer(ctx: CommerceContext, customerId: string): Promise<Customer | null> {
    return withTenant(ctx.tenantId, async (tx) => {
      const found = await findCustomerById(tx, ctx.tenantId, customerId)
      if (!found) return null

      const orders = await listOrdersForCustomer(tx, ctx.tenantId, customerId)
      return customerSchema.parse({
        ...found.summary,
        defaultAddress: found.defaultAddress,
        orders,
      })
    })
  }

  // endregion

  // region Discounts

  async listDiscounts(ctx: CommerceContext): Promise<Discount[]> {
    return withTenant(ctx.tenantId, (tx) => listDiscounts(tx, ctx.tenantId))
  }

  async createDiscount(ctx: CommerceContext, input: CreateDiscountInput): Promise<Discount> {
    return withTenant(ctx.tenantId, async (tx) => {
      const existing = await findDiscountByCode(tx, ctx.tenantId, input.code)
      if (existing) throw new ConflictError('That discount code already exists.')

      return insertDiscount(tx, {
        tenantId: ctx.tenantId,
        code: input.code,
        type: input.type,
        percentageBps: input.percentageBps ?? null,
        amountValue: input.amount?.amount ?? null,
        amountCurrency: input.amount?.currency ?? null,
        minimumSubtotalValue: input.minimumSubtotal?.amount ?? null,
        minimumSubtotalCurrency: input.minimumSubtotal?.currency ?? null,
        stackable: input.stackable,
        priority: input.priority,
        usageLimit: input.usageLimit ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        active: input.active,
      })
    })
  }

  async updateDiscount(
    ctx: CommerceContext,
    discountId: string,
    patch: UpdateDiscountInput,
  ): Promise<Discount | null> {
    return withTenant(ctx.tenantId, async (tx) => {
      const existing = await findDiscountById(tx, ctx.tenantId, discountId)
      if (!existing) return null
      return updateDiscount(tx, ctx.tenantId, discountId, patch)
    })
  }

  async deleteDiscount(ctx: CommerceContext, discountId: string): Promise<boolean> {
    return withTenant(ctx.tenantId, (tx) => deleteDiscount(tx, ctx.tenantId, discountId))
  }

  // endregion

  // region Shipping configuration

  async listShippingRates(ctx: CommerceContext): Promise<ShippingRate[]> {
    return withTenant(ctx.tenantId, (tx) => listShippingRates(tx, ctx.tenantId))
  }

  async createShippingRate(ctx: CommerceContext, input: CreateShippingRateInput): Promise<ShippingRate> {
    if (input.freeAboveSubtotal && input.freeAboveSubtotal.currency !== input.price.currency) {
      throw new BadRequestError('The free-shipping threshold must use the same currency as the rate.')
    }

    return withTenant(ctx.tenantId, (tx) =>
      insertShippingRate(tx, {
        tenantId: ctx.tenantId,
        name: input.name,
        description: input.description ?? '',
        priceAmount: input.price.amount,
        currency: input.price.currency,
        freeAboveAmount: input.freeAboveSubtotal?.amount ?? null,
        countries: input.countries ?? [],
        active: input.active,
      }),
    )
  }

  async deleteShippingRate(ctx: CommerceContext, rateId: string): Promise<boolean> {
    return withTenant(ctx.tenantId, (tx) => deleteShippingRate(tx, ctx.tenantId, rateId))
  }

  // endregion
}
