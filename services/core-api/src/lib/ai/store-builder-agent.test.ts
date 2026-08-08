import { describe, expect, it } from 'vitest'
import { storeBuildInputSchema, storeBuildPlanSchema } from '@platform/schemas'
import { planStoreBuild } from './store-builder-agent.js'

describe('store-builder-agent', () => {
  it('plans a deterministic shop when Gemini is unavailable', async () => {
    const input = storeBuildInputSchema.parse({
      prompt: 'Build a ceramics shop called Clay & Co with warm essentials and EUR pricing',
      siteId: '00000000-0000-4000-8000-000000000001',
      currency: 'EUR',
      productCount: 4,
      themePreset: 'editorial-ink',
    })

    const plan = await planStoreBuild(input)
    expect(storeBuildPlanSchema.safeParse(plan).success).toBe(true)
    expect(plan.collections.length).toBeGreaterThanOrEqual(1)
    expect(plan.products.length).toBe(4)
    expect(plan.products[0]?.variants.length).toBeGreaterThanOrEqual(1)
    expect(plan.shipping.price.currency).toBe('EUR')
    expect(plan.welcomeDiscountCode).toBe('WELCOME10')
  })
})
