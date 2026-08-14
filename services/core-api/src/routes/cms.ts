import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createCmsCollectionInputSchema,
  createCmsEntryInputSchema,
  updateCmsEntryInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import {
  deleteCmsCollection,
  deleteCmsEntry,
  insertCmsCollection,
  insertCmsEntry,
  listCmsCollections,
  listCmsEntries,
  updateCmsEntry,
} from '../db/repositories/cms.js'
import { findSiteById } from '../db/repositories/sites.js'
import { resolveCmsEntry } from '../lib/cms/resolve.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const siteParams = z.object({ siteId: uuidSchema })
const collectionParams = z.object({ collectionId: uuidSchema })
const entryParams = z.object({ entryId: uuidSchema })

async function requireSite(tenantId: string, siteId: string) {
  const site = await withTenant(tenantId, (tx) => findSiteById(tx, tenantId, siteId))
  if (!site) throw new NotFoundError('Site not found.')
  return site
}

const cmsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/sites/:siteId/cms/collections', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { siteId } = parseOrThrow(siteParams, request.params, 'cms collections')
    await requireSite(context.tenantId, siteId)
    const collections = await listCmsCollections(context.tenantId, siteId)
    return reply.send(ok({ collections }))
  })

  app.post('/sites/:siteId/cms/collections', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { siteId } = parseOrThrow(siteParams, request.params, 'cms collections')
    const input = parseOrThrow(createCmsCollectionInputSchema, request.body ?? {}, 'cms collection')
    await requireSite(context.tenantId, siteId)
    const collection = await insertCmsCollection({
      tenantId: context.tenantId,
      siteId,
      slug: input.slug,
      name: input.name,
      fields: input.fields ?? ['title', 'body'],
    })
    return reply.code(201).send(ok({ collection }))
  })

  app.delete('/cms/collections/:collectionId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { collectionId } = parseOrThrow(collectionParams, request.params, 'cms collection')
    const removed = await deleteCmsCollection(context.tenantId, collectionId)
    if (!removed) throw new NotFoundError('Collection not found.')
    return reply.send(ok({ ok: true as const }))
  })

  app.get('/cms/collections/:collectionId/entries', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { collectionId } = parseOrThrow(collectionParams, request.params, 'cms entries')
    const entries = await listCmsEntries(context.tenantId, collectionId)
    return reply.send(ok({ entries }))
  })

  app.post('/cms/collections/:collectionId/entries', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { collectionId } = parseOrThrow(collectionParams, request.params, 'cms entries')
    const input = parseOrThrow(createCmsEntryInputSchema, request.body ?? {}, 'cms entry')
    const entry = await insertCmsEntry({
      tenantId: context.tenantId,
      collectionId,
      slug: input.slug,
      title: input.title,
      data: input.data,
      published: input.published,
    })
    return reply.code(201).send(ok({ entry }))
  })

  app.patch('/cms/entries/:entryId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { entryId } = parseOrThrow(entryParams, request.params, 'cms entry')
    const input = parseOrThrow(updateCmsEntryInputSchema, request.body ?? {}, 'cms entry')
    const entry = await updateCmsEntry(context.tenantId, entryId, input)
    if (!entry) throw new NotFoundError('Entry not found.')
    return reply.send(ok({ entry }))
  })

  app.delete('/cms/entries/:entryId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { entryId } = parseOrThrow(entryParams, request.params, 'cms entry')
    const removed = await deleteCmsEntry(context.tenantId, entryId)
    if (!removed) throw new NotFoundError('Entry not found.')
    return reply.send(ok({ ok: true as const }))
  })

  app.get('/cms/resolve', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const query = parseOrThrow(
      z.object({
        siteId: uuidSchema,
        provider: z.enum(['platform', 'frappe', 'wordpress']).default('platform'),
        collection: z.string().min(1).max(80),
        slug: z.string().min(1).max(120),
      }),
      request.query ?? {},
      'cms resolve',
    )

    const entry = await resolveCmsEntry({
      tenantId: context.tenantId,
      siteId: query.siteId,
      provider: query.provider,
      collection: query.collection,
      slug: query.slug,
    })
    return reply.send(ok({ entry }))
  })
}

export default cmsRoutes
