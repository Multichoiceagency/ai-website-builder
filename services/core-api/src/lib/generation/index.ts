import { createSection, searchBlocks } from '@platform/blocks'
import {
  qualityReportSchema,
  sitePlanSchema,
  themeSchema,
  type BusinessProfile,
  type GenerationRequest,
  type PlannedPage,
  type QualityReport,
  type Section,
  type SitePlan,
  type Theme,
} from '@platform/schemas'
import { AiGateway, type CopySlots } from '../ai/gateway.js'
import { AnthropicCopyProvider } from '../ai/providers/anthropic.js'
import { DeterministicCopyProvider } from '../ai/providers/deterministic.js'
import { GeminiCopyProvider } from '../ai/providers/gemini.js'
import type { MediaResolution } from './media-resolver.js'
import { preferredBlock, type TemplateSteering } from './templates.js'

/**
 * The generation pipeline (§8).
 *
 *   business profile → brand → plan → block selection → content → QA
 *
 * Block *selection* is budget-aware and comes from the registry, so generated
 * sites cannot exceed their performance class. Content comes from the AI
 * Gateway. Neither step ever emits component source (ADR-0003).
 */

// Preference order. Google Gemini is the default language model for discovery
// → copy (scraped business sites) and section AI. Each provider is skipped when
// it has no key, so the list degrades on its own: Anthropic is the paid fallback
// when GEMINI_API_KEY is missing. The deterministic composer always closes the
// list — it is the guaranteed floor, so the pipeline can never be left with nothing.
export const aiGateway = new AiGateway([
  new GeminiCopyProvider(),
  new AnthropicCopyProvider(),
  new DeterministicCopyProvider(),
])

// region Brand → theme

const INDUSTRY_PALETTES: Record<string, { primary: string; accent: string }> = {
  contractor: { primary: '#0b5d8f', accent: '#c2410c' },
  healthcare: { primary: '#0f766e', accent: '#0369a1' },
  beauty: { primary: '#9d174d', accent: '#a16207' },
  restaurant: { primary: '#7c2d12', accent: '#b45309' },
  automotive: { primary: '#1e293b', accent: '#b91c1c' },
  legal: { primary: '#1e3a5f', accent: '#92400e' },
  accounting: { primary: '#134e4a', accent: '#1d4ed8' },
  real_estate: { primary: '#164e63', accent: '#b45309' },
  agency: { primary: '#4c1d95', accent: '#db2777' },
  saas: { primary: '#1d4ed8', accent: '#0d9488' },
  ecommerce: { primary: '#111827', accent: '#0D9488' },
  consultant: { primary: '#1e3a8a', accent: '#0f766e' },
  local: { primary: '#1d4ed8', accent: '#0f766e' },
}

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '')
  if (value.length !== 6) return 1

  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

/**
 * A discovered brand colour is only adopted if white text on it clears WCAG AA
 * for large text. A generated site must not ship an unreadable button because
 * the customer's old website had a pale yellow logo.
 */
