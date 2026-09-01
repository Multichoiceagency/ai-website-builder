import { businessProfileSchema, mediaAssetSchema, type BusinessProfile, type MediaAsset } from '@platform/schemas'
import { describe, expect, it, vi } from 'vitest'
import { composePage, planSite } from '../src/lib/generation/index.js'
import {
  MAX_SITE_IMAGES,
  mediaIntentsFor,
  resolveSiteMedia,
  type MediaIntent,
  type MediaResolverDeps,
} from '../src/lib/generation/media-resolver.js'
import type { GeneratedImage, ImageGenerationProvider } from '../src/lib/media/image-generation.js'

/**
 * Imagery for a generated site: which source wins, how far the budget stretches
 * and what a failing provider costs. Every dependency is injected, so nothing
 * here touches the database, Pexels or Gemini.
 */

const profile: BusinessProfile = businessProfileSchema.parse({
  company: { name: 'Van Dijk Loodgieters', industry: 'plumbing', shortDescription: 'Plumbing in Rotterdam.' },
  contact: { phone: '010 123 4567' },
  locations: [{ city: 'Rotterdam', street: 'Kade 1', postalCode: '3011 AA' }],
  services: [
    { name: 'Leidingwerk', description: 'Nieuwe leidingen' },
    { name: 'Ontstoppen', description: 'Riool ontstoppen' },
  ],
  locale: 'nl-NL',
})

/** media_assets.id is a uuid; the schema rejects a friendly label. */
function uuid(seed: number): string {
  return `00000000-0000-4000-8000-${String(seed).padStart(12, '0')}`
}

