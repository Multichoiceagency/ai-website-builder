import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  addLineItemInputSchema,
  commerceIdSchema,
  completeCheckoutInputSchema,
  createCartInputSchema,
  feedSettingsSchema,
  publicPageSchema,
  startCheckoutInputSchema,
  themeSchema,
  updateLineItemInputSchema,
  type Product,
} from '@platform/schemas'
import { commerceProvider, type CommerceContext } from '../adapters/commerce/index.js'
import { env } from '../config/env.js'
import { withTenant, withoutTenant } from '../db/client.js'
import { findProductByHandle } from '../db/repositories/commerce.js'
import { listNavigation } from '../db/repositories/navigation.js'
import { findPublishedChrome, findPublishedPage } from '../db/repositories/pages.js'
import { getSeoSettings } from '../db/repositories/seo.js'
import { listOutboundNetworkLinks } from '../db/repositories/seo-network.js'
import { findSettingsDocument } from '../db/repositories/settings.js'
import { findSiteById, listSites, resolveSiteByHost } from '../db/repositories/sites.js'
import {
  buildFeed,
  feedChannelMeta,
  feedOptionsFromSettings,
  type FeedChannel,
} from '../lib/commerce/feeds.js'
import { composePageSections } from '../lib/chrome/compose.js'
import { networkSectionFromLinks } from '../lib/seo/network-sync.js'
import { storefrontPublicOrigin } from '../lib/public-url.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'

const publicPageQuerySchema = z.object({
  host: z.string().min(1).max(253),
  path: z.string().min(1).max(512).default('/'),
})

const publicHostQuerySchema = z.object({
  host: z.string().min(1).max(253),
})

const publicFeedParamsSchema = z.object({
  token: z.string().min(24).max(64),
  channel: z.enum(['google', 'meta', 'amazon', 'ebay', 'marktplaats']),
})

const publicCartParamsSchema = z.object({
  cartId: commerceIdSchema,
})

