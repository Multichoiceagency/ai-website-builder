import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { normalizeDocument } from '@platform/blocks'
import {
  blogPostListQuerySchema,
  bulkMediaInputSchema,
  createBlogAuthorInputSchema,
  createBlogCategoryInputSchema,
  createBlogPostInputSchema,
  mediaListQuerySchema,
  mediaUploadQuerySchema,
  publicPageSchema,
  publishBlogPostInputSchema,
  seoSchema,
  themeSchema,
  updateBlogPostInputSchema,
  updateMediaInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import {
  deleteBlogAuthor,
  deleteBlogCategory,
  deleteBlogPost,
  deleteMediaAsset,
  deleteMediaAssets,
  findBlogPostById,
  findBlogRevision,
  findMediaById,
  findMediaByIds,
  findMediaUsage,
  insertBlogAuthor,
  insertBlogCategory,
  insertBlogPost,
  insertBlogRevision,
  insertMediaAsset,
  listBlogAuthors,
  listBlogCategories,
  listBlogPosts,
  listBlogRevisions,
  listMediaLibrary,
  listPublicBlogPosts,
  moveMediaAssets,
  publishBlogPost,
  referencedMediaCounts,
  replaceMediaBytes,
  resolvePublicMedia,
  retagMediaAssets,
  unpublishBlogPost,
  updateBlogPost,
  updateMediaAsset,
} from '../db/repositories/content.js'
import { listNavigation } from '../db/repositories/navigation.js'
import { findSiteById, resolveSiteByHost } from '../db/repositories/sites.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors.js'
import { MEDIA_MAX_BYTES, MEDIA_VIDEO_MAX_BYTES, prepareUpload, responseHeadersFor } from '../lib/media/upload.js'
import { storage } from '../lib/storage/index.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, type TenantContext } from '../plugins/auth.js'

/**
 * Blog (§6) and media (§14).
 *
 * Blog mutations reuse the `page.*` domain events with `resource.type: 'post'`
 * rather than inventing parallel names: a post is the same document under a
 * different address, and every subscriber that revalidates a page wants to
 * revalidate a post for exactly the same reason.
 */

const mediaParams = z.object({ mediaId: uuidSchema })
const postParams = z.object({ postId: uuidSchema })
const siteParams = z.object({ siteId: uuidSchema })
const publicHostQuery = z.object({ host: z.string().min(1).max(253) })
const downloadQuery = z.object({ download: z.coerce.boolean().default(false) })

/** Upload bodies are raw bytes, so they need a route ceiling of their own. */
const UPLOAD_ROUTE = { bodyLimit: MEDIA_VIDEO_MAX_BYTES + 1024 } as const

const contentRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Uploads arrive as the raw request body rather than as multipart.
   *
   * There is no form here — the dashboard sends a `File`, and a `File` is
   * bytes. Skipping multipart means skipping a parser, a boundary scanner and
   * a temp-file lifecycle for a request that carries exactly one thing, and it
   * removes the filename field that multipart would otherwise tempt us to
   * trust. The parser is registered inside this plugin, so it is scoped to
   * these routes and cannot change how any other route reads a body.
   */
  app.addContentTypeParser(
    [
      'application/octet-stream',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
    ],
    { parseAs: 'buffer', bodyLimit: MEDIA_VIDEO_MAX_BYTES + 1024 },
    (_request, body, done) => done(null, body),
  )

  // region Media

  app.post('/media', UPLOAD_ROUTE, async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const query = parseOrThrow(mediaUploadQuerySchema, request.query ?? {}, 'upload')

    const prepared = prepareUpload({
      body: toBuffer(request.body),
      claimedContentType: request.headers['content-type'] ?? '',
      filename: query.filename,
      alt: query.alt,
    })

    // Bytes first, row second: an orphaned object costs storage, whereas a row
    // pointing at nothing is a broken image on someone's published site.
    await storage().put(prepared.storageKey, prepared.bytes, prepared.mime)

    const asset = await withTenant(context.tenantId, (tx) =>
      insertMediaAsset(tx, context.tenantId, {
        folder: query.folder,
        filename: prepared.filename,
        storageKey: prepared.storageKey,
        mime: prepared.mime,
        sizeBytes: prepared.sizeBytes,
        width: prepared.width,
        height: prepared.height,
        alt: prepared.alt,
        altSource: prepared.altSource,
        tags: parseTags(query.tags),
        checksum: prepared.checksum,
        createdBy: context.user.email,
      }),
    )

    return reply.status(201).send(ok({ asset, sanitised: prepared.sanitised }))
  })

  app.get('/media', async (request, reply) => {
    const context = requireTenant(request, 'media:read')
    const query = parseOrThrow(mediaListQuerySchema, request.query ?? {}, 'query')

    const library = await withTenant(context.tenantId, (tx) => listMediaLibrary(tx, context.tenantId, query))
    return reply.send(ok(library))
  })

  app.get('/media/:mediaId', async (request, reply) => {
    const context = requireTenant(request, 'media:read')
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')

    const asset = await withTenant(context.tenantId, (tx) => findMediaById(tx, context.tenantId, mediaId))
    if (!asset) throw new NotFoundError('Asset')

    return reply.send(ok(asset))
  })

  app.patch('/media/:mediaId', async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')
    const patch = parseOrThrow(updateMediaInputSchema, request.body, 'asset')

    const asset = await withTenant(context.tenantId, (tx) =>
      updateMediaAsset(tx, context.tenantId, mediaId, patch),
    )
    if (!asset) throw new NotFoundError('Asset')

    return reply.send(ok(asset))
  })

  /**
   * Swap the bytes behind an existing asset. Every page that references it
   * keeps working, which is the entire point — a "replace" that mints a new id
   * is an upload plus a hunt for the places that used the old one.
   */
  app.post('/media/:mediaId/replace', UPLOAD_ROUTE, async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')
    const query = parseOrThrow(mediaUploadQuerySchema, request.query ?? {}, 'upload')

    const prepared = prepareUpload({
      body: toBuffer(request.body),
      claimedContentType: request.headers['content-type'] ?? '',
      filename: query.filename,
    })

    const existing = await withTenant(context.tenantId, (tx) => findMediaById(tx, context.tenantId, mediaId))
    if (!existing) throw new NotFoundError('Asset')

    await storage().put(prepared.storageKey, prepared.bytes, prepared.mime)

    const asset = await withTenant(context.tenantId, (tx) =>
      replaceMediaBytes(tx, context.tenantId, mediaId, {
        storageKey: prepared.storageKey,
        mime: prepared.mime,
        sizeBytes: prepared.sizeBytes,
        width: prepared.width,
        height: prepared.height,
        checksum: prepared.checksum,
        filename: prepared.filename,
      }),
    )
    if (!asset) throw new NotFoundError('Asset')

    // Only once the row points at the new object is the old one unreferenced.
    await storage().remove(existing.storageKey)

    return reply.send(ok({ asset, sanitised: prepared.sanitised }))
  })

  app.get('/media/:mediaId/usage', async (request, reply) => {
    const context = requireTenant(request, 'media:read')
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')

    const usage = await withTenant(context.tenantId, (tx) => findMediaUsage(tx, context.tenantId, mediaId))
    return reply.send(ok(usage))
  })

  /**
   * Delete, refused while the asset is in use.
   *
   * `?force=true` is the override, and it exists because the usage scan is a
   * text match over open-ended block props: it can be wrong in the direction of
   * "found something that is not really a reference", and a library you can
   * never clean up is its own kind of broken. The response always names what
   * would break, so the override is an informed one.
   */
  app.delete('/media/:mediaId', async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')
    const { force } = parseOrThrow(
      z.object({ force: z.coerce.boolean().default(false) }),
      request.query ?? {},
      'query',
    )

    const outcome = await withTenant(context.tenantId, async (tx) => {
      const asset = await findMediaById(tx, context.tenantId, mediaId)
      if (!asset) throw new NotFoundError('Asset')

      const usage = await findMediaUsage(tx, context.tenantId, mediaId)
      if (usage.total > 0 && !force) return { blockedBy: usage, asset }

      await deleteMediaAsset(tx, context.tenantId, mediaId)
      return { blockedBy: null, asset }
    })

    if (outcome.blockedBy) {
      throw new ConflictError(
        `This asset is used by ${outcome.blockedBy.total} page(s) or post(s). Delete it anyway with \`?force=true\`.`,
        outcome.blockedBy,
      )
    }

    await storage().remove(outcome.asset.storageKey)
    return reply.send(ok({ deleted: true }))
  })

  /**
   * Bulk move, tag, untag and delete over a selection.
   *
   * Delete is the only one that can destroy something, so it is the only one
   * that consults usage: referenced assets are skipped and reported back by
   * name, and `force` is what a person sets after reading that list.
   */
  app.post('/media/bulk', async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const input = parseOrThrow(bulkMediaInputSchema, request.body, 'bulk edit')

    if (input.action === 'move' && input.folder === undefined) {
      throw new BadRequestError('A move needs a target folder.')
    }
    if ((input.action === 'tag' || input.action === 'untag') && !input.tags?.length) {
      throw new BadRequestError('Tagging needs at least one tag.')
    }

    const outcome = await withTenant(context.tenantId, async (tx) => {
      if (input.action === 'move') {
        return { changed: await moveMediaAssets(tx, context.tenantId, input.ids, input.folder!), blocked: [] }
      }
      if (input.action === 'tag' || input.action === 'untag') {
        const changed = await retagMediaAssets(
          tx,
          context.tenantId,
          input.ids,
          input.tags!,
          input.action === 'tag' ? 'add' : 'remove',
        )
        return { changed, blocked: [] }
      }

      const assets = await findMediaByIds(tx, context.tenantId, input.ids)
      const counts = input.force ? new Map<string, number>() : await referencedMediaCounts(tx, context.tenantId)

      const blocked = assets
        .filter((asset) => (counts.get(asset.id.toLowerCase()) ?? 0) > 0)
        .map((asset) => ({ id: asset.id, filename: asset.filename, uses: counts.get(asset.id.toLowerCase()) ?? 0 }))

      const blockedIds = new Set(blocked.map((entry) => entry.id))
      const deletable = assets.filter((asset) => !blockedIds.has(asset.id))

      await deleteMediaAssets(tx, context.tenantId, deletable.map((asset) => asset.id))
      return { changed: deletable.length, blocked, removedKeys: deletable.map((asset) => asset.storageKey) }
    })

    // Storage last: a failed object delete must not roll back the rows, or the
    // library would keep showing assets a retry has already half-removed.
    for (const key of (outcome as { removedKeys?: string[] }).removedKeys ?? []) {
      await storage().remove(key)
    }

    return reply.send(ok({ changed: outcome.changed, blocked: outcome.blocked }))
  })

  /** The authenticated read. Another tenant's id is a 404, not a 403. */
  app.get('/media/:mediaId/file', async (request, reply) => {
    const context = requireTenant(request, 'media:read')
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')
    const { download } = parseOrThrow(downloadQuery, request.query ?? {}, 'query')

    const asset = await withTenant(context.tenantId, (tx) => findMediaById(tx, context.tenantId, mediaId))
    if (!asset) throw new NotFoundError('Asset')

    const bytes = await storage().get(asset.storageKey)
    if (!bytes) throw new NotFoundError('Asset file')

    return reply.headers(responseHeadersFor(asset.mime, asset.filename, { download })).send(bytes)
  })

  /**
   * The unauthenticated read, for published sites.
   *
   * Media in the library exists to be embedded in public pages, so serving it
   * by unguessable id is the intended reach rather than a leak — but note what
   * this route cannot do: it takes an id and returns bytes, it cannot list, and
   * `resolve_public_media` returns the owning tenant so the read still happens
   * inside one tenant's storage.
   */
  app.get('/public/media/:mediaId', async (request, reply) => {
    const { mediaId } = parseOrThrow(mediaParams, request.params, 'media id')
    const { download } = parseOrThrow(downloadQuery, request.query ?? {}, 'query')

    const located = await withoutTenant((tx) => resolvePublicMedia(tx, mediaId))
    if (!located) throw new NotFoundError('Asset')

    const bytes = await storage().get(located.storageKey)
    if (!bytes) throw new NotFoundError('Asset file')

    return reply.headers(responseHeadersFor(located.mime, located.filename, { download })).send(bytes)
  })

  // endregion

  // region Blog — taxonomy

  app.get('/sites/:siteId/blog/categories', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { siteId } = parseOrThrow(siteParams, request.params, 'site id')

    const categories = await withTenant(context.tenantId, (tx) =>
      listBlogCategories(tx, context.tenantId, siteId),
    )
    return reply.send(ok(categories))
  })

  app.post('/sites/:siteId/blog/categories', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { siteId } = parseOrThrow(siteParams, request.params, 'site id')
    const input = parseOrThrow(createBlogCategoryInputSchema, request.body, 'category')

    const category = await withTenant(context.tenantId, async (tx) => {
      if (!(await findSiteById(tx, context.tenantId, siteId))) throw new NotFoundError('Site')
      return insertBlogCategory(tx, context.tenantId, siteId, input)
    })
    return reply.status(201).send(ok(category))
  })

  app.delete('/blog/categories/:categoryId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { categoryId } = parseOrThrow(z.object({ categoryId: uuidSchema }), request.params, 'category id')

    const deleted = await withTenant(context.tenantId, (tx) =>
      deleteBlogCategory(tx, context.tenantId, categoryId),
    )
    if (!deleted) throw new NotFoundError('Category')

    return reply.send(ok({ deleted: true }))
  })

  app.get('/sites/:siteId/blog/authors', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { siteId } = parseOrThrow(siteParams, request.params, 'site id')

    const authors = await withTenant(context.tenantId, (tx) => listBlogAuthors(tx, context.tenantId, siteId))
    return reply.send(ok(authors))
  })

  app.post('/sites/:siteId/blog/authors', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { siteId } = parseOrThrow(siteParams, request.params, 'site id')
    const input = parseOrThrow(createBlogAuthorInputSchema, request.body, 'author')

    const author = await withTenant(context.tenantId, async (tx) => {
      if (!(await findSiteById(tx, context.tenantId, siteId))) throw new NotFoundError('Site')
      return insertBlogAuthor(tx, context.tenantId, siteId, input)
    })
    return reply.status(201).send(ok(author))
  })

  app.delete('/blog/authors/:authorId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { authorId } = parseOrThrow(z.object({ authorId: uuidSchema }), request.params, 'author id')

    const deleted = await withTenant(context.tenantId, (tx) => deleteBlogAuthor(tx, context.tenantId, authorId))
    if (!deleted) throw new NotFoundError('Author')

    return reply.send(ok({ deleted: true }))
  })

  // endregion

  // region Blog — posts

  app.get('/sites/:siteId/blog/posts', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { siteId } = parseOrThrow(siteParams, request.params, 'site id')
    const query = parseOrThrow(blogPostListQuerySchema, request.query ?? {}, 'query')

    const posts = await withTenant(context.tenantId, (tx) =>
      listBlogPosts(tx, context.tenantId, siteId, query),
    )
    return reply.send(ok(posts))
  })

  app.post('/sites/:siteId/blog/posts', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { siteId } = parseOrThrow(siteParams, request.params, 'site id')
    const input = parseOrThrow(createBlogPostInputSchema, request.body, 'post')

    // The same block-registry validation a page gets. An unknown block is a 400
    // here rather than an unrenderable document later (ADR-0003).
    const sections = normalizeDocument(input.sections ?? [])

    const post = await withTenant(context.tenantId, async (tx) => {
      if (!(await findSiteById(tx, context.tenantId, siteId))) throw new NotFoundError('Site')

      return insertBlogPost(tx, {
        tenantId: context.tenantId,
        siteId,
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt ?? '',
        seo: seoSchema.parse(input.seo ?? {}),
        sections,
        categoryId: input.categoryId ?? null,
        authorId: input.authorId ?? null,
        coverMediaId: input.coverMediaId ?? null,
        tags: input.tags ?? [],
      })
    })

    await emit(context, 'page.created', post.id, { kind: 'post', slug: post.slug, siteId })
    return reply.status(201).send(ok(post))
  })

  app.get('/blog/posts/:postId', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')

    const post = await withTenant(context.tenantId, (tx) => findBlogPostById(tx, context.tenantId, postId))
    if (!post) throw new NotFoundError('Post')

    return reply.send(ok(post))
  })

  app.patch('/blog/posts/:postId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')
    const patch = parseOrThrow(updateBlogPostInputSchema, request.body, 'post')

    const sections = patch.sections ? normalizeDocument(patch.sections) : undefined

    const post = await withTenant(context.tenantId, async (tx) => {
      const existing = await findBlogPostById(tx, context.tenantId, postId)
      if (!existing) throw new NotFoundError('Post')

      return updateBlogPost(tx, context.tenantId, postId, {
        slug: patch.slug,
        title: patch.title,
        excerpt: patch.excerpt,
        seo: patch.seo ? seoSchema.parse({ ...existing.seo, ...patch.seo }) : undefined,
        sections,
        categoryId: patch.categoryId,
        authorId: patch.authorId,
        coverMediaId: patch.coverMediaId,
        tags: patch.tags,
      })
    })
    if (!post) throw new NotFoundError('Post')

    await emit(context, 'page.updated', post.id, { kind: 'post', slug: post.slug })
    return reply.send(ok(post))
  })

  /**
   * Publish, now or at a future moment.
   *
   * Identical to publishing a page — snapshot a revision, copy the draft onto
   * the live document — with one addition: `scheduledAt` in the future stores
   * that timestamp instead of `now()`. Nothing else changes, because scheduling
   * is a question about *when* the live document counts, not about a third
   * kind of document.
   */
  app.post('/blog/posts/:postId/publish', async (request, reply) => {
    const context = requireTenant(request, 'page:publish')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')
    const input = parseOrThrow(publishBlogPostInputSchema, request.body ?? {}, 'publish')

    const publishAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date()
    if (Number.isNaN(publishAt.getTime())) throw new BadRequestError('`scheduledAt` is not a valid moment.')

    const post = await withTenant(context.tenantId, async (tx) => {
      const existing = await findBlogPostById(tx, context.tenantId, postId)
      if (!existing) throw new NotFoundError('Post')

      await insertBlogRevision(tx, {
        tenantId: context.tenantId,
        postId,
        title: existing.title,
        excerpt: existing.excerpt,
        seo: existing.seo,
        sections: existing.sections,
        reason: 'publish',
        createdBy: context.user.email,
      })

      return publishBlogPost(tx, context.tenantId, postId, publishAt)
    })
    if (!post) throw new NotFoundError('Post')

    await emit(context, 'page.published', post.id, {
      kind: 'post',
      slug: post.slug,
      siteId: post.siteId,
      scheduled: post.status === 'scheduled',
    })
    return reply.send(ok(post))
  })

  app.post('/blog/posts/:postId/unpublish', async (request, reply) => {
    const context = requireTenant(request, 'page:publish')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')

    const post = await withTenant(context.tenantId, (tx) => unpublishBlogPost(tx, context.tenantId, postId))
    if (!post) throw new NotFoundError('Post')

    await emit(context, 'page.unpublished', post.id, { kind: 'post', slug: post.slug })
    return reply.send(ok(post))
  })

  app.delete('/blog/posts/:postId', async (request, reply) => {
    const context = requireTenant(request, 'page:delete')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')

    const deleted = await withTenant(context.tenantId, (tx) => deleteBlogPost(tx, context.tenantId, postId))
    if (!deleted) throw new NotFoundError('Post')

    await emit(context, 'page.deleted', postId, { kind: 'post' })
    return reply.send(ok({ deleted: true }))
  })

  app.get('/blog/posts/:postId/revisions', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')

    const revisions = await withTenant(context.tenantId, (tx) =>
      listBlogRevisions(tx, context.tenantId, postId),
    )
    return reply.send(ok(revisions))
  })

  /** Restore into the draft. Publishing it stays a separate, explicit act. */
  app.post('/blog/posts/:postId/revisions/:revisionId/restore', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { postId } = parseOrThrow(postParams, request.params, 'post id')
    const { revisionId } = parseOrThrow(z.object({ revisionId: uuidSchema }), request.params, 'revision id')

    const post = await withTenant(context.tenantId, async (tx) => {
      const current = await findBlogPostById(tx, context.tenantId, postId)
      if (!current) throw new NotFoundError('Post')

      const revision = await findBlogRevision(tx, context.tenantId, postId, revisionId)
      if (!revision) throw new NotFoundError('Revision')

      // Snapshot what is about to be overwritten, so restore is itself undoable.
      await insertBlogRevision(tx, {
        tenantId: context.tenantId,
        postId,
        title: current.title,
        excerpt: current.excerpt,
        seo: current.seo,
        sections: current.sections,
        reason: 'pre-restore',
        createdBy: context.user.email,
      })

      return updateBlogPost(tx, context.tenantId, postId, {
        title: revision.title,
        excerpt: revision.excerpt,
        seo: revision.seo,
        sections: revision.sections,
      })
    })
    if (!post) throw new NotFoundError('Post')

    return reply.send(ok(post))
  })

  // endregion

  // region Public read model

  /** Published posts for a hostname. Scheduled posts are filtered in SQL. */
  app.get('/public/blog', async (request, reply) => {
    const query = parseOrThrow(
      publicHostQuery.extend({ limit: z.coerce.number().int().min(1).max(50).default(20) }),
      request.query ?? {},
      'query',
    )

    const resolved = await resolveHost(query.host)
    const result = await withTenant(resolved.tenantId, async (tx) => {
      const site = await findSiteById(tx, resolved.tenantId, resolved.siteId)
      if (!site) throw new NotFoundError('Site')

      const posts = await listPublicBlogPosts(tx, resolved.siteId, { limit: query.limit })
      return { site, posts }
    })

    reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    return reply.send(
      ok({
        site: { name: result.site.name, locale: result.site.locale },
        // The body is dropped from the index: a list does not render sections,
        // and shipping them would make the payload grow with the archive.
        posts: result.posts.map(({ sections: _sections, ...summary }) => summary),
        total: result.posts.length,
      }),
    )
  })

  /**
   * One published post, in `publicPageSchema` — the exact shape the storefront
   * already renders a page with, so showing a post needs no renderer changes.
   */
  app.get('/public/blog/:slug', async (request, reply) => {
    const query = parseOrThrow(publicHostQuery, request.query ?? {}, 'query')
    const { slug } = parseOrThrow(z.object({ slug: z.string().min(1).max(120) }), request.params, 'slug')

    const resolved = await resolveHost(query.host)
    const result = await withTenant(resolved.tenantId, async (tx) => {
      const site = await findSiteById(tx, resolved.tenantId, resolved.siteId)
      if (!site) throw new NotFoundError('Site')

      const [post] = await listPublicBlogPosts(tx, resolved.siteId, { slug, limit: 1 })
      if (!post) throw new NotFoundError('Post')

      return { site, post, navigation: await listNavigation(tx, resolved.tenantId, resolved.siteId) }
    })

    const payload = publicPageSchema.parse({
      site: {
        name: result.site.name,
        locale: result.site.locale,
        theme: themeSchema.parse(result.site.theme),
      },
      page: {
        path: result.post.path,
        title: result.post.title,
        seo: result.post.seo,
        sections: result.post.sections,
        publishedAt: result.post.publishedAt,
      },
      navigation: result.navigation,
    })

    reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    // `page` is byte-identical to what `/public/v1/pages` returns; `post`
    // carries only what a page has no concept of — author, category, cover.
    return reply.send(
      ok({
        ...payload,
        post: {
          slug: result.post.slug,
          excerpt: result.post.excerpt,
          categorySlug: result.post.categorySlug,
          categoryName: result.post.categoryName,
          authorName: result.post.authorName,
          coverUrl: result.post.coverUrl,
          tags: result.post.tags,
        },
      }),
    )
  })

  /**
   * RSS 2.0.
   *
   * Not JSON, and deliberately not wrapped in the response envelope — a feed
   * reader wants `application/rss+xml` and nothing else.
   */
  app.get('/public/blog/feed.xml', async (request, reply) => {
    const query = parseOrThrow(publicHostQuery, request.query ?? {}, 'query')

    const resolved = await resolveHost(query.host)
    const result = await withTenant(resolved.tenantId, async (tx) => {
      const site = await findSiteById(tx, resolved.tenantId, resolved.siteId)
      if (!site) throw new NotFoundError('Site')
      return { site, posts: await listPublicBlogPosts(tx, resolved.siteId, { limit: 50 }) }
    })

    const origin = `https://${query.host.split(':')[0]}`
    const items = result.posts
      .map((post) =>
        [
          '    <item>',
          `      <title>${escapeXml(post.title)}</title>`,
          `      <link>${escapeXml(`${origin}${post.path}`)}</link>`,
          `      <guid isPermaLink="true">${escapeXml(`${origin}${post.path}`)}</guid>`,
          post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : '',
          post.categoryName ? `      <category>${escapeXml(post.categoryName)}</category>` : '',
          post.authorName ? `      <dc:creator>${escapeXml(post.authorName)}</dc:creator>` : '',
          post.publishedAt ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : '',
          '    </item>',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n')

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
      '  <channel>',
      `    <title>${escapeXml(result.site.name)}</title>`,
      `    <link>${escapeXml(`${origin}/blog`)}</link>`,
      `    <description>${escapeXml(`${result.site.name} — blog`)}</description>`,
      `    <language>${escapeXml(result.site.locale)}</language>`,
      `    <atom:link href="${escapeXml(`${origin}/blog/feed.xml`)}" rel="self" type="application/rss+xml"/>`,
      items,
      '  </channel>',
      '</rss>',
      '',
    ].join('\n')

    reply.header('cache-control', 'public, max-age=300, stale-while-revalidate=900')
    return reply.type('application/rss+xml; charset=utf-8').send(xml)
  })

  // endregion

  async function emit(
    context: TenantContext,
    name: 'page.created' | 'page.updated' | 'page.published' | 'page.unpublished' | 'page.deleted',
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event = buildEvent({
      name,
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'post', id },
      payload,
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)
  }
}

async function resolveHost(host: string): Promise<{ tenantId: string; siteId: string }> {
  const hostname = host.split(':')[0]!.toLowerCase()
  const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
  if (!resolved) throw new NotFoundError('Site for this hostname')
  return resolved
}

/** The parser hands back a Buffer; anything else means the body was not raw. */
function toBuffer(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) return body
  if (typeof body === 'string') return Buffer.from(body, 'utf8')
  return Buffer.alloc(0)
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((tag) => tag.trim().toLowerCase().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 20)
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]!)
}

export default contentRoutes
