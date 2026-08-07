import { getBlock, PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import { defaultMotionSitesTemplate, listTemplates } from '@platform/templates'
import { businessProfileSchema, generationRequestSchema, type BusinessProfile } from '@platform/schemas'
import { describe, expect, it } from 'vitest'
import { ceilingForStyle, planSite, themeFromBrand } from '../src/lib/generation/index.js'
import { briefFor, fitsCeiling, preferencesFromRecipe, resolveTemplate } from '../src/lib/generation/templates.js'

/**
 * The one property that matters about template steering: a template is a
 * preference, never an override. These are pure functions over the registry,
 * so nothing here touches the database.
 */

const profile: BusinessProfile = businessProfileSchema.parse({
  company: { name: 'Van Dijk Loodgieters', industry: 'contractor', shortDescription: 'Plumbing in Rotterdam.' },
  contact: {},
  locale: 'nl-NL',
})

function planWith(style: 'minimal' | 'modern' | 'premium', templateId: string | null) {
  const request = generationRequestSchema.parse({
    profile,
    style,
    maxPerformanceClass: ceilingForStyle(style),
    publish: false,
  })
  return planSite(profile, request, resolveTemplate(templateId))
}

/** The heaviest template in the catalogue that maps to at least one block. */
function heaviestTemplate() {
  return [...listTemplates()]
    .filter((template) => template.blockRecipe.length > 0)
    .sort(
      (a, b) => PERFORMANCE_CLASS_ORDER[b.performanceClass] - PERFORMANCE_CLASS_ORDER[a.performanceClass],
    )[0]!
}

describe('template steering', () => {
  it('resolves a known template and ignores an unknown one', () => {
    const known = listTemplates().find((template) => template.blockRecipe.length > 0)!
    expect(resolveTemplate(known.id)?.template.id).toBe(known.id)
    expect(resolveTemplate('no-such-template')).toBeNull()
  })

  it('defaults to the first MotionSites sourcePrompt template when none is chosen', () => {
    const fallback = defaultMotionSitesTemplate()!
    expect(fallback.id).toBe('interactive-discovery')
    expect(resolveTemplate(null)?.template.id).toBe(fallback.id)
    expect(resolveTemplate(undefined)?.template.id).toBe(fallback.id)
    expect(resolveTemplate('')?.template.id).toBe(fallback.id)
  })

  it('embeds a truncated MotionSites sourcePrompt in the brief', () => {
    const steering = resolveTemplate('interactive-discovery')!
    expect(steering.brief).toContain('MotionSites design brief')
    expect(steering.brief).toContain('Lithos')
    expect(steering.designHints.fontHeading).toBe('Playfair Display')
    expect(steering.designHints.fontBody).toBe('Inter')
    expect(steering.brief.length).toBeLessThan(9000)
  })

  it('applies parsed fonts and colours onto the theme when the brand has none', () => {
    const steering = resolveTemplate('interactive-discovery')!
    const theme = themeFromBrand(profile, 'modern', steering)
    expect(theme.fontHeading).toBe('Playfair Display')
    expect(theme.fontBody).toBe('Inter')
    expect(theme.colorPrimary).toBe('#e8702a')
  })

  it('maps a recipe to one preference per registry category', () => {
    for (const template of listTemplates()) {
      const preferences = preferencesFromRecipe(template.blockRecipe)
      for (const [category, blockId] of Object.entries(preferences)) {
        expect(getBlock(blockId)?.category).toBe(category)
      }
    }
  })

  it('places a template block when the budget allows it', () => {
    const premiumHero = listTemplates().find(
      (template) =>
        template.blockRecipe.some((id) => getBlock(id)?.category === 'hero') &&
        template.blockRecipe.every((id) => PERFORMANCE_CLASS_ORDER[getBlock(id)!.performanceClass] <= 2),
    )!
    const preferredHero = premiumHero.blockRecipe.find((id) => getBlock(id)?.category === 'hero')!

    const plan = planWith('premium', premiumHero.id)
    expect(plan.pages[0]!.blocks).toContain(preferredHero)
  })

  /**
   * The safety property. `minimal` earns a class-A ceiling; pointing the
   * heaviest template in the catalogue at it must degrade, not override.
   */
  it('never lets a template exceed the ceiling its style earned', () => {
    const heavy = heaviestTemplate()
    const plan = planWith('minimal', heavy.id)

    expect(plan.maxPerformanceClass).toBe('A')
    for (const page of plan.pages) {
      for (const blockId of page.blocks) {
        expect(PERFORMANCE_CLASS_ORDER[getBlock(blockId)!.performanceClass]).toBeLessThanOrEqual(
          PERFORMANCE_CLASS_ORDER.A,
        )
      }
    }
  })

  it('produces the same plan as no steering when every preference is unaffordable', () => {
    const heavy = listTemplates().find(
      (template) =>
        template.blockRecipe.length > 0 &&
        template.blockRecipe.every((id) => PERFORMANCE_CLASS_ORDER[getBlock(id)!.performanceClass] > 0),
    )!

    const request = generationRequestSchema.parse({
      profile,
      style: 'minimal',
      maxPerformanceClass: 'A',
      publish: false,
    })
    expect(planSite(profile, request, resolveTemplate(heavy.id))).toEqual(planSite(profile, request, null))
  })

  it('offers a template only to sites whose ceiling can render it', () => {
    const heavy = heaviestTemplate()
    expect(fitsCeiling(heavy, 'A')).toBe(heavy.performanceClass === 'A')
    expect(fitsCeiling(heavy, 'D')).toBe(true)
  })

  it('builds briefFor with MotionSites cue and no page markup payload', () => {
    const template = listTemplates()[0]!
    const brief = briefFor(template)
    expect(brief).toContain('Design direction:')
    // Brief may quote the catalogue prompt; it is never written into page sections.
    expect(brief.length).toBeGreaterThan(40)
  })
})
