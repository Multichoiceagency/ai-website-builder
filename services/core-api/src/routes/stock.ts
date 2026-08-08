import type { FastifyPluginAsync } from 'fastify'
import {
  isVideoMime,
  stockImportInputSchema,
  stockSearchQuerySchema,
  type MediaAsset,
} from '@platform/schemas'
import { resolveStockProvider, stockProvider } from '../adapters/stock/index.js'
import { withTenant } from '../db/client.js'
import { insertMediaAsset } from '../db/repositories/content.js'
import { BadRequestError } from '../lib/errors.js'
import { prepareUpload } from '../lib/media/upload.js'
import { scheduleVideoFrameExtract } from '../lib/media/frames.js'
import { ok } from '../lib/response.js'
import { storage } from '../lib/storage/index.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Stock media proxy — search + import into the tenant library.
 *
 * The browser never talks to Mixkit directly (CORS + SSRF surface). Downloads
 * are allowlisted inside the vendor adapter (ADR-0006).
 */

const IMPORT_ROUTE = { bodyLimit: 1024 * 1024 } as const
const MAX_IMPORT_BYTES = 64 * 1024 * 1024

function filenameForImport(input: {
  title?: string
  externalId: string
  kind: 'video' | 'image'
  downloadUrl: string
}): string {
  const fromUrl = input.downloadUrl.split('?')[0]?.split('/').pop() ?? ''
  if (fromUrl && /\.(mp4|webm|png|jpe?g|webp)$/i.test(fromUrl)) return fromUrl

  const base = (input.title ?? `mixkit-${input.externalId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return `${base || `mixkit-${input.externalId}`}.${input.kind === 'video' ? 'mp4' : 'png'}`
}

async function fetchAllowlistedBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PlatformStockProxy/1.0 (+stock-import)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new BadRequestError(`Could not download stock file (HTTP ${response.status}).`)
  }

  const lengthHeader = response.headers.get('content-length')
  if (lengthHeader && Number(lengthHeader) > MAX_IMPORT_BYTES) {
    throw new BadRequestError('Stock file is larger than the media library allows.')
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_IMPORT_BYTES) {
    throw new BadRequestError('Stock file is larger than the media library allows.')
  }

  return {
    bytes: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  }
}

const stockRoutes: FastifyPluginAsync = async (app) => {
  app.get('/search', async (request, reply) => {
    requireTenant(request, 'media:read')
    const query = parseOrThrow(stockSearchQuerySchema, request.query ?? {}, 'query')
    const provider = resolveStockProvider(query)

    if (!provider.supports(query.kind)) {
      throw new BadRequestError(`${provider.label} does not support ${query.kind} search.`)
    }

    try {
      const result = await provider.search(query)
      return reply.send(ok(result))
    } catch (error) {
      request.log.warn({ err: error, provider: provider.id }, 'stock search failed')
      throw new BadRequestError(
        error instanceof Error ? error.message : `Could not search ${provider.label}.`,
      )
    }
  })

  /**
   * Copy a stock file into the tenant media library.
   *
   * The download URL is re-validated against the adapter allowlist so a client
   * cannot turn this route into an open proxy (SSRF).
   */
  app.post('/import', IMPORT_ROUTE, async (request, reply) => {
    const context = requireTenant(request, 'media:write')
    const input = parseOrThrow(stockImportInputSchema, request.body ?? {}, 'import')
    const provider = stockProvider(input.provider)

    if (!provider.isAllowedDownloadUrl(input.downloadUrl)) {
      throw new BadRequestError('That download URL is not allowlisted for this stock provider.')
    }

    const { bytes, contentType } = await fetchAllowlistedBytes(input.downloadUrl)
    const filename = filenameForImport(input)

    const prepared = prepareUpload({
      body: bytes,
      claimedContentType: contentType,
      filename,
      alt: input.alt ?? input.title,
    })

    await storage().put(prepared.storageKey, prepared.bytes, prepared.mime)

    const tags = [
      ...(input.tags ?? []),
      'stock',
      input.provider,
      input.kind,
    ]
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20)

    const asset: MediaAsset = await withTenant(context.tenantId, (tx) =>
      insertMediaAsset(tx, context.tenantId, {
        folder: input.folder || 'stock',
        filename: prepared.filename,
        storageKey: prepared.storageKey,
        mime: prepared.mime,
        sizeBytes: prepared.sizeBytes,
        width: prepared.width,
        height: prepared.height,
        alt: prepared.alt,
        altSource: prepared.altSource,
        tags: [...new Set(tags)],
        checksum: prepared.checksum,
        createdBy: context.user.email,
      }),
    )

    if (isVideoMime(asset.mime)) {
      scheduleVideoFrameExtract(context.tenantId, asset.id)
    }

    return reply.status(201).send(ok({ asset, provider: input.provider, externalId: input.externalId }))
  })
}

export default stockRoutes
