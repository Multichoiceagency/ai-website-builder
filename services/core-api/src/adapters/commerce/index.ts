import type { CommerceStatus } from '@platform/schemas'
import { paymentProviderStatuses } from '../payments/index.js'
import { shippingProviderStatuses } from '../shipping/index.js'
import { resolveTenantPayments } from '../../lib/payments/resolve.js'
import { resolveEnvCommerceProvider, resolveTenantCommerce } from '../../lib/commerce/resolve.js'
import { MedusaCommerceProvider } from './medusa.js'
import { PostgresCommerceProvider } from './postgres.js'
import { ShopifyCommerceProvider } from './shopify.js'
import { WooCommerceCommerceProvider } from './woocommerce.js'
import type { CommerceContext, CommerceProvider } from './types.js'

export * from './types.js'
export { ShopifyCommerceProvider } from './shopify.js'
export { WooCommerceCommerceProvider } from './woocommerce.js'
export { MedusaCommerceProvider } from './medusa.js'
export { PostgresCommerceProvider } from './postgres.js'

/**
 * Commerce provider selection (ADR-0006).
 *
 * `commerceProvider` is a routing facade: every method re-resolves the active
 * engine for `ctx.tenantId` (tenant Connection settings → env → platform).
 * Routes keep calling `commerceProvider.*` unchanged.
 */
class RoutingCommerceProvider implements CommerceProvider {
  readonly id = 'routing'

  status() {
    return resolveEnvCommerceProvider().status()
  }

