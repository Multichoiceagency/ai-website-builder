import { parse as parseHtml } from 'node-html-parser'
import type { StockMediaItem, StockMediaKind, StockSearchQuery, StockSearchResult } from '@platform/schemas'
import type { StockMediaProvider } from './types.js'

/**
 * Mixkit free stock — behind the stock adapter (ADR-0006).
 *
 * Mixkit does not publish a documented developer API. What we consume instead:
 *
 * 1. Public search / tag pages Mixkit already exposes for browsers and search
 *    engines (`/free-stock-video/discover/{q}/`, `/free-stock-art/…`).
 * 2. Schema.org JSON-LD (`VideoObject`) embedded on those pages — the same
 *    structured data Mixkit ships for SEO.
 * 3. Public CDN object URLs on `assets.mixkit.co` (deterministic paths for
 *    video / art downloads).
 *
 * We do not reverse-engineer private endpoints, bypass paywalls, or hotlink
 * Mixkit into published sites — import copies bytes into the tenant media
 * library via the core-api proxy.
 */

const MIXKIT_ORIGIN = 'https://mixkit.co'
const ASSETS_HOST = 'assets.mixkit.co'
const LICENSE_VIDEO = 'https://mixkit.co/license/#videoFree'
const LICENSE_ART = 'https://mixkit.co/license/#artFree'
const USER_AGENT = 'PlatformStockProxy/1.0 (+https://mixkit.co; free-stock import)'

const ALLOWED_DOWNLOAD_HOSTS = new Set([ASSETS_HOST])