function pickPrimary(profile: BusinessProfile, templatePrimary?: string): string {
  const industry = INDUSTRY_PALETTES[profile.company.industry] ?? INDUSTRY_PALETTES.local!

  for (const candidate of [profile.brand.primaryColor, ...profile.brand.colors, templatePrimary]) {
    if (!candidate || !/^#[0-9a-f]{6}$/i.test(candidate)) continue
    const contrast = 1.05 / (relativeLuminance(candidate) + 0.05)
    if (contrast >= 3) return candidate.toLowerCase()
  }

  return industry.primary
}

/**
 * Which performance class a style direction earns.
 *
 * Premium, bold and editorial are the directions where motion carries meaning,
 * so they unlock the Experience UI tier. Everything else stays at B — a local
 * business site should not ship a shader because nobody chose otherwise.
 */
export function ceilingForStyle(style: GenerationRequest['style']): 'A' | 'B' | 'C' | 'D' {
  if (style === 'premium' || style === 'bold' || style === 'editorial') return 'C'
  if (style === 'minimal') return 'A'
  return 'B'
}

/**
 * Build site theme tokens from the brand, optionally steered by MotionSites
 * template hints (fonts / primary / accent parsed from `sourcePrompt`).
 *
 * Brand colours and fonts still win when present. Template hints fill gaps and
 * supply accent when the industry palette would otherwise be the only signal.
 * Never stores markup — theme props only (ADR-0003).
 */
export function themeFromBrand(
  profile: BusinessProfile,
  style: GenerationRequest['style'],
  steering: TemplateSteering | null = null,
): Theme {
  const industry = INDUSTRY_PALETTES[profile.company.industry] ?? INDUSTRY_PALETTES.local!
  const hints = steering?.designHints
  const primary = pickPrimary(profile, hints?.primaryHint)
  const isEcommerce = profile.company.industry === 'ecommerce'

  const radius =
    style === 'bold' || isEcommerce
      ? 'none'
      : style === 'premium' || style === 'editorial'
        ? 'sm'
        : style === 'minimal'
          ? 'md'
          : 'lg'

  const heading = profile.brand.fonts[0] ?? hints?.fontHeading ?? (isEcommerce ? 'Rubik' : 'Inter')
  const body = profile.brand.fonts[1] ?? hints?.fontBody ?? (isEcommerce ? 'Nunito Sans' : heading)
  const accent =
    hints?.accentHint && /^#[0-9a-f]{6}$/i.test(hints.accentHint) ? hints.accentHint.toLowerCase() : industry.accent

  return themeSchema.parse({
    colorPrimary: primary,
    colorAccent: accent,
    colorSurface: isEcommerce ? '#FFFFFF' : '#ffffff',
    colorSurfaceAlt: isEcommerce ? '#F8FAFC' : style === 'premium' ? '#f8f7f5' : '#f1f5f9',
    colorText: style === 'bold' || isEcommerce ? '#0F172A' : '#18181b',
    colorTextMuted: '#52525b',
    fontHeading: heading,
    fontBody: body,
    radius,
    maxPerformanceClass: ceilingForStyle(style),
    ...(isEcommerce ? { contentWidth: '1440' as const } : {}),
  })
}

// endregion

// region Planning

function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'pagina'
  )
}

/**
 * Choose a block for a role, respecting the performance ceiling.
 *
 * Selection goes through `searchBlocks`, the same registry query the editor's
 * block picker uses, so AI can never place a block a human could not.
 */
function selectBlock(
  category: string,
  ceiling: 'A' | 'B' | 'C' | 'D',
  industry: string,
  prefer?: string,
): string | null {
  // Everything the budget allows, before any softer preference is applied.
  const allowed = searchBlocks({ category: category as never, maxPerformanceClass: ceiling })
  if (!allowed.length) return null

  const candidates = searchBlocks({
    category: category as never,
    maxPerformanceClass: ceiling,
    industry,
  })
  const pool = candidates.length ? candidates : allowed

  if (prefer) {
    // The ceiling is absolute; the industry hint is not. A block the caller
    // asked for by name is honoured whenever the budget allows it, and simply
    // ignored when it does not — which is how a too-heavy template degrades.
    const preferred = allowed.find((block) => block.id === prefer)
    if (preferred) return preferred.id
  }

  // Highest combined quality wins, so "cheapest" never beats "good enough".
  return [...pool].sort(
    (a, b) => b.scores.performance + b.scores.accessibility - (a.scores.performance + a.scores.accessibility),
  )[0]!.id
}

/**
 * Plan the site.
 *
 * `steering` is the optional contribution of a chosen template: a map of
 * category → preferred block id. It is passed to `selectBlock` as a *hint*,
 * which means it is applied only after the performance ceiling has already
 * filtered the pool. A template asking for a class-D hero on a class-B site
 * therefore degrades to the best block class B allows — the ceiling is never
 * weakened, and `ceilingForStyle` remains the only thing that sets it.
 */
