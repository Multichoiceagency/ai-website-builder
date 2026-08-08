import { describe, expect, it } from 'vitest'
import {
  buildAssistCatalogueContext,
  catalogueTokens,
  formatCatalogueDigest,
  listCatalogueSummaries,
  retrieveCatalogueHits,
} from '../src/lib/ai/catalogue-context.js'

describe('catalogue-context', () => {
  it('lists blocks and templates as compact summaries', () => {
    const summaries = listCatalogueSummaries()
    expect(summaries.some((entry) => entry.kind === 'block')).toBe(true)
    expect(summaries.some((entry) => entry.kind === 'template')).toBe(true)
    for (const entry of summaries.slice(0, 20)) {
      expect(entry.id).toBeTruthy()
      expect(entry.name).toBeTruthy()
      expect(entry.category).toBeTruthy()
    }
  })

  it('retrieves Motionsites / hero hits from a free-text query', () => {
    const hits = retrieveCatalogueHits('add a cinematic hero Motionsites section', 10)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((hit) => hit.kind === 'template' || /hero/i.test(hit.category))).toBe(true)
  })

  it('tokenises without stop words', () => {
    expect(catalogueTokens('add a hero for the website')).toEqual(['hero'])
  })

  it('builds an assist digest that fits a prompt budget', () => {
    const { digest, hits } = buildAssistCatalogueContext('landing page hero')
    expect(digest).toContain('Block catalogue')
    expect(digest).toContain('Templates')
    expect(digest.length).toBeLessThan(20_000)
    expect(hits.length).toBeGreaterThan(0)
    expect(formatCatalogueDigest(hits).split('\n').length).toBe(hits.length)
  })
})
