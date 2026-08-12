import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { normalizeDocument } from '@platform/blocks'
import {
  createKeywordInputSchema,
  pageDocumentSchema,
  seoSchema,
  updateSeoSettingsInputSchema,
  uuidSchema,
  type SeoProviders,
  type StructuredDataResult,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { listNavigation } from '../db/repositories/navigation.js'
import {
  deleteKeyword,
  findLatestAudit,
  getSeoSettings,
  insertAudit,
  insertKeyword,
  listAuditHistory,
  listKeywords,
  listPagesForSeo,
  listPublishedPagesForSeo,
  upsertSeoSettings,
} from '../db/repositories/seo.js'
import { findSiteById } from '../db/repositories/sites.js'
import { BadRequestError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import {
  auditSite,
  buildPageGraph,
  buildRobots,
  buildSitemap,
  evaluateContentQuality,
  getSiteNetworkStatus,
  searchConsole,
  serpGateway,
  siteOrigin,
  syncSiteNetworkMembership,
} from '../lib/seo/index.js'
import { isPageSpeedConfigured, runPageSpeed } from '../lib/seo/pagespeed.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * The SEO engine (§15).
 *
 * Every read here is derived from data the platform already owns, so the module
 * is fully functional with no third-party account connected. Where an outside
 * data source *would* add something — Search Console performance, keyword
 * positions — the API says so rather than filling the gap with plausible
 * numbers.
 */

const siteParamsSchema = z.object({ siteId: uuidSchema })
const sitePageParamsSchema = z.object({ siteId: uuidSchema, pageId: uuidSchema })
const keywordParamsSchema = z.object({ keywordId: uuidSchema })

/** An unsaved page, as the editor holds it. Every field is optional: the stored
 *  page fills in whatever the editor did not touch. */
const scoreDraftInputSchema = z.object({
  title: z.string().max(200).optional(),
  seo: seoSchema.partial().optional(),
  sections: pageDocumentSchema.optional(),
})

const contentGateInputSchema = z.object({
  title: z.string().max(200).default(''),
  seo: seoSchema.partial().optional(),
  sections: pageDocumentSchema,
  threshold: z.number().int().min(0).max(100).optional(),
})

const seoRoutes: FastifyPluginAsync = async (app) => {
  /** What can and cannot be measured on this installation, and why. */
  app.get('/providers', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')

    const providers: SeoProviders = {
      searchConsole: await searchConsole.status(context.tenantId),
      serp: serpGateway.status(),
    }
    return reply.send(
      ok({
        ...providers,
        pageSpeed: {
          provider: 'pagespeed_insights',
          configured: isPageSpeedConfigured(),
          connected: isPageSpeedConfigured(),
          reason: isPageSpeedConfigured()
            ? 'PageSpeed Insights is ready (GOOGLE_API_KEY).'
            : 'Set GOOGLE_API_KEY to run PageSpeed on published URLs.',
        },
      }),
    )
  })

  app.get('/sites/:siteId/search-console/sites', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    parseOrThrow(siteParamsSchema, request.params, 'site id')
    const sites = await searchConsole.listSites(context.tenantId)
    return reply.send(ok({ sites }))
  })

  app.get('/sites/:siteId/search-console/performance', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    parseOrThrow(siteParamsSchema, request.params, 'site id')
    const query = parseOrThrow(
      z.object({
        siteUrl: z.string().min(1).max(500),
        days: z.coerce.number().int().min(1).max(90).default(28),
        dimension: z.enum(['query', 'page']).default('query'),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      request.query ?? {},
      'query',
    )
    const end = new Date()
    const start = new Date(end.getTime() - query.days * 86_400_000)
    const iso = (date: Date) => date.toISOString().slice(0, 10)
    const rows = await searchConsole.queryPerformance(context.tenantId, {
      siteUrl: query.siteUrl,
      startDate: iso(start),
      endDate: iso(end),
      dimension: query.dimension,
      limit: query.limit,
    })
    return reply.send(ok({ rows, siteUrl: query.siteUrl, days: query.days, dimension: query.dimension }))
  })

  app.post('/sites/:siteId/pagespeed', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const body = parseOrThrow(
      z.object({
        url: z.string().url().max(2048).optional(),
        strategy: z.enum(['mobile', 'desktop']).default('mobile'),
      }),
      request.body ?? {},
      'body',
    )

    const target = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      if (body.url) return body.url
      if (!site.primaryHostname) {
        throw new BadRequestError('Pass a public url, or publish the site on a hostname first.')
      }
      return siteOrigin(site)
    })

    const result = await runPageSpeed(target, body.strategy)
    return reply.send(ok(result))
  })

  // region Settings

  app.get('/sites/:siteId/settings', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const settings = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return getSeoSettings(tx, context.tenantId, siteId)
    })

    return reply.send(ok(settings))
  })

  app.put('/sites/:siteId/settings', async (request, reply) => {
    const context = requireTenant(request, 'seo:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const patch = parseOrThrow(updateSeoSettingsInputSchema, request.body, 'seo settings')

    const settings = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      const next = await upsertSeoSettings(tx, { tenantId: context.tenantId, siteId, patch })
      // Network opt-in / niche changes re-sync partner edges immediately.
      await syncSiteNetworkMembership(tx, { tenantId: context.tenantId, siteId })
      return next
    })

    return reply.send(ok(settings))
  })

  // endregion

  // region Platform partner network (automatic backlinks)

  app.get('/sites/:siteId/network', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const status = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return getSiteNetworkStatus(tx, { tenantId: context.tenantId, siteId })
    })

    return reply.send(ok(status))
  })

  app.post('/sites/:siteId/network/sync', async (request, reply) => {
    const context = requireTenant(request, 'seo:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const status = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return syncSiteNetworkMembership(tx, { tenantId: context.tenantId, siteId })
    })

    return reply.send(ok(status))
  })

  // endregion

  // region Audit

  /**
   * Run the audit. It is a pure function of the stored documents, so running it
   * on every visit is cheaper than trusting a cache to be current.
   */
  app.get('/sites/:siteId/audit', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const audit = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')

      const [pages, navigation] = await Promise.all([
        listPagesForSeo(tx, context.tenantId, siteId),
        listNavigation(tx, context.tenantId, siteId),
      ])

      return auditSite({ siteId, pages, navigation })
    })

    return reply.send(ok(audit))
  })

  /** Run and keep it, so the dashboard can show a trend. */
  app.post('/sites/:siteId/audit', async (request, reply) => {
    const context = requireTenant(request, 'seo:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const audit = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')

      const [pages, navigation] = await Promise.all([
        listPagesForSeo(tx, context.tenantId, siteId),
        listNavigation(tx, context.tenantId, siteId),
      ])

      const result = auditSite({ siteId, pages, navigation })
      await insertAudit(tx, { tenantId: context.tenantId, siteId, audit: result })
      return result
    })

    return reply.status(201).send(ok(audit))
  })

  app.get('/sites/:siteId/audit/latest', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const result = await withTenant(context.tenantId, async (tx) => {
      const audit = await findLatestAudit(tx, context.tenantId, siteId)
      const history = await listAuditHistory(tx, context.tenantId, siteId)
      return { audit, history }
    })

    return reply.send(ok(result))
  })

  /** One page's score, for the editor's SEO panel. */
  app.get('/sites/:siteId/pages/:pageId/score', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId, pageId } = parseOrThrow(sitePageParamsSchema, request.params, 'page id')

    const score = await withTenant(context.tenantId, async (tx) => {
      const [pages, navigation] = await Promise.all([
        listPagesForSeo(tx, context.tenantId, siteId),
        listNavigation(tx, context.tenantId, siteId),
      ])
      if (pages.length === 0) throw new NotFoundError('Site')

      // Scored inside the whole-site audit: duplicates and orphans are only
      // visible in context, so a per-page run would have to invent them.
      const audit = auditSite({ siteId, pages, navigation })
      const page = audit.pages.find((entry) => entry.pageId === pageId)
      if (!page) throw new NotFoundError('Page')
      return page
    })

    return reply.send(ok(score))
  })

  /**
   * Score an unsaved draft of a page.
   *
   * The editor needs a score for what is on screen, not for what was last
   * saved. The rest of the site still comes from the database, because
   * duplicate titles, orphans and broken links are only visible in context —
   * the submitted document simply replaces its own page in that audit.
   */
  app.post('/sites/:siteId/pages/:pageId/score', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId, pageId } = parseOrThrow(sitePageParamsSchema, request.params, 'page id')
    const draft = parseOrThrow(scoreDraftInputSchema, request.body, 'page draft')

    const score = await withTenant(context.tenantId, async (tx) => {
      const [stored, navigation] = await Promise.all([
        listPagesForSeo(tx, context.tenantId, siteId),
        listNavigation(tx, context.tenantId, siteId),
      ])

      const current = stored.find((entry) => entry.id === pageId)
      if (!current) throw new NotFoundError('Page')

      const edited: typeof current = {
        ...current,
        title: draft.title ?? current.title,
        seo: draft.seo ? seoSchema.parse({ ...current.seo, ...draft.seo }) : current.seo,
        sections: draft.sections ? normalizeDocument(draft.sections) : current.sections,
      }

      const pages = stored.map((entry) => (entry.id === pageId ? edited : entry))
      const audit = auditSite({ siteId, pages, navigation })
      const page = audit.pages.find((entry) => entry.pageId === pageId)
      if (!page) throw new NotFoundError('Page')

      return {
        ...page,
        // The publish gate, on the same payload — the editor shows both.
        quality: evaluateContentQuality({ title: edited.title, seo: edited.seo, sections: edited.sections }),
      }
    })

    return reply.send(ok(score))
  })

  // endregion

  // region Structured data

  app.get('/sites/:siteId/pages/:pageId/schema', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId, pageId } = parseOrThrow(sitePageParamsSchema, request.params, 'page id')

    const result = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')

      const pages = await listPagesForSeo(tx, context.tenantId, siteId)
      const page = pages.find((entry) => entry.id === pageId)
      if (!page) throw new NotFoundError('Page')

      const settings = await getSeoSettings(tx, context.tenantId, siteId)
      const business = settings.business.name
        ? settings.business
        : { ...settings.business, name: site.name }

      const { graph, suppressed } = buildPageGraph({
        site: { name: site.name, locale: site.locale },
        origin: siteOrigin(site),
        page,
        pages,
        business,
        // No catalogue exists yet. Commerce (Phase 5) passes its products to
        // `buildPageGraph` directly; a `Product` node is never guessed from a
        // page that has no product data behind it.
        products: [],
      })

      return { pageId: page.id, path: page.path, graph, suppressed } satisfies StructuredDataResult
    })

    return reply.send(ok(result))
  })

  // endregion

  // region Sitemap and robots

  app.get('/sites/:siteId/sitemap.xml', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const xml = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')

      const [pages, settings] = await Promise.all([
        listPublishedPagesForSeo(tx, context.tenantId, siteId),
        getSeoSettings(tx, context.tenantId, siteId),
      ])

      return buildSitemap({ origin: siteOrigin(site), pages, settings })
    })

    return reply.header('content-type', 'application/xml; charset=utf-8').send(xml)
  })

  app.get('/sites/:siteId/robots.txt', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const text = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')

      const [pages, settings] = await Promise.all([
        listPublishedPagesForSeo(tx, context.tenantId, siteId),
        getSeoSettings(tx, context.tenantId, siteId),
      ])

      return buildRobots({ origin: siteOrigin(site), pages, settings })
    })

    return reply.header('content-type', 'text/plain; charset=utf-8').send(text)
  })

  // endregion

  // region Keywords

  app.get('/sites/:siteId/keywords', async (request, reply) => {
    const context = requireTenant(request, 'seo:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const keywords = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return listKeywords(tx, context.tenantId, siteId)
    })

    // The provider status travels with the data: without a source the table has
    // no positions, and the UI must say why rather than show an empty column.
    return reply.send(ok({ keywords, provider: serpGateway.status() }))
  })

  app.post('/sites/:siteId/keywords', async (request, reply) => {
    const context = requireTenant(request, 'seo:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const input = parseOrThrow(createKeywordInputSchema, request.body, 'keyword')

    const keyword = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return insertKeyword(tx, { tenantId: context.tenantId, siteId, keyword: input })
    })

    return reply.status(201).send(ok(keyword))
  })

  app.delete('/keywords/:keywordId', async (request, reply) => {
    const context = requireTenant(request, 'seo:write')
    const { keywordId } = parseOrThrow(keywordParamsSchema, request.params, 'keyword id')

    const deleted = await withTenant(context.tenantId, (tx) =>
      deleteKeyword(tx, context.tenantId, keywordId),
    )
    if (!deleted) throw new NotFoundError('Keyword')

    return reply.send(ok({ deleted: true }))
  })

  // endregion

  /**
   * The content-quality gate (§15), exposed so the Phase 2 generator can check
   * a page *before* it writes it. Pure: nothing is stored, nothing is fetched.
   */
  app.post('/content-gate', async (request, reply) => {
    requireTenant(request, 'seo:read')
    const input = parseOrThrow(contentGateInputSchema, request.body, 'page')

    const report = evaluateContentQuality(
      {
        title: input.title,
        seo: seoSchema.parse(input.seo ?? {}),
        sections: normalizeDocument(input.sections),
      },
      { threshold: input.threshold },
    )

    return reply.send(ok(report))
  })
}

export default seoRoutes
