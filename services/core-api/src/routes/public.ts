import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  feedSettingsSchema,
  publicPageSchema,
  themeSchema,
  type Product,
} from '@platform/schemas'
import { commerceProvider, type CommerceContext } from '../adapters/commerce/index.js'
import { env } from '../config/env.js'
import { withTenant, withoutTenant } from '../db/client.js'
import { listNavigation } from '../db/repositories/navigation.js'
import { findPublishedPage } from '../db/repositories/pages.js'
import { getSeoSettings } from '../db/repositories/seo.js'
import { findSettingsDocument } from '../db/repositories/settings.js'
import { findSiteById, listSites, resolveSiteByHost } from '../db/repositories/sites.js'
import {
  buildFeed,
  feedChannelMeta,
  feedOptionsFromSettings,
  type FeedChannel,
} from '../lib/commerce/feeds.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'

const publicPageQuerySchema = z.object({
  host: z.string().min(1).max(253),
  path: z.string().min(1).max(512).default('/'),
})

const publicFeedParamsSchema = z.object({
  token: z.string().min(24).max(64),
  channel: z.enum(['google', 'meta', 'amazon', 'ebay', 'marktplaats']),
})

/** Port-stripped hostname; map loopback aliases to the seeded `localhost` domain. */
function normalizePublicHost(raw: string): string {
  const hostname = raw.split(':')[0]!.toLowerCase()
  if (hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') return 'localhost'
  return hostname
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

      const [navigation, seoSettings] = await Promise.all([
        listNavigation(tx, resolved.tenantId, resolved.siteId),
        getSeoSettings(tx, resolved.tenantId, resolved.siteId),
      ])
      return { site, page, navigation, logo: seoSettings.business.logo ?? '' }
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

    const storefrontUrl =
      env.CORS_ORIGINS.find((origin) => origin.includes('3001')) ?? env.CORS_ORIGINS[0] ?? 'http://localhost:3001'

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
}

export default publicRoutes
