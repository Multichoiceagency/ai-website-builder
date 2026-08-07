import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { normalizeDocument, normalizeSection } from '@platform/blocks'
import {
  sectionSeoSchema,
  seoBusinessSchema,
  seoSchema,
  type Section,
  type SectionSeo,
} from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { closeDatabase, withoutTenant } from '../src/db/client.js'
import {
  auditSite,
  buildPageGraph,
  buildRobots,
  buildSitemap,
  evaluateContentQuality,
  siteOrigin,
  type SeoPageInput,
} from '../src/lib/seo/index.js'

/**
 * Phase 3 coverage.
 *
 * The audit, the sitemap, the structured-data graph and the content gate are
 * pure functions over stored documents, so most of this suite needs no database
 * at all — which is also the point: the SEO engine works with zero credentials
 * and zero third-party calls. The HTTP block at the end proves the same
 * behaviour survives auth, tenancy and the response envelope.
 */

// region Fixtures

function section(id: string, block: string, props: Record<string, unknown> = {}): Section {
  return normalizeSection({ id, block, props })
}

/** A hero that links only where we tell it to — defaults point at /contact. */
function hero(id: string, headline: string, href = '/'): Section {
  return section(id, 'hero-centered-01', {
    headline,
    subheadline: 'A sentence that explains the offer without repeating the headline.',
    primaryHref: href,
    secondaryHref: '',
  })
}

function text(id: string, heading: string, body: string): Section {
  return section(id, 'content-richtext-01', { heading, body })
}

