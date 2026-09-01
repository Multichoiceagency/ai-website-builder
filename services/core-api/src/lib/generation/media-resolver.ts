import type { BusinessProfile, MediaAsset, StockMediaItem } from '@platform/schemas'
import { pexelsStockProvider } from '../../adapters/stock/index.js'
import { withTenant } from '../../db/client.js'
import { listMediaLibrary } from '../../db/repositories/content.js'
import { geminiImageGenerationProvider, type ImageGenerationProvider } from '../media/image-generation.js'
import {
  importStockAsset,
  mediaFilename,
  storeMediaAsset,
  type StockImportInput,
  type StoreMediaInput,
} from '../media/import.js'

/**
 * Pick the content imagery for one generated site.
 *
 * Order is cheapest-first: images already discovered on the customer's own
 * site, then the tenant library, then Pexels, then a generated image. Every
 * step is optional — a site still generates with no imagery at all.
 */

/**
 * Content photos and illustrations placed in page sections. Logos, favicons,
 * icons and decorative CSS shapes are outside this budget.
 */
export const MAX_SITE_IMAGES = 3

/**
 * No durable job runner exists yet, so generation awaits the image provider
 * instead of detaching a promise it cannot retry. The whole site shares this
 * budget; past it, sections keep their stock or empty image.
 */
export const IMAGE_GENERATION_BUDGET_MS = 20_000

const IMAGE_URL_PATTERN = /\.(jpe?g|png|webp|avif|gif)(\?|$)/i

export type MediaRole = 'hero' | 'service' | 'about'

export interface MediaIntent {
  role: MediaRole
  /** Search terms, derived from industry, services and location — never PII. */
  query: string
  alt: string
}

export interface ResolvedImage {
  url: string
  alt: string
  assetId: string | null
  source: 'profile' | 'tenant' | 'pexels' | 'generated'
}

export interface MediaResolution {
  byRole: Partial<Record<MediaRole, ResolvedImage>>
  reused: number
  imported: number
  generated: number
  /** Provider failures, already handled by falling through to the next source. */
  errors: string[]
}

/** Every outside call the resolver makes, so tests need no database or network. */
export interface MediaResolverDeps {
  listTenantImages(tenantId: string): Promise<MediaAsset[]>
  stockConfigured(): boolean
  searchStock(query: string, limit: number): Promise<StockMediaItem[]>
  importStock(input: StockImportInput): Promise<MediaAsset>
  storeGenerated(input: StoreMediaInput): Promise<MediaAsset>
  imageProvider: ImageGenerationProvider
}

export function defaultMediaResolverDeps(): MediaResolverDeps {
  return {
    listTenantImages: async (tenantId) => {
      const library = await withTenant(tenantId, (tx) =>
        listMediaLibrary(tx, tenantId, { sort: 'newest', limit: 60, offset: 0 }),
      )
      return library.assets
    },
    stockConfigured: () => pexelsStockProvider.isConfigured(),
    searchStock: async (query, limit) => {
      const result = await pexelsStockProvider.search({
        q: query,
        kind: 'image',
        provider: 'pexels',
        category: '',
        page: 1,
        limit,
      })
      return result.items
    },
    importStock: importStockAsset,
    storeGenerated: storeMediaAsset,
    imageProvider: geminiImageGenerationProvider,
  }
}

export interface ResolveMediaInput {
  tenantId: string
  createdBy: string
  profile: BusinessProfile
  intents: MediaIntent[]
  deps?: MediaResolverDeps
  now?: () => number
}

export function mediaIntentsFor(profile: BusinessProfile): MediaIntent[] {
  const industry = profile.company.industry.trim()
  const city = profile.locations[0]?.city?.trim() ?? ''
  const service = profile.services[0]?.name?.trim() ?? ''
  const company = profile.company.name.trim()

  const subject = industry || service || 'professional business'
  const intents: MediaIntent[] = [
    {
      role: 'hero',
      query: [subject, city, 'workplace'].filter(Boolean).join(' '),
      alt: company ? `${company} — ${subject}` : subject,
    },
  ]

  if (service) {
    intents.push({
      role: 'service',
      query: [service, subject].filter(Boolean).join(' '),
      alt: service,
    })
  }

  if (industry) {
    intents.push({
      role: 'about',
      query: [subject, 'team at work'].filter(Boolean).join(' '),
      alt: company ? `Team of ${company}` : `${subject} team`,
    })
  }

  return intents.slice(0, MAX_SITE_IMAGES)
}

function isUsableImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && IMAGE_URL_PATTERN.test(parsed.pathname)
  } catch {
    return false
  }
}

function scoreForIntent(asset: MediaAsset, intent: MediaIntent): number {
  const terms = intent.query.toLowerCase().split(/\s+/).filter((term) => term.length > 2)
  const haystack = `${asset.filename} ${asset.alt} ${asset.tags.join(' ')}`.toLowerCase()
  let score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
  // Heroes are wide; a portrait crop in a split hero reads as a mistake.
  if (intent.role === 'hero' && asset.width && asset.height && asset.width > asset.height) score += 1
  return score
}

