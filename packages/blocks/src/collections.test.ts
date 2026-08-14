import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { REGISTRY_COLLECTIONS, blockMetadataSchema, registryBlockMetadataSchema } from '@platform/schemas'
import type { PerformanceClass } from '@platform/schemas'
import {
  BUILT_IN_BLOCKS,
  COLLECTIONS,
  COLLECTION_BLOCKS,
  CORE_BLOCK_TAGS,
  countBlocksByCollection,
  listBlockMetadata,
  searchBlocks,
} from './index.js'

const RENDERER_MAP_PATH = fileURLToPath(new URL('../../blocks-nuxt/components/Block/Renderer.vue', import.meta.url))
const rendererSource = readFileSync(RENDERER_MAP_PATH, 'utf8')

/** `'hero-aurora-01': BlockHeroAurora01,` → `{ 'hero-aurora-01': 'HeroAurora01' }`. */
const rendererMap = new Map<string, string>(
  [...rendererSource.matchAll(/'([a-z0-9-]+)':\s*Block([A-Za-z0-9]+),/g)].map((match) => [match[1]!, match[2]!]),
)

/**
 * What a performance class is allowed to claim.
 *
 * The class is the promise; the score is the number. A class C block that
 * claims 99 for performance is either mis-classed or lying, and both are worse
 * than a slow block, because budget-aware AI selection trusts these figures.
 */
const SCORE_ENVELOPE: Record<PerformanceClass, { min: number; max: number }> = {
  A: { min: 95, max: 100 },
  B: { min: 88, max: 96 },
  C: { min: 78, max: 90 },
  D: { min: 60, max: 85 },
}

/**
 * Categories `planSite()` actually selects a block for. A block in one of these
 * can be chosen by AI, and the pipeline fills its props by matching the *id
 * prefix* — so the id has to start with the category's canonical prefix, or the
 * block would render its own placeholder copy on a customer's live site.
 *
 * `gallery`, `pricing`, `team`, `blog`, `about` and `logos` are absent because
 * the pipeline never plans them; blocks there are picker-only and free to be
 * named for their design.
 */
const AI_REACHABLE_PREFIXES: Record<string, string> = {
  hero: 'hero-',
  stats: 'stats-',
  services: 'services-',
  features: 'features-',
  testimonials: 'testimonials-',
  faq: 'faq-',
  cta: 'cta-',
  content: 'content-',
  contact: 'contact-',
  header: 'header-',
  footer: 'footer-',
  product: 'product-',
}

/**
 * One block predates the convention: `feature-spotlight-01` sits in `features`
 * but is named `feature-`, so the pipeline would hand it an empty props object.
 * It is unreachable today only because `features-grid-01` outscores it in every
 * pool, which is luck rather than design. Recorded here rather than quietly
 * excluded, and left alone because the existing library is not ours to rename —
 * renaming a block id would orphan every page already using it.
 */
const LEGACY_PREFIX_EXCEPTIONS = new Set([
  'feature-spotlight-01',
  // Nestable empty canvas — picker / InsertPanel only; id is layout-* not content-*.
  'layout-canvas-01',
  // Partner backlink band — category footer, id predates the footer- prefix rule.
  'seo-network-01',
])

