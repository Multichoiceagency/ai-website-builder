import { describe, expect, it } from 'vitest'
import { COMPONENT_TARGETS, generateComponentInputSchema } from '@platform/schemas'
import { describeReferenceImage } from '../src/lib/ai/describe-reference-image.js'

describe('generate-component request contract', () => {
  it('accepts brief + target + optional reference URL', () => {
    const parsed = generateComponentInputSchema.parse({
      siteId: '11111111-1111-4111-8111-111111111111',
      brief: 'Redesign our product card with bold price and soft shadow',
      target: 'product-card',
      referenceImage: 'https://cdn.example.com/card-ref.png',
      title: 'Brutal product card',
    })
    expect(parsed.target).toBe('product-card')
    expect(parsed.saveAsset).toBe(true)
    expect(parsed.assign).toBe(true)
  })

  it('lists every system target', () => {
    expect(COMPONENT_TARGETS).toContain('header')
    expect(COMPONENT_TARGETS).toContain('product-card')
    expect(COMPONENT_TARGETS).toContain('theme')
  })
})

describe('describeReferenceImage fallback', () => {
  it('returns none when no image is provided', async () => {
    const result = await describeReferenceImage(undefined, 'product-card')
    expect(result.mode).toBe('none')
    expect(result.summary).toBe('')
  })

  it('falls back to text when vision bytes are unavailable', async () => {
    const previous = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    try {
      const result = await describeReferenceImage(
        '/api/v1/content/media/abc/card.png',
        'product-card redesign',
      )
      expect(result.mode).toBe('text-fallback')
      expect(result.summary).toMatch(/Reference image/)
      expect(result.summary).toMatch(/card\.png/)
    } finally {
      if (previous !== undefined) process.env.GEMINI_API_KEY = previous
    }
  })
})
