import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createSection } from '@platform/blocks'
import { limitsForPlan } from '@platform/permissions'
import {
  createSiteInputSchema,
  navigationItemSchema,
  pageRoleSchema,
  seoSchema,
  themeSchema,
  updateSiteInputSchema,
  uuidSchema,
  type Page,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { listNavigation, upsertNavigation } from '../db/repositories/navigation.js'
import {
  findChromePage,
  findPageByPath,
  insertPage,
  listPages,
  publishPage,
} from '../db/repositories/pages.js'
import { countSites, findSiteById, insertSite, listSites, updateSite } from '../db/repositories/sites.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { NotFoundError, PlanLimitError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const siteParamsSchema = z.object({ siteId: uuidSchema })
const navigationKeySchema = z.enum(['primary', 'footer'])
const chromeRoleSchema = z.enum(['header', 'footer'])

function chromePath(role: 'header' | 'footer'): string {
  return role === 'header' ? '/__chrome/header' : '/__chrome/footer'
}

async function ensureChromePage(
  tx: Parameters<typeof findChromePage>[0],
  tenantId: string,
  siteId: string,
  role: 'header' | 'footer',
  siteName: string,
): Promise<Page> {
  const existing =
    (await findChromePage(tx, tenantId, siteId, role)) ??
    (await findPageByPath(tx, tenantId, siteId, chromePath(role)))
  if (existing) return existing

  const defaultBlock = role === 'header' ? 'header-simple-01' : 'footer-simple-01'
  const sections =
    role === 'header'
      ? [createSection(defaultBlock, { brand: siteName || 'Brand' })]
      : [
          createSection(defaultBlock, {
            brand: siteName || 'Brand',
            legal: `© ${new Date().getFullYear()}`,
          }),
        ]

  const created = await insertPage(tx, {
    tenantId,
    siteId,
    path: chromePath(role),
    title: role === 'header' ? 'Site header' : 'Site footer',
    role: pageRoleSchema.parse(role),
    seo: seoSchema.parse({
      title: role === 'header' ? 'Header' : 'Footer',
      description: '',
      noIndex: true,
    }),
    sections,
  })
  await publishPage(tx, tenantId, created.id)
  return (await findChromePage(tx, tenantId, siteId, role)) ?? created
}

const sitesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'site:read')
    const sites = await withTenant(context.tenantId, (tx) => listSites(tx, context.tenantId))
    return reply.send(ok(sites))
  })

  app.post('/', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const input = parseOrThrow(createSiteInputSchema, request.body, 'site')
    const limits = limitsForPlan(context.plan)

    const site = await withTenant(context.tenantId, async (tx) => {
      const current = await countSites(tx, context.tenantId)
      if (current >= limits.sites) {
        throw new PlanLimitError(
          `Your ${context.plan} plan includes ${limits.sites} site(s). Upgrade to add more.`,
          { plan: context.plan, limit: limits.sites, current },
        )
      }

      return insertSite(tx, {
        tenantId: context.tenantId,
        name: input.name,
        slug: input.slug,
        locale: input.locale,
        kind: input.kind,
        theme: themeSchema.parse(input.theme ?? {}),
      })
    })

    const event = buildEvent({
      name: 'site.created',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'site', id: site.id },
      payload: { slug: site.slug },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.status(201).send(ok(site))
  })

  app.get('/:siteId', async (request, reply) => {
    const context = requireTenant(request, 'site:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const site = await withTenant(context.tenantId, (tx) => findSiteById(tx, context.tenantId, siteId))
    if (!site) throw new NotFoundError('Site')

    return reply.send(ok(site))
  })

  app.patch('/:siteId', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const patch = parseOrThrow(updateSiteInputSchema, request.body, 'site')

    const site = await withTenant(context.tenantId, async (tx) => {
      const existing = await findSiteById(tx, context.tenantId, siteId)
      if (!existing) throw new NotFoundError('Site')

      return updateSite(tx, context.tenantId, siteId, {
        name: patch.name,
        locale: patch.locale,
        kind: patch.kind,
        theme: patch.theme ? themeSchema.parse({ ...existing.theme, ...patch.theme }) : undefined,
        componentTargets: patch.componentTargets
          ? {
              ...existing.componentTargets,
              ...patch.componentTargets,
            }
          : undefined,
      })
    })
    if (!site) throw new NotFoundError('Site')

    const event = buildEvent({
      name: 'site.updated',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'site', id: site.id },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(site))
  })

  app.get('/:siteId/pages', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const pages = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return listPages(tx, context.tenantId, siteId)
    })

    return reply.send(ok(pages))
  })

  /** Load site-wide header/footer chrome (404 when not created yet). */
  app.get('/:siteId/chrome/:role', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const { role } = parseOrThrow(z.object({ role: chromeRoleSchema }), request.params, 'chrome role')

    const page = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return (
        (await findChromePage(tx, context.tenantId, siteId, role)) ??
        (await findPageByPath(tx, context.tenantId, siteId, chromePath(role)))
      )
    })
    if (!page) throw new NotFoundError('Chrome page')
    return reply.send(ok(page))
  })

  /** Find or create + publish chrome for the active site. */
  app.post('/:siteId/chrome/:role', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const { role } = parseOrThrow(z.object({ role: chromeRoleSchema }), request.params, 'chrome role')

    const page = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return ensureChromePage(tx, context.tenantId, siteId, role, site.name)
    })

    return reply.send(ok(page))
  })

  app.get('/:siteId/navigation', async (request, reply) => {
    const context = requireTenant(request, 'site:read')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')

    const navigation = await withTenant(context.tenantId, (tx) => listNavigation(tx, context.tenantId, siteId))
    return reply.send(ok(navigation))
  })

  app.put('/:siteId/navigation/:key', async (request, reply) => {
    const context = requireTenant(request, 'site:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const { key } = parseOrThrow(z.object({ key: navigationKeySchema }), request.params, 'navigation key')
    const { items } = parseOrThrow(
      z.object({ items: z.array(navigationItemSchema).max(24) }),
      request.body,
      'navigation',
    )

    const navigation = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')
      return upsertNavigation(tx, { tenantId: context.tenantId, siteId, key, items })
    })

    return reply.send(ok(navigation))
  })
}

export default sitesRoutes
