import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { normalizeDocument } from '@platform/blocks'
import {
  createPageInputSchema,
  seoSchema,
  updatePageInputSchema,
  uuidSchema,
  type DomainEvent,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import {
  deletePage,
  findPageById,
  findRevision,
  insertPage,
  insertRevision,
  listRevisions,
  publishPage,
  unpublishPage,
  updatePage,
} from '../db/repositories/pages.js'
import { findSiteById } from '../db/repositories/sites.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const pageParamsSchema = z.object({ pageId: uuidSchema })
const siteParamsSchema = z.object({ siteId: uuidSchema })

const pagesRoutes: FastifyPluginAsync = async (app) => {
  /** Create a page under a site. Registered under `/sites/:siteId/pages`. */
  app.post('/sites/:siteId/pages', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { siteId } = parseOrThrow(siteParamsSchema, request.params, 'site id')
    const input = parseOrThrow(createPageInputSchema, request.body, 'page')

    // Validated against the block registry before it can reach the database —
    // an invalid document must never become storable state (ADR-0003).
    const sections = normalizeDocument(input.sections ?? [])

    const page = await withTenant(context.tenantId, async (tx) => {
      const site = await findSiteById(tx, context.tenantId, siteId)
      if (!site) throw new NotFoundError('Site')

      return insertPage(tx, {
        tenantId: context.tenantId,
        siteId,
        path: input.path,
        title: input.title,
        seo: seoSchema.parse(input.seo ?? {}),
        sections,
      })
    })

    const event = buildEvent({
      name: 'page.created',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: page.id },
      payload: { path: page.path, siteId },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.status(201).send(ok(page))
  })

  app.get('/pages/:pageId', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')

    const page = await withTenant(context.tenantId, (tx) => findPageById(tx, context.tenantId, pageId))
    if (!page) throw new NotFoundError('Page')

    return reply.send(ok(page))
  })

  app.patch('/pages/:pageId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')
    const patch = parseOrThrow(updatePageInputSchema, request.body, 'page')

    const sections = patch.sections ? normalizeDocument(patch.sections) : undefined

    const page = await withTenant(context.tenantId, async (tx) => {
      const existing = await findPageById(tx, context.tenantId, pageId)
      if (!existing) throw new NotFoundError('Page')

      return updatePage(tx, context.tenantId, pageId, {
        path: patch.path,
        title: patch.title,
        seo: patch.seo ? seoSchema.parse({ ...existing.seo, ...patch.seo }) : undefined,
        sections,
      })
    })
    if (!page) throw new NotFoundError('Page')

    const event = buildEvent({
      name: 'page.updated',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: page.id },
      payload: { path: page.path, sectionCount: page.sectionCount },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(page))
  })

  /**
   * Publish. Snapshots a revision and copies the draft onto the live document
   * in one transaction, so a rollback target always exists for every published
   * state.
   */
  app.post('/pages/:pageId/publish', async (request, reply) => {
    const context = requireTenant(request, 'page:publish')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')

    const page = await withTenant(context.tenantId, async (tx) => {
      const existing = await findPageById(tx, context.tenantId, pageId)
      if (!existing) throw new NotFoundError('Page')

      await insertRevision(tx, {
        tenantId: context.tenantId,
        pageId,
        title: existing.title,
        seo: existing.seo,
        sections: existing.sections,
        reason: 'publish',
        createdBy: context.user.email,
      })

      return publishPage(tx, context.tenantId, pageId)
    })
    if (!page) throw new NotFoundError('Page')

    const event = buildEvent({
      name: 'page.published',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: page.id },
      payload: { path: page.path, siteId: page.siteId },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    // Subscribers revalidate the affected route and purge the CDN — see §53.
    await eventBus.publish(event)

    return reply.send(ok(page))
  })

  app.post('/pages/:pageId/unpublish', async (request, reply) => {
    const context = requireTenant(request, 'page:publish')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')

    const page = await withTenant(context.tenantId, (tx) => unpublishPage(tx, context.tenantId, pageId))
    if (!page) throw new NotFoundError('Page')

    const event = buildEvent({
      name: 'page.unpublished',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: page.id },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(page))
  })

  app.delete('/pages/:pageId', async (request, reply) => {
    const context = requireTenant(request, 'page:delete')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')

    const deleted = await withTenant(context.tenantId, (tx) => deletePage(tx, context.tenantId, pageId))
    if (!deleted) throw new NotFoundError('Page')

    const event: DomainEvent = buildEvent({
      name: 'page.deleted',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: pageId },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok({ deleted: true }))
  })

  app.get('/pages/:pageId/revisions', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')

    const revisions = await withTenant(context.tenantId, (tx) => listRevisions(tx, context.tenantId, pageId))
    return reply.send(ok(revisions))
  })

  /** Restore a revision into the draft. Publishing it stays a separate act. */
  app.post('/pages/:pageId/revisions/:revisionId/restore', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { pageId } = parseOrThrow(pageParamsSchema, request.params, 'page id')
    const { revisionId } = parseOrThrow(
      z.object({ revisionId: uuidSchema }),
      request.params,
      'revision id',
    )

    const page = await withTenant(context.tenantId, async (tx) => {
      const current = await findPageById(tx, context.tenantId, pageId)
      if (!current) throw new NotFoundError('Page')

      const revision = await findRevision(tx, context.tenantId, pageId, revisionId)
      if (!revision) throw new NotFoundError('Revision')

      // Snapshot what we are about to overwrite, so restore is itself undoable.
      await insertRevision(tx, {
        tenantId: context.tenantId,
        pageId,
        title: current.title,
        seo: current.seo,
        sections: current.sections,
        reason: 'pre-restore',
        createdBy: context.user.email,
      })

      return updatePage(tx, context.tenantId, pageId, {
        title: revision.title,
        seo: revision.seo,
        sections: revision.sections,
      })
    })
    if (!page) throw new NotFoundError('Page')

    return reply.send(ok(page))
  })
}

export default pagesRoutes