  async #active(ctx: CommerceContext): Promise<CommerceProvider> {
    const resolved = await resolveTenantCommerce(ctx.tenantId)
    return resolved.active
  }

  async listProducts(ctx: CommerceContext, query: Parameters<CommerceProvider['listProducts']>[1]) {
    return (await this.#active(ctx)).listProducts(ctx, query)
  }
  async getProduct(ctx: CommerceContext, productId: string) {
    return (await this.#active(ctx)).getProduct(ctx, productId)
  }
  async createProduct(ctx: CommerceContext, input: Parameters<CommerceProvider['createProduct']>[1]) {
    return (await this.#active(ctx)).createProduct(ctx, input)
  }
  async updateProduct(
    ctx: CommerceContext,
    productId: string,
    patch: Parameters<CommerceProvider['updateProduct']>[2],
  ) {
    return (await this.#active(ctx)).updateProduct(ctx, productId, patch)
  }
  async deleteProduct(ctx: CommerceContext, productId: string) {
    return (await this.#active(ctx)).deleteProduct(ctx, productId)
  }
  async listCollections(ctx: CommerceContext) {
    return (await this.#active(ctx)).listCollections(ctx)
  }
  async createCollection(
    ctx: CommerceContext,
    input: Parameters<CommerceProvider['createCollection']>[1],
  ) {
    return (await this.#active(ctx)).createCollection(ctx, input)
  }
  async listLocations(ctx: CommerceContext) {
    return (await this.#active(ctx)).listLocations(ctx)
  }
  async createLocation(ctx: CommerceContext, input: Parameters<CommerceProvider['createLocation']>[1]) {
    return (await this.#active(ctx)).createLocation(ctx, input)
  }
  async listInventory(ctx: CommerceContext, variantId: string) {
    return (await this.#active(ctx)).listInventory(ctx, variantId)
  }
  async setInventory(
    ctx: CommerceContext,
    variantId: string,
    input: Parameters<CommerceProvider['setInventory']>[2],
  ) {
    return (await this.#active(ctx)).setInventory(ctx, variantId, input)
  }
  async createCart(ctx: CommerceContext, input: Parameters<CommerceProvider['createCart']>[1]) {
    return (await this.#active(ctx)).createCart(ctx, input)
  }
  async getCart(ctx: CommerceContext, cartId: string) {
    return (await this.#active(ctx)).getCart(ctx, cartId)
  }
  async addLineItem(
    ctx: CommerceContext,
    cartId: string,
    input: Parameters<CommerceProvider['addLineItem']>[2],
  ) {
    return (await this.#active(ctx)).addLineItem(ctx, cartId, input)
  }
  async updateLineItem(ctx: CommerceContext, cartId: string, itemId: string, quantity: number) {
    return (await this.#active(ctx)).updateLineItem(ctx, cartId, itemId, quantity)
  }
  async applyDiscountCode(ctx: CommerceContext, cartId: string, code: string) {
    return (await this.#active(ctx)).applyDiscountCode(ctx, cartId, code)
  }
  async removeDiscountCode(ctx: CommerceContext, cartId: string, code: string) {
    return (await this.#active(ctx)).removeDiscountCode(ctx, cartId, code)
  }
  async startCheckout(
    ctx: CommerceContext,
    cartId: string,
    input: Parameters<CommerceProvider['startCheckout']>[2],
  ) {
    return (await this.#active(ctx)).startCheckout(ctx, cartId, input)
  }
  async completeCheckout(
    ctx: CommerceContext,
    cartId: string,
    input: Parameters<CommerceProvider['completeCheckout']>[2],
  ) {
    return (await this.#active(ctx)).completeCheckout(ctx, cartId, input)
  }
  async listOrders(ctx: CommerceContext, query: Parameters<CommerceProvider['listOrders']>[1]) {
    return (await this.#active(ctx)).listOrders(ctx, query)
  }
  async getOrder(ctx: CommerceContext, orderId: string) {
    return (await this.#active(ctx)).getOrder(ctx, orderId)
  }
  async transitionOrder(
    ctx: CommerceContext,
    orderId: string,
    status: Parameters<CommerceProvider['transitionOrder']>[2],
    note: string,
  ) {
    return (await this.#active(ctx)).transitionOrder(ctx, orderId, status, note)
  }
  async capturePayment(ctx: CommerceContext, orderId: string) {
    return (await this.#active(ctx)).capturePayment(ctx, orderId)
  }
  async createRefund(
    ctx: CommerceContext,
    orderId: string,
    input: Parameters<CommerceProvider['createRefund']>[2],
  ) {
    return (await this.#active(ctx)).createRefund(ctx, orderId, input)
  }
  async listCustomers(ctx: CommerceContext, query: Parameters<CommerceProvider['listCustomers']>[1]) {
    return (await this.#active(ctx)).listCustomers(ctx, query)
  }
  async getCustomer(ctx: CommerceContext, customerId: string) {
    return (await this.#active(ctx)).getCustomer(ctx, customerId)
  }
  async listDiscounts(ctx: CommerceContext) {
    return (await this.#active(ctx)).listDiscounts(ctx)
  }
  async createDiscount(ctx: CommerceContext, input: Parameters<CommerceProvider['createDiscount']>[1]) {
    return (await this.#active(ctx)).createDiscount(ctx, input)
  }
  async updateDiscount(
    ctx: CommerceContext,
    discountId: string,
    patch: Parameters<CommerceProvider['updateDiscount']>[2],
  ) {
    return (await this.#active(ctx)).updateDiscount(ctx, discountId, patch)
  }
  async deleteDiscount(ctx: CommerceContext, discountId: string) {
    return (await this.#active(ctx)).deleteDiscount(ctx, discountId)
  }
  async listShippingRates(ctx: CommerceContext) {
    return (await this.#active(ctx)).listShippingRates(ctx)
  }
  async createShippingRate(
    ctx: CommerceContext,
    input: Parameters<CommerceProvider['createShippingRate']>[1],
  ) {
    return (await this.#active(ctx)).createShippingRate(ctx, input)
  }
  async deleteShippingRate(ctx: CommerceContext, rateId: string) {
    return (await this.#active(ctx)).deleteShippingRate(ctx, rateId)
  }
}

/** @deprecated Prefer RoutingCommerceProvider via `commerceProvider`. Kept for tests. */
export function createCommerceProvider(): CommerceProvider {
  return resolveEnvCommerceProvider()
}

export const commerceProvider: CommerceProvider = new RoutingCommerceProvider()

/** Env-only snapshot (tests / boot). Prefer `commerceStatusForTenant` in routes. */
export function commerceStatus(): CommerceStatus {
  const active = resolveEnvCommerceProvider()
  return {
    commerce: active.status(),
    engines: [
      new PostgresCommerceProvider().status(),
      new MedusaCommerceProvider().status(),
      new ShopifyCommerceProvider().status(),
      new WooCommerceCommerceProvider().status(),
      {
        id: 'bigcommerce',
        configured: false,
        capabilities: [],
        reason: 'BigCommerce adapter is on the roadmap.',
      },
    ],
    activeEngineId: active.id,
    payments: paymentProviderStatuses(),
    shipping: shippingProviderStatuses(),
  }
}

/** Tenant-aware status — commerce engine + Payments secrets. */
export async function commerceStatusForTenant(tenantId: string): Promise<CommerceStatus> {
  const [commerce, payments] = await Promise.all([
    resolveTenantCommerce(tenantId),
    resolveTenantPayments(tenantId),
  ])
  return {
    commerce: commerce.active.status(),
    engines: commerce.engines,
    activeEngineId: commerce.active.id,
    payments: payments.statuses,
    shipping: shippingProviderStatuses(),
  }
}
