import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { limitsForPlan } from '@platform/permissions'
import {
  createSiteInputSchema,
  navigationItemSchema,
  themeSchema,
  updateSiteInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { listNavigation, upsertNavigation } from '../db/repositories/navigation.js'
import { listPages } from '../db/repositories/pages.js'
import { countSites, findSiteById, insertSite, listSites, updateSite } from '../db/repositories/sites.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { NotFoundError, PlanLimitError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const siteParamsSchema = z.object({ siteId: uuidSchema })
const navigationKeySchema = z.enum(['primary', 'footer'])

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
        // Theme is patched, not replaced, so a partial update cannot silently
        // reset tokens the client did not send.
        theme: patch.theme ? themeSchema.parse({ ...existing.theme, ...patch.theme }) : undefined,
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
