import { getBlock, PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import {
  defaultMotionSitesTemplate,
  getTemplate,
  parseSourcePrompt,
  truncateSourcePrompt,
  type SourcePromptDesignHints,
} from '@platform/templates'
import type { BlockCategory, GenerationRequest, PerformanceClass, SiteTemplate } from '@platform/schemas'

/**
 * How a chosen template steers generation.
 *
 * A template is a *preference*, never an override. It says "for this site, when
 * you need a hero, this is the one I'd like" — and the budget still decides
 * whether that hero is affordable. The asymmetry is deliberate and is the whole
 * safety property of this file: a template asking for a class-D hero on a
 * class-B site degrades to the best allowed block, and a template can never
 * raise `ceilingForStyle`.
 *
 * It carries no markup and names no assets; the only thing it can add to a page
 * is a preference for one registry block id over another, theme token hints
 * parsed from the MotionSites brief, and plain-language design direction
 * (ADR-0003).
 */

/** What a resolved template contributes to a generation run. */
export interface TemplateSteering {
  template: SiteTemplate
  /** Block preferences keyed by registry category: `hero` → `hero-aurora-01`. */
  preferences: Record<string, string>
  /** The style direction the template implies, ready for a generation request. */
  style: Exclude<GenerationRequest['style'], 'auto'>
  /** Design direction for the copy brief (includes truncated MotionSites prompt). */
  brief: string
  /** Fonts / colours / spacing parsed from `sourcePrompt` for theme steering. */
  designHints: SourcePromptDesignHints
}

/**
 * Turn a template's ordered recipe into per-category preferences.
 *
 * Each recipe entry is looked up in the registry so an id that no longer exists
 * — a block renamed or retired since the catalogue was generated — is dropped
 * rather than carried into planning. First recipe entry per category wins,
 * which preserves the order the template intended.
 */
export function preferencesFromRecipe(blockRecipe: readonly string[]): Record<string, string> {
  const preferences: Record<string, string> = {}

  for (const blockId of blockRecipe) {
    const block = getBlock(blockId)
    if (!block) continue
    if (!preferences[block.category]) preferences[block.category] = block.id
  }

  return preferences
}

/**
 * Resolve a template id into steering.
 *
 * When `templateId` is omitted / null / empty, we default to
 * {@link defaultMotionSitesTemplate} (first catalogue entry with a non-empty
 * `sourcePrompt`). An unknown id still returns `null` so a stale picker value
 * degrades to ordinary generation rather than failing the build.
 */
export function resolveTemplate(templateId: string | undefined | null): TemplateSteering | null {
  const requested = templateId?.trim()
  const resolvedId = requested || defaultMotionSitesTemplate()?.id
  if (!resolvedId) return null

  const template = getTemplate(resolvedId)
  if (!template) return null

  const designHints = parseSourcePrompt(template.sourcePrompt)

  return {
    template,
    preferences: preferencesFromRecipe(template.blockRecipe),
    style: template.style[0] ?? 'modern',
    brief: briefFor(template, designHints),
    designHints,
  }
}

/**
 * The design direction, in words a copy provider can act on. Includes a
 * truncated MotionSites `sourcePrompt` so tone, typography intent and spacing
 * match the catalogue brief. Deliberately about mood and constraints rather
 * than layout markup: asking a model to emit React/CSS is how ADR-0003 breaks.
 */
export function briefFor(
  template: SiteTemplate,
  hints: SourcePromptDesignHints = parseSourcePrompt(template.sourcePrompt),
): string {
  const motion = template.motionType.filter((type) => type !== 'static')
  const parts = [
    `Design direction: ${template.style.join(', ')}.`,
    motion.length ? `The page moves: ${motion.join(', ')}.` : 'The page is still — the writing carries it.',
    template.complexity === 'simple'
      ? 'Keep the copy short; there is little to hide behind.'
      : 'The layout is rich, so the copy must stay specific and short.',
  ]

  if (hints.fontHeading || hints.fontBody) {
    parts.push(
      `Typography cue: heading ${hints.fontHeading ?? 'as brand'}, body ${hints.fontBody ?? hints.fontHeading ?? 'as brand'}.`,
    )
  }

  for (const constraint of hints.spacingConstraints) {
    parts.push(constraint)
  }

  const source = template.sourcePrompt.trim()
  if (source) {
    parts.push('MotionSites design brief (mood and constraints only — do not emit markup or component source):')
    parts.push(truncateSourcePrompt(source))
  }

  return parts.join(' ')
}

/**
 * Whether a template is worth offering for a site with this ceiling.
 *
 * A heavier template is not *forbidden* — its recipe simply degrades — but
 * offering a class-D showcase to a site that will render class-B blocks sets an
 * expectation the result cannot meet, so the picker filters it out.
 */
export function fitsCeiling(template: SiteTemplate, ceiling: PerformanceClass): boolean {
  return PERFORMANCE_CLASS_ORDER[template.performanceClass] <= PERFORMANCE_CLASS_ORDER[ceiling]
}

/**
 * The preference for one category, or `undefined`. `selectBlock` takes this as
 * a hint and ignores it whenever the block is missing from the ceiling-filtered
 * pool — which is exactly how a too-heavy preference degrades.
 */
export function preferredBlock(
  steering: TemplateSteering | null,
  category: BlockCategory | string,
): string | undefined {
  return steering?.preferences[category]
}
