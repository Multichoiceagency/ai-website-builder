import { isVideoMime, type MediaAsset, type StockProviderId } from '@platform/schemas'
import { stockProvider } from '../../adapters/stock/index.js'
import { withTenant } from '../../db/client.js'
import { findMediaByChecksum, insertMediaAsset } from '../../db/repositories/content.js'
import { BadRequestError } from '../errors.js'
import { storage } from '../storage/index.js'
import { scheduleVideoFrameExtract } from './frames.js'
import { prepareUpload } from './upload.js'

/**
 * Import bytes into a tenant media library.
 *
 * Shared by the stock proxy route and by site generation, which must not reach
 * its own HTTP routes. Downloads stay allowlisted per provider (ADR-0006): the
 * browser never talks to a stock host, and neither does an unchecked URL here.
 */

/** Matches the video upload ceiling so 720p stock clips import cleanly. */
const MAX_IMPORT_BYTES = 64 * 1024 * 1024

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

export interface StoreMediaInput {
  tenantId: string
  createdBy: string
  bytes: Buffer
  contentType: string
  filename: string
  alt?: string
  tags?: string[]
  folder?: string
}

export interface StockImportInput {
  tenantId: string
  createdBy: string
  provider: StockProviderId
  externalId: string
  kind: 'image' | 'video'
  downloadUrl: string
  title?: string
  alt?: string
  tags?: string[]
  folder?: string
}

export function mediaFilename(base: string, contentType: string, fallback: string): string {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const extension = IMAGE_EXTENSIONS[contentType] ?? 'jpg'
  return `${slug || fallback}.${extension}`
}

function filenameForImport(input: {
  title?: string
  externalId: string
  kind: 'video' | 'image'
  downloadUrl: string
}): string {
  const fromUrl = input.downloadUrl.split('?')[0]?.split('/').pop() ?? ''
  if (fromUrl && /\.(mp4|webm|png|jpe?g|webp)$/i.test(fromUrl)) return fromUrl
  if (input.kind === 'video') {
    const slug = (input.title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
    return `${slug || `stock-${input.externalId}`}.mp4`
  }
  return mediaFilename(input.title ?? '', 'image/jpeg', `stock-${input.externalId}`)
}

export async function fetchAllowlistedBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PlatformStockProxy/1.0 (+stock-import)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    throw new BadRequestError(`Could not download stock file (HTTP ${response.status}).`)
  }

  const lengthHeader = response.headers.get('content-length')
  if (lengthHeader && Number(lengthHeader) > MAX_IMPORT_BYTES) {
    throw new BadRequestError(
      `Stock file is larger than ${Math.floor(MAX_IMPORT_BYTES / 1024 / 1024)} MB.`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_IMPORT_BYTES) {
    throw new BadRequestError(
      `Stock file is larger than ${Math.floor(MAX_IMPORT_BYTES / 1024 / 1024)} MB.`,
    )
  }

  const headerType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  let contentType = headerType
  // Mixkit/Pexels sometimes send octet-stream — hint from URL so prepareUpload sniffs correctly.
  if (!contentType || contentType === 'application/octet-stream' || contentType === 'binary/octet-stream') {
    const path = url.split('?')[0]!.toLowerCase()
    if (path.endsWith('.mp4')) contentType = 'video/mp4'
    else if (path.endsWith('.webm')) contentType = 'video/webm'
    else if (path.endsWith('.png')) contentType = 'image/png'
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg'
    else if (path.endsWith('.webp')) contentType = 'image/webp'
    else contentType = 'application/octet-stream'
  }

  return { bytes: Buffer.from(arrayBuffer), contentType }
}

/** Returns the tenant's existing asset when it already holds these exact bytes. */
export async function storeMediaAsset(input: StoreMediaInput): Promise<MediaAsset> {
  const prepared = prepareUpload({
    body: input.bytes,
    claimedContentType: input.contentType,
    filename: input.filename,
    alt: input.alt,
  })

  const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20)

  const existing = await withTenant(input.tenantId, (tx) =>
    findMediaByChecksum(tx, input.tenantId, prepared.checksum),
  )
  if (existing) return existing

  await storage().put(prepared.storageKey, prepared.bytes, prepared.mime)

  const asset = await withTenant(input.tenantId, (tx) =>
    insertMediaAsset(tx, input.tenantId, {
      folder: input.folder || 'stock',
      filename: prepared.filename,
      storageKey: prepared.storageKey,
      mime: prepared.mime,
      sizeBytes: prepared.sizeBytes,
      width: prepared.width,
      height: prepared.height,
      alt: prepared.alt,
      altSource: prepared.altSource,
      tags,
      checksum: prepared.checksum,
      createdBy: input.createdBy,
    }),
  )

  if (isVideoMime(asset.mime)) scheduleVideoFrameExtract(input.tenantId, asset.id)

  return asset
}

/** Copy one stock file into the tenant library. Rejects a URL the provider does not own. */
export async function importStockAsset(input: StockImportInput): Promise<MediaAsset> {
  const provider = stockProvider(input.provider)
  if (!provider.isAllowedDownloadUrl(input.downloadUrl)) {
    throw new BadRequestError('That download URL is not allowlisted for this stock provider.')
  }

  const { bytes, contentType } = await fetchAllowlistedBytes(input.downloadUrl)

  return storeMediaAsset({
    tenantId: input.tenantId,
    createdBy: input.createdBy,
    bytes,
    contentType,
    filename: filenameForImport(input),
    alt: input.alt ?? input.title,
    tags: [...(input.tags ?? []), 'stock', input.provider, input.kind],
    folder: input.folder,
  })
}
