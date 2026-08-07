/**
 * `@platform/templates` — the site template catalogue.
 *
 * A template is metadata about a design, never the design itself: a style
 * direction, a motion character, a page archetype and an ordered recipe of
 * registry block ids. Choosing one steers block selection and the copy brief;
 * it can never introduce markup, CSS or a third-party asset (ADR-0003).
 *
 * The catalogue is generated and committed — see
 * `scripts/import-motionsites.mjs` — so nothing is fetched at runtime and the
 * whole thing is reviewable in a diff.
 */
import { PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import {
  type MotionBackground,
  type MotionBackgroundQuery,
  type SiteTemplate,
  type TemplateCatalog,
  type TemplateCollection,
  type TemplateQuery,
} from '@platform/schemas'
import { MOTIONSITES_BACKGROUNDS } from './backgrounds.generated.js'
import { MOTIONSITES_CATALOG } from './catalog.generated.js'
import { MOTIONSITES_ISLAND_READY } from './island-ready.js'

export { MOTIONSITES_CATALOG } from './catalog.generated.js'
export { MOTIONSITES_BACKGROUNDS } from './backgrounds.generated.js'
export { MOTIONSITES_ISLAND_READY } from './island-ready.js'
export {
  parseSourcePrompt,
  truncateSourcePrompt,
  SOURCE_PROMPT_BRIEF_MAX,
  type SourcePromptDesignHints,
} from './parse-source-prompt.js'

export const templateCatalog: TemplateCatalog = MOTIONSITES_CATALOG

const ISLAND_READY = new Set<string>(MOTIONSITES_ISLAND_READY)

export function listTemplates(): SiteTemplate[] {
  return templateCatalog.templates.map((template) => ({
    ...template,
    islandReady: ISLAND_READY.has(template.id) || Boolean(template.islandReady),
  }))
}

export function listTemplateCollections(): TemplateCollection[] {
  return templateCatalog.collections
}

export function getTemplate(id: string): SiteTemplate | undefined {
  const template = templateCatalog.templates.find((entry) => entry.id === id)
  if (!template) return undefined
  return {
    ...template,
    islandReady: ISLAND_READY.has(template.id) || Boolean(template.islandReady),
  }
}

/**
 * Default MotionSites template for generation when the caller did not pick one.
 *
 * Rule: first catalogue-order entry (`MOTIONSITES_CATALOG.templates`) whose
 * `sourcePrompt` is non-empty after trim. Catalogue order is the import order
 * of MotionSites sections (interactive-discovery first today). We do **not**
 * prefer island-ready or hero collection here — the brief itself is the
 * steering signal; island/recipe selection still goes through the registry
 * and performance ceiling (ADR-0003).
 */
export function defaultMotionSitesTemplate(): SiteTemplate | undefined {
  return listTemplates().find((template) => template.sourcePrompt.trim().length > 0)
}

/**
 * The one query the browser, the picker and the generator share, so a template
 * a human can see is a template the generator can be pointed at.
 *
 * `maxPerformanceClass` filters templates whose *own* class is heavier than the
 * site can afford. It is a browsing convenience, not the budget — the real
 * ceiling is enforced again during block selection and always wins.
 */
export function searchTemplates(query: TemplateQuery = { limit: 300 }): SiteTemplate[] {
  const search = query.search?.trim().toLowerCase()
  const ceiling = query.maxPerformanceClass ? PERFORMANCE_CLASS_ORDER[query.maxPerformanceClass] : undefined

  const matches = listTemplates().filter((template) => {
    if (query.collection && template.collection !== query.collection) return false
    if (query.pageType && template.pageType !== query.pageType) return false
    if (query.style && !template.style.includes(query.style)) return false
    if (query.complexity && template.complexity !== query.complexity) return false
    if (query.mobileSafe && !template.mobileSafe) return false
    if (query.freeOnly && !template.isFree) return false
    if (ceiling !== undefined && PERFORMANCE_CLASS_ORDER[template.performanceClass] > ceiling) return false
    if (query.industry && !template.industry.includes('*') && !template.industry.includes(query.industry)) {
      return false
    }
    if (query.motionType?.length && !query.motionType.every((type) => template.motionType.includes(type))) {
      return false
    }
    if (search) {
      const haystack = `${template.id} ${template.title} ${template.category} ${template.collection} ${template.style.join(' ')} ${template.industry.join(' ')} ${template.motionType.join(' ')}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    return true
  })

  return matches.slice(0, query.limit ?? 300)
}

export function listBackgrounds(): MotionBackground[] {
  return MOTIONSITES_BACKGROUNDS.backgrounds
}

export function getBackground(id: string): MotionBackground | undefined {
  return listBackgrounds().find((entry) => entry.id === id)
}

export function searchBackgrounds(query: MotionBackgroundQuery = { limit: 200 }): MotionBackground[] {
  const search = query.search?.trim().toLowerCase()
  const matches = listBackgrounds().filter((entry) => {
    if (query.freeOnly && !entry.isFree) return false
    if (search) {
      const haystack = `${entry.title} ${entry.tags.join(' ')} ${entry.rebuildPrompt}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    return true
  })
  return matches.slice(0, query.limit ?? 200)
}
