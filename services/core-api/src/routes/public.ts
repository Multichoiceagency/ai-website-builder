import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { publicPageSchema, themeSchema } from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import { listNavigation } from '../db/repositories/navigation.js'
import { findPublishedPage } from '../db/repositories/pages.js'
import { findSiteById, resolveSiteByHost } from '../db/repositories/sites.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'

const publicPageQuerySchema = z.object({
  host: z.string().min(1).max(253),
  path: z.string().min(1).max(512).default('/'),
})

/**
 * The storefront read API. Unauthenticated by design and strictly read-only:
 * it can only ever see documents that a `publish` copied into `published_*`.
 */
const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/pages', async (request, reply) => {
    const query = parseOrThrow(publicPageQuerySchema, request.query ?? {}, 'query')
    // Strip a port so `localhost:3001` resolves like `localhost`.
    const hostname = query.host.split(':')[0]!.toLowerCase()

    const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
    if (!resolved) throw new NotFoundError('Site for this hostname')

    const result = await withTenant(resolved.tenantId, async (tx) => {
      const site = await findSiteById(tx, resolved.tenantId, resolved.siteId)
      if (!site) throw new NotFoundError('Site')

      const page = await findPublishedPage(tx, resolved.tenantId, resolved.siteId, query.path)
      if (!page) throw new NotFoundError('Page')

      const navigation = await listNavigation(tx, resolved.tenantId, resolved.siteId)
      return { site, page, navigation }
    })

    const payload = publicPageSchema.parse({
      site: {
        name: result.site.name,
        locale: result.site.locale,
        theme: themeSchema.parse(result.site.theme),
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
}

export default publicRoutes
