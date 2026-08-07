import { z } from 'zod'
import {
  MOTION_PRESETS,
  sectionMotionSchema,
  type MotionPreset,
  type SectionMotion,
} from './blocks.js'
import type { TemplateMotionType } from './templates.js'

/**
 * Motion templates — Elementor-style entrance recipes the editor can apply.
 *
 * A template is a complete `SectionMotion` plus chrome for the properties
 * panel (label, icon, short hint). The stored document still holds only
 * intent tokens (`preset`, `trigger`, …); these recipes never become
 * animation code (ADR-0003).
 *
 * Ids match `MOTION_PRESETS` one-to-one so a preset added to the schema
 * without a template entry is an obvious gap in review.
 */

export interface MotionTemplate {
  /** Same token as `SectionMotion.preset`. */
  id: MotionPreset
  label: string
  /** `UiIcon` name — a string token, not a component. */
  icon: string
  /** One line under the tile. Keep it short. */
  hint: string
  /** Full motion intent applied when the user picks this template. */
  motion: SectionMotion
}

const template = (
  id: MotionPreset,
  label: string,
  icon: string,
  hint: string,
  motion: Partial<SectionMotion>,
): MotionTemplate => ({
  id,
  label,
  icon,
  hint,
  motion: sectionMotionSchema.parse(
    id === 'none' ? { preset: 'none', trigger: 'none', delay: 0, stagger: 0.08, once: true } : { preset: id, ...motion },
  ),
})

/**
 * Ordered for the properties grid: none first, then simple fades/slides,
 * then compound recipes. Keep this list aligned with `MOTION_PRESETS`.
 */
export const MOTION_TEMPLATES: readonly MotionTemplate[] = [
  template('none', 'None', 'motion-none', 'No entrance', { trigger: 'none' }),
  template('fade-in', 'Fade', 'motion-fade', 'Opacity only', { trigger: 'viewport' }),
  template('fade-up', 'Fade up', 'motion-fade-up', 'Rise into place', { trigger: 'viewport' }),
  template('fade-down', 'Fade down', 'motion-fade-down', 'Settle from above', { trigger: 'viewport' }),
  template('slide-left', 'Slide left', 'motion-slide-left', 'Enter from the right', { trigger: 'viewport' }),
  template('slide-right', 'Slide right', 'motion-slide-right', 'Enter from the left', { trigger: 'viewport' }),
  template('scale-in', 'Scale', 'motion-scale', 'Grow into place', { trigger: 'viewport' }),
  template('blur-in', 'Blur', 'motion-blur', 'Sharpen into focus', { trigger: 'viewport' }),
  template('stagger-children', 'Stagger', 'motion-stagger', 'Children one by one', {
    trigger: 'viewport',
    stagger: 0.08,
  }),
  template('hero-reveal', 'Hero', 'motion-hero', 'On-load hero entrance', {
    trigger: 'load',
    delay: 0.05,
  }),
  template('product-reveal', 'Product', 'motion-product', 'Product-card lift', {
    trigger: 'viewport',
    delay: 0.04,
  }),
] as const

/** Every schema preset must have a template, and vice versa. */
const templateIds = new Set(MOTION_TEMPLATES.map((entry) => entry.id))
for (const preset of MOTION_PRESETS) {
  if (!templateIds.has(preset)) {
    throw new Error(`MOTION_TEMPLATES is missing preset "${preset}"`)
  }
}

export const motionTemplateIdSchema = z.enum(MOTION_PRESETS)
export type MotionTemplateId = z.infer<typeof motionTemplateIdSchema>

export function listMotionTemplates(): readonly MotionTemplate[] {
  return MOTION_TEMPLATES
}

export function getMotionTemplate(id: string): MotionTemplate | undefined {
  return MOTION_TEMPLATES.find((entry) => entry.id === id)
}

/** Apply a named template over the section's current motion (delay/once kept when unset). */
export function applyMotionTemplate(
  current: Partial<SectionMotion> | null | undefined,
  templateId: MotionPreset,
): SectionMotion {
  const recipe = getMotionTemplate(templateId)?.motion ?? sectionMotionSchema.parse({ preset: templateId })
  const base = current ?? {}
  return sectionMotionSchema.parse({
    ...recipe,
    // Keep an explicit delay/once the user already tuned, unless picking None.
    delay: templateId === 'none' ? 0 : (base.delay ?? recipe.delay),
    once: base.once ?? recipe.once,
    stagger:
      templateId === 'stagger-children' ? (base.stagger ?? recipe.stagger) : recipe.stagger,
  })
}

/**
 * Map a MotionSites template's motion character onto a section intent.
 *
 * Specialized presets (`none` for scroll-choreography blocks, `hero-reveal`,
 * `product-reveal`) are left alone — those blocks own their motion.
 */
export function motionRecipeFromTemplateTypes(
  types: readonly TemplateMotionType[],
): Partial<SectionMotion> | null {
  if (!types.length) {
    // Framer Motion–style default for MotionSites / template inserts.
    return { preset: 'fade-up', trigger: 'viewport' }
  }
  if (types.length === 1 && types[0] === 'static') {
    return { preset: 'fade-up', trigger: 'viewport' }
  }
  if (types.includes('scroll-reveal')) {
    return { preset: 'fade-up', trigger: 'viewport' }
  }
  if (types.includes('entrance')) {
    return { preset: 'fade-up', trigger: 'load' }
  }
  if (types.includes('marquee') || types.includes('carousel')) {
    return { preset: 'fade-in', trigger: 'viewport' }
  }
  if (types.includes('hover') || types.includes('morph') || types.includes('text-effect')) {
    return { preset: 'fade-up', trigger: 'viewport' }
  }
  // Any other MotionSites motion character still gets an entrance.
  return { preset: 'fade-up', trigger: 'viewport' }
}

/** Merge a template-type recipe into a section motion without clobbering opt-outs. */
export function applyTemplateMotionTypes(
  current: Partial<SectionMotion> | null | undefined,
  types: readonly TemplateMotionType[],
): SectionMotion {
  const parsed = sectionMotionSchema.parse(current ?? {})
  if (parsed.preset === 'none' || parsed.preset === 'hero-reveal' || parsed.preset === 'product-reveal') {
    return parsed
  }
  const recipe = motionRecipeFromTemplateTypes(types)
  if (!recipe) return parsed
  return sectionMotionSchema.parse({ ...parsed, ...recipe })
}
