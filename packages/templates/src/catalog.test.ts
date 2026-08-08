import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBlock } from '@platform/blocks'
import { siteTemplateSchema, templateCatalogSchema } from '@platform/schemas'
import { describe, expect, it } from 'vitest'
import { getTemplate, listTemplateCollections, listTemplates, searchTemplates, templateCatalog } from './index.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const publicDir = join(repoRoot, 'apps', 'dashboard', 'public')

describe('template catalogue', () => {
  it('validates as a whole against the schema', () => {
    expect(() => templateCatalogSchema.parse(templateCatalog)).not.toThrow()
  })

  it('validates every entry individually', () => {
    const invalid: string[] = []
    for (const template of listTemplates()) {
      const result = siteTemplateSchema.safeParse(template)
      if (!result.success) invalid.push(`${template.id}: ${result.error.issues[0]?.message}`)
    }
    expect(invalid).toEqual([])
  })

  it('has unique ids', () => {
    const ids = listTemplates().map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names only block ids that exist in the registry', () => {
    const unknown: string[] = []
    for (const template of listTemplates()) {
      for (const blockId of template.blockRecipe) {
        if (!getBlock(blockId)) unknown.push(`${template.id} → ${blockId}`)
      }
    }
    expect(unknown).toEqual([])
  })

  /**
   * The source library pins every design to a third party's CDN. A template
   * that carried one of those URLs would make a customer page hotlink somebody
   * else's storage, so the whole catalogue is checked, not just the fields we
   * expect to be risky.
   */
  it('references no external asset URL anywhere', () => {
    const offenders = listTemplates()
      .filter((template) => /https?:\/\/|\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(JSON.stringify(template)))
      .map((template) => template.id)
    expect(offenders).toEqual([])
  })

  /**
   * Catalogue chrome may point at first-party `/motionsites/...` previews.
   * `sourcePrompt` is design-brief prose (never rendered) and may mention
   * example asset names — only the preview fields are load-bearing.
   */
  it('keeps preview media on same-origin /motionsites paths only', () => {
    const MEDIA = /\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|mov|m3u8|mp3)$/i
    const offenders: string[] = []
    for (const template of listTemplates()) {
      for (const key of ['previewImage', 'previewVideo'] as const) {
        const value = template[key]
        if (!value) continue
        if (!value.startsWith('/motionsites/') || !MEDIA.test(value)) {
          offenders.push(`${template.id}.${key}=${value}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('allows only same-origin Motionsites preview fields on the schema', () => {
    const fields = new Set(Object.keys(siteTemplateSchema.shape))
    expect(fields.has('previewImage')).toBe(true)
    expect(fields.has('previewVideo')).toBe(true)
    expect(fields.has('islandReady')).toBe(true)
    for (const banned of ['thumbnail', 'image', 'preview', 'screenshot']) {
      expect(fields.has(banned), `"${banned}" is back on the template schema`).toBe(false)
    }
  })

  it('overlays islandReady from MOTIONSITES_ISLAND_READY', () => {
    expect(getTemplate('velorah-hero')?.islandReady).toBe(true)
    expect(getTemplate('asme-hero')?.islandReady).toBe(true)
    expect(getTemplate('wanderful-hero')?.islandReady).toBe(true)
    expect(listTemplates().filter((template) => template.islandReady).map((t) => t.id).sort()).toEqual([
      'asme-hero',
      'interactive-discovery',
      'velorah-hero',
      'wanderful-hero',
    ])
    expect(getTemplate('interactive-discovery')?.islandReady).toBe(true)
  })

  /**
   * The dashboard used to serve 142 vendored screenshots from here. Nothing may
   * put them back: this asserts the directory itself stays absent.
   */
  it('ships no vendored template images in the dashboard', () => {
    expect(existsSync(join(publicDir, 'templates'))).toBe(false)
  })

  it('groups every template into a declared collection with a matching count', () => {
    const declared = new Map(listTemplateCollections().map((collection) => [collection.id, collection.count]))
    const actual = new Map<string, number>()
    for (const template of listTemplates()) {
      actual.set(template.collection, (actual.get(template.collection) ?? 0) + 1)
    }

    for (const [id, count] of actual) {
      expect(declared.get(id), `collection "${id}" is not declared`).toBe(count)
    }
    expect([...declared.keys()].sort()).toEqual([...actual.keys()].sort())
  })

  it('gives a landing template a whole-page recipe and a section template a single band', () => {
    const landings = listTemplates().filter((template) => template.pageType === 'landing' && template.blockRecipe.length)
    const sections = listTemplates().filter((template) => template.pageType === 'section' && template.blockRecipe.length)

    expect(landings.every((template) => template.blockRecipe.length >= 3)).toBe(true)
    expect(sections.every((template) => template.blockRecipe.length === 1)).toBe(true)
  })

  it('never repeats a block within one recipe', () => {
    const repeated = listTemplates()
      .filter((template) => new Set(template.blockRecipe).size !== template.blockRecipe.length)
      .map((template) => template.id)
    expect(repeated).toEqual([])
  })
})

describe('searchTemplates', () => {
  it('filters by collection', () => {
    const heroes = searchTemplates({ collection: 'hero', limit: 500 })
    expect(heroes.length).toBeGreaterThan(0)
    expect(heroes.every((template) => template.collection === 'hero')).toBe(true)
  })

  it('never returns a template heavier than the requested ceiling', () => {
    const light = searchTemplates({ maxPerformanceClass: 'B', limit: 500 })
    expect(light.every((template) => template.performanceClass === 'A' || template.performanceClass === 'B')).toBe(true)
  })

  it('matches on title as well as on metadata', () => {
    const first = listTemplates()[0]!
    expect(searchTemplates({ search: first.title, limit: 500 }).map((t) => t.id)).toContain(first.id)
  })

  it('includes Shadcn Space free-block recipes', () => {
    const space = listTemplates().filter((template) => template.id.startsWith('shadcnspace-'))
    expect(space.length).toBeGreaterThan(0)
    expect(space.every((template) => template.isFree)).toBe(true)
    expect(space.every((template) => template.sourcePrompt.trim().length > 0)).toBe(true)
  })

  it('includes Shadcn Space full landing-page templates', () => {
    const landings = listTemplates().filter((template) => template.id.startsWith('shadcnspace-landing-'))
    expect(landings.length).toBeGreaterThanOrEqual(10)
    expect(landings.every((template) => template.pageType === 'landing')).toBe(true)
    expect(landings.every((template) => template.blockRecipe.length >= 3)).toBe(true)
    expect(landings.every((template) => template.sourcePrompt.trim().length > 0)).toBe(true)
    expect(landings.every((template) => !/https?:\/\//i.test(template.sourcePrompt))).toBe(true)
  })

  it('includes Magic UI free registry recipes', () => {
    const magic = listTemplates().filter((template) => template.id.startsWith('magicui-'))
    expect(magic.length).toBeGreaterThan(0)
    expect(magic.every((template) => template.isFree)).toBe(true)
    expect(magic.every((template) => template.sourcePrompt.trim().length > 0)).toBe(true)
    expect(magic.some((template) => template.id.includes('recipe-'))).toBe(true)
  })

  it('includes Studio layout recipes from allowlisted marketing repos', () => {
    const studio = listTemplates().filter((template) => template.id.startsWith('studio-'))
    expect(studio.length).toBeGreaterThanOrEqual(5)
    expect(studio.every((template) => template.pageType === 'landing')).toBe(true)
    expect(studio.every((template) => template.islandReady === false)).toBe(true)
    expect(studio.every((template) => template.blockRecipe.length >= 3)).toBe(true)
    expect(studio.every((template) => template.sourcePrompt.trim().length > 0)).toBe(true)
    expect(studio.every((template) => !/https?:\/\//i.test(template.sourcePrompt))).toBe(true)
    expect(studio.every((template) => !/import\s+|export\s+|className=/i.test(template.sourcePrompt))).toBe(true)
  })

  it('honours the limit', () => {
    expect(searchTemplates({ limit: 5 })).toHaveLength(5)
  })
})

describe('getTemplate', () => {
  it('finds a template by id', () => {
    const first = listTemplates()[0]!
    expect(getTemplate(first.id)?.title).toBe(first.title)
  })

  it('returns undefined for an unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeUndefined()
  })
})
