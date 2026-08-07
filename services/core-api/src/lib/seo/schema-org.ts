import type {
  JsonLdGraph,
  Section,
  SectionSchemaType,
  SeoBusiness,
  SeoProduct,
  SuppressedNode,
} from '@platform/schemas'
import { effectiveTitle, faqItems, type SeoPageInput } from './document.js'

/**
 * Page-level structured data (§15).
 *
 * Two block renderers already emit their own JSON-LD: `faq-accordion-01`
 * emits `FAQPage` and `contact-details-01` emits `LocalBusiness` whenever it
 * has a real address. Emitting the same node again from the page graph is not
 * "more SEO" — duplicate nodes are a defect search engines report back to the
 * owner. So those cases are skipped here and reported as `suppressed`, which
 * is the honest answer to "why is my FAQ not in this graph".
 */

const DAY_NAMES: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

/**
 * What each block renders on its own, and when.
 *
 * This is the list that keeps the page graph from duplicating a renderer: both
 * FAQ blocks emit `FAQPage` once they have questions, and the contact block
 * emits `LocalBusiness` once it has a real address.
 */
function selfEmittedType(section: Section): SectionSchemaType | null {
  if (section.block === 'contact-details-01') {
    const props = section.props as { street?: unknown; city?: unknown }
    return props.street && props.city ? 'LocalBusiness' : null
  }

  if (section.block === 'faq-accordion-01' || section.block === 'faq-reveal-accordion-01') {
    return faqItems(section).length > 0 ? 'FAQPage' : null
  }

  return null
}

export interface StructuredDataInput {
  site: { name: string; locale: string }
  /** Absolute origin, no trailing slash — `https://acme.nl`. */
  origin: string
  page: SeoPageInput
  /** Every page of the site, so breadcrumbs can use real page titles. */
  pages: SeoPageInput[]
  business: SeoBusiness
  /** Supplied by commerce (Phase 5). Nothing is invented when it is empty. */
  products?: SeoProduct[]
}

function absolute(origin: string, path: string): string {
  return `${origin}${path === '/' ? '/' : path}`
}

function humanize(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (character) => character.toUpperCase())
}

/** `mon 08:00–18:00` → `Mo 08:00-18:00` in schema.org's own vocabulary. */
function openingHoursSpecification(business: SeoBusiness): Record<string, unknown>[] {
  return business.openingHours
    .filter((entry) => !entry.closed && entry.opens && entry.closes)
    .map((entry) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_NAMES[entry.day] ?? entry.day,
      opens: entry.opens,
      closes: entry.closes,
    }))
}

function businessNode(business: SeoBusiness, origin: string): Record<string, unknown> {
  const address = business.address
  const hasAddress = Boolean(address.street || address.city)
  const hours = openingHoursSpecification(business)

  return {
    '@type': business.type,
    '@id': `${origin}/#business`,
    name: business.name,
    ...(business.legalName ? { legalName: business.legalName } : {}),
    ...(business.description ? { description: business.description } : {}),
    url: origin,
    ...(business.logo ? { logo: business.logo } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.priceRange ? { priceRange: business.priceRange } : {}),
    ...(hasAddress
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: address.street,
            postalCode: address.postalCode,
            addressLocality: address.city,
            ...(address.region ? { addressRegion: address.region } : {}),
            ...(address.country ? { addressCountry: address.country } : {}),
          },
        }
      : {}),
    ...(business.latitude !== undefined && business.longitude !== undefined
      ? { geo: { '@type': 'GeoCoordinates', latitude: business.latitude, longitude: business.longitude } }
      : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(business.sameAs.length ? { sameAs: business.sameAs } : {}),
  }
}

function breadcrumbNode(input: StructuredDataInput): Record<string, unknown> | null {
  if (input.page.path === '/') return null

  const segments = input.page.path.split('/').filter(Boolean)
  const items = [{ name: 'Home', url: absolute(input.origin, '/') }]

  let walked = ''
  for (const segment of segments) {
    walked += `/${segment}`
    const match = input.pages.find((candidate) => candidate.path === walked)
    items.push({
      name: match ? effectiveTitle(match) : humanize(segment),
      url: absolute(input.origin, walked),
    })
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': `${absolute(input.origin, input.page.path)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

function productNode(product: SeoProduct, origin: string): Record<string, unknown> {
  return {
    '@type': 'Product',
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.image ? { image: product.image } : {}),
    ...(product.price !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: product.priceCurrency,
            availability: `https://schema.org/${product.availability}`,
            url: product.url || origin,
          },
        }
      : {}),
  }
}

