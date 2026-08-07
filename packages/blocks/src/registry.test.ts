import { describe, expect, it } from 'vitest'
import { blockMetadataSchema } from '@platform/schemas'
import {
  BUILT_IN_BLOCKS,
  InvalidBlockPropsError,
  UnknownBlockError,
  createSection,
  listBlockMetadata,
  normalizeDocument,
  resolveRenderProps,
  searchBlocks,
  validateBlockProps,
} from './index.js'

describe('block registry', () => {
  it('registers every built-in block exactly once', () => {
    const ids = BUILT_IN_BLOCKS.map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(listBlockMetadata()).toHaveLength(BUILT_IN_BLOCKS.length)
  })

  it('exposes metadata that satisfies the published contract', () => {
    for (const metadata of listBlockMetadata()) {
      expect(() => blockMetadataSchema.parse(metadata)).not.toThrow()
    }
  })

  it('gives every block a complete set of defaults', () => {
    // `defineBlock` enforces this at import time; asserting it here means a
    // regression fails the test suite rather than a production render.
    for (const block of BUILT_IN_BLOCKS) {
      expect(() => block.schema.parse({})).not.toThrow()
    }
  })

  it('creates a renderable section from a block id alone', () => {
    const section = createSection('hero-split-01')
    expect(section.block).toBe('hero-split-01')
    expect(section.id).toMatch(/^sec_[a-z0-9]{12}$/)
    expect(section.props.headline).toBeTruthy()
  })

  it('rejects unknown blocks', () => {
    expect(() => createSection('does-not-exist-99')).toThrow(UnknownBlockError)
  })

  it('rejects props that do not match the block schema', () => {
    expect(() => validateBlockProps('hero-split-01', { headline: 42 })).toThrow(InvalidBlockPropsError)
  })

  it('strips unknown props instead of storing them', () => {
    const props = validateBlockProps('hero-centered-01', { headline: 'Hello', bogus: 'nope' })
    expect(props.headline).toBe('Hello')
    expect(props).not.toHaveProperty('bogus')
  })

  it('validates a whole document', () => {
    const document = normalizeDocument([
      { id: 'sec_a', block: 'hero-centered-01', props: { headline: 'Hi' } },
      { id: 'sec_b', block: 'cta-banner-01', props: {} },
    ])
    expect(document).toHaveLength(2)
    expect(document[1]?.props.ctaLabel).toBeTruthy()
  })

  it('never throws at render time, even for corrupt props', () => {
    const props = resolveRenderProps({
      id: 'sec_x',
      block: 'hero-split-01',
      props: { headline: { nope: true } } as never,
    })
    expect(typeof props.headline).toBe('string')
  })

  it('returns empty props for a block that no longer exists', () => {
    expect(resolveRenderProps({ id: 'sec_x', block: 'removed-block-01', props: {} })).toEqual({})
  })
})

describe('block search', () => {
  it('filters by category', () => {
    const heroes = searchBlocks({ category: 'hero' })
    expect(heroes.length).toBeGreaterThan(0)
    expect(heroes.every((block) => block.category === 'hero')).toBe(true)
  })

  it('honours the performance-class ceiling', () => {
    const lightweight = searchBlocks({ maxPerformanceClass: 'A' })
    expect(lightweight.every((block) => block.performanceClass === 'A')).toBe(true)
    expect(lightweight.some((block) => block.id === 'hero-split-01')).toBe(false)
  })

  it('treats `*` industries as universal', () => {
    const forDentists = searchBlocks({ industry: 'healthcare' })
    expect(forDentists.some((block) => block.id === 'hero-centered-01')).toBe(true)
  })

  it('matches free text against id, name and capabilities', () => {
    expect(searchBlocks({ search: 'accordion' }).map((block) => block.id)).toContain('faq-accordion-01')
  })
})
