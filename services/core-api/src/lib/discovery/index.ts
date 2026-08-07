import {
  businessProfileSchema,
  type BusinessProfile,
  type BusinessService,
  type DiscoveryInput,
  type DiscoveryResult,
  type SocialProfile,
} from '@platform/schemas'
import { BlockedUrlError, fetchDocument, normalizeUrl } from './fetch.js'
import { isAllowed, loadRobots } from './robots.js'
import { extractColors, extractPage, type ExtractedPage } from './extract.js'

/**
 * Business discovery (§8 and §47).
 *
 * Crawls the company's own website, follows the pages most likely to carry
 * business facts, reads structured data where it exists, and collects social
 * profile links. Everything is normalized into one `BusinessProfile`.
 *
 * What this deliberately does not do: log into anything, bypass a block, or
 * scrape a platform that forbids it. Where a source refuses automated access
 * the profile records the refusal instead of hiding it.
 */

/** Pages worth reading, in priority order. */
const PRIORITY_PATHS = [
  /^\/?$/,
  /(diensten|services|wat-we-doen|what-we-do|behandelingen|aanbod)/i,
  /(over-ons|about|over|team|wie-zijn-wij)/i,
  /(contact|afspraak|appointment|offerte|quote)/i,
  /(reviews|beoordelingen|testimonials|ervaringen)/i,
  /(openingstijden|opening-hours|hours)/i,
]

function priorityOf(path: string): number {
  const index = PRIORITY_PATHS.findIndex((pattern) => pattern.test(path))
  return index === -1 ? PRIORITY_PATHS.length : index
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (character) => character.toUpperCase())
}

/**
 * Company name from the strongest available signal: structured data, then the
 * OG title, then the document title with the usual " | tagline" suffix removed.
 */
function deriveCompanyName(pages: ExtractedPage[], fallback: string): string {
  for (const page of pages) {
    for (const node of page.jsonLd) {
      const type = String(node['@type'] ?? '')
      if (/Organization|LocalBusiness|Store|ProfessionalService/i.test(type) && node.name) {
        return String(node.name).slice(0, 200)
      }
    }
  }

  // Titles are almost always "Brand | tagline" or "Brand. Tagline" or
  // "Brand - tagline". Keep the brand, drop the pitch.
  const title = pages[0]?.title ?? ''
  if (title) {
    const separated = title.split(/\s[|–—·]\s|\s-\s/)[0]!.trim()
    const sentence = separated.match(/^(.{2,40}?)\.\s+[A-Z]/)?.[1]?.trim()
    const cleaned = sentence ?? separated

    if (cleaned.length > 1 && cleaned.length < 80) return cleaned
  }

  return fallback
}

/**
 * Services from headings on service-ish pages. Headings are how businesses
 * actually structure this, and they read far better than sentences mined out
 * of prose.
 */
function deriveServices(pages: ExtractedPage[]): BusinessService[] {
  const candidates = new Map<string, BusinessService>()

  const servicePages = pages.filter((page) => /(diensten|services|behandelingen|aanbod)/i.test(page.url))
  const searchIn = servicePages.length ? servicePages : pages

  for (const page of searchIn) {
    const onServicePage = servicePages.includes(page)

    for (const heading of page.headings) {
      if (heading.level === 1) continue
      const name = heading.text.replace(/\s*[.:]$/, '').trim()

      if (name.length < 3 || name.length > 70) continue
      if (/(cookie|privacy|contact|nieuws|blog|volg ons|follow us|menu|navigat)/i.test(name)) continue
      if (candidates.has(name.toLowerCase())) continue

      // The paragraph following a heading is usually its description.
      const description =
        page.paragraphs.find((paragraph) => paragraph.length > 60 && paragraph.length < 400) ?? ''

      candidates.set(name.toLowerCase(), {
        name,
        description: description.slice(0, 300),
        prominence: onServicePage ? 0.9 : 0.5,
      })
    }
  }

  return [...candidates.values()].sort((a, b) => b.prominence - a.prominence).slice(0, 12)
}