async function fromTenantLibrary(
  deps: MediaResolverDeps,
  tenantId: string,
  intent: MediaIntent,
  taken: Set<string>,
): Promise<ResolvedImage | null> {
  const assets = await deps.listTenantImages(tenantId)

  const best = assets
    .filter((asset) => asset.mime.startsWith('image/') && !taken.has(asset.id))
    .map((asset) => ({ asset, score: scoreForIntent(asset, intent) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.asset

  if (!best) return null

  return { url: best.url, alt: best.alt || intent.alt, assetId: best.id, source: 'tenant' }
}

async function fromStock(
  deps: MediaResolverDeps,
  input: ResolveMediaInput,
  intent: MediaIntent,
  taken: Set<string>,
): Promise<ResolvedImage | null> {
  if (!deps.stockConfigured()) return null

  const items = await deps.searchStock(intent.query, 5)
  // One result per intention, so a single search cannot fill the whole site.
  const photo = items.find((item) => item.downloadUrl && !taken.has(item.downloadUrl))
  if (!photo) return null

  const asset = await deps.importStock({
    tenantId: input.tenantId,
    createdBy: input.createdBy,
    provider: 'pexels',
    externalId: photo.externalId,
    kind: 'image',
    downloadUrl: photo.downloadUrl,
    title: photo.title,
    alt: intent.alt,
    tags: ['generated-site', intent.role],
    folder: 'stock',
  })

  taken.add(photo.downloadUrl)
  return { url: asset.url, alt: asset.alt || intent.alt, assetId: asset.id, source: 'pexels' }
}

function promptFor(intent: MediaIntent, profile: BusinessProfile): string {
  const industry = profile.company.industry.trim() || 'professional services'
  return [
    `A photorealistic, wide landscape photograph for the ${intent.role} section of a ${industry} website.`,
    `Subject: ${intent.query}.`,
    'Natural light, no text, no logos, no watermarks, no recognisable faces.',
  ].join(' ')
}

async function fromImageProvider(
  deps: MediaResolverDeps,
  input: ResolveMediaInput,
  intent: MediaIntent,
  remainingMs: number,
): Promise<ResolvedImage | null> {
  if (remainingMs <= 0) return null

  const image = await deps.imageProvider.generate(promptFor(intent, input.profile), {
    timeoutMs: remainingMs,
  })

  const asset = await deps.storeGenerated({
    tenantId: input.tenantId,
    createdBy: input.createdBy,
    bytes: image.bytes,
    contentType: image.mimeType,
    filename: mediaFilename(`${intent.role}-${intent.query}`, image.mimeType, `generated-${intent.role}`),
    alt: intent.alt,
    tags: ['generated-site', 'ai-generated', deps.imageProvider.id, intent.role],
    folder: 'generated',
  })

  return { url: asset.url, alt: asset.alt || intent.alt, assetId: asset.id, source: 'generated' }
}

export async function resolveSiteMedia(input: ResolveMediaInput): Promise<MediaResolution> {
  const deps = input.deps ?? defaultMediaResolverDeps()
  const now = input.now ?? Date.now
  const deadline = now() + IMAGE_GENERATION_BUDGET_MS

  const resolution: MediaResolution = { byRole: {}, reused: 0, imported: 0, generated: 0, errors: [] }
  const taken = new Set<string>()
  const discovered = input.profile.media.filter(isUsableImageUrl)

  for (const intent of input.intents.slice(0, MAX_SITE_IMAGES)) {
    if (Object.keys(resolution.byRole).length >= MAX_SITE_IMAGES) break

    const fresh = discovered.find((url) => !taken.has(url))
    if (fresh) {
      taken.add(fresh)
      resolution.byRole[intent.role] = { url: fresh, alt: intent.alt, assetId: null, source: 'profile' }
      resolution.reused += 1
      continue
    }

    try {
      const tenant = await fromTenantLibrary(deps, input.tenantId, intent, taken)
      if (tenant?.assetId) {
        taken.add(tenant.assetId)
        resolution.byRole[intent.role] = tenant
        resolution.reused += 1
        continue
      }
    } catch (error) {
      resolution.errors.push(`tenant:${intent.role}:${(error as Error).message}`)
    }

    try {
      const stock = await fromStock(deps, input, intent, taken)
      if (stock) {
        if (stock.assetId) taken.add(stock.assetId)
        resolution.byRole[intent.role] = stock
        resolution.imported += 1
        continue
      }
    } catch (error) {
      resolution.errors.push(`pexels:${intent.role}:${(error as Error).message}`)
    }

    if (!deps.imageProvider.isConfigured()) continue

    try {
      const generated = await fromImageProvider(deps, input, intent, deadline - now())
      if (generated) {
        if (generated.assetId) taken.add(generated.assetId)
        resolution.byRole[intent.role] = generated
        resolution.generated += 1
      }
    } catch (error) {
      resolution.errors.push(`${deps.imageProvider.id}:${intent.role}:${(error as Error).message}`)
    }
  }

  return resolution
}
