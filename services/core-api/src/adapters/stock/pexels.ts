import type { StockMediaItem, StockMediaKind, StockSearchQuery, StockSearchResult } from '@platform/schemas'
import type { StockMediaProvider } from './types.js'

/**
 * Pexels free stock photos — behind the stock adapter (ADR-0006).
 *
 * Requires `PEXELS_API_KEY` (https://www.pexels.com/api/). When unset, search
 * throws a clear configuration error so the Photos tab can show setup copy.
 */

const PEXELS_API = 'https://api.pexels.com/v1'
const PEXELS_IMAGES_HOSTS = new Set(['images.pexels.com'])
const LICENSE = 'https://www.pexels.com/license/'
const USER_AGENT = 'PlatformStockProxy/1.0 (+pexels; free-stock import)'

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  alt: string | null
  src: {
    original: string
    large2x?: string
    large?: string
    medium?: string
    small?: string
    portrait?: string
    landscape?: string
    tiny?: string
  }
}

interface PexelsSearchResponse {
  page: number
  per_page: number
  total_results: number
  next_page?: string
  photos: PexelsPhoto[]
}

function apiKey(): string {
  return (process.env.PEXELS_API_KEY ?? '').trim()
}

function mapPhoto(photo: PexelsPhoto): StockMediaItem {
  const download =
    photo.src.large2x || photo.src.large || photo.src.original || photo.src.medium || ''
  const thumb = photo.src.medium || photo.src.small || photo.src.tiny || download
  const title = (photo.alt?.trim() || `Photo by ${photo.photographer}`).slice(0, 300)

  return {
    provider: 'pexels',
    externalId: String(photo.id),
    kind: 'image',
    title: title || `Pexels ${photo.id}`,
    thumbnailUrl: thumb,
    downloadUrl: download,
    pageUrl: photo.url,
    width: photo.width || null,
    height: photo.height || null,
    durationSeconds: null,
    licenseUrl: LICENSE,
    licenseName: 'Pexels License',
    attribution: photo.photographer ? `Photo by ${photo.photographer} on Pexels` : 'Pexels',
    tags: [],
  }
}

export class PexelsStockProvider implements StockMediaProvider {
  readonly id = 'pexels' as const
  readonly label = 'Pexels'

  supports(kind: StockMediaKind): boolean {
    return kind === 'image'
  }

  isConfigured(): boolean {
    return Boolean(apiKey())
  }

  isAllowedDownloadUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') return false
      if (!PEXELS_IMAGES_HOSTS.has(parsed.hostname)) return false
      // /photos/{id}/… derivatives
      return /^\/photos\/\d+\//i.test(parsed.pathname)
    } catch {
      return false
    }
  }

  async search(query: StockSearchQuery): Promise<StockSearchResult> {
    const key = apiKey()
    if (!key) {
      throw new Error(
        'Pexels is not configured. Set PEXELS_API_KEY in the environment (https://www.pexels.com/api/).',
      )
    }

    const term = (query.q.trim() || query.category.trim() || 'nature').slice(0, 120)
    const params = new URLSearchParams({
      query: term,
      page: String(query.page),
      per_page: String(Math.min(query.limit, 48)),
      orientation: 'landscape',
    })

    const response = await fetch(`${PEXELS_API}/search?${params}`, {
      headers: {
        Authorization: key,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) {
      throw new Error(`Pexels search returned HTTP ${response.status}`)
    }

    const data = (await response.json()) as PexelsSearchResponse
    const items = (data.photos ?? []).map(mapPhoto).filter((item) => item.downloadUrl)

    return {
      provider: 'pexels',
      kind: 'image',
      query: query.q,
      page: query.page,
      items: items.slice(0, query.limit),
      hasMore: Boolean(data.next_page) || items.length >= query.limit,
    }
  }
}

export const pexelsStockProvider = new PexelsStockProvider()
