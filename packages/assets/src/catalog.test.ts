import { describe, expect, it } from 'vitest'
import { getBlock, PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import {
  assetCatalogSchema,
  assetPresetSchema,
  assetSourceRegisterEntrySchema,
  isShippableLicence,
} from '@platform/schemas'
import {
  applyPerformanceCeiling,
  assetCatalog,
  derivePerformanceClass,
  fingerprintSections,
  instantiateSections,
  listAssetPresets,
  listAssetSources,
  listImportableSources,
  searchAssetPresets,
} from './index.js'

/**
 * The catalogue is generated and committed, so these are the checks that stop a
 * bad generator run from being merged. The licence assertions are the point:
 * a preset whose provenance we cannot state is a liability, and it must fail
 * here rather than reach a customer page.
 */

describe('the preset catalogue', () => {
  it('parses against its own schema', () => {
    expect(() => assetCatalogSchema.parse(assetCatalog)).not.toThrow()
  })

  it('ships at least one preset', () => {
    expect(listAssetPresets().length).toBeGreaterThan(0)
  })

  it('gives every preset a licence that is not unknown', () => {
    for (const preset of listAssetPresets()) {
      expect(isShippableLicence(preset.licence), `${preset.id} has licence "${preset.licence}"`).toBe(true)
    }
  })

  it('refuses an unresolved licence at the schema boundary', () => {
    const [preset] = listAssetPresets()
    expect(() => assetPresetSchema.parse({ ...preset!, licence: 'unknown' })).toThrow()
  })

  it('attributes every preset that came from a third party', () => {
    for (const preset of listAssetPresets()) {
      if (!preset.source.library || preset.source.library === 'platform') continue
      expect(preset.attribution, `${preset.id} is third-party but carries no attribution`).not.toBe('')
    }
  })

  /**
   * The inverse of the check above, and the one that actually got violated: a
   * preset that is ours must not carry somebody else's name. Attribution is a
   * record of an act, not a decoration — labelling our own arrangement as
   * derived manufactures a provenance claim nobody can check, which is a
   * different failure from copying and just as bad for an audit trail.
   */
  it('claims no lineage a preset does not have', () => {
    for (const preset of listAssetPresets()) {
      const thirdParty = Boolean(preset.source.library) && preset.source.library !== 'platform'

      if (!thirdParty) {
        expect(preset.source.derivation, `${preset.id} is ours but declares a derivation`).toBe('none')
        expect(preset.attribution, `${preset.id} is ours but carries an attribution`).toBe('')
        expect(preset.source.url, `${preset.id} is ours but carries a provenance URL`).toBe('')
      } else {
        expect(preset.source.derivation, `${preset.id} names a source but not what happened`).not.toBe('none')
      }
    }
  })

  it('refuses a source record that names a library without saying what happened', () => {
    const [preset] = listAssetPresets()
    expect(() =>
      assetPresetSchema.parse({
        ...preset!,
        source: { library: 'Some UI', demo: '', url: '', derivation: 'none' },
      }),
    ).toThrow()
  })

  it('references only blocks that exist in the registry', () => {
    for (const preset of listAssetPresets()) {
      for (const section of preset.sections) {
        expect(getBlock(section.block), `${preset.id} references unknown block ${section.block}`).toBeDefined()
      }
    }
  })

  it('stores no external URL anywhere a page could render one', () => {
    for (const preset of listAssetPresets()) {
      expect(preset.thumbnail).not.toMatch(/:\/\//)
      // Props are the one place a URL could hide, and they end up in markup.
      expect(JSON.stringify(preset.sections)).not.toMatch(/https?:\/\//)
    }
  })

  it('derives each preset performance class from its heaviest block', () => {
    for (const preset of listAssetPresets()) {
      expect(preset.performanceClass).toBe(derivePerformanceClass(preset.sections))
    }
  })

  it('gives every preset a distinct id', () => {
    const ids = listAssetPresets().map((preset) => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('the licence register', () => {
  it('records every source a preset claims to come from', () => {
    const known = new Set(listAssetSources().map((source) => source.library))
    for (const preset of listAssetPresets()) {
      if (!preset.source.library) continue
      expect(known.has(preset.source.library), `${preset.source.library} is not in the register`).toBe(true)
    }
  })

  it('marks a source with an unresolved licence as not importable', () => {
    for (const source of listAssetSources()) {
      if (isShippableLicence(source.licence)) continue
      expect(source.importable, `${source.library} is "${source.licence}" but marked importable`).toBe(false)
    }
  })

  it('emits no preset from a source that is not importable', () => {
    const refused = new Set(
      listAssetSources().filter((source) => !source.importable).map((source) => source.library),
    )
    for (const preset of listAssetPresets()) {
      expect(refused.has(preset.source.library)).toBe(false)
    }
  })

  /**
   * `proprietary` and `unknown` are both refusals but they are not the same
   * finding, and collapsing them loses the distinction that matters: one may be
   * resolved by reading a licence, the other has been read and says no.
   */
  it('keeps a proprietary source refused and distinguishable from an unresolved one', () => {
    const proprietary = listAssetSources().filter((source) => source.licence === 'proprietary')
    for (const source of proprietary) {
      expect(source.importable).toBe(false)
      expect(isShippableLicence(source.licence)).toBe(false)
      // The evidence is the point: we did not fail to find a licence here, we
      // found one and it refuses us.
      expect(source.evidenceUrl, `${source.library} is proprietary with no evidence URL`).not.toBe('')
    }
  })

  /**
   * MIT's one substantive obligation is reproducing the copyright notice, so an
   * attribution that paraphrases it fails the licence it invokes. This caught a
   * real defect: `themesberg/flowbite` was credited to "Themesberg", the GitHub
   * org, where the LICENSE says `Copyright (c) 2023 Bergside Inc.`
   */
  it('carries a verbatim copyright notice for every cleared third-party source', () => {
    for (const source of listImportableSources()) {
      if (source.library === 'platform') continue
      expect(source.copyrightNotice, `${source.library} has no copyright notice`).toMatch(/^Copyright/)
      expect(source.noticeReadAt, `${source.library} does not record where its notice was read`).not.toBe('')
    }
  })

  it('refuses a cleared source whose notice is described rather than quoted', () => {
    const [source] = listImportableSources().filter((entry) => entry.library !== 'platform')
    expect(() =>
      assetSourceRegisterEntrySchema.parse({ ...source!, copyrightNotice: 'MIT, by the Flowbite team' }),
    ).toThrow()
  })

  /**
   * Two repositories under one GitHub org can have different copyright holders —
   * `themesberg/flowbite` is Bergside Inc., `themesberg/flowbite-vue` is Crafty
   * Dwarf LLC. One entry must never silently vouch for a repo nobody read.
   */
  it('gives each repository its own entry rather than inheriting a sibling’s', () => {
    const byLibrary = new Map(listAssetSources().map((source) => [source.library, source]))

    const pairs: [string, string][] = [
      ['Flowbite', 'flowbite-vue'],
      ['shadcn/ui', 'shadcn-vue'],
    ]

    for (const [upstream, port] of pairs) {
      const a = byLibrary.get(upstream)
      const b = byLibrary.get(port)
      if (!a || !b) continue
      expect(a.copyrightNotice, `${upstream} and ${port} share a notice — one of them was not read`).not.toBe(
        b.copyrightNotice,
      )
      expect(b.noticeReadAt).not.toBe('')
    }
  })

  it('records why every refusal happened', () => {
    for (const source of listAssetSources()) {
      if (source.importable) continue
      expect(source.notes, `${source.library} was refused without a reason`).not.toBe('')
    }
  })
})

describe('instantiateSections', () => {
  it('gives every inserted section a new id', () => {
    const preset = listAssetPresets()[0]!
    const first = instantiateSections(preset.sections)
    const second = instantiateSections(preset.sections)

    const originals = preset.sections.map((section) => section.id)
    for (const section of first) expect(originals).not.toContain(section.id)

    // Two inserts of the same asset must not collide with each other either.
    const overlap = first.map((s) => s.id).filter((id) => second.some((other) => other.id === id))
    expect(overlap).toHaveLength(0)
  })

  it('keeps the blocks and their order', () => {
    const preset = listAssetPresets()[0]!
    expect(instantiateSections(preset.sections).map((s) => s.block)).toEqual(
      preset.sections.map((s) => s.block),
    )
  })
})

describe('fingerprintSections', () => {
  it('ignores section ids, so the same arrangement hashes the same', () => {
    const preset = listAssetPresets()[0]!
    expect(fingerprintSections(instantiateSections(preset.sections))).toBe(
      fingerprintSections(preset.sections),
    )
  })

  it('ignores prop key order', () => {
    const a = [{ id: 'a', block: 'hero-split-01', props: { headline: 'One', eyebrow: 'Two' } }]
    const b = [{ id: 'b', block: 'hero-split-01', props: { eyebrow: 'Two', headline: 'One' } }]
    expect(fingerprintSections(a)).toBe(fingerprintSections(b))
  })

  it('changes when the arrangement changes', () => {
    const preset = listAssetPresets()[0]!
    const shortened = preset.sections.slice(0, 1)
    if (preset.sections.length > 1) {
      expect(fingerprintSections(shortened)).not.toBe(fingerprintSections(preset.sections))
    }
  })
})

describe('applyPerformanceCeiling', () => {
  it('keeps everything when no ceiling is set', () => {
    const preset = listAssetPresets()[0]!
    const result = applyPerformanceCeiling(preset.sections, undefined)
    expect(result.sections).toHaveLength(preset.sections.length)
    expect(result.dropped).toBe(0)
  })

  it('drops the sections a budget cannot afford and counts them', () => {
    const heavy = listAssetPresets().find((preset) =>
      preset.sections.some((section) => (getBlock(section.block)?.performanceClass ?? 'D') !== 'A'),
    )
    if (!heavy) return

    const result = applyPerformanceCeiling(heavy.sections, 'A')
    expect(result.dropped).toBeGreaterThan(0)
    expect(result.sections).toHaveLength(heavy.sections.length - result.dropped)
    for (const section of result.sections) {
      expect(PERFORMANCE_CLASS_ORDER[getBlock(section.block)!.performanceClass]).toBe(0)
    }
  })
})

describe('searchAssetPresets', () => {
  it('filters by collection', () => {
    const collection = listAssetPresets()[0]!.collection
    const results = searchAssetPresets({ collection, limit: 200 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((preset) => preset.collection === collection)).toBe(true)
  })

  it('excludes presets heavier than the ceiling', () => {
    const results = searchAssetPresets({ maxPerformanceClass: 'A', limit: 200 })
    expect(results.every((preset) => preset.performanceClass === 'A')).toBe(true)
  })

  it('returns nothing when the caller only wants workspace assets', () => {
    expect(searchAssetPresets({ tier: 'workspace', limit: 200 })).toHaveLength(0)
  })
})