function deriveIndustry(pages: ExtractedPage[]): string {
  const haystack = pages
    .flatMap((page) => [page.title, page.description, ...page.headings.map((heading) => heading.text)])
    .join(' ')
    .toLowerCase()

  /**
   * Short tokens are anchored with word boundaries. Without them `car` matches
   * "carousel" and "scarcity", and a SaaS company gets classified as a garage —
   * which then picks the wrong palette, the wrong blocks and the wrong copy.
   *
   * Scored rather than first-match: the strongest signal wins, not the earliest
   * entry in the list.
   */
  const INDUSTRIES: [string, RegExp][] = [
    ['saas', /(\bsaas\b|\bsoftware\b|\bplatform\b|\bapi\b|\bdashboard\b|\bintegrations?\b|\bsubscription\b)/],
    ['ecommerce', /(webshop|\bwebstore\b|winkel|bestel|\bcheckout\b|\bstorefront\b|\bproducts?\b)/],
    ['contractor', /(loodgiet|plumb|installat|dakdekk|elektricien|electrician|\bbouw\b|aannemer|klusbedrijf|schilder)/],
    ['healthcare', /(tandarts|dentist|huisarts|fysio|physio|kliniek|\bclinic\b|\bzorg\b|praktijk)/],
    ['beauty', /(kapper|\bsalon\b|barber|schoonheid|\bbeauty\b|nagelstudio|\bspa\b)/],
    ['restaurant', /(restaurant|\bcaf[eé]\b|bistro|catering|bakkerij|pizzeria|\bmenu kaart\b)/],
    ['automotive', /(\bgarage\b|autobedrijf|\bbanden\b|\bapk\b|\bautomotive\b|\bcars?\b|autoschade)/],
    ['legal', /(advocaat|jurist|notaris|\blawyer\b|\blegal\b|rechtsbijstand)/],
    ['accounting', /(accountant|boekhoud|administratiekantoor|belastingaangifte|\bbookkeeping\b)/],
    ['real_estate', /(makelaar|vastgoed|\breal estate\b|woningaanbod)/],
    ['agency', /(\bagency\b|reclamebureau|\bbureau\b|design studio|webdesign|\bbranding\b)/],
    ['consultant', /(\bconsultan|\badvies\b|adviseur|\bcoaching\b|\btraining\b)/],
  ]

  const scores = INDUSTRIES.map(([industry, pattern]) => {
    const matches = haystack.match(new RegExp(pattern.source, 'g'))
    return { industry, score: matches?.length ?? 0 }
  }).sort((a, b) => b.score - a.score)

  return scores[0] && scores[0].score > 0 ? scores[0].industry : 'local'
}

function deriveTone(industry: string): BusinessProfile['brand']['tone'] {
  if (industry === 'healthcare' || industry === 'legal' || industry === 'accounting') return 'reassuring'
  if (industry === 'agency' || industry === 'saas') return 'professional'
  if (industry === 'beauty' || industry === 'restaurant') return 'friendly'
  if (industry === 'contractor' || industry === 'automotive') return 'reassuring'
  return 'professional'
}

/**
 * Public metadata from a social profile — nothing more. Most platforms block
 * automated access; when they do, that is recorded and the crawl moves on.
 */
async function fetchSocialProfile(url: string, platform: SocialProfile['platform']): Promise<SocialProfile> {
  const base: SocialProfile = { platform, url, fetched: false }

  try {
    const target = normalizeUrl(url)
    const handle = target.pathname.split('/').filter(Boolean)[0]
    if (handle) base.handle = handle.slice(0, 200)

    const robots = await loadRobots(target.origin)
    if (!isAllowed(robots, target.pathname)) {
      return { ...base, blockedReason: 'Disallowed by the platform’s robots.txt' }
    }

    const document = await fetchDocument(target)
    if (!document || document.status >= 400 || !document.body) {
      return { ...base, blockedReason: 'The platform did not serve the page to an automated request' }
    }

    const page = extractPage(document.url, document.body)
    return {
      ...base,
      fetched: true,
      title: page.title.slice(0, 300) || undefined,
      description: page.description.slice(0, 2000) || undefined,
      image: page.ogImage || undefined,
    }
  } catch (error) {
    return { ...base, blockedReason: error instanceof BlockedUrlError ? error.message : 'Could not be read' }
  }
}