function slugify(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function searchPageUrl(kind: StockMediaKind, query: string, page: number): string {
  const slug = slugify(query)
  const base =
    kind === 'image'
      ? slug
        ? `${MIXKIT_ORIGIN}/free-stock-art/discover/${slug}/`
        : `${MIXKIT_ORIGIN}/free-stock-art/`
      : slug
        ? `${MIXKIT_ORIGIN}/free-stock-video/discover/${slug}/`
        // Tag-style browse paginates more reliably than an empty discover URL.
        : `${MIXKIT_ORIGIN}/free-stock-video/nature/`

  if (page <= 1) return base
  const join = base.includes('?') ? '&' : '?'
  return `${base}${join}page=${page}`
}

function videoDownloadUrl(id: string): string {
  return `https://${ASSETS_HOST}/videos/${id}/${id}-720.mp4`
}

function videoPreviewUrl(id: string): string {
  return `https://${ASSETS_HOST}/videos/${id}/${id}-360.mp4`
}

function videoThumbUrl(id: string): string {
  return `https://${ASSETS_HOST}/videos/${id}/${id}-thumb-360-0.jpg`
}

function artDownloadUrl(id: string): string {
  return `https://${ASSETS_HOST}/art/${id}/${id}-original.png`
}

function artThumbUrl(id: string, fromHtml?: string): string {
  if (fromHtml && fromHtml.includes(`/${id}/`)) return fromHtml.split('?')[0]!
  return `https://${ASSETS_HOST}/art/${id}/${id}-square.png-500h.png`
}

interface JsonLdVideo {
  name?: string
  contentUrl?: string
  thumbnailUrl?: string
  embedUrl?: string
  license?: string
  description?: string
}

function parseJsonLdVideos(html: string): Map<string, JsonLdVideo> {
  const out = new Map<string, JsonLdVideo>()
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)

  for (const block of blocks) {
    let data: unknown
    try {
      data = JSON.parse(block[1]!)
    } catch {
      continue
    }

    const nodes = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && '@graph' in data && Array.isArray((data as { '@graph': unknown[] })['@graph'])
        ? (data as { '@graph': unknown[] })['@graph']
        : [data]

    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      const entry = node as JsonLdVideo & { '@type'?: string; '@id'?: string }
      if (entry['@type'] !== 'VideoObject') continue

      const idMatch =
        (typeof entry.contentUrl === 'string' ? entry.contentUrl.match(/\/videos\/(\d+)\//) : null) ??
        (typeof entry['@id'] === 'string' ? entry['@id'].match(/-(\d+)\/?#/) : null) ??
        (typeof entry.thumbnailUrl === 'string' ? entry.thumbnailUrl.match(/\/videos\/(\d+)\//) : null)

      const id = idMatch?.[1]
      if (!id) continue
      out.set(id, entry)
    }
  }

  return out
}

function parseVideoCards(html: string, jsonLd: Map<string, JsonLdVideo>): StockMediaItem[] {
  const root = parseHtml(html)
  const items: StockMediaItem[] = []
  const seen = new Set<string>()

  for (const anchor of root.querySelectorAll('a[href*="/free-stock-video/"]')) {
    const href = anchor.getAttribute('href') ?? ''
    const match = href.match(/\/free-stock-video\/([a-z0-9-]+)-(\d+)\/?$/i)
    if (!match) continue

    const slug = match[1]!
    const id = match[2]!
    if (seen.has(id)) continue
    seen.add(id)

    const img = anchor.querySelector('img')
    const thumbAttr = img?.getAttribute('src') || img?.getAttribute('data-src') || ''
    const thumb =
      thumbAttr.includes(`/videos/${id}/`) ? thumbAttr.split('?')[0]! : videoThumbUrl(id)

    const meta = jsonLd.get(id)
    const download =
      typeof meta?.contentUrl === 'string' && meta.contentUrl.includes(`/${id}/`)
        ? meta.contentUrl
        : videoDownloadUrl(id)
    const preview =
      typeof meta?.embedUrl === 'string' && meta.embedUrl.includes(`/${id}/`)
        ? meta.embedUrl
        : videoPreviewUrl(id)

    items.push({
      provider: 'mixkit',
      externalId: id,
      kind: 'video',
      title: meta?.name?.trim() || titleFromSlug(slug),
      thumbnailUrl: typeof meta?.thumbnailUrl === 'string' ? meta.thumbnailUrl : thumb,
      downloadUrl: download,
      previewUrl: preview,
      pageUrl: href.startsWith('http') ? href : `${MIXKIT_ORIGIN}${href.startsWith('/') ? href : `/${href}`}`,
      width: null,
      height: null,
      durationSeconds: null,
      licenseUrl: typeof meta?.license === 'string' ? meta.license : LICENSE_VIDEO,
      licenseName: 'Mixkit Free License',
      attribution: 'Mixkit',
      tags: [],
    })
  }

  // JSON-LD may list clips the grid parser missed (featured / SEO set).
  for (const [id, meta] of jsonLd) {
    if (seen.has(id)) continue
    if (!meta.contentUrl) continue
    seen.add(id)
    items.push({
      provider: 'mixkit',
      externalId: id,
      kind: 'video',
      title: meta.name?.trim() || `Mixkit video ${id}`,
      thumbnailUrl: meta.thumbnailUrl || videoThumbUrl(id),
      downloadUrl: meta.contentUrl,
      previewUrl: meta.embedUrl || videoPreviewUrl(id),
      pageUrl: `${MIXKIT_ORIGIN}/free-stock-video/clip-${id}/`,
      width: null,
      height: null,
      durationSeconds: null,
      licenseUrl: meta.license || LICENSE_VIDEO,
      licenseName: 'Mixkit Free License',
      attribution: 'Mixkit',
      tags: [],
    })
  }

  return items
}

function parseArtCards(html: string): StockMediaItem[] {
  const root = parseHtml(html)
  const items: StockMediaItem[] = []
  const seen = new Set<string>()

  for (const anchor of root.querySelectorAll('a[href*="/free-stock-art/"]')) {
    const href = anchor.getAttribute('href') ?? ''
    const match = href.match(/\/free-stock-art\/([a-z0-9-]+)-(\d+)\/?$/i)
    if (!match) continue

    const slug = match[1]!
    const id = match[2]!
    if (seen.has(id)) continue
    seen.add(id)

    const img = anchor.querySelector('img')
    const thumbAttr = img?.getAttribute('src') || img?.getAttribute('data-src') || ''

    items.push({
      provider: 'mixkit',
      externalId: id,
      kind: 'image',
      title: titleFromSlug(slug),
      thumbnailUrl: artThumbUrl(id, thumbAttr),
      downloadUrl: artDownloadUrl(id),
      pageUrl: href.startsWith('http') ? href : `${MIXKIT_ORIGIN}${href.startsWith('/') ? href : `/${href}`}`,
      width: null,
      height: null,
      durationSeconds: null,
      licenseUrl: LICENSE_ART,
      licenseName: 'Mixkit Free License',
      attribution: 'Mixkit',
      tags: [],
    })
  }

  return items
}

function pageSuggestsMore(html: string, page: number): boolean {
  const nextPage = page + 1
  return (
    html.includes(`page=${nextPage}`) ||
    html.includes(`?page=${nextPage}`) ||
    html.includes(`page/${nextPage}`) ||
    /rel=["']next["']/i.test(html)
  )
}

export class MixkitStockProvider implements StockMediaProvider {
  readonly id = 'mixkit' as const
  readonly label = 'Mixkit'

  supports(kind: StockMediaKind): boolean {
    return kind === 'video' || kind === 'image'
  }

  isAllowedDownloadUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') return false
      if (!ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) return false

      // Videos: /videos/{id}/{id}-{quality}.mp4
      if (/^\/videos\/\d+\/\d+-(360|720|1080)\.mp4$/i.test(parsed.pathname)) return true
      // Art originals / resized derivatives Mixkit serves publicly.
      if (/^\/art\/\d+\/\d+(-original)?(\.png|\.jpg|\.jpeg|\.webp)(-[\w.]+)?$/i.test(parsed.pathname)) {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async search(query: StockSearchQuery): Promise<StockSearchResult> {
    const kind = query.kind
    const pageUrl = searchPageUrl(kind, query.q, query.page)

    const response = await fetch(pageUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) {
      throw new Error(`Mixkit search returned HTTP ${response.status}`)
    }

    const html = await response.text()
    const items =
      kind === 'image' ? parseArtCards(html) : parseVideoCards(html, parseJsonLdVideos(html))

    return {
      provider: 'mixkit',
      kind,
      query: query.q,
      page: query.page,
      items: items.slice(0, query.limit),
      hasMore: pageSuggestsMore(html, query.page) || items.length >= query.limit,
    }
  }
}

export const mixkitStockProvider = new MixkitStockProvider()
