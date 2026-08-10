import { fetchDocument, normalizeUrl, BlockedUrlError } from '../discovery/fetch.js'
import { extractPage } from '../discovery/extract.js'

/**
 * Best-effort product extraction from marketplace product URLs
 * (Amazon, AliExpress, and generic Product JSON-LD / Open Graph pages).
 *
 * Marketplaces often block bots — callers must tolerate partial results and
 * fall back to LLM synthesis from the URL + whatever we could read.
 */

export interface MarketplaceListing {
  sourceUrl: string
  marketplace: 'amazon' | 'aliexpress' | 'generic'
  title: string
  description: string
  priceAmount: number | null
  currency: string | null
  images: string[]
  brand: string
  warnings: string[]
}

function detectMarketplace(hostname: string): MarketplaceListing['marketplace'] {
  const host = hostname.toLowerCase()
  if (host.includes('amazon.') || host.startsWith('amzn.') || host.includes('a.co')) return 'amazon'
  if (host.includes('aliexpress.') || host.includes('alibaba.')) return 'aliexpress'
  return 'generic'
}

function parseMoney(raw: string | undefined, fallbackCurrency: string): { amount: number; currency: string } | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return null
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/,/g, '')
      : cleaned.includes(',')
        ? cleaned.replace(',', '.')
        : cleaned
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  const currencyMatch = raw.match(/\b(EUR|USD|GBP|CAD|AUD|JPY|CNY|SEK|NOK|DKK|CHF|PLN|INR)\b/i)
  const symbol =
    raw.includes('€') ? 'EUR' : raw.includes('$') ? 'USD' : raw.includes('£') ? 'GBP' : null
  return {
    amount: Math.round(value * 100),
    currency: (currencyMatch?.[1] || symbol || fallbackCurrency).toUpperCase(),
  }
}

function productNodes(jsonLd: Record<string, unknown>[]): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  for (const node of jsonLd) {
    const type = node['@type']
    const types = Array.isArray(type) ? type.map(String) : [String(type ?? '')]
    if (types.some((entry) => /Product/i.test(entry))) nodes.push(node)
    const graph = node['@graph']
    if (Array.isArray(graph)) {
      for (const child of graph) {
        if (child && typeof child === 'object') {
          const childType = (child as Record<string, unknown>)['@type']
          const childTypes = Array.isArray(childType) ? childType.map(String) : [String(childType ?? '')]
          if (childTypes.some((entry) => /Product/i.test(entry))) nodes.push(child as Record<string, unknown>)
        }
      }
    }
  }
  return nodes
}

function collectImages(node: Record<string, unknown>, fallback: string[]): string[] {
  const out: string[] = []
  const push = (value: unknown) => {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) out.push(value)
    else if (value && typeof value === 'object' && 'url' in (value as object)) {
      const url = (value as { url?: unknown }).url
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) out.push(url)
    }
  }
  const image = node.image
  if (Array.isArray(image)) image.forEach(push)
  else push(image)
  return [...new Set([...out, ...fallback])].slice(0, 8)
}

export async function extractMarketplaceListing(
  rawUrl: string,
  fallbackCurrency = 'EUR',
): Promise<MarketplaceListing> {
  const url = normalizeUrl(rawUrl)
  const marketplace = detectMarketplace(url.hostname)
  const warnings: string[] = []

  let title = ''
  let description = ''
  let brand = ''
  let images: string[] = []
  let priceAmount: number | null = null
  let currency: string | null = null

  try {
    const document = await fetchDocument(url)
    if (!document?.body) {
      warnings.push('The marketplace page returned no HTML — generating from the URL alone.')
    } else {
      const page = extractPage(document.url, document.body)
      title = page.title
      description = page.description
      images = page.images.slice(0, 8)

      for (const node of productNodes(page.jsonLd)) {
        if (typeof node.name === 'string' && node.name.trim()) title = node.name.trim()
        if (typeof node.description === 'string' && node.description.trim()) {
          description = node.description.trim()
        }
        const brandNode = node.brand
        if (typeof brandNode === 'string') brand = brandNode
        else if (brandNode && typeof brandNode === 'object' && 'name' in brandNode) {
          brand = String((brandNode as { name?: unknown }).name ?? '')
        }
        images = collectImages(node, images)

        const offers = node.offers
        const offer = Array.isArray(offers) ? offers[0] : offers
        if (offer && typeof offer === 'object') {
          const offerRecord = offer as Record<string, unknown>
          const priceRaw =
            typeof offerRecord.price === 'number'
              ? String(offerRecord.price)
              : typeof offerRecord.price === 'string'
                ? offerRecord.price
                : typeof offerRecord.lowPrice === 'string'
                  ? offerRecord.lowPrice
                  : undefined
          const offerCurrency =
            typeof offerRecord.priceCurrency === 'string' ? offerRecord.priceCurrency : fallbackCurrency
          const money = parseMoney(priceRaw, offerCurrency)
          if (money) {
            priceAmount = money.amount
            currency = money.currency
          }
        }
      }

      if (!title) warnings.push('No product title found in the page markup.')
      if (priceAmount == null) warnings.push('No price found — a starter price will be estimated.')
    }
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      warnings.push(error.message)
    } else {
      warnings.push(
        error instanceof Error
          ? error.message.slice(0, 180)
          : 'Could not fetch the marketplace page (often blocked).',
      )
    }
  }

  if (!title) {
    const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
      .replace(/[-_+]+/g, ' ')
      .replace(/\.(html?|php)$/i, '')
      .trim()
    title = slug.slice(0, 120) || `${marketplace} product`
  }

  return {
    sourceUrl: url.toString(),
    marketplace,
    title: title.slice(0, 200),
    description: description.slice(0, 4000),
    priceAmount,
    currency,
    images,
    brand: brand.slice(0, 120),
    warnings: [...new Set(warnings)].slice(0, 12),
  }
}