function page(overrides: Partial<SeoPageInput> & Pick<SeoPageInput, 'id' | 'path'>): SeoPageInput {
  return {
    title: 'A page title that is long enough',
    status: 'published',
    seo: seoSchema.parse({
      description: 'A meta description of a sensible length that describes what the visitor finds on this page.',
    }),
    sections: [hero(`sec_${overrides.id}`, 'Headline'), text(`sec_${overrides.id}_b`, 'About', 'Body copy.')],
    publishedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

/** Section SEO with the defaults filled in, the way a stored document has it. */
function sectionSeo(patch: Partial<SectionSeo>): SectionSeo {
  return sectionSeoSchema.parse(patch)
}

const SITE_ID = '00000000-0000-0000-0000-0000000000aa'
const uuid = (n: number) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`

// endregion

describe('technical audit', () => {
  it('reports a page with no title and no H1 as critical', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({ id: uuid(1), path: '/' }),
        page({
          id: uuid(2),
          path: '/naked',
          title: '',
          seo: seoSchema.parse({}),
          sections: [text('sec_only', 'Heading', 'Body.')],
        }),
      ],
    })

    const naked = audit.pages.find((entry) => entry.path === '/naked')!
    const codes = naked.issues.map((issue) => issue.code)

    expect(codes).toContain('missing_title')
    expect(codes).toContain('missing_h1')
    expect(codes).toContain('missing_description')
    expect(codes).toContain('thin_content')
    expect(naked.issues.every((issue) => issue.fix.length > 0)).toBe(true)
    expect(naked.score).toBeLessThan(60)
  })

  it('reports duplicate titles on every page that shares one', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [{ key: 'primary', items: [{ label: 'Copy', href: '/copy' }] }],
      pages: [
        page({ id: uuid(1), path: '/', title: 'Plumber in Rotterdam' }),
        page({ id: uuid(2), path: '/copy', title: 'Plumber in Rotterdam' }),
      ],
    })

    const duplicates = audit.pages.filter((entry) =>
      entry.issues.some((issue) => issue.code === 'duplicate_title'),
    )
    expect(duplicates).toHaveLength(2)
  })

  it('flags an over-long title and an over-long description', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          title: 'A'.repeat(75),
          seo: seoSchema.parse({ description: 'B'.repeat(180) }),
        }),
      ],
    })

    const codes = audit.pages[0]!.issues.map((issue) => issue.code)
    expect(codes).toContain('title_too_long')
    expect(codes).toContain('description_too_long')
  })

  it('flags more than one hero block as multiple H1s', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [hero('sec_a', 'First'), hero('sec_b', 'Second'), text('sec_c', 'More', 'Copy.')],
        }),
      ],
    })

    expect(audit.pages[0]!.issues.map((issue) => issue.code)).toContain('multiple_h1')
  })

  it('finds an orphan page and a broken internal link', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [hero('sec_home', 'Home', '/nowhere'), text('sec_home_b', 'About', 'Copy.')],
        }),
        page({ id: uuid(2), path: '/orphan' }),
      ],
    })

    const home = audit.pages.find((entry) => entry.path === '/')!
    const orphan = audit.pages.find((entry) => entry.path === '/orphan')!

    const broken = home.issues.find((issue) => issue.code === 'broken_internal_link')
    expect(broken?.context.href).toBe('/nowhere')
    expect(broken?.severity).toBe('critical')
    expect(orphan.issues.map((issue) => issue.code)).toContain('orphan_page')
  })

  it('does not call a page an orphan when the navigation links to it', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [{ key: 'primary', items: [{ label: 'Contact', href: '/contact' }] }],
      pages: [page({ id: uuid(1), path: '/' }), page({ id: uuid(2), path: '/contact' })],
    })

    const contact = audit.pages.find((entry) => entry.path === '/contact')!
    expect(contact.issues.map((issue) => issue.code)).not.toContain('orphan_page')
  })

  it('reports duplicate paths and a missing home page at site level', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [page({ id: uuid(1), path: '/duplicate' }), page({ id: uuid(2), path: '/duplicate' })],
    })

    expect(audit.siteIssues.map((issue) => issue.code)).toContain('missing_home_page')
    expect(audit.pages.flatMap((entry) => entry.issues).map((issue) => issue.code)).toContain(
      'duplicate_path',
    )
  })

  it('scores a healthy site above a broken one and counts issues by severity', () => {
    const healthy = auditSite({
      siteId: SITE_ID,
      navigation: [{ key: 'primary', items: [{ label: 'Contact', href: '/contact' }] }],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          seo: seoSchema.parse({
            description: 'Plumbing, heating and emergency repairs across Rotterdam, seven days a week.',
            ogImage: 'https://example.test/og.png',
          }),
          sections: [hero('sec_h', 'Plumber in Rotterdam', '/contact'), text('sec_t', 'About us', 'Copy.'), text('sec_u', 'Areas', 'Copy.')],
        }),
        page({
          id: uuid(2),
          path: '/contact',
          title: 'Contact our Rotterdam team',
          seo: seoSchema.parse({
            description: 'Call, e-mail or drop by — we answer the phone during working hours and on Saturdays.',
            ogImage: 'https://example.test/og.png',
          }),
          sections: [hero('sec_c', 'Contact us', '/'), text('sec_c_b', 'Where to find us', 'Copy.'), text('sec_c_c', 'Hours', 'Copy.')],
        }),
      ],
    })

    const broken = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [page({ id: uuid(3), path: '/only', title: '', seo: seoSchema.parse({}), sections: [] })],
    })

    expect(healthy.score).toBeGreaterThan(broken.score)
    expect(healthy.issueCounts.critical).toBe(0)
    expect(broken.issueCounts.critical).toBeGreaterThan(0)
  })
})

describe('per-section SEO', () => {
  it('leaves a document written before section SEO existed exactly as it was', () => {
    const stored = [
      { id: 'sec_a', block: 'hero-centered-01', props: { headline: 'Hello' } },
      { id: 'sec_b', block: 'cta-banner-01', props: {} },
    ]

    const normalized = normalizeDocument(stored)

    expect(normalized).toHaveLength(2)
    // Optional and undefaulted: parsing must not invent a `seo` key, or every
    // stored page would come back changed and look edited.
    expect(normalized[0]).not.toHaveProperty('seo')
    expect(normalized[1]).not.toHaveProperty('seo')
  })

  it('keeps section SEO through a round trip', () => {
    const [section] = normalizeDocument([
      {
        id: 'sec_a',
        block: 'hero-centered-01',
        props: { headline: 'Hello' },
        seo: { anchorId: 'intro', headingLevel: 'h2', schemaType: 'LocalBusiness' },
      },
    ])

    expect(section!.seo).toEqual({
      anchorId: 'intro',
      headingLevel: 'h2',
      schemaType: 'LocalBusiness',
      includeInToc: true,
      noSnippet: false,
    })
  })

  it('rejects an anchor that is not a usable URL fragment', () => {
    expect(() =>
      normalizeDocument([
        { id: 'sec_a', block: 'hero-centered-01', props: {}, seo: { anchorId: 'Not A Slug' } },
      ]),
    ).toThrow()
  })

  it('stops flagging two H1s once the second hero is demoted', () => {
    const twoHeroes = [hero('sec_a', 'First', '/'), hero('sec_b', 'Second', '/'), text('sec_c', 'More', 'Copy.')]

    const before = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [page({ id: uuid(1), path: '/', sections: twoHeroes })],
    })
    expect(before.pages[0]!.issues.map((issue) => issue.code)).toContain('multiple_h1')

    const after = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [
            twoHeroes[0]!,
            { ...twoHeroes[1]!, seo: sectionSeo({ headingLevel: 'h2' }) },
            twoHeroes[2]!,
          ],
        }),
      ],
    })
    expect(after.pages[0]!.issues.map((issue) => issue.code)).not.toContain('multiple_h1')
  })

  it('flags an outline that skips a heading level', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [
            hero('sec_a', 'Home', '/'),
            text('sec_b', 'Services', 'Copy.'),
            { ...text('sec_c', 'Detail', 'Copy.'), seo: sectionSeo({ headingLevel: 'h4' }) },
          ],
        }),
      ],
    })

    const skip = audit.pages[0]!.issues.find((issue) => issue.code === 'heading_level_skip')
    expect(skip?.severity).toBe('warning')
    expect(skip?.context).toMatchObject({ sectionId: 'sec_c', from: 2, to: 4 })
  })

  it('flags two sections claiming the same anchor', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [
            { ...hero('sec_a', 'Home', '/'), seo: sectionSeo({ anchorId: 'top' }) },
            { ...text('sec_b', 'About', 'Copy.'), seo: sectionSeo({ anchorId: 'top' }) },
            text('sec_c', 'More', 'Copy.'),
          ],
        }),
      ],
    })

    const duplicate = audit.pages[0]!.issues.find((issue) => issue.code === 'duplicate_anchor_id')
    expect(duplicate?.context).toMatchObject({ sectionId: 'sec_b', anchorId: 'top' })
  })

  it('says so when a block cannot render the heading level it was given', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [
            hero('sec_a', 'Home', '/'),
            {
              ...section('sec_b', 'stats-band-01'),
              seo: sectionSeo({ headingLevel: 'h3' }),
            },
            text('sec_c', 'About', 'Copy.'),
          ],
        }),
      ],
    })

    const issue = audit.pages[0]!.issues.find((entry) => entry.code === 'heading_level_not_rendered')
    expect(issue?.severity).toBe('info')
    expect(issue?.context).toMatchObject({ block: 'stats-band-01', requested: 'h3' })
  })

  it('reports a section that claims the FAQ role without questions', () => {
    const audit = auditSite({
      siteId: SITE_ID,
      navigation: [],
      pages: [
        page({
          id: uuid(1),
          path: '/',
          sections: [
            hero('sec_a', 'Home', '/'),
            { ...section('sec_b', 'faq-accordion-01', { items: [] }), seo: sectionSeo({ schemaType: 'FAQPage' }) },
            text('sec_c', 'About', 'Copy.'),
          ],
        }),
      ],
    })

    expect(audit.pages[0]!.issues.map((issue) => issue.code)).toContain('schema_type_without_data')
  })
})

describe('sitemap and robots', () => {
  const settings = { indexingEnabled: true, excludedPaths: ['/thanks'], robotsExtra: '' }

  const pages = [
    page({ id: uuid(1), path: '/' }),
    page({ id: uuid(2), path: '/draft', status: 'draft', publishedAt: null }),
    page({ id: uuid(3), path: '/hidden', seo: seoSchema.parse({ noIndex: true }) }),
    page({ id: uuid(4), path: '/thanks' }),
  ]

  it('lists published, indexable, non-excluded pages only', () => {
    const xml = buildSitemap({ origin: 'https://acme.test', pages, settings })

    expect(xml).toContain('<loc>https://acme.test/</loc>')
    expect(xml).not.toContain('/draft')
    expect(xml).not.toContain('/hidden')
    expect(xml).not.toContain('/thanks')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('escapes reserved XML characters in a path', () => {
    const xml = buildSitemap({
      origin: 'https://acme.test',
      pages: [page({ id: uuid(1), path: '/a&b' })],
      settings: { indexingEnabled: true, excludedPaths: [], robotsExtra: '' },
    })
    expect(xml).toContain('/a&amp;b')
  })

  it('produces an empty urlset and a full disallow when indexing is off', () => {
    const off = { indexingEnabled: false, excludedPaths: [], robotsExtra: '' }

    expect(buildSitemap({ origin: 'https://acme.test', pages, settings: off })).not.toContain('<url>')
    expect(buildRobots({ origin: 'https://acme.test', pages, settings: off })).toContain('Disallow: /')
  })

  it('disallows excluded and noindex paths and points at the sitemap', () => {
    const robots = buildRobots({ origin: 'https://acme.test', pages, settings })

    expect(robots).toContain('Disallow: /thanks')
    expect(robots).toContain('Disallow: /hidden')
    expect(robots).toContain('Sitemap: https://acme.test/sitemap.xml')
  })

  it('uses the verified domain, else the preview address', () => {
    expect(siteOrigin({ slug: 'acme', primaryHostname: 'acme.nl' })).toBe('https://acme.nl')
    expect(siteOrigin({ slug: 'acme', primaryHostname: null })).toBe('http://acme.localhost')
  })
})

describe('structured data', () => {
  const business = seoBusinessSchema.parse({
    name: 'Acme Plumbing',
    phone: '010 123 4567',
    address: { street: 'Coolsingel 1', postalCode: '3011AD', city: 'Rotterdam' },
    openingHours: [{ day: 'mon', opens: '08:00', closes: '18:00' }],
    sameAs: ['https://www.facebook.com/acme'],
  })

  const site = { name: 'Acme', locale: 'nl' }

  it('emits a WebSite, a WebPage and a LocalBusiness node', () => {
    const home = page({ id: uuid(1), path: '/' })
    const { graph } = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: home,
      pages: [home],
      business,
    })

    expect(graph['@context']).toBe('https://schema.org')
    const types = graph['@graph'].map((node) => node['@type'])
    expect(types).toContain('WebSite')
    expect(types).toContain('WebPage')
    expect(types).toContain('LocalBusiness')

    const local = graph['@graph'].find((node) => node['@type'] === 'LocalBusiness') as Record<string, unknown>
    expect((local.address as Record<string, string>).addressLocality).toBe('Rotterdam')
    expect(local.openingHoursSpecification).toHaveLength(1)
    expect(local.sameAs).toEqual(['https://www.facebook.com/acme'])
  })

  it('builds a breadcrumb trail from the path, using real page titles', () => {
    const home = page({ id: uuid(1), path: '/' })
    const services = page({ id: uuid(2), path: '/services', title: 'Our services' })
    const detail = page({ id: uuid(3), path: '/services/boiler-repair', title: 'Boiler repair' })

    const { graph } = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: detail,
      pages: [home, services, detail],
      business,
    })

    const breadcrumb = graph['@graph'].find((node) => node['@type'] === 'BreadcrumbList') as
      | Record<string, unknown>
      | undefined
    const items = breadcrumb?.itemListElement as { position: number; name: string; item: string }[]

    expect(items).toHaveLength(3)
    expect(items[1]!.name).toBe('Our services')
    expect(items[2]!.item).toBe('https://acme.test/services/boiler-repair')
  })

  it('omits nodes the block renderers already emit, and says which block does', () => {
    const contact = page({
      id: uuid(1),
      path: '/contact',
      sections: [
        hero('sec_h', 'Contact', '/'),
        section('sec_faq', 'faq-accordion-01', {
          items: [{ question: 'Do you charge a call-out fee?', answer: 'No.' }],
        }),
        section('sec_contact', 'contact-details-01', {
          street: 'Coolsingel 1',
          postalCode: '3011AD',
          city: 'Rotterdam',
        }),
      ],
    })

    const { graph, suppressed } = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: contact,
      pages: [contact],
      business,
    })

    expect(graph['@graph'].map((node) => node['@type'])).not.toContain('LocalBusiness')
    expect(graph['@graph'].map((node) => node['@type'])).not.toContain('FAQPage')
    expect(suppressed.map((entry) => entry.emittedBy).sort()).toEqual([
      'contact-details-01',
      'faq-accordion-01',
    ])
  })

  it('suppresses FAQPage for either FAQ block, naming the one that renders it', () => {
    const faqPage = page({
      id: uuid(1),
      path: '/faq',
      sections: [
        hero('sec_h', 'Questions', '/'),
        section('sec_faq', 'faq-reveal-accordion-01', {
          items: [{ question: 'Do you charge a call-out fee?', answer: 'No.' }],
        }),
      ],
    })

    const { graph, suppressed } = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: faqPage,
      pages: [faqPage],
      business,
    })

    expect(graph['@graph'].map((node) => node['@type'])).not.toContain('FAQPage')
    expect(suppressed).toContainEqual(
      expect.objectContaining({ type: 'FAQPage', emittedBy: 'faq-reveal-accordion-01' }),
    )
  })

  it('builds FAQPage from a section that claims the role and renders no JSON-LD of its own', () => {
    // A block that carries question/answer items without emitting structured
    // data itself — which is exactly what `schemaType` exists to cover.
    const qaPage = page({
      id: uuid(1),
      path: '/help',
      sections: [
        hero('sec_h', 'Help', '/'),
        {
          id: 'sec_qa',
          block: 'content-qa-01',
          props: { items: [{ question: 'Are you open on Saturday?', answer: 'Until 13:00.' }] },
          seo: sectionSeo({ schemaType: 'FAQPage', anchorId: 'questions' }),
        },
      ],
    })

    const { graph } = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: qaPage,
      pages: [qaPage],
      business,
    })

    const faq = graph['@graph'].find((node) => node['@type'] === 'FAQPage') as Record<string, unknown>
    expect(faq['@id']).toBe('https://acme.test/help#questions')
    expect(faq.mainEntity).toHaveLength(1)
    expect((faq.mainEntity as Record<string, unknown>[])[0]!.name).toBe('Are you open on Saturday?')
  })

  it('points the business node at the section that claims it', () => {
    const contactPage = page({
      id: uuid(1),
      path: '/contact',
      sections: [
        hero('sec_h', 'Contact', '/'),
        { ...text('sec_where', 'Where to find us', 'Copy.'), seo: sectionSeo({ schemaType: 'LocalBusiness', anchorId: 'visit-us' }) },
      ],
    })

    const { graph } = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: contactPage,
      pages: [contactPage],
      business,
    })

    const local = graph['@graph'].find((node) => node['@type'] === 'LocalBusiness') as Record<string, unknown>
    expect(local.mainEntityOfPage).toBe('https://acme.test/contact#visit-us')
  })

  it('emits Product nodes only for products it is given', () => {
    const home = page({ id: uuid(1), path: '/' })
    const withoutProducts = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: home,
      pages: [home],
      business,
    })
    expect(withoutProducts.graph['@graph'].map((node) => node['@type'])).not.toContain('Product')

    const withProducts = buildPageGraph({
      site,
      origin: 'https://acme.test',
      page: home,
      pages: [home],
      business,
      products: [
        {
          name: 'Boiler service',
          description: 'Annual service.',
          sku: 'SRV-1',
          brand: 'Acme',
          image: '',
          price: 129,
          priceCurrency: 'EUR',
          availability: 'InStock',
          url: 'https://acme.test/boiler-service',
        },
      ],
    })

    const product = withProducts.graph['@graph'].find((node) => node['@type'] === 'Product') as
      | Record<string, unknown>
      | undefined
    expect(product?.name).toBe('Boiler service')
    expect((product?.offers as Record<string, unknown>).availability).toBe('https://schema.org/InStock')
  })
})

describe('content quality gate', () => {
  it('rejects a thin programmatic page', () => {
    const report = evaluateContentQuality({
      title: 'Plumber in Delft',
      seo: seoSchema.parse({}),
      sections: [hero('sec_a', 'Plumber in Delft', '/contact'), text('sec_b', 'Delft', 'We work in Delft.')],
    })

    expect(report.passed).toBe(false)
    expect(report.score).toBeLessThan(report.threshold)
    expect(report.blockers.length).toBeGreaterThan(0)
  })

  it('rejects a page that is nothing but block defaults', () => {
    const report = evaluateContentQuality({
      title: 'Home',
      seo: seoSchema.parse({}),
      sections: [
        section('sec_a', 'hero-centered-01'),
        section('sec_b', 'features-grid-01'),
        section('sec_c', 'services-list-01'),
        section('sec_d', 'faq-accordion-01'),
        section('sec_e', 'cta-banner-01'),
      ],
    })

    const original = report.signals.find((signal) => signal.id === 'original_copy')!
    expect(original.value).toBeLessThan(0.2)
    expect(report.passed).toBe(false)
  })

  it('passes a page with real copy, structure and links', () => {
    const body = 'We repair boilers, unblock drains and fix leaks across Rotterdam. '.repeat(12)

    const report = evaluateContentQuality({
      title: 'Plumber in Rotterdam',
      seo: seoSchema.parse({
        description:
          'Emergency plumber in Rotterdam for boiler repairs, blocked drains and leaks — seven days a week.',
      }),
      sections: [
        hero('sec_a', 'Emergency plumber in Rotterdam', '/contact'),
        text('sec_b', 'What we do', body),
        text('sec_c', 'How we work', body),
        section('sec_d', 'services-list-01', {
          heading: 'Our plumbing services',
          items: [
            { title: 'Boiler repair', description: 'Same-day repairs on every major brand.', href: '/services/boiler-repair', linkLabel: 'Boiler repair' },
            { title: 'Drain unblocking', description: 'Cameras first, so we fix the cause.', href: '/services/drains', linkLabel: 'Drain unblocking' },
          ],
        }),
        section('sec_e', 'cta-banner-01', {
          heading: 'Need a plumber today?',
          body: 'Call before noon and we come out the same afternoon.',
          ctaLabel: 'Call us now',
          ctaHref: '/contact',
        }),
      ],
    })

    expect(report.passed).toBe(true)
    expect(report.wordCount).toBeGreaterThan(200)
  })

  it('honours a caller-supplied threshold', () => {
    const thin = { title: 'Thin', seo: seoSchema.parse({}), sections: [hero('sec_a', 'Thin', '/')] }

    expect(evaluateContentQuality(thin, { threshold: 90 }).passed).toBe(false)
    expect(evaluateContentQuality(thin, { threshold: 0 }).passed).toBe(true)
  })
})

/**
 * The HTTP surface. Runs against the real database and the real permission
 * engine, like `api.test.ts` — nothing is mocked, because auth, tenancy and the
 * envelope are exactly what a mock would hide.
 */
describe('the SEO API', () => {
  const suffix = Math.random().toString(36).slice(2, 8)
  const EMAIL = `seo-test-${suffix}@platform.local`
  const PASSWORD = 'a-long-enough-password'

  let app: FastifyInstance
  let cookie = ''
  let tenantId = ''
  let siteId = ''
  let publishedPageId = ''

  function body(response: { body: string }) {
    return JSON.parse(response.body)
  }

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    const registered = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: PASSWORD, name: 'SEO Test', organizationName: `SEO Test ${suffix}` },
    })
    tenantId = body(registered).data.activeTenantId
    cookie = String(registered.headers['set-cookie']).split(';')[0]!

    const site = await app.inject({
      method: 'POST',
      url: '/api/v1/sites',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { name: 'SEO Site', slug: `seo-site-${suffix}`, locale: 'nl' },
    })
    siteId = body(site).data.id

    const home = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        path: '/',
        title: 'Home',
        seo: { description: 'The home page of a test site, described in enough characters to be realistic.' },
        sections: [
          { id: 'sec_home', block: 'hero-centered-01', props: { headline: 'Home', primaryHref: '/', secondaryHref: '' } },
        ],
      },
    })
    publishedPageId = body(home).data.id

    await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${publishedPageId}/publish`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    // A draft, so the sitemap has something it must leave out.
    await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { path: '/draft-page', title: 'Draft page', sections: [] },
    })
  })

  afterAll(async () => {
    await withoutTenant(async (tx) => {
      await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
      await tx`DELETE FROM users WHERE email = ${EMAIL}`
    })
    await app.close()
    await closeDatabase()
  })

  it('requires authentication', async () => {
    const response = await app.inject({ method: 'GET', url: `/api/v1/seo/sites/${siteId}/audit` })
    expect(response.statusCode).toBe(401)
  })

  it('reports honestly that no rank or Search Console data source is configured', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/seo/providers',
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    // No SERP provider exists at all, so positions are never tracked.
    expect(body(response).data.serp.provider).toBeNull()
    expect(body(response).data.serp.configured).toBe(false)
    // Search Console may be *configured* on an installation that has Google
    // credentials, but no workspace can be connected until someone grants
    // access — so this stays false either way, with a reason attached.
    expect(body(response).data.searchConsole.provider).toBe('google_search_console')
    expect(body(response).data.searchConsole.connected).toBe(false)
    expect(body(response).data.searchConsole.reason.length).toBeGreaterThan(0)
  })

  it('audits the site and attaches issues to the page they belong to', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/audit`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    const audit = body(response).data
    expect(audit.pageCount).toBe(2)
    expect(audit.publishedCount).toBe(1)

    const draft = audit.pages.find((entry: { path: string }) => entry.path === '/draft-page')
    expect(draft.issues.map((issue: { code: string }) => issue.code)).toContain('thin_content')
  })

  it('stores an audit run and reads it back', async () => {
    const stored = await app.inject({
      method: 'POST',
      url: `/api/v1/seo/sites/${siteId}/audit`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(stored.statusCode).toBe(201)

    const latest = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/audit/latest`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(body(latest).data.audit.siteId).toBe(siteId)
    expect(body(latest).data.history.length).toBeGreaterThan(0)
  })

  it('serves a sitemap that contains published pages and no drafts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/sitemap.xml`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/xml')
    expect(response.body).toContain(`http://seo-site-${suffix}.localhost/`)
    expect(response.body).not.toContain('/draft-page')
  })

  it('serves robots.txt pointing at the sitemap', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/robots.txt`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.headers['content-type']).toContain('text/plain')
    expect(response.body).toContain('User-agent: *')
    expect(response.body).toContain('Sitemap:')
  })

  it('turns indexing off in robots.txt and the sitemap together', async () => {
    await app.inject({
      method: 'PUT',
      url: `/api/v1/seo/sites/${siteId}/settings`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { indexingEnabled: false },
    })

    const robots = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/robots.txt`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    const sitemap = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/sitemap.xml`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(robots.body).toContain('Disallow: /')
    expect(sitemap.body).not.toContain('<url>')

    await app.inject({
      method: 'PUT',
      url: `/api/v1/seo/sites/${siteId}/settings`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { indexingEnabled: true },
    })
  })

  it('returns a JSON-LD graph for a page', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/pages/${publishedPageId}/schema`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    const result = body(response).data
    expect(result.graph['@context']).toBe('https://schema.org')
    expect(result.graph['@graph'].map((node: { '@type': string }) => node['@type'])).toContain('WebPage')
  })

  it('stores keywords but reports no positions while no provider exists', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/seo/sites/${siteId}/keywords`,
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: { keyword: 'loodgieter rotterdam', locale: 'nl', country: 'NL', targetPath: '/' },
    })
    expect(created.statusCode).toBe(201)
    expect(body(created).data.latestPosition).toBeNull()

    const listed = await app.inject({
      method: 'GET',
      url: `/api/v1/seo/sites/${siteId}/keywords`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(body(listed).data.keywords).toHaveLength(1)
    expect(body(listed).data.provider.provider).toBeNull()

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/seo/keywords/${body(created).data.id}`,
      headers: { cookie, 'x-tenant-id': tenantId },
    })
    expect(deleted.statusCode).toBe(200)
  })

  it('rejects a thin page at the content gate', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/seo/content-gate',
      headers: { cookie, 'x-tenant-id': tenantId },
      payload: {
        title: 'Plumber in Delft',
        sections: [{ id: 'sec_a', block: 'hero-centered-01', props: { headline: 'Plumber in Delft' } }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.passed).toBe(false)
    expect(body(response).data.blockers.length).toBeGreaterThan(0)
  })
})