export function planSite(
  profile: BusinessProfile,
  request: GenerationRequest,
  steering: TemplateSteering | null = null,
): SitePlan {
  const ceiling = request.maxPerformanceClass
  const industry = profile.company.industry || 'local'
  const locale = profile.locale
  const dutch = locale.startsWith('nl')

  /** The template's preference for a role, or the platform's own default. */
  const prefer = (category: string, fallback?: string) => preferredBlock(steering, category) ?? fallback

  const header = selectBlock('header', ceiling, industry, prefer('header'))
  const footer = selectBlock('footer', ceiling, industry, prefer('footer'))
  const hero = selectBlock(
    'hero',
    ceiling,
    industry,
    prefer('hero', ceiling === 'A' ? 'hero-centered-01' : 'hero-split-01'),
  )
  // Inner pages keep a quieter hero even when the template picked a loud one:
  // one statement screen per site, not one per page.
  const heroSecondary = selectBlock('hero', ceiling, industry, 'hero-centered-01')

  const chrome = (blocks: (string | null)[]) => [header, ...blocks, footer].filter((id): id is string => Boolean(id))

  const hasServices = profile.services.length > 0
  const hasReviews = profile.reviews.length > 0
  const hasAddress = profile.locations.some((location) => location.city)
  const isEcommerce = industry === 'ecommerce'

  const pages: PlannedPage[] = []

  // Home — the only page that carries every proof element.
  pages.push({
    goal: 'home',
    path: '/',
    title: profile.company.name,
    description: profile.company.shortDescription,
    blocks: chrome([
      hero,
      selectBlock('stats', ceiling, industry, prefer('stats')),
      hasServices
        ? selectBlock('services', ceiling, industry, prefer('services'))
        : selectBlock('features', ceiling, industry, prefer('features')),
      selectBlock('features', ceiling, industry, prefer('features')),
      hasReviews ? selectBlock('testimonials', ceiling, industry, prefer('testimonials')) : null,
      selectBlock('cta', ceiling, industry, prefer('cta')),
    ]),
  })

  if (isEcommerce) {
    const announce = selectBlock('header', ceiling, industry, 'header-shop-announce-01')
    pages.push({
      goal: 'product',
      path: '/product',
      title: dutch ? 'Product' : 'Product',
      description: '',
      blocks: [announce, header, selectBlock('product', ceiling, industry, prefer('product', 'product-detail-01')), footer].filter(
        (id): id is string => Boolean(id),
      ),
    })
  }

  if (hasServices) {
    pages.push({
      goal: 'services',
      path: dutch ? '/diensten' : '/services',
      title: dutch ? 'Diensten' : 'Services',
      description: '',
      blocks: chrome([
        heroSecondary,
        selectBlock('services', ceiling, industry, prefer('services')),
        selectBlock('faq', ceiling, industry, prefer('faq')),
        selectBlock('cta', ceiling, industry, prefer('cta')),
      ]),
    })

    // A page per prominent service — the honest half of programmatic SEO (§15).
    // Only services with a real description qualify, so nothing thin ships.
    for (const service of profile.services.filter((entry) => entry.description.length > 80).slice(0, 4)) {
      pages.push({
        goal: 'service_detail',
        path: `${dutch ? '/diensten' : '/services'}/${slugify(service.name)}`,
        title: service.name,
        description: service.description.slice(0, 160),
        blocks: chrome([
          heroSecondary,
          selectBlock('content', ceiling, industry, prefer('content')),
          selectBlock('cta', ceiling, industry, prefer('cta')),
        ]),
      })
    }
  }

  pages.push({
    goal: 'about',
    path: dutch ? '/over-ons' : '/about',
    title: dutch ? 'Over ons' : 'About us',
    description: '',
    blocks: chrome([
      heroSecondary,
      selectBlock('content', ceiling, industry, prefer('content')),
      hasReviews ? selectBlock('testimonials', ceiling, industry, prefer('testimonials')) : null,
      selectBlock('cta', ceiling, industry, prefer('cta')),
    ]),
  })

  pages.push({
    goal: 'contact',
    path: '/contact',
    title: 'Contact',
    description: '',
    blocks: chrome([heroSecondary, hasAddress ? selectBlock('contact', ceiling, industry, prefer('contact')) : null]),
  })

  return sitePlanSchema.parse({
    siteName: request.siteName || profile.company.name,
    locale,
    maxPerformanceClass: ceiling,
    pages,
    navigation: pages
      .filter((page) => page.goal !== 'service_detail')
      .slice(0, 6)
      .map((page) => ({ label: page.goal === 'home' ? (dutch ? 'Home' : 'Home') : page.title, href: page.path })),
  })
}

// endregion

// region Composition

