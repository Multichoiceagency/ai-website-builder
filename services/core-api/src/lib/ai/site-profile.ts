import { businessProfileSchema, type BusinessProfile, type Section, type Site } from '@platform/schemas'

/**
 * Derive a Business Profile from a site that already exists.
 *
 * The generation pipeline (§8) is built around a `BusinessProfile` produced by
 * discovery — but discovery results are never persisted: `POST
 * /onboarding/generate` takes a profile as input and stores only the site it
 * produced. So by the time someone is in the editor inserting a template, the
 * facts that wrote the rest of their site are gone.
 *
 * They are not gone from the *site*, though. The service names, the phone
 * number, the reviews and the company's own description are all sitting in the
 * props of the sections already on its pages. This reads them back out.
 *
 * The rule throughout: **only copy that is actually there**. Nothing is
 * inferred, nothing is invented, and a site with one empty page yields a
 * profile that says so rather than one that reads plausibly.
 */

export interface DerivedSiteContext {
  profile: BusinessProfile
  /** What informed the profile, in the words the editor shows the user. */
  basis: string[]
  /**
   * True when the site's own copy contributed. False means only its name and
   * language were available, which the caller must say out loud rather than
   * presenting generic copy as tailored.
   */
  contextual: boolean
}

interface SourcePage {
  path: string
  title: string
  sections: Section[]
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function items(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
}

/** The longest of the candidates, because more words means more signal here. */
function longest(candidates: string[]): string {
  return candidates.reduce((best, candidate) => (candidate.length > best.length ? candidate : best), '')
}

export function deriveSiteProfile(site: Site, pages: SourcePage[]): DerivedSiteContext {
  const services: { name: string; description: string; prominence: number }[] = []
  const reviews: { author: string; rating: number; text: string; source: string }[] = []
  const media: string[] = []
  const descriptions: string[] = []
  const taglines: string[] = []

  let brandName = ''
  let phone = ''
  let email = ''
  let street = ''
  let postalCode = ''
  let city = ''
  let sectionsRead = 0
  let pagesWithCopy = 0

  for (const page of pages) {
    const before = sectionsRead

    for (const section of page.sections) {
      const props = section.props ?? {}
      const block = section.block

      if (block.startsWith('header-')) {
        brandName ||= str(props.brand)
      }

      if (block.startsWith('hero-')) {
        // The hero is where a business says what it does in one line.
        descriptions.push(str(props.subheadline))
        taglines.push(str(props.headline))
        const image = str(props.image)
        if (image) media.push(image)
      }

      if (block.startsWith('content-')) descriptions.push(str(props.body))

      if (block.startsWith('services-')) {
        for (const item of items(props.items)) {
          const name = str(item.title)
          if (name) services.push({ name, description: str(item.description), prominence: 0.6 })
        }
      }

      if (block.startsWith('testimonials-')) {
        for (const item of items(props.items)) {
          const text = str(item.quote)
          if (!text) continue
          const rating = typeof item.rating === 'number' ? item.rating : 5
          reviews.push({ author: str(item.author), rating, text, source: 'website' })
        }
      }

      if (block.startsWith('contact-') || block.startsWith('footer-')) {
        phone ||= str(props.phone)
        email ||= str(props.email)
        street ||= str(props.street)
        postalCode ||= str(props.postalCode)
        city ||= str(props.city)
        taglines.push(str(props.tagline))
      }

      sectionsRead += 1
    }

    if (sectionsRead > before) pagesWithCopy += 1
  }

  const description = longest(descriptions.filter(Boolean))
  const shortDescription = longest(taglines.filter(Boolean)).slice(0, 300)

  const profile = businessProfileSchema.parse({
    company: {
      // The header's brand text is what the site itself calls the business;
      // the workspace's name for the site is only the fallback.
      name: brandName || site.name,
      description: description.slice(0, 2000),
      shortDescription,
    },
    locations: city || street ? [{ street, postalCode, city }] : [],
    contact: { phone, email },
    // Duplicated service names come from the same list repeated across pages.
    services: dedupeByName(services).slice(0, 40),
    brand: {
      primaryColor: site.theme.colorPrimary,
      colors: [site.theme.colorPrimary, site.theme.colorAccent].filter(Boolean),
      fonts: [site.theme.fontHeading, site.theme.fontBody].filter(Boolean),
    },
    reviews: reviews.slice(0, 50),
    media: media.slice(0, 60),
    locale: site.locale,
    sources: [{ source: 'website', reference: site.slug, confidence: 0.9 }],
  })

  const basis = ['the site name', 'its language', 'its brand colours and fonts']
  if (pagesWithCopy) basis.push(`${pagesWithCopy} page${pagesWithCopy === 1 ? '' : 's'} of existing copy`)
  if (profile.services.length) basis.push(`${profile.services.length} services`)
  if (profile.reviews.length) basis.push(`${profile.reviews.length} reviews`)
  if (phone || email) basis.push('contact details')
  if (city) basis.push(city)

  // The site's own words are what makes generated copy fit the site. Without
  // any, the composer can only write from a name — real, but thin.
  const contextual = Boolean(
    profile.services.length || profile.reviews.length || description || shortDescription || phone || email,
  )

  return { profile, basis, contextual }
}

function dedupeByName<T extends { name: string }>(entries: T[]): T[] {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = entry.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Which page goal a path represents, so the composer varies intent the way it
 * does during onboarding. Best-effort and language-aware; an unrecognised path
 * is treated as an ordinary content page.
 */
export function goalForPath(path: string): 'home' | 'services' | 'about' | 'contact' {
  const value = path.toLowerCase()
  if (value === '/' || value === '') return 'home'
  if (value.includes('contact')) return 'contact'
  if (value.includes('service') || value.includes('dienst')) return 'services'
  return 'about'
}