export async function discoverBusiness(input: DiscoveryInput): Promise<DiscoveryResult> {
  const startedAt = Date.now()
  const warnings: string[] = []
  const pages: ExtractedPage[] = []
  const rawHtml: string[] = []

  if (input.googleLocationId) {
    // The connector lands with the Google integration; until then the request
    // is honoured through the other sources rather than failing.
    warnings.push(
      'Google Business Profile is not connected yet, so its data was not used. Connect it under Growth → Google Business.',
    )
  }

  if (input.website) {
    const origin = normalizeUrl(input.website)
    const robots = await loadRobots(origin.origin)

    const queue: string[] = [origin.toString()]
    const seen = new Set<string>()

    while (queue.length && pages.length < input.maxPages) {
      const next = queue.shift()!
      if (seen.has(next)) continue
      seen.add(next)

      const target = new URL(next)
      if (!isAllowed(robots, target.pathname)) {
        warnings.push(`Skipped ${target.pathname} — disallowed by robots.txt.`)
        continue
      }

      const document = await fetchDocument(target)
      if (!document?.body) continue

      const page = extractPage(document.url, document.body)
      pages.push(page)
      rawHtml.push(document.body)

      // Queue same-origin links, most valuable first.
      const candidates = page.links
        .filter((link) => {
          try {
            const url = new URL(link.href)
            return url.origin === origin.origin && !seen.has(url.toString()) && !/\.(pdf|jpg|png|zip)$/i.test(url.pathname)
          } catch {
            return false
          }
        })
        .map((link) => new URL(link.href))
        .sort((a, b) => priorityOf(a.pathname) - priorityOf(b.pathname))

      for (const candidate of candidates.slice(0, 12)) {
        candidate.hash = ''
        candidate.search = ''
        if (!seen.has(candidate.toString())) queue.push(candidate.toString())
      }

      if (robots.crawlDelayMs) await new Promise((resolve) => setTimeout(resolve, robots.crawlDelayMs))
    }

    if (!pages.length) warnings.push('The website could not be read. It may be offline or blocking automated access.')
  }

  // --- merge -----------------------------------------------------------------

  const allSocialUrls = unique([
    ...pages.flatMap((page) => page.socials.map((social) => social.url)),
    ...input.socialUrls,
  ]).slice(0, 12)

  const socialPlatformFor = (url: string): SocialProfile['platform'] => {
    const found = pages.flatMap((page) => page.socials).find((social) => social.url === url)
    return found?.platform ?? 'other'
  }

  const socials = await Promise.all(
    allSocialUrls.map((url) => fetchSocialProfile(url, socialPlatformFor(url))),
  )

  for (const social of socials) {
    if (!social.fetched && social.blockedReason) {
      warnings.push(`${social.platform}: ${social.blockedReason}.`)
    }
  }

  const industry = pages.length ? deriveIndustry(pages) : (input.industry ?? 'local')
  const companyName = deriveCompanyName(pages, input.businessName ?? '')

  const locations = pages.flatMap((page) => page.locations)
  if (input.city && !locations.length) {
    locations.push({
      label: '', street: '', postalCode: '', city: input.city,
      region: '', country: '', hours: [],
    })
  }

  const colors = unique([
    ...pages.map((page) => page.themeColor).filter(Boolean),
    ...extractColors(rawHtml.join('\n')),
  ]).slice(0, 8)

  const description =
    pages.find((page) => page.description.length > 60)?.description ??
    pages.flatMap((page) => page.paragraphs).find((paragraph) => paragraph.length > 80) ??
    ''

  const profile = businessProfileSchema.parse({
    company: {
      name: companyName || input.businessName || 'Your business',
      legalName: '',
      description: description.slice(0, 2000),
      shortDescription: description.slice(0, 300),
      industry,
      categories: unique(pages.flatMap((page) => page.headings.filter((h) => h.level === 2).map((h) => h.text))).slice(0, 8),
    },
    locations: locations.slice(0, 10),
    contact: {
      phone: unique(pages.flatMap((page) => page.phones))[0] ?? '',
      email: unique(pages.flatMap((page) => page.emails))[0] ?? '',
      website: input.website ? normalizeUrl(input.website).origin : '',
      whatsapp: socials.find((social) => social.platform === 'whatsapp')?.url ?? '',
    },
    services: deriveServices(pages),
    brand: {
      logo: pages[0]?.ogImage ?? '',
      colors,
      primaryColor: colors[0] ?? '',
      fonts: unique(pages.flatMap((page) => page.fonts)).slice(0, 4),
      tone: deriveTone(industry),
      adjectives: [],
      audience: input.city ? `Customers in and around ${titleCase(input.city)}` : '',
      positioning: '',
      prohibitedWords: [],
    },
    reviews: pages.flatMap((page) => page.reviews).slice(0, 12),
    socials,
    media: unique(pages.flatMap((page) => page.images)).slice(0, 24),
    locale: input.locale,
    sources: [
      ...(input.website ? [{ source: 'website' as const, reference: input.website, confidence: 0.9 }] : []),
      ...(socials.some((social) => social.fetched) ? [{ source: 'social' as const, confidence: 0.5 }] : []),
      ...(input.businessName ? [{ source: 'manual' as const, confidence: 1 }] : []),
    ],
    crawledUrls: pages.map((page) => page.url),
    warnings: unique(warnings).slice(0, 20),
  })

  return {
    profile,
    durationMs: Date.now() - startedAt,
    pagesCrawled: pages.length,
  }
}
