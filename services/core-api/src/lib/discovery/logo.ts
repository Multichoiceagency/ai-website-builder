/**
 * Logo candidate ranking for discovery.
 *
 * `og:image` is often a marketing photo, not the mark — so JSON-LD / header /
 * `*logo*` assets outrank it. Favicons are a last resort.
 */

export interface LogoCandidate {
  url: string
  score: number
  source: string
}

const SKIP_PATTERN =
  /(?:pixel|tracker|sprite|spacer|blank|1x1|facebook\.com\/tr|google-analytics|doubleclick|hotjar|gravatar\.com\/avatar)/i

export function absoluteUrl(href: string, base: URL): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return ''
  }
}

export function scoreLogoCandidate(input: {
  url: string
  source: string
  alt?: string
  className?: string
  id?: string
  srcHint?: string
  rel?: string
  sizes?: string
  inChrome?: boolean
}): number {
  const url = input.url
  if (!url || SKIP_PATTERN.test(url)) return 0

  let score = 10
  const haystack = [input.alt, input.className, input.id, input.srcHint, input.rel, url]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (input.source === 'jsonld') score += 120
  else if (input.source === 'itemprop') score += 100
  else if (input.source === 'img-logo') score += 70
  else if (input.source === 'header') score += 50
  else if (input.source === 'apple-touch-icon') score += 40
  else if (input.source === 'favicon') score += 25
  else if (input.source === 'og') score += 15
  else if (input.source === 'places') score += 35
  else score += 5

  if (/\blogo\b/.test(haystack)) score += 25
  if (/\b(brand|wordmark|logotype|site-logo|navbar-brand)\b/.test(haystack)) score += 15
  if (input.inChrome) score += 12

  if (/\.svg($|\?)/i.test(url) || url.includes('image/svg')) score += 12
  if (/\.(png|webp)($|\?)/i.test(url)) score += 6
  if (/\.ico($|\?)/i.test(url)) score -= 5

  // Prefer higher-res touch icons (e.g. 180x180).
  const sizeMatch = (input.sizes ?? '').match(/(\d+)\s*x\s*(\d+)/i)
  if (sizeMatch) {
    const px = Math.max(Number(sizeMatch[1]), Number(sizeMatch[2]))
    if (px >= 180) score += 10
    else if (px >= 120) score += 6
    else if (px < 48) score -= 8
  }

  // Tiny tracking / badge images in path names.
  if (/\/(?:16|24|32)x(?:16|24|32)\//i.test(url)) score -= 15

  return Math.max(0, score)
}

export function pickBestLogo(candidates: LogoCandidate[]): LogoCandidate | null {
  const bestByUrl = new Map<string, LogoCandidate>()

  for (const candidate of candidates) {
    if (!candidate.url || candidate.score <= 0) continue
    // Drop query noise for dedupe, keep the highest-scoring variant.
    let key = candidate.url
    try {
      const parsed = new URL(candidate.url)
      parsed.hash = ''
      key = parsed.toString()
    } catch {
      // keep raw
    }
    const existing = bestByUrl.get(key)
    if (!existing || candidate.score > existing.score) bestByUrl.set(key, candidate)
  }

  return [...bestByUrl.values()].sort((a, b) => b.score - a.score)[0] ?? null
}

/** Hex / rgb fills from SVG markup (logos are often SVG). */
export function extractColorsFromSvg(svg: string): string[] {
  const counts = new Map<string, number>()

  const consider = (hex: string) => {
    const normalized = hex.toLowerCase()
    const r = parseInt(normalized.slice(1, 3), 16)
    const g = parseInt(normalized.slice(3, 5), 16)
    const b = parseInt(normalized.slice(5, 7), 16)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max > 242 && min > 242) return
    if (max < 24) return
    if (max - min < 18) return
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  for (const match of svg.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const raw = match[1]!
    const hex =
      raw.length === 3
        ? `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`
        : `#${raw}`
    consider(hex)
  }

  for (const match of svg.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    const r = Number(match[1])
    const g = Number(match[2])
    const b = Number(match[3])
    if ([r, g, b].some((channel) => channel > 255)) continue
    consider(`#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex]) => hex)
}