function propsForBlock(
  blockId: string,
  page: PlannedPage,
  profile: BusinessProfile,
  copy: CopySlots,
  navigation: SitePlan['navigation'],
  media: MediaResolution['byRole'] = {},
): Record<string, unknown> {
  const phone = profile.contact.phone
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '/contact'
  const location = profile.locations[0]
  const isHome = page.goal === 'home'

  if (blockId.startsWith('header-')) {
    const logo = profile.brand.logo
    return {
      brand: profile.company.name,
      logo,
      // Written per generated site, not as a registry default, so published
      // pages keep the header they already have.
      ...(logo ? { layout: 'stacked', logoHeight: 'xl' } : {}),
      links: navigation.filter((item) => item.href !== '/').slice(0, 4),
      ctaLabel: phone ? phone : copy.primaryCta,
      ctaHref: telHref,
    }
  }

  if (blockId.startsWith('footer-')) {
    return {
      brand: profile.company.name,
      tagline: copy.seoDescription,
      phone,
      email: profile.contact.email,
      address: location ? [location.street, `${location.postalCode} ${location.city}`.trim()].filter(Boolean).join(', ') : '',
      links: navigation.slice(0, 5),
      legal: `© ${new Date().getFullYear()} ${profile.company.name}`,
    }
  }

  if (blockId.startsWith('hero-split-')) {
    return {
      eyebrow: isHome ? copy.heroEyebrow : '',
      headline: isHome ? copy.heroHeadline : page.title,
      subheadline: isHome ? copy.heroSubheadline : page.description || copy.heroSubheadline,
      primaryLabel: copy.primaryCta,
      primaryHref: phone ? telHref : '/contact',
      secondaryLabel: isHome ? copy.secondaryCta : '',
      secondaryHref: navigation[1]?.href ?? '/contact',
      image: media.hero?.url ?? profile.media[0] ?? '',
      imageAlt: media.hero?.alt || profile.company.name,
    }
  }

  if (blockId.startsWith('hero-centered-')) {
    return {
      eyebrow: isHome ? copy.heroEyebrow : '',
      headline: isHome ? copy.heroHeadline : page.title,
      subheadline: isHome ? copy.heroSubheadline : page.description,
      primaryLabel: copy.primaryCta,
      primaryHref: phone ? telHref : '/contact',
      secondaryLabel: '',
      align: 'center',
    }
  }

  if (blockId.startsWith('stats-')) {
    const items: { value: string; label: string }[] = []
    if (profile.reviews.length) {
      const average = profile.reviews.reduce((sum, review) => sum + review.rating, 0) / profile.reviews.length
      items.push({ value: average.toFixed(1).replace('.', profile.locale.startsWith('nl') ? ',' : '.'), label: profile.locale.startsWith('nl') ? 'Gemiddelde beoordeling' : 'Average rating' })
    }
    if (profile.services.length) {
      items.push({ value: `${profile.services.length}`, label: profile.locale.startsWith('nl') ? 'Diensten' : 'Services' })
    }
    if (location?.city) {
      items.push({ value: location.city, label: profile.locale.startsWith('nl') ? 'Werkgebied' : 'Service area' })
    }
    // Never fabricate numbers: an empty stats band is dropped in composePage.
    return { items }
  }

  if (blockId.startsWith('services-')) {
    return {
      heading: copy.servicesHeading,
      intro: copy.servicesIntro,
      items: profile.services.slice(0, 6).map((service) => ({
        title: service.name,
        description: service.description || '',
        href: '',
        linkLabel: profile.locale.startsWith('nl') ? 'Meer informatie' : 'Read more',
      })),
    }
  }

  if (blockId.startsWith('features-')) {
    return { heading: copy.featuresHeading, intro: '', items: copy.features.slice(0, 3) }
  }

  if (blockId.startsWith('testimonials-')) {
    return {
      heading: profile.locale.startsWith('nl') ? 'Wat klanten zeggen' : 'What customers say',
      items: profile.reviews.slice(0, 6).map((review) => ({
        quote: review.text,
        author: review.author || (profile.locale.startsWith('nl') ? 'Klant' : 'Customer'),
        role: '',
        rating: review.rating,
      })),
    }
  }

  if (blockId.startsWith('faq-')) {
    return { heading: profile.locale.startsWith('nl') ? 'Veelgestelde vragen' : 'Frequently asked questions', items: copy.faq }
  }

  if (blockId.startsWith('cta-')) {
    return { heading: copy.ctaHeading, body: copy.ctaBody, ctaLabel: copy.primaryCta, ctaHref: phone ? telHref : '/contact', tone: 'primary' }
  }

  if (blockId.startsWith('content-')) {
    return { heading: page.goal === 'about' ? copy.aboutHeading : page.title, body: page.goal === 'about' ? copy.aboutBody : page.description || copy.aboutBody }
  }

  if (blockId.startsWith('contact-')) {
    return {
      heading: profile.locale.startsWith('nl') ? 'Contactgegevens' : 'Get in touch',
      intro: '',
      phone,
      email: profile.contact.email,
      street: location?.street ?? '',
      postalCode: location?.postalCode ?? '',
      city: location?.city ?? '',
      hours: (location?.hours ?? [])
        .map((entry) => `${entry.day}: ${entry.closed ? '—' : `${entry.opens ?? ''}–${entry.closes ?? ''}`}`)
        .join('\n'),
      showMap: Boolean(location?.street),
    }
  }

  if (blockId.startsWith('logos-')) return { heading: '', items: [] }

  return {}
}