function asset(overrides: Partial<MediaAsset> & { id: string }): MediaAsset {
  return mediaAssetSchema.parse({
    usageCount: 0,
    folder: 'library',
    filename: 'photo.jpg',
    storageKey: `media/${overrides.id}`,
    mime: 'image/jpeg',
    sizeBytes: 1024,
    width: 1600,
    height: 900,
    alt: 'A photo',
    altSource: 'human',
    needsAlt: false,
    tags: [],
    checksum: `sum-${overrides.id}`,
    url: `https://cdn.test/${overrides.id}.jpg`,
    frameStatus: 'none',
    frameCount: 0,
    frameFps: 0,
    frameWidth: 0,
    frameError: '',
    createdBy: 'seed@test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

function stockItem(id: string) {
  return {
    provider: 'pexels' as const,
    externalId: id,
    kind: 'image' as const,
    title: `Stock ${id}`,
    thumbnailUrl: `https://images.pexels.com/photos/${id}/thumb.jpg`,
    downloadUrl: `https://images.pexels.com/photos/${id}/full.jpg`,
    pageUrl: `https://www.pexels.com/photo/${id}/`,
    width: 1600,
    height: 900,
    durationSeconds: null,
    tags: [],
  }
}

function fakeImageProvider(overrides: Partial<ImageGenerationProvider> = {}): ImageGenerationProvider {
  return {
    id: 'fake',
    isConfigured: () => true,
    generate: async (): Promise<GeneratedImage> => ({
      bytes: Buffer.from('png'),
      mimeType: 'image/png',
      model: 'fake-image-1',
    }),
    ...overrides,
  }
}

function deps(overrides: Partial<MediaResolverDeps> = {}): MediaResolverDeps {
  return {
    listTenantImages: async () => [],
    stockConfigured: () => true,
    searchStock: async () => [],
    importStock: async (input) => asset({ id: uuid(20), alt: input.alt ?? '' }),
    storeGenerated: async (input) => asset({ id: uuid(30), alt: input.alt ?? '', tags: input.tags ?? [] }),
    imageProvider: fakeImageProvider(),
    ...overrides,
  }
}

const HERO_ONLY: MediaIntent[] = [
  { role: 'hero', query: 'plumbing rotterdam workplace', alt: 'Van Dijk Loodgieters' },
]

/** One intention by default, so a precedence assertion is about one decision. */
function resolve(overrides: Partial<MediaResolverDeps> = {}, intents: MediaIntent[] = HERO_ONLY) {
  return resolveSiteMedia({
    tenantId: 'tenant-1',
    createdBy: 'owner@test',
    profile,
    intents,
    deps: deps(overrides),
  })
}

describe('site media resolution', () => {
  it('prefers a tenant asset over stock and generation', async () => {
    const searchStock = vi.fn(async () => [stockItem('1')])
    const generate = vi.fn()

    const result = await resolve({
      listTenantImages: async () => [asset({ id: uuid(1), tags: ['plumbing'], alt: 'Plumber at work' })],
      searchStock,
      imageProvider: fakeImageProvider({ generate }),
    })

    expect(result.byRole.hero?.source).toBe('tenant')
    expect(result.byRole.hero?.assetId).toBe(uuid(1))
    expect(generate).not.toHaveBeenCalled()
  })

  it('imports from stock when the tenant library has nothing matching', async () => {
    const generate = vi.fn()

    const result = await resolve({
      searchStock: async () => [stockItem('1')],
      imageProvider: fakeImageProvider({ generate }),
    })

    expect(result.byRole.hero?.source).toBe('pexels')
    expect(result.imported).toBeGreaterThan(0)
    expect(generate).not.toHaveBeenCalled()
  })

  it('generates only for the gaps stock could not fill', async () => {
    const generate = vi.fn(async () => ({
      bytes: Buffer.from('png'),
      mimeType: 'image/png',
      model: 'fake-image-1',
    }))

    const result = await resolve({ imageProvider: fakeImageProvider({ generate }) })

    expect(result.byRole.hero?.source).toBe('generated')
    expect(result.generated).toBeGreaterThan(0)
    expect(generate).toHaveBeenCalled()
  })

  it('leaves generation off when the provider is not configured', async () => {
    const generate = vi.fn()

    const result = await resolve({
      imageProvider: fakeImageProvider({ isConfigured: () => false, generate }),
    })

    expect(generate).not.toHaveBeenCalled()
    expect(result.byRole.hero).toBeUndefined()
  })

  it('stops at three images and never repeats one asset', async () => {
    const many = Array.from({ length: 8 }, (_, index) => `https://cdn.test/site-${index}.jpg`)

    const result = await resolveSiteMedia({
      tenantId: 'tenant-1',
      createdBy: 'owner@test',
      profile: businessProfileSchema.parse({ ...profile, media: many }),
      intents: [
        { role: 'hero', query: 'a', alt: 'a' },
        { role: 'service', query: 'b', alt: 'b' },
        { role: 'about', query: 'c', alt: 'c' },
      ],
      deps: deps(),
    })

    const urls = Object.values(result.byRole).map((image) => image.url)
    expect(urls).toHaveLength(MAX_SITE_IMAGES)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('does not reuse one tenant asset for two roles', async () => {
    const only = asset({ id: uuid(1), tags: ['plumbing'], alt: 'Plumber at work' })

    const result = await resolve({ listTenantImages: async () => [only] }, [
      { role: 'hero', query: 'plumbing', alt: 'hero' },
      { role: 'service', query: 'plumbing', alt: 'service' },
    ])

    const tenantPicks = Object.values(result.byRole).filter((image) => image.source === 'tenant')
    expect(tenantPicks).toHaveLength(1)
  })

  it('derives one intention per section role from the profile', () => {
    const intents = mediaIntentsFor(profile)

    expect(intents.length).toBeLessThanOrEqual(MAX_SITE_IMAGES)
    expect(intents[0]?.role).toBe('hero')
    expect(new Set(intents.map((intent) => intent.role)).size).toBe(intents.length)
  })

  it('survives a stock failure and still generates', async () => {
    const result = await resolve({
      searchStock: async () => {
        throw new Error('Pexels returned HTTP 429')
      },
    })

    expect(result.byRole.hero?.source).toBe('generated')
    expect(result.errors.join(' ')).toContain('pexels')
  })

  it('survives an image provider failure without losing the site', async () => {
    const result = await resolve({
      imageProvider: fakeImageProvider({
        generate: async () => {
          throw new Error('Gemini image generation returned HTTP 500')
        },
      }),
    })

    expect(result.byRole.hero).toBeUndefined()
    expect(result.errors.join(' ')).toContain('fake')
  })

  it('stores alt text and source metadata with a generated image', async () => {
    const storeGenerated = vi.fn(async (input: Parameters<MediaResolverDeps['storeGenerated']>[0]) =>
      asset({ id: uuid(30), alt: input.alt ?? '' }),
    )

    await resolve({ storeGenerated })

    const stored = storeGenerated.mock.calls[0]![0]
    expect(stored.alt).toBeTruthy()
    expect(stored.tags).toContain('ai-generated')
    expect(stored.tags).toContain('fake')
    expect(stored.folder).toBe('generated')
  })

  it('never puts customer contact details in a generation prompt', async () => {
    const generate = vi.fn(async () => ({
      bytes: Buffer.from('png'),
      mimeType: 'image/png',
      model: 'fake-image-1',
    }))

    await resolve({ imageProvider: fakeImageProvider({ generate }) })

    const prompt = generate.mock.calls[0]![0] as string
    expect(prompt).not.toContain(profile.contact.phone)
    expect(prompt).not.toContain('@')
  })
})

describe('generated header props', () => {
  function homeSections(brandLogo: string) {
    const withLogo = businessProfileSchema.parse({
      ...profile,
      brand: { ...profile.brand, logo: brandLogo },
    })
    const plan = planSite(withLogo, { style: 'minimal', maxPerformanceClass: 'A' } as never, null)
    const home = plan.pages[0]!
    return composePage(home, withLogo, copySlots, plan.navigation)
  }

  const copySlots = {
    heroEyebrow: '',
    heroHeadline: 'Loodgieter in Rotterdam',
    heroSubheadline: 'Snel ter plaatse.',
    primaryCta: 'Bel ons',
    secondaryCta: 'Diensten',
    servicesHeading: 'Diensten',
    servicesIntro: '',
    featuresHeading: 'Waarom wij',
    features: [{ title: 'Snel', description: '24/7' }],
    aboutHeading: 'Over ons',
    aboutBody: 'Al 20 jaar.',
    ctaHeading: 'Afspraak maken',
    ctaBody: 'Bel vandaag.',
    faq: [{ question: 'Kosten?', answer: 'Op aanvraag.' }],
    seoTitle: 'Loodgieter Rotterdam',
    seoDescription: 'Loodgieter in Rotterdam.',
  } as never

  it('puts a brand logo on its own row at extra-large size', () => {
    const header = homeSections('https://cdn.test/logo.svg').find((section) =>
      section.block.startsWith('header-'),
    )

    expect(header?.props.layout).toBe('stacked')
    expect(header?.props.logoHeight).toBe('xl')
  })

  it('leaves the header layout alone when there is no logo', () => {
    const header = homeSections('').find((section) => section.block.startsWith('header-'))

    expect(header?.props.layout).not.toBe('stacked')
  })
})
