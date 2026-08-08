import { parse, type HTMLElement } from 'node-html-parser'
import type { BusinessLocation, BusinessReview, OpeningHours, SocialPlatform } from '@platform/schemas'
import { absoluteUrl, scoreLogoCandidate, type LogoCandidate } from './logo.js'

/**
 * Turn one HTML document into structured facts.
 *
 * Order of trust: JSON-LD structured data first (the business told search
 * engines this on purpose), then meta tags, then visible content. Guessing
 * from prose is the last resort and is marked with lower confidence upstream.
 */

export interface ExtractedPage {
  url: string
  title: string
  description: string
  headings: { level: number; text: string }[]
  paragraphs: string[]
  links: { href: string; text: string }[]
  images: string[]
  /** Ranked logo / mark candidates from this document (not just og:image). */
  logos: LogoCandidate[]
  phones: string[]
  emails: string[]
  socials: { platform: SocialPlatform; url: string }[]
  themeColor: string
  ogImage: string
  jsonLd: Record<string, unknown>[]
  locations: BusinessLocation[]
  reviews: BusinessReview[]
  openingHours: OpeningHours[]
  fonts: string[]
}

const SOCIAL_PATTERNS: { platform: SocialPlatform; pattern: RegExp }[] = [
  { platform: 'facebook', pattern: /(?:facebook|fb)\.com\// },
  { platform: 'instagram', pattern: /instagram\.com\// },
  { platform: 'linkedin', pattern: /linkedin\.com\// },
  { platform: 'x', pattern: /(?:twitter|x)\.com\// },
  { platform: 'youtube', pattern: /(?:youtube\.com|youtu\.be)\// },
  { platform: 'tiktok', pattern: /tiktok\.com\// },
  { platform: 'pinterest', pattern: /pinterest\.[a-z.]+\// },
  { platform: 'whatsapp', pattern: /(?:wa\.me|api\.whatsapp\.com)\// },
]

const DAY_MAP: Record<string, OpeningHours['day']> = {
  monday: 'mon', mon: 'mon', maandag: 'mon', ma: 'mon',
  tuesday: 'tue', tue: 'tue', dinsdag: 'tue', di: 'tue',
  wednesday: 'wed', wed: 'wed', woensdag: 'wed', wo: 'wed',
  thursday: 'thu', thu: 'thu', donderdag: 'thu', do: 'thu',
  friday: 'fri', fri: 'fri', vrijdag: 'fri', vr: 'fri',
  saturday: 'sat', sat: 'sat', zaterdag: 'sat', za: 'sat',
  sunday: 'sun', sun: 'sun', zondag: 'sun', zo: 'sun',
}

function text(node: HTMLElement | null): string {
  return (node?.text ?? '').replace(/\s+/g, ' ').trim()
}

function collectJsonLd(root: HTMLElement): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = []

  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed: unknown = JSON.parse(script.text)
      // A document may use @graph, an array, or a bare object.
      const candidates = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed !== null && '@graph' in parsed
          ? ((parsed as { '@graph': unknown })['@graph'] as unknown[])
          : [parsed]

      for (const candidate of candidates) {
        if (candidate && typeof candidate === 'object') found.push(candidate as Record<string, unknown>)
      }
    } catch {
      // Malformed JSON-LD is common and not worth failing a crawl over.
    }
  }

  return found
}

function locationFromJsonLd(node: Record<string, unknown>): BusinessLocation | null {
  const address = node.address as Record<string, unknown> | undefined
  if (!address || typeof address !== 'object') return null

  const geo = node.geo as Record<string, unknown> | undefined

  return {
    label: String(node.name ?? ''),
    street: String(address.streetAddress ?? ''),
    postalCode: String(address.postalCode ?? ''),
    city: String(address.addressLocality ?? ''),
    region: String(address.addressRegion ?? ''),
    country: String(address.addressCountry ?? ''),
    latitude: geo?.latitude ? Number(geo.latitude) : undefined,
    longitude: geo?.longitude ? Number(geo.longitude) : undefined,
    hours: [],
  }
}

function hoursFromJsonLd(node: Record<string, unknown>): OpeningHours[] {
  const raw = node.openingHoursSpecification
  if (!Array.isArray(raw)) return []

  const hours: OpeningHours[] = []
  for (const entry of raw as Record<string, unknown>[]) {
    const days = Array.isArray(entry.dayOfWeek) ? entry.dayOfWeek : [entry.dayOfWeek]
    for (const day of days) {
      const key = String(day ?? '').split('/').pop()?.toLowerCase() ?? ''
      const mapped = DAY_MAP[key]
      if (!mapped) continue
      hours.push({
        day: mapped,
        opens: entry.opens ? String(entry.opens).slice(0, 5) : undefined,
        closes: entry.closes ? String(entry.closes).slice(0, 5) : undefined,
        closed: false,
      })
    }
  }
  return hours
}

function reviewsFromJsonLd(node: Record<string, unknown>): BusinessReview[] {
  const raw = node.review
  if (!Array.isArray(raw)) return []

  return (raw as Record<string, unknown>[])
    .map((entry) => {
      const rating = entry.reviewRating as Record<string, unknown> | undefined
      const author = entry.author as Record<string, unknown> | string | undefined
      return {
        author: typeof author === 'string' ? author : String(author?.name ?? ''),
        rating: Number(rating?.ratingValue ?? 5) || 5,
        text: String(entry.reviewBody ?? entry.description ?? '').slice(0, 2000),
        source: 'website',
      }
    })
    .filter((review) => review.text.length > 0)
    .slice(0, 20)
}

/** Font families named in inline styles or Google Fonts links. */
function extractFonts(root: HTMLElement, html: string): string[] {
  const fonts = new Set<string>()

  for (const link of root.querySelectorAll('link[href*="fonts.googleapis.com"]')) {
    const href = link.getAttribute('href') ?? ''
    for (const match of href.matchAll(/family=([^&:]+)/g)) {
      const family = decodeURIComponent(match[1]!).replace(/\+/g, ' ').split(':')[0]
      if (family) fonts.add(family.trim())
    }
  }

  for (const match of html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)) {
    const first = match[1]!.split(',')[0]?.replace(/['"]/g, '').trim()
    if (first && !/^(inherit|initial|unset|var\()/i.test(first) && first.length < 40) fonts.add(first)
  }

  return [...fonts].slice(0, 6)
}

/** Colours declared as hex in inline styles or a theme-color meta tag. */
function extractColors(html: string): string[] {
  const counts = new Map<string, number>()

  for (const match of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const hex = `#${match[1]!.toLowerCase()}`
    // Skip near-white and near-black: they are page chrome, not brand.
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max > 242 && min > 242) continue
    if (max < 24) continue
    if (max - min < 18) continue // grey

    counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex]) => hex)
}

function pushLogo(candidates: LogoCandidate[], candidate: LogoCandidate): void {
  if (!candidate.url || candidate.score <= 0) return
  candidates.push(candidate)
}

function logoUrlFromJsonLd(value: unknown, base: URL): string {
  if (!value) return ''
  if (typeof value === 'string') return absoluteUrl(value, base)
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    if (typeof record.url === 'string') return absoluteUrl(record.url, base)
    if (typeof record.contentUrl === 'string') return absoluteUrl(record.contentUrl, base)
    if (typeof record['@id'] === 'string' && /^https?:/i.test(record['@id'])) {
      return absoluteUrl(record['@id'], base)
    }
  }
  return ''
}

/** Collect every plausible logo / mark reference on the page. */
export function extractLogos(root: HTMLElement, base: URL, ogImage: string): LogoCandidate[] {
  const candidates: LogoCandidate[] = []

  for (const node of collectJsonLd(root)) {
    const logo = logoUrlFromJsonLd(node.logo, base)
    if (logo) {
      pushLogo(candidates, {
        url: logo,
        score: scoreLogoCandidate({ url: logo, source: 'jsonld' }),
        source: 'jsonld',
      })
    }
    const image = logoUrlFromJsonLd(node.image, base)
    // Only treat JSON-LD image as a logo when the type looks like an org/site.
    const type = String(node['@type'] ?? '').toLowerCase()
    if (image && /organization|localbusiness|website|brand|store/.test(type)) {
      pushLogo(candidates, {
        url: image,
        score: scoreLogoCandidate({ url: image, source: 'jsonld', srcHint: 'organization-image' }),
        source: 'jsonld',
      })
    }
  }

  for (const link of root.querySelectorAll('link[rel]')) {
    const rel = (link.getAttribute('rel') ?? '').toLowerCase()
    const href = link.getAttribute('href') ?? ''
    if (!href) continue
    const url = absoluteUrl(href, base)
    if (!url) continue

    if (rel.includes('apple-touch-icon')) {
      pushLogo(candidates, {
        url,
        score: scoreLogoCandidate({
          url,
          source: 'apple-touch-icon',
          rel,
          sizes: link.getAttribute('sizes') ?? '',
        }),
        source: 'apple-touch-icon',
      })
    } else if (/\bicon\b/.test(rel) || rel.includes('shortcut')) {
      pushLogo(candidates, {
        url,
        score: scoreLogoCandidate({
          url,
          source: 'favicon',
          rel,
          sizes: link.getAttribute('sizes') ?? '',
        }),
        source: 'favicon',
      })
    }
  }

  const tile = root.querySelector('meta[name="msapplication-TileImage"]')?.getAttribute('content')
  if (tile) {
    const url = absoluteUrl(tile, base)
    pushLogo(candidates, {
      url,
      score: scoreLogoCandidate({ url, source: 'favicon', rel: 'msapplication-TileImage' }),
      source: 'favicon',
    })
  }

  if (ogImage) {
    const url = absoluteUrl(ogImage, base)
    pushLogo(candidates, {
      url,
      score: scoreLogoCandidate({ url, source: 'og', srcHint: 'og:image' }),
      source: 'og',
    })
  }

  for (const img of root.querySelectorAll('img[src], img[data-src], img[srcset]')) {
    const raw =
      img.getAttribute('src')
      || img.getAttribute('data-src')
      || (img.getAttribute('srcset') ?? '').split(',')[0]?.trim().split(/\s+/)[0]
      || ''
    if (!raw) continue
    const url = absoluteUrl(raw, base)
    if (!url) continue

    const alt = img.getAttribute('alt') ?? ''
    const className = img.getAttribute('class') ?? ''
    const id = img.getAttribute('id') ?? ''
    const aria = img.getAttribute('aria-label') ?? ''
    const itemprop = (img.getAttribute('itemprop') ?? '').toLowerCase()
    const inChrome = Boolean(img.closest('header, nav, [role="banner"], .navbar, .site-header, .header'))

    if (itemprop === 'logo') {
      pushLogo(candidates, {
        url,
        score: scoreLogoCandidate({ url, source: 'itemprop', alt, className, id, inChrome: true }),
        source: 'itemprop',
      })
      continue
    }

    const hints = `${alt} ${className} ${id} ${aria} ${raw}`.toLowerCase()
    const looksLikeLogo = /\blogo\b|wordmark|brand-mark|navbar-brand|site-logo|header-logo/.test(hints)

    if (looksLikeLogo) {
      pushLogo(candidates, {
        url,
        score: scoreLogoCandidate({
          url,
          source: 'img-logo',
          alt: `${alt} ${aria}`,
          className,
          id,
          srcHint: raw,
          inChrome,
        }),
        source: 'img-logo',
      })
      continue
    }

    if (inChrome) {
      pushLogo(candidates, {
        url,
        score: scoreLogoCandidate({
          url,
          source: 'header',
          alt: `${alt} ${aria}`,
          className,
          id,
          srcHint: raw,
          inChrome: true,
        }),
        source: 'header',
      })
    }
  }

  for (const wrap of root.querySelectorAll('a, [class*="logo"], [id*="logo"]')) {
    const classId = `${wrap.getAttribute('class') ?? ''} ${wrap.getAttribute('id') ?? ''}`.toLowerCase()
    if (!/\blogo\b/.test(classId) && wrap.rawTagName !== 'a') continue
    if (wrap.rawTagName === 'a' && !/\blogo\b/.test(classId)) continue
    const img = wrap.rawTagName === 'img' ? wrap : wrap.querySelector('img[src]')
    if (!img) continue
    const raw = img.getAttribute('src') ?? ''
    const url = absoluteUrl(raw, base)
    pushLogo(candidates, {
      url,
      score: scoreLogoCandidate({
        url,
        source: 'img-logo',
        className: `${wrap.getAttribute('class') ?? ''} ${img.getAttribute('class') ?? ''}`,
        id: wrap.getAttribute('id') ?? '',
        alt: img.getAttribute('alt') ?? '',
        inChrome: true,
      }),
      source: 'img-logo',
    })
  }

  return candidates
}

export function extractPage(url: string, html: string): ExtractedPage {
  const root = parse(html, { blockTextElements: { script: true, style: true } })
  const base = new URL(url)

  const meta = (name: string): string =>
    root.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ??
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    ''

  const headings = root
    .querySelectorAll('h1, h2, h3')
    .map((node) => ({ level: Number(node.rawTagName.slice(1)), text: text(node) }))
    .filter((heading) => heading.text.length > 1 && heading.text.length < 200)

  const paragraphs = root
    .querySelectorAll('p, li')
    .map((node) => text(node))
    .filter((value) => value.length > 40 && value.length < 1200)

  const links: { href: string; text: string }[] = []
  const socials = new Map<string, { platform: SocialPlatform; url: string }>()
  const phones = new Set<string>()
  const emails = new Set<string>()

  for (const anchor of root.querySelectorAll('a[href]')) {
    const raw = anchor.getAttribute('href') ?? ''
    if (!raw || raw.startsWith('#')) continue

    if (raw.startsWith('tel:')) {
      phones.add(decodeURIComponent(raw.slice(4)).trim())
      continue
    }
    if (raw.startsWith('mailto:')) {
      emails.add(decodeURIComponent(raw.slice(7)).split('?')[0]!.trim().toLowerCase())
      continue
    }

    let absolute: string
    try {
      absolute = new URL(raw, base).toString()
    } catch {
      continue
    }

    const match = SOCIAL_PATTERNS.find((entry) => entry.pattern.test(absolute))
    if (match) {
      // Keep the shortest URL per platform — usually the profile, not a post.
      const existing = socials.get(match.platform)
      if (!existing || absolute.length < existing.url.length) {
        socials.set(match.platform, { platform: match.platform, url: absolute })
      }
      continue
    }

    links.push({ href: absolute, text: text(anchor).slice(0, 120) })
  }

  // Addresses and phone numbers also appear as plain text.
  const bodyText = text(root.querySelector('body'))
  for (const match of bodyText.matchAll(/(?:\+31|0)\s?[1-9](?:[\s-]?\d){8}/g)) {
    phones.add(match[0].trim())
  }
  for (const match of bodyText.matchAll(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g)) {
    emails.add(match[0].toLowerCase())
  }

  const jsonLd = collectJsonLd(root)
  const locations: BusinessLocation[] = []
  const reviews: BusinessReview[] = []
  const openingHours: OpeningHours[] = []

  for (const node of jsonLd) {
    const location = locationFromJsonLd(node)
    if (location && (location.street || location.city)) locations.push(location)
    openingHours.push(...hoursFromJsonLd(node))
    reviews.push(...reviewsFromJsonLd(node))
  }

  const ogImage = meta('og:image')

  const images = root
    .querySelectorAll('img[src]')
    .map((node) => node.getAttribute('src') ?? '')
    .filter(Boolean)
    .map((src) => {
      try {
        return new URL(src, base).toString()
      } catch {
        return ''
      }
    })
    .filter((src) => src && !/\.svg($|\?)/i.test(src))
    .slice(0, 30)

  return {
    url,
    title: text(root.querySelector('title')) || meta('og:title'),
    description: meta('description') || meta('og:description'),
    headings,
    paragraphs,
    links,
    images,
    logos: extractLogos(root, base, ogImage),
    phones: [...phones],
    emails: [...emails],
    socials: [...socials.values()],
    themeColor: meta('theme-color'),
    ogImage,
    jsonLd,
    locations,
    reviews,
    openingHours,
    fonts: extractFonts(root, html),
  }
}

export { extractColors }
