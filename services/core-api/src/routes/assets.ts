import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { normalizeDocument } from '@platform/blocks'
import {
  assetListItemSchema,
  assetQuerySchema,
  assetDuplicateCheckInputSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  uuidSchema,
  type Asset,
  type AssetListItem,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import {
  deleteAsset,
  findAssetByFingerprint,
  findAssetById,
  insertAsset,
  listAssets,
  updateAsset,
} from '../db/repositories/assets.js'
import { applyPerformanceCeiling, derivePerformanceClass, fingerprintSections } from '../lib/assets.js'
import { ASSET_PRESETS, ASSET_SOURCES } from '../lib/asset-presets.generated.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Reusable assets — saved compositions that drop into any page.
 *
 * Two tiers behind one list: workspace assets live in the database behind RLS,
 * platform presets are a generated catalogue compiled into the service. Both
 * are the same shape, so the panel does not branch and neither does the caller.
 *
 * Nothing here stores or serves markup. A composition is an array of registry
 * block ids and their props; every write goes through `normalizeDocument`, so
 * an asset referencing a block that does not exist cannot become storable
 * state (ADR-0003).
 */

const assetParamsSchema = z.object({ assetId: uuidSchema })
const createQuerySchema = z.object({
  /** Opt in to saving an arrangement the workspace already holds. */
  allowDuplicate: z.coerce.boolean().default(false),
})

/**
 * Apply the caller's ceiling to one asset's sections and record the cost.
 * Returns null when nothing survives — an asset with no affordable sections is
 * not something to offer for insertion.
 */
function toListItem(asset: Asset, ceiling: AssetListItem['performanceClass'] | undefined): AssetListItem | null {
  const { sections, dropped } = applyPerformanceCeiling(asset.sections, ceiling)
  if (!sections.length) return null

  return assetListItemSchema.parse({ ...asset, sections, droppedSections: dropped })
}

/** Filters that read the same over a database row and a compiled preset. */
function matchesQuery(asset: Asset, query: z.infer<typeof assetQuerySchema>): boolean {
  if (query.collection && asset.collection !== query.collection) return false

  if (query.tags?.length) {
    const owned = asset.tags.map((tag) => tag.toLowerCase())
    // Every requested tag must match: `?tags=dark,pricing` means both.
    if (!query.tags.every((tag) => owned.includes(tag.toLowerCase()))) return false
  }

  if (query.search) {
    const haystack = `${asset.name} ${asset.description} ${asset.tags.join(' ')} ${asset.collection}`
    if (!haystack.toLowerCase().includes(query.search.trim().toLowerCase())) return false
  }

  return true
}

const assetsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Every UI library in the licence register — cleared and refused — with how
   * many presets currently ship and the npx / clone command to pull reference
   * sources locally (ADR-0003: reference only, never into customer pages).
   */
  app.get('/sources', async (request, reply) => {
    requireTenant(request, 'page:read')

    const counts = new Map<string, number>()
    for (const preset of ASSET_PRESETS) {
      const library = preset.source?.library?.trim() || 'platform'
      counts.set(library, (counts.get(library) ?? 0) + 1)
    }

    const libraries = ASSET_SOURCES.map((source) => ({
      ...source,
      presetCount: counts.get(source.library) ?? 0,
    }))

    return reply.send(ok(libraries))
  })

  /**
   * List workspace assets and platform presets together, newest workspace
   * asset first. `tier` narrows to one of the two.
   */
  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const query = parseOrThrow(assetQuerySchema, request.query, 'asset query')

    const workspace =
      query.tier === 'platform'
        ? []
        : await withTenant(context.tenantId, (tx) => listAssets(tx, context.tenantId, query))

    const presets = query.tier === 'workspace' ? [] : ASSET_PRESETS

    const items = [...workspace, ...presets]
      .filter((asset) => matchesQuery(asset, query))
      .map((asset) => toListItem(asset, query.maxPerformanceClass))
      .filter((item): item is AssetListItem => item !== null)
      .slice(0, query.limit)

    return reply.send(ok(items))
  })

  /**
   * Does this workspace already hold this arrangement?
   *
   * A pre-flight for the editor, so "Save as asset" can say so before opening a
   * naming dialog. `POST /` enforces the same rule independently — a check the
   * client can skip is not a guarantee.
   */
  app.post('/duplicate-check', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const input = parseOrThrow(assetDuplicateCheckInputSchema, request.body, 'asset')

    const sections = normalizeDocument(input.sections)
    const fingerprint = fingerprintSections(sections)

    const existing = await withTenant(context.tenantId, (tx) =>
      findAssetByFingerprint(tx, context.tenantId, fingerprint),
    )

    return reply.send(ok({ duplicate: existing !== null, fingerprint, existing }))
  })

  /** Save a selection of sections as a reusable workspace asset. */
  app.post('/', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { allowDuplicate } = parseOrThrow(createQuerySchema, request.query, 'asset query')
    const input = parseOrThrow(createAssetInputSchema, request.body, 'asset')

    // The same gate a page document passes. An asset is a page document that
    // happens to be reusable, so it must not be an easier way in (ADR-0003).
    const sections = normalizeDocument(input.sections)
    const fingerprint = fingerprintSections(sections)

    const asset = await withTenant(context.tenantId, async (tx) => {
      if (!allowDuplicate) {
        const existing = await findAssetByFingerprint(tx, context.tenantId, fingerprint)
        if (existing) {
          throw new ConflictError('This arrangement is already saved as an asset.', {
            existing,
            // The caller can repeat the request with this to save it anyway.
            allowDuplicate: true,
          })
        }
      }

      return insertAsset(tx, {
        tenantId: context.tenantId,
        name: input.name,
        description: input.description,
        collection: input.collection,
        tags: input.tags,
        sections,
        performanceClass: derivePerformanceClass(sections),
        // Composed from our own registry blocks by the user, so there is
        // nothing third-party in it to attribute.
        licence: 'platform-owned',
        attribution: '',
        // No third party was involved in a user arranging our own blocks, so
        // there is nothing to name and nothing to have derived from.
        source: { library: '', demo: '', url: '', derivation: 'none' },
        fingerprint,
        createdBy: context.user.email,
      })
    })

    return reply.status(201).send(ok(asset))
  })

  app.get('/:assetId', async (request, reply) => {
    const context = requireTenant(request, 'page:read')
    const { assetId } = parseOrThrow(assetParamsSchema, request.params, 'asset id')

    const asset = await withTenant(context.tenantId, (tx) => findAssetById(tx, context.tenantId, assetId))
    if (!asset) throw new NotFoundError('Asset')

    return reply.send(ok(asset))
  })

  app.patch('/:assetId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { assetId } = parseOrThrow(assetParamsSchema, request.params, 'asset id')
    const patch = parseOrThrow(updateAssetInputSchema, request.body, 'asset')

    const sections = patch.sections ? normalizeDocument(patch.sections) : undefined

    const asset = await withTenant(context.tenantId, async (tx) => {
      const existing = await findAssetById(tx, context.tenantId, assetId)
      if (!existing) throw new NotFoundError('Asset')

      return updateAsset(tx, context.tenantId, assetId, {
        name: patch.name,
        description: patch.description,
        collection: patch.collection,
        tags: patch.tags,
        sections,
        // Cost and identity are derived from the document, so they can only be
        // recomputed here — never accepted from a client.
        performanceClass: sections ? derivePerformanceClass(sections) : undefined,
        fingerprint: sections ? fingerprintSections(sections) : undefined,
      })
    })
    if (!asset) throw new NotFoundError('Asset')

    return reply.send(ok(asset))
  })

  app.delete('/:assetId', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { assetId } = parseOrThrow(assetParamsSchema, request.params, 'asset id')

    const deleted = await withTenant(context.tenantId, (tx) => deleteAsset(tx, context.tenantId, assetId))
    if (!deleted) throw new NotFoundError('Asset')

    return reply.send(ok({ deleted: true }))
  })
}

export default assetsRoutes