/** A section with nothing to say is dropped rather than shipped empty. */
function isEmptySection(blockId: string, props: Record<string, unknown>): boolean {
  const items = props.items
  if (Array.isArray(items) && items.length === 0) return true
  if (blockId.startsWith('content-') && !String(props.body ?? '').trim()) return true
  return false
}

export function composePage(
  page: PlannedPage,
  profile: BusinessProfile,
  copy: CopySlots,
  navigation: SitePlan['navigation'],
  media: MediaResolution['byRole'] = {},
): Section[] {
  const sections: Section[] = []

  for (const blockId of page.blocks) {
    const props = propsForBlock(blockId, page, profile, copy, navigation, media)
    if (isEmptySection(blockId, props)) continue

    try {
      sections.push(createSection(blockId, props))
    } catch {
      // A registry mismatch drops one section rather than failing the build.
    }
  }

  return sections
}

// endregion

// region Quality

export function assessQuality(plan: SitePlan, pages: { page: PlannedPage; sections: Section[] }[]): QualityReport {
  const seoIssues: string[] = []
  const contentIssues: string[] = []
  const performanceIssues: string[] = []
  const accessibilityIssues: string[] = []

  for (const { page, sections } of pages) {
    if (!page.description) seoIssues.push(`${page.path} has no meta description.`)
    if (page.title.length > 60) seoIssues.push(`${page.path} has a title longer than 60 characters.`)
    if (sections.length < 3) contentIssues.push(`${page.path} has very little content.`)

    const heroes = sections.filter((section) => section.block.startsWith('hero-'))
    if (heroes.length > 1) accessibilityIssues.push(`${page.path} has more than one hero, so it has multiple H1s.`)

    for (const section of sections) {
      if (section.block.startsWith('hero-split-') && !String(section.props.image ?? '')) {
        contentIssues.push(`${page.path} has no hero image yet.`)
      }
      if (section.block.startsWith('hero-split-') && String(section.props.image ?? '') && !String(section.props.imageAlt ?? '')) {
        accessibilityIssues.push(`${page.path} has a hero image without alt text.`)
      }
    }
  }

  const paths = pages.map((entry) => entry.page.path)
  if (new Set(paths).size !== paths.length) seoIssues.push('Two pages share the same address.')

  const score = (issues: string[], weight = 12) => Math.max(0, 100 - issues.length * weight)

  return qualityReportSchema.parse({
    seo: { score: score(seoIssues), issues: seoIssues.slice(0, 10) },
    accessibility: { score: score(accessibilityIssues), issues: accessibilityIssues.slice(0, 10) },
    performance: {
      score: plan.maxPerformanceClass === 'A' ? 99 : plan.maxPerformanceClass === 'B' ? 95 : 85,
      issues: performanceIssues,
      heaviestClass: plan.maxPerformanceClass,
    },
    content: { score: score(contentIssues, 8), issues: contentIssues.slice(0, 10) },
  })
}

// endregion