describe('collections', () => {
  it('declares metadata for every collection id and no others', () => {
    expect(COLLECTIONS.map((collection) => collection.id).sort()).toEqual([...REGISTRY_COLLECTIONS].sort())
  })

  it('gives every collection at least one block', () => {
    const counts = countBlocksByCollection()
    for (const collection of COLLECTIONS) {
      expect(counts[collection.id] ?? 0).toBeGreaterThan(0)
    }
  })

  it('ships at least 24 blocks outside core', () => {
    expect(COLLECTION_BLOCKS.length).toBeGreaterThanOrEqual(24)
  })

  it('keeps block ids unique across every collection', () => {
    const ids = BUILT_IN_BLOCKS.map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('records a licence and an inspiration note for every collection', () => {
    // The collections are inspired by named libraries. Saying so in the manifest
    // is what keeps "inspired by" from quietly becoming "copied from".
    for (const collection of COLLECTIONS) {
      expect(collection.licence.length).toBeGreaterThan(10)
      expect(collection.inspiration.length).toBeGreaterThan(10)
    }
  })
})

describe('collection block contract', () => {
  it('parses every block\'s defaults', () => {
    for (const block of COLLECTION_BLOCKS) {
      expect(() => block.schema.parse({}), block.id).not.toThrow()
    }
  })

  it('satisfies the published metadata contract, collection facets included', () => {
    for (const metadata of listBlockMetadata()) {
      expect(() => blockMetadataSchema.parse(metadata), metadata.id).not.toThrow()
      expect(() => registryBlockMetadataSchema.parse(metadata), metadata.id).not.toThrow()
    }
  })

  it('tags every block, in every collection', () => {
    for (const metadata of listBlockMetadata()) {
      expect(metadata.tags.length, metadata.id).toBeGreaterThan(0)
    }
    // Core blocks get their tags from the description map rather than a
    // definition, so an untagged new core block should fail here too.
    expect(Object.keys(CORE_BLOCK_TAGS).length).toBeGreaterThan(0)
  })

  it('claims only scores its performance class can support', () => {
    for (const metadata of listBlockMetadata()) {
      const envelope = SCORE_ENVELOPE[metadata.performanceClass]
      expect(metadata.scores.performance, `${metadata.id} performance`).toBeGreaterThanOrEqual(envelope.min)
      expect(metadata.scores.performance, `${metadata.id} performance`).toBeLessThanOrEqual(envelope.max)
      // Cost is a reason to be slow, never a reason to be inaccessible.
      expect(metadata.scores.accessibility, `${metadata.id} accessibility`).toBeGreaterThanOrEqual(90)
      expect(metadata.scores.mobile, `${metadata.id} mobile`).toBeGreaterThanOrEqual(80)
    }
  })

  it('names AI-reachable blocks after their category, so generated props reach them', () => {
    for (const metadata of listBlockMetadata()) {
      const prefix = AI_REACHABLE_PREFIXES[metadata.category]
      if (!prefix || LEGACY_PREFIX_EXCEPTIONS.has(metadata.id)) continue
      expect(metadata.id.startsWith(prefix), `${metadata.id} should start with "${prefix}"`).toBe(true)
    }
  })

  it('declares industries and a style direction for AI selection', () => {
    for (const metadata of listBlockMetadata()) {
      expect(metadata.industries.length, metadata.id).toBeGreaterThan(0)
      expect(metadata.style.length, metadata.id).toBeGreaterThan(0)
    }
  })
})

describe('renderers', () => {
  it('maps every registered block to a Nuxt renderer', () => {
    for (const block of BUILT_IN_BLOCKS) {
      expect(rendererMap.has(block.id), `${block.id} has no entry in Renderer.vue`).toBe(true)
    }
  })

  it('maps no renderer to a block that does not exist', () => {
    const ids = new Set(BUILT_IN_BLOCKS.map((block) => block.id))
    for (const id of rendererMap.keys()) {
      expect(ids.has(id), `Renderer.vue maps unknown block "${id}"`).toBe(true)
    }
  })

  it('points every renderer at a component file that exists', () => {
    for (const [id, component] of rendererMap) {
      const path = fileURLToPath(new URL(`../../blocks-nuxt/components/Block/${component}.vue`, import.meta.url))
      expect(() => readFileSync(path, 'utf8'), `${id} → ${component}.vue`).not.toThrow()
    }
  })

  it('never animates a layout-bound property', () => {
    // Compositor-only motion is a registry-wide rule, not a per-block habit.
    for (const [, component] of rendererMap) {
      const path = fileURLToPath(new URL(`../../blocks-nuxt/components/Block/${component}.vue`, import.meta.url))
      const source = readFileSync(path, 'utf8')
      const transitions = [...source.matchAll(/transition(?:-property)?:\s*([^;"'`}]+)/g)].map((match) => match[1]!)
      for (const declaration of transitions) {
        expect(
          /\b(width|height|top|left|right|bottom|margin|padding|font-size)\b/.test(declaration),
          `${component}.vue transitions a layout property: ${declaration.trim()}`,
        ).toBe(false)
      }
    }
  })
})

describe('collection-aware search', () => {
  it('filters by collection', () => {
    const motion = searchBlocks({ collection: 'motion' })
    expect(motion.length).toBeGreaterThan(0)
    expect(motion.every((block) => block.collection === 'motion')).toBe(true)
  })

  it('filters by tag, requiring every tag given', () => {
    const scrollAndSticky = searchBlocks({ tags: ['scroll', 'sticky'] })
    expect(scrollAndSticky.length).toBeGreaterThan(0)
    for (const block of scrollAndSticky) {
      expect(block.tags).toContain('scroll')
      expect(block.tags).toContain('sticky')
    }
    expect(searchBlocks({ tags: ['scroll', 'not-a-real-tag'] })).toHaveLength(0)
  })

  it('combines collection, category and ceiling', () => {
    const results = searchBlocks({ collection: 'showcase', category: 'testimonials', maxPerformanceClass: 'B' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((block) => block.collection === 'showcase' && block.category === 'testimonials')).toBe(true)
  })

  it('keeps the performance ceiling closed to the new collections', () => {
    // The whole point of the ceiling: adding twenty-seven blocks must not make
    // a class-A generated site any heavier than it was yesterday.
    for (const block of searchBlocks({ maxPerformanceClass: 'A' })) {
      expect(block.performanceClass, block.id).toBe('A')
    }
    for (const block of searchBlocks({ maxPerformanceClass: 'B' })) {
      expect(['A', 'B'], block.id).toContain(block.performanceClass)
    }
    const heavy = COLLECTION_BLOCKS.filter((block) => block.performanceClass === 'C')
    expect(heavy.length).toBeGreaterThan(0)
    const ceilingB = new Set(searchBlocks({ maxPerformanceClass: 'B' }).map((block) => block.id))
    for (const block of heavy) expect(ceilingB.has(block.id), block.id).toBe(false)
  })

  it('makes new blocks selectable through the same query the AI selector uses', () => {
    // `selectBlock()` in the generation pipeline calls exactly this, so a block
    // appearing here is a block AI can place.
    const pool = searchBlocks({ category: 'features', maxPerformanceClass: 'C', industry: 'saas' })
    expect(pool.map((block) => block.id)).toContain('features-sticky-stack-01')
    expect(pool.map((block) => block.id)).toContain('features-glow-cards-01')
  })

  it('finds scroll video scrub via frames / scrub / 3d keywords', () => {
    for (const term of ['frames', 'scrub', '3d', 'frame-pack', 'scrollytelling']) {
      expect(
        searchBlocks({ search: term }).map((block) => block.id),
        term,
      ).toContain('scroll-video-scrub-01')
    }
    const scrub = searchBlocks({ search: 'scroll-video-scrub' })
    expect(scrub.map((block) => block.id)).toContain('scroll-video-scrub-01')
  })

  it('finds empty layout canvas via empty / manual / nestable keywords', () => {
    for (const term of ['empty', 'manual', 'nestable', 'layout-canvas']) {
      expect(
        searchBlocks({ search: term }).map((block) => block.id),
        term,
      ).toContain('layout-canvas-01')
    }
  })
})