/**
 * Build the graph for one page. Returns what was left out and why, so the
 * dashboard can explain the gap instead of looking incomplete.
 */
export function buildPageGraph(input: StructuredDataInput): {
  graph: JsonLdGraph
  suppressed: SuppressedNode[]
} {
  const url = absolute(input.origin, input.page.path)
  const suppressed: SuppressedNode[] = []
  const graph: Record<string, unknown>[] = []

  const websiteId = `${input.origin}/#website`
  graph.push({
    '@type': 'WebSite',
    '@id': websiteId,
    name: input.site.name,
    url: input.origin,
    inLanguage: input.site.locale,
  })

  graph.push({
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: effectiveTitle(input.page),
    ...(input.page.seo.description ? { description: input.page.seo.description } : {}),
    inLanguage: input.site.locale,
    isPartOf: { '@id': websiteId },
    ...(input.page.publishedAt ? { datePublished: input.page.publishedAt } : {}),
    dateModified: input.page.updatedAt,
  })

  // What the renderers on this page will emit by themselves.
  const selfEmitted = new Map<SectionSchemaType, string>()
  for (const section of input.page.sections) {
    const type = selfEmittedType(section)
    if (type && !selfEmitted.has(type)) selfEmitted.set(type, section.block)
  }

  /** Where a section that claims a type says its node lives on the page. */
  function anchorFor(type: SectionSchemaType): string | null {
    const declaring = input.page.sections.find((section) => section.seo?.schemaType === type)
    const anchorId = declaring?.seo?.anchorId
    return anchorId ? `${url}#${anchorId}` : null
  }

  // LocalBusiness — unless the contact block on this page already renders one.
  const businessEmittedBy = selfEmitted.get('LocalBusiness')

  if (input.business.name) {
    if (businessEmittedBy) {
      suppressed.push({
        type: input.business.type,
        emittedBy: businessEmittedBy,
        reason: 'The contact block on this page already renders LocalBusiness data for this address.',
      })
    } else {
      const anchor = anchorFor('LocalBusiness')
      graph.push({
        ...businessNode(input.business, input.origin),
        // A section claimed this node, so point at where it lives on the page.
        ...(anchor ? { mainEntityOfPage: anchor } : {}),
      })
    }
  }

  const breadcrumb = breadcrumbNode(input)
  if (breadcrumb) {
    const anchor = anchorFor('BreadcrumbList')
    graph.push(anchor ? { ...breadcrumb, '@id': anchor } : breadcrumb)
  }

  // FAQPage. The FAQ blocks render their own, so the page graph only builds one
  // for a section that claims the role and carries questions itself.
  const faqEmittedBy = selfEmitted.get('FAQPage')
  if (faqEmittedBy) {
    suppressed.push({
      type: 'FAQPage',
      emittedBy: faqEmittedBy,
      reason: 'The FAQ block on this page already renders FAQPage data for its questions.',
    })
  } else {
    const faqSection = input.page.sections.find(
      (section) => section.seo?.schemaType === 'FAQPage' && faqItems(section).length > 0,
    )
    if (faqSection) {
      const anchorId = faqSection.seo?.anchorId
      graph.push({
        '@type': 'FAQPage',
        '@id': anchorId ? `${url}#${anchorId}` : `${url}#faq`,
        mainEntity: faqItems(faqSection).map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      })
    }
  }

  const productAnchor = anchorFor('Product')
  for (const product of input.products ?? []) {
    const node = productNode(product, input.origin)
    graph.push(productAnchor ? { ...node, mainEntityOfPage: productAnchor } : node)
  }

  return {
    graph: { '@context': 'https://schema.org', '@graph': graph },
    suppressed,
  }
}