const publicProductsQuerySchema = z.object({
  host: z.string().min(1).max(253),
  search: z.string().max(200).optional(),
  collectionId: commerceIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

/** Port-stripped hostname; map loopback aliases to the seeded `localhost` domain. */
function normalizePublicHost(raw: string): string {
  const hostname = raw.split(':')[0]!.toLowerCase()
  if (hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') return 'localhost'
  return hostname
}

async function resolvePublicCommerce(host: string): Promise<{ tenantId: string; siteId: string }> {
  const hostname = normalizePublicHost(host)
  const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
  if (!resolved) throw new NotFoundError('Site for this hostname')
  return resolved
}

function publicCommerceContext(tenantId: string): CommerceContext {
  return { tenantId, actorLabel: 'public-storefront' }
}

async function resolveFeedTenant(token: string): Promise<string | null> {
  const row = await withoutTenant(async (tx) => {
    const [match] = await tx<{ tenant_id: string }[]>`
      SELECT tenant_id FROM resolve_feed_tenant_by_token(${token})
    `
    return match ?? null
  })
  return row?.tenant_id ?? null
}

async function loadPublicFeedProducts(tenantId: string): Promise<Product[]> {
  const ctx: CommerceContext = { tenantId, actorLabel: 'public-feed' }
  const products: Product[] = []
  let page = 1
  const limit = 100
  const maxPages = 5

  while (page <= maxPages) {
    const batch = await commerceProvider.listProducts(ctx, { status: 'active', page, limit })
    for (const summary of batch.items) {
      const product = await commerceProvider.getProduct(ctx, summary.id)
      if (product) products.push(product)
    }
    if (batch.items.length < limit || products.length >= batch.meta.total) break
    page += 1
  }

  return products
}

/**
 * The storefront read API. Unauthenticated by design and strictly read-only:
 * it can only ever see documents that a `publish` copied into `published_*`.
 */
const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/pages', async (request, reply) => {
    const query = parseOrThrow(publicPageQuerySchema, request.query ?? {}, 'query')
    const hostname = normalizePublicHost(query.host)

    const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
    if (!resolved) throw new NotFoundError('Site for this hostname')

    const result = await withTenant(resolved.tenantId, async (tx) => {
      const site = await findSiteById(tx, resolved.tenantId, resolved.siteId)
      if (!site) throw new NotFoundError('Site')

      const page = await findPublishedPage(tx, resolved.tenantId, resolved.siteId, query.path)
      if (!page) throw new NotFoundError('Page')

      const [navigation, seoSettings, headerChrome, footerChrome, networkLinks] = await Promise.all([
        listNavigation(tx, resolved.tenantId, resolved.siteId),
        getSeoSettings(tx, resolved.tenantId, resolved.siteId),
        findPublishedChrome(tx, resolved.tenantId, resolved.siteId, 'header'),
        findPublishedChrome(tx, resolved.tenantId, resolved.siteId, 'footer'),
        listOutboundNetworkLinks(tx, resolved.siteId),
      ])

      const primaryNav = navigation.find((menu) => menu.key === 'primary')?.items ?? []
      const footerNav = navigation.find((menu) => menu.key === 'footer')?.items ?? []
      let sections = composePageSections({
        site,
        body: page.sections,
        headerChrome,
        footerChrome,
        primaryNav,
        footerNav,
      })

      // Automatic platform partner backlinks (claude-seo: branded anchors, capped degree).
      if (seoSettings.networkEnabled && seoSettings.indexingEnabled) {
        const networkSection = networkSectionFromLinks(networkLinks)
        if (networkSection) {
          const footerIndex = sections.findIndex((section) => section.block.startsWith('footer-'))
          if (footerIndex >= 0) sections = [
            ...sections.slice(0, footerIndex),
            networkSection,
            ...sections.slice(footerIndex),
          ]
          else sections = [...sections, networkSection]
        }
      }

      return { site, page: { ...page, sections }, navigation, logo: seoSettings.business.logo ?? '' }
    })

    const payload = publicPageSchema.parse({
      site: {
        name: result.site.name,
        locale: result.site.locale,
        theme: themeSchema.parse(result.site.theme),
        logo: result.logo,
      },
      page: {
        path: result.page.path,
        title: result.page.title,
        seo: result.page.seo,
        sections: result.page.sections,
        publishedAt: result.page.publishedAt,
      },
      navigation: result.navigation,
    })

    // Short public cache with a longer stale window: publishing emits an event
    // that purges, so a stale edge copy is bounded by the purge, not the TTL.
    reply.header('cache-control', 'public, max-age=30, stale-while-revalidate=300')
    return reply.send(ok(payload))
  })

  /**
   * Live marketplace feed. Merchants paste this URL into Google/Meta tools —
   * no session cookie. Auth is the opaque token minted in feed settings.
   */
  app.get('/commerce/feeds/:token/:channel', async (request, reply) => {
    const { token, channel } = parseOrThrow(publicFeedParamsSchema, request.params, 'feed')
    const meta = feedChannelMeta(channel)
    if (!meta) throw new NotFoundError('Feed channel')

    const tenantId = await resolveFeedTenant(token)
    if (!tenantId) throw new NotFoundError('Feed')

    const settingsDoc = await withTenant(tenantId, (tx) =>
      findSettingsDocument(tx, tenantId, 'commerce', 'feeds'),
    )
    const settings = feedSettingsSchema.parse(settingsDoc?.value ?? {})
    if (!settings.publicToken || settings.publicToken !== token) throw new NotFoundError('Feed')

    const storefrontUrl = storefrontPublicOrigin()

    const [products, sites] = await Promise.all([
      loadPublicFeedProducts(tenantId),
      withTenant(tenantId, (tx) => listSites(tx, tenantId)),
    ])
    const shopName = sites[0]?.name?.trim() || 'Shop'
    const body = buildFeed(
      channel as FeedChannel,
      products,
      feedOptionsFromSettings({ storefrontUrl, shopName }, settings),
    )

    reply.header('content-type', meta.contentType)
    reply.header('cache-control', 'public, max-age=300, stale-while-revalidate=600')
    return reply.send(body)
  })

  // region Guest shop / cart / checkout (host-scoped)

  app.get('/commerce/products', async (request, reply) => {
    const query = parseOrThrow(publicProductsQuerySchema, request.query ?? {}, 'products query')
    const { tenantId } = await resolvePublicCommerce(query.host)
    const page = await commerceProvider.listProducts(publicCommerceContext(tenantId), {
      status: 'active',
      search: query.search,
      collectionId: query.collectionId,
      page: query.page,
      limit: query.limit,
    })
    reply.header('cache-control', 'public, max-age=30, stale-while-revalidate=120')
    return reply.send(ok(page))
  })

  app.get('/commerce/products/:handle', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const { handle } = parseOrThrow(z.object({ handle: z.string().min(1).max(120) }), request.params, 'handle')
    const { tenantId } = await resolvePublicCommerce(host)
    const product = await withTenant(tenantId, (tx) => findProductByHandle(tx, tenantId, handle))
    if (!product || product.status !== 'active') throw new NotFoundError('Product')
    reply.header('cache-control', 'public, max-age=30, stale-while-revalidate=120')
    return reply.send(ok(product))
  })

  app.post('/commerce/carts', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const input = parseOrThrow(createCartInputSchema, request.body ?? {}, 'cart')
    const { tenantId } = await resolvePublicCommerce(host)
    const cart = await commerceProvider.createCart(publicCommerceContext(tenantId), input)
    return reply.status(201).send(ok(cart))
  })

  app.get('/commerce/carts/:cartId', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const { cartId } = parseOrThrow(publicCartParamsSchema, request.params, 'cart id')
    const { tenantId } = await resolvePublicCommerce(host)
    const cart = await commerceProvider.getCart(publicCommerceContext(tenantId), cartId)
    if (!cart) throw new NotFoundError('Cart')
    return reply.send(ok(cart))
  })

  app.post('/commerce/carts/:cartId/items', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const { cartId } = parseOrThrow(publicCartParamsSchema, request.params, 'cart id')
    const input = parseOrThrow(addLineItemInputSchema, request.body, 'line item')
    const { tenantId } = await resolvePublicCommerce(host)
    const cart = await commerceProvider.addLineItem(publicCommerceContext(tenantId), cartId, input)
    return reply.send(ok(cart))
  })

  app.patch('/commerce/carts/:cartId/items/:itemId', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const { cartId } = parseOrThrow(publicCartParamsSchema, request.params, 'cart id')
    const { itemId } = parseOrThrow(z.object({ itemId: commerceIdSchema }), request.params, 'item id')
    const { quantity } = parseOrThrow(updateLineItemInputSchema, request.body, 'line item')
    const { tenantId } = await resolvePublicCommerce(host)
    const cart = await commerceProvider.updateLineItem(
      publicCommerceContext(tenantId),
      cartId,
      itemId,
      quantity,
    )
    return reply.send(ok(cart))
  })

  app.post('/commerce/carts/:cartId/checkout', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const { cartId } = parseOrThrow(publicCartParamsSchema, request.params, 'cart id')
    const input = parseOrThrow(startCheckoutInputSchema, request.body, 'checkout')
    const { tenantId } = await resolvePublicCommerce(host)
    const checkout = await commerceProvider.startCheckout(publicCommerceContext(tenantId), cartId, input)
    return reply.send(ok(checkout))
  })

  app.post('/commerce/carts/:cartId/complete', async (request, reply) => {
    const { host } = parseOrThrow(publicHostQuerySchema, request.query ?? {}, 'host')
    const { cartId } = parseOrThrow(publicCartParamsSchema, request.params, 'cart id')
    const input = parseOrThrow(completeCheckoutInputSchema, request.body ?? {}, 'checkout')
    const { tenantId } = await resolvePublicCommerce(host)
    const order = await commerceProvider.completeCheckout(publicCommerceContext(tenantId), cartId, input)
    return reply.status(201).send(ok(order))
  })

  // endregion
}

export default publicRoutes
