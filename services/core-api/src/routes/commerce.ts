import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  addLineItemInputSchema,
  completeCheckoutInputSchema,
  createCartInputSchema,
  createCollectionInputSchema,
  createDiscountInputSchema,
  createLocationInputSchema,
  createProductInputSchema,
  createRefundInputSchema,
  createShippingRateInputSchema,
  customerQuerySchema,
  orderQuerySchema,
  productQuerySchema,
  setInventoryInputSchema,
  startCheckoutInputSchema,
  transitionOrderInputSchema,
  updateDiscountInputSchema,
  updateLineItemInputSchema,
  updateProductInputSchema,
  uuidSchema,
  type DomainEventName,
} from '@platform/schemas'
import { commerceProvider, commerceStatus, type CommerceContext } from '../adapters/commerce/index.js'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, type TenantContext } from '../plugins/auth.js'

/**
 * Commerce routes (§12, §13).
 *
 * Not one line below knows which commerce engine is running. Handlers validate,
 * call `commerceProvider`, emit the domain event and return the envelope —
 * exactly the same code whether Postgres or Medusa is answering (ADR-0006).
 */

const productParams = z.object({ productId: uuidSchema })
const cartParams = z.object({ cartId: uuidSchema })
const orderParams = z.object({ orderId: uuidSchema })

/** Provider calls take the tenant and a label for order timelines, nothing more. */
function commerceContext(context: TenantContext): CommerceContext {
  return { tenantId: context.tenantId, actorLabel: context.user.email }
}

/**
 * Audit row and event publication, in that order — the audit trail is written
 * in the tenant's transaction, and a subscriber can never fail the request that
 * produced the fact (ADR-0008).
 */
async function emit(
  context: TenantContext,
  name: DomainEventName,
  resource: { type: string; id: string },
  payload: Record<string, unknown> = {},
): Promise<void> {
  const event = buildEvent({
    name,
    tenantId: context.tenantId,
    actor: context.actor,
    resource,
    payload,
  })
  await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
  await eventBus.publish(event)
}

const commerceRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Which providers are configured. The dashboard renders this rather than
   * assuming, so an unconfigured Medusa or Stripe is visible instead of being
   * discovered at checkout.
   */
  app.get('/status', async (request, reply) => {
    requireTenant(request, 'commerce:read')
    return reply.send(ok(commerceStatus()))
  })

  // region Products

  app.get('/products', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    const query = parseOrThrow(productQuerySchema, request.query, 'product query')

    const page = await commerceProvider.listProducts(commerceContext(context), query)
    return reply.send(ok(page.items, page.meta))
  })

  app.post('/products', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const input = parseOrThrow(createProductInputSchema, request.body, 'product')

    const product = await commerceProvider.createProduct(commerceContext(context), input)
    await emit(context, 'product.created', { type: 'product', id: product.id }, {
      handle: product.handle,
      variantCount: product.variants.length,
    })

    return reply.status(201).send(ok(product))
  })

  app.get('/products/:productId', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    const { productId } = parseOrThrow(productParams, request.params, 'product id')

    const product = await commerceProvider.getProduct(commerceContext(context), productId)
    // A product belonging to another tenant is simply not there — RLS returns
    // no row and the API does not confirm that an id exists elsewhere.
    if (!product) throw new NotFoundError('Product')

    return reply.send(ok(product))
  })

  app.patch('/products/:productId', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { productId } = parseOrThrow(productParams, request.params, 'product id')
    const patch = parseOrThrow(updateProductInputSchema, request.body, 'product')

    const product = await commerceProvider.updateProduct(commerceContext(context), productId, patch)
    if (!product) throw new NotFoundError('Product')

    return reply.send(ok(product))
  })

  app.delete('/products/:productId', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { productId } = parseOrThrow(productParams, request.params, 'product id')

    const deleted = await commerceProvider.deleteProduct(commerceContext(context), productId)
    if (!deleted) throw new NotFoundError('Product')

    return reply.send(ok({ deleted: true }))
  })

  // endregion

  // region Collections, locations, inventory

  app.get('/collections', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    return reply.send(ok(await commerceProvider.listCollections(commerceContext(context))))
  })

  app.post('/collections', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const input = parseOrThrow(createCollectionInputSchema, request.body, 'collection')

    const collection = await commerceProvider.createCollection(commerceContext(context), input)
    return reply.status(201).send(ok(collection))
  })

  app.get('/locations', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    return reply.send(ok(await commerceProvider.listLocations(commerceContext(context))))
  })

  app.post('/locations', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const input = parseOrThrow(createLocationInputSchema, request.body, 'location')

    const location = await commerceProvider.createLocation(commerceContext(context), input)
    return reply.status(201).send(ok(location))
  })

  app.get('/variants/:variantId/inventory', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    const { variantId } = parseOrThrow(z.object({ variantId: uuidSchema }), request.params, 'variant id')

    return reply.send(ok(await commerceProvider.listInventory(commerceContext(context), variantId)))
  })

  app.put('/variants/:variantId/inventory', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { variantId } = parseOrThrow(z.object({ variantId: uuidSchema }), request.params, 'variant id')
    const input = parseOrThrow(setInventoryInputSchema, request.body, 'inventory level')

    const level = await commerceProvider.setInventory(commerceContext(context), variantId, input)
    return reply.send(ok(level))
  })

  // endregion

  // region Discounts

  app.get('/discounts', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    return reply.send(ok(await commerceProvider.listDiscounts(commerceContext(context))))
  })

  app.post('/discounts', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const input = parseOrThrow(createDiscountInputSchema, request.body, 'discount')

    const discount = await commerceProvider.createDiscount(commerceContext(context), input)
    return reply.status(201).send(ok(discount))
  })

  app.patch('/discounts/:discountId', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { discountId } = parseOrThrow(z.object({ discountId: uuidSchema }), request.params, 'discount id')
    const patch = parseOrThrow(updateDiscountInputSchema, request.body, 'discount')

    const discount = await commerceProvider.updateDiscount(commerceContext(context), discountId, patch)
    if (!discount) throw new NotFoundError('Discount')

    return reply.send(ok(discount))
  })

  app.delete('/discounts/:discountId', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { discountId } = parseOrThrow(z.object({ discountId: uuidSchema }), request.params, 'discount id')

    const deleted = await commerceProvider.deleteDiscount(commerceContext(context), discountId)
    if (!deleted) throw new NotFoundError('Discount')

    return reply.send(ok({ deleted: true }))
  })

  // endregion

  // region Shipping rates

  app.get('/shipping/rates', async (request, reply) => {
    const context = requireTenant(request, 'commerce:read')
    return reply.send(ok(await commerceProvider.listShippingRates(commerceContext(context))))
  })

  app.post('/shipping/rates', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const input = parseOrThrow(createShippingRateInputSchema, request.body, 'shipping rate')

    const rate = await commerceProvider.createShippingRate(commerceContext(context), input)
    return reply.status(201).send(ok(rate))
  })

  app.delete('/shipping/rates/:rateId', async (request, reply) => {
    const context = requireTenant(request, 'commerce:write')
    const { rateId } = parseOrThrow(z.object({ rateId: uuidSchema }), request.params, 'rate id')

    const deleted = await commerceProvider.deleteShippingRate(commerceContext(context), rateId)
    if (!deleted) throw new NotFoundError('Shipping rate')

    return reply.send(ok({ deleted: true }))
  })

  // endregion

  // region Carts

  app.post('/carts', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const input = parseOrThrow(createCartInputSchema, request.body ?? {}, 'cart')

    const cart = await commerceProvider.createCart(commerceContext(context), input)
    await emit(context, 'cart.created', { type: 'cart', id: cart.id }, { currency: cart.currency })

    return reply.status(201).send(ok(cart))
  })

  app.get('/carts/:cartId', async (request, reply) => {
    const context = requireTenant(request, 'order:read')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')

    const cart = await commerceProvider.getCart(commerceContext(context), cartId)
    if (!cart) throw new NotFoundError('Cart')

    return reply.send(ok(cart))
  })

  app.post('/carts/:cartId/items', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const input = parseOrThrow(addLineItemInputSchema, request.body, 'line item')

    const cart = await commerceProvider.addLineItem(commerceContext(context), cartId, input)
    return reply.send(ok(cart))
  })

  app.patch('/carts/:cartId/items/:itemId', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const { itemId } = parseOrThrow(z.object({ itemId: uuidSchema }), request.params, 'item id')
    const { quantity } = parseOrThrow(updateLineItemInputSchema, request.body, 'line item')

    const cart = await commerceProvider.updateLineItem(commerceContext(context), cartId, itemId, quantity)
    return reply.send(ok(cart))
  })

  app.delete('/carts/:cartId/items/:itemId', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const { itemId } = parseOrThrow(z.object({ itemId: uuidSchema }), request.params, 'item id')

    const cart = await commerceProvider.updateLineItem(commerceContext(context), cartId, itemId, 0)
    return reply.send(ok(cart))
  })

  app.post('/carts/:cartId/discounts', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const { code } = parseOrThrow(z.object({ code: z.string().min(2).max(40) }), request.body, 'discount code')

    const cart = await commerceProvider.applyDiscountCode(commerceContext(context), cartId, code)
    return reply.send(ok(cart))
  })

  app.delete('/carts/:cartId/discounts/:code', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const { code } = parseOrThrow(z.object({ code: z.string().min(2).max(40) }), request.params, 'discount code')

    const cart = await commerceProvider.removeDiscountCode(commerceContext(context), cartId, code)
    return reply.send(ok(cart))
  })

  // endregion

  // region Checkout

  app.post('/carts/:cartId/checkout', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const input = parseOrThrow(startCheckoutInputSchema, request.body, 'checkout')

    const checkout = await commerceProvider.startCheckout(commerceContext(context), cartId, input)
    await emit(context, 'checkout.started', { type: 'cart', id: cartId }, {
      total: checkout.cart.totals.total.amount,
      currency: checkout.cart.currency,
      paymentConfigured: checkout.paymentConfigured,
    })

    return reply.send(ok(checkout))
  })

  app.post('/carts/:cartId/complete', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { cartId } = parseOrThrow(cartParams, request.params, 'cart id')
    const input = parseOrThrow(completeCheckoutInputSchema, request.body ?? {}, 'checkout')

    const order = await commerceProvider.completeCheckout(commerceContext(context), cartId, input)
    // The event tracking, CRM, e-mail and analytics all wait for. Its payload
    // carries minor units and a currency, never a formatted string.
    await emit(context, 'order.placed', { type: 'order', id: order.id }, {
      number: order.number,
      total: order.totals.total.amount,
      currency: order.currency,
      itemCount: order.itemCount,
      customerId: order.customerId,
    })

    return reply.status(201).send(ok(order))
  })

  // endregion

  // region Orders

  app.get('/orders', async (request, reply) => {
    const context = requireTenant(request, 'order:read')
    const query = parseOrThrow(orderQuerySchema, request.query, 'order query')

    const page = await commerceProvider.listOrders(commerceContext(context), query)
    return reply.send(ok(page.items, page.meta))
  })

  app.get('/orders/:orderId', async (request, reply) => {
    const context = requireTenant(request, 'order:read')
    const { orderId } = parseOrThrow(orderParams, request.params, 'order id')

    const order = await commerceProvider.getOrder(commerceContext(context), orderId)
    if (!order) throw new NotFoundError('Order')

    return reply.send(ok(order))
  })

  app.post('/orders/:orderId/transition', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { orderId } = parseOrThrow(orderParams, request.params, 'order id')
    const input = parseOrThrow(transitionOrderInputSchema, request.body, 'order status')

    const order = await commerceProvider.transitionOrder(
      commerceContext(context),
      orderId,
      input.status,
      input.note ?? '',
    )
    if (!order) throw new NotFoundError('Order')

    return reply.send(ok(order))
  })

  app.post('/orders/:orderId/capture', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { orderId } = parseOrThrow(orderParams, request.params, 'order id')

    const order = await commerceProvider.capturePayment(commerceContext(context), orderId)
    if (!order) throw new NotFoundError('Order')

    if (order.paymentStatus === 'captured') {
      await emit(context, 'payment.captured', { type: 'order', id: order.id }, {
        number: order.number,
        amount: order.totals.total.amount,
        currency: order.currency,
        provider: order.paymentProviderId,
      })
    }

    return reply.send(ok(order))
  })

  app.post('/orders/:orderId/refunds', async (request, reply) => {
    const context = requireTenant(request, 'order:write')
    const { orderId } = parseOrThrow(orderParams, request.params, 'order id')
    const input = parseOrThrow(createRefundInputSchema, request.body, 'refund')

    const refund = await commerceProvider.createRefund(commerceContext(context), orderId, input)
    await emit(context, 'refund.created', { type: 'order', id: orderId }, {
      refundId: refund.id,
      amount: refund.amount.amount,
      currency: refund.amount.currency,
    })

    return reply.status(201).send(ok(refund))
  })

  // endregion

  // region Customers

  app.get('/customers', async (request, reply) => {
    const context = requireTenant(request, 'customer:read')
    const query = parseOrThrow(customerQuerySchema, request.query, 'customer query')

    const page = await commerceProvider.listCustomers(commerceContext(context), query)
    return reply.send(ok(page.items, page.meta))
  })

  app.get('/customers/:customerId', async (request, reply) => {
    const context = requireTenant(request, 'customer:read')
    const { customerId } = parseOrThrow(z.object({ customerId: uuidSchema }), request.params, 'customer id')

    const customer = await commerceProvider.getCustomer(commerceContext(context), customerId)
    if (!customer) throw new NotFoundError('Customer')

    return reply.send(ok(customer))
  })

  // endregion
}

export default commerceRoutes
