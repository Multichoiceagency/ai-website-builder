/**
 * `@platform/assets` — the reusable asset system.
 *
 * An **asset** is a saved arrangement of sections that drops into any page. It
 * is *data*: an ordered array of `{ block, props, motion? }` referencing blocks
 * that already exist in `@platform/blocks`. Inserting one adds no renderer,
 * fetches no source and executes nothing new (ADR-0003).
 *
 * Two tiers share one shape. Workspace assets are rows behind RLS and belong to
 * the core API. Platform presets are the generated catalogue below — committed,
 * reviewable in a diff, and never fetched at runtime, same posture as
 * `@platform/templates`.
 *
 * The licence register travels with the catalogue. Every source the importer
 * has ever considered is in it, including the refused ones, so "why is there no
 * Aceternity preset?" has an answer that outlives the person who made the call.
 */
import { PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import {
  isShippableLicence,
  type AssetCatalog,
  type AssetPreset,
  type AssetQuery,
  type AssetSourceRegisterEntry,
} from '@platform/schemas'
import { ASSET_CATALOG } from './catalog.generated.js'

export { ASSET_CATALOG } from './catalog.generated.js'
export * from './document.js'

export const assetCatalog: AssetCatalog = ASSET_CATALOG

export function listAssetPresets(): AssetPreset[] {
  return assetCatalog.presets
}

export function getAssetPreset(id: string): AssetPreset | undefined {
  return assetCatalog.presets.find((preset) => preset.id === id)
}

/** Every source considered, cleared or refused. The audit trail, in code. */
export function listAssetSources(): AssetSourceRegisterEntry[] {
  return assetCatalog.sources
}

/** The sources a preset may actually be derived from today. */
export function listImportableSources(): AssetSourceRegisterEntry[] {
  return assetCatalog.sources.filter((source) => source.importable && isShippableLicence(source.licence))
}

/**
 * The one query the Assets panel, the API and the preset catalogue share, so a
 * preset a human can see is a preset the generator can be pointed at.
 *
 * `maxPerformanceClass` excludes presets whose *own* class the site cannot
 * afford. Per-section filtering is a separate concern and belongs to
 * `applyPerformanceCeiling` — this is browsing, not the budget.
 */
export function searchAssetPresets(query: AssetQuery = { limit: 200 }): AssetPreset[] {
  const search = query.search?.trim().toLowerCase()
  const ceiling = query.maxPerformanceClass ? PERFORMANCE_CLASS_ORDER[query.maxPerformanceClass] : undefined
  const wantedTags = query.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ?? []

  const matches = listAssetPresets().filter((preset) => {
    if (query.tier === 'workspace') return false
    if (query.collection && preset.collection !== query.collection) return false
    if (ceiling !== undefined && PERFORMANCE_CLASS_ORDER[preset.performanceClass] > ceiling) return false
    if (wantedTags.length) {
      const owned = preset.tags.map((tag) => tag.toLowerCase())
      // Every requested tag must match: `tags: ['dark', 'pricing']` means both.
      if (!wantedTags.every((tag) => owned.includes(tag))) return false
    }
    if (search) {
      const haystack = `${preset.id} ${preset.name} ${preset.description} ${preset.collection} ${preset.tags.join(' ')}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    return true
  })

  return matches.slice(0, query.limit ?? 200)
}
