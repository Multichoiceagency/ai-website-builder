import { createSection, getBlock, PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import type { PerformanceClass, Section } from '@platform/schemas'

/**
 * Pure functions over an asset's composition.
 *
 * These are the canonical copies. `services/core-api/src/lib/assets.ts` carries
 * a duplicate of `derivePerformanceClass`, `fingerprintSections` and
 * `applyPerformanceCeiling` because the service cannot yet depend on this
 * package; the two must stay behaviourally identical, and should collapse into
 * one import once that dependency exists.
 */

/**
 * The heaviest block in the composition wins.
 *
 * Derived rather than declared so an asset cannot understate its own cost and
 * slip past a site's performance ceiling (ADR-0003). An unknown block id is
 * treated as `D`: something we cannot score is something we must not assume is
 * cheap.
 */
export function derivePerformanceClass(sections: readonly Section[]): PerformanceClass {
  let heaviest: PerformanceClass = 'A'

  for (const section of sections) {
    const definition = getBlock(section.block)
    const current: PerformanceClass = definition ? definition.performanceClass : 'D'
    if (PERFORMANCE_CLASS_ORDER[current] > PERFORMANCE_CLASS_ORDER[heaviest]) heaviest = current
  }

  return heaviest
}

/**
 * Stable JSON: object keys sorted at every depth, so two structurally identical
 * compositions serialise identically regardless of the order the editor happened
 * to write their props in.
 */
function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonicalise(entry)]),
    )
  }
  return value
}

/**
 * FNV-1a over the canonical form, widened to 160 bits by hashing four salted
 * passes. Deliberately dependency-free and identical in Node and the browser —
 * `node:crypto` is not available in the dashboard, and a fingerprint that only
 * one half of the platform can compute is not a fingerprint.
 *
 * This is a *sameness* check, not a security primitive: a collision produces a
 * spurious "already saved" warning, which the user can ignore. Nothing is
 * authorised or rejected on the strength of it.
 */
function hash(input: string, salt: number): string {
  let value = 0x811c9dc5 ^ salt
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value.toString(16).padStart(8, '0')
}

/**
 * A hash of *what the composition is*, not of the particular copy in hand.
 *
 * Section ids are stripped before hashing: they are regenerated on every insert
 * and on every save, so including them would make every fingerprint unique and
 * duplicate detection permanently useless.
 */
export function fingerprintSections(sections: readonly Section[]): string {
  const stripped = sections.map((section) => ({
    block: section.block,
    props: section.props,
    motion: section.motion,
    visibility: section.visibility,
    seo: section.seo,
  }))

  const canonical = JSON.stringify(canonicalise(stripped))
  return [0, 1, 2, 3, 4].map((salt) => hash(canonical, salt)).join('')
}

/**
 * Keep only the sections a site's performance budget can afford, and report how
 * many were dropped so the UI can say so rather than silently shipping less
 * than the user picked.
 */
export function applyPerformanceCeiling(
  sections: readonly Section[],
  ceiling: PerformanceClass | undefined,
): { sections: Section[]; dropped: number } {
  if (!ceiling) return { sections: [...sections], dropped: 0 }

  const limit = PERFORMANCE_CLASS_ORDER[ceiling]
  const kept = sections.filter((section) => {
    const definition = getBlock(section.block)
    const current: PerformanceClass = definition ? definition.performanceClass : 'D'
    return PERFORMANCE_CLASS_ORDER[current] <= limit
  })

  return { sections: kept, dropped: sections.length - kept.length }
}

/**
 * Prepare an asset's sections for insertion into a page.
 *
 * Every section gets a fresh id. Without this, inserting the same asset twice
 * produces two sections that claim the same identity, and the editor's
 * selection, reordering and undo all start acting on the wrong one. Props,
 * motion, visibility and per-section SEO are carried across unchanged.
 */
export function instantiateSections(sections: readonly Section[]): Section[] {
  return sections.map((section) => {
    const fresh = createSection(section.block, section.props)
    return {
      ...fresh,
      ...(section.motion ? { motion: section.motion } : {}),
      ...(section.visibility ? { visibility: section.visibility } : {}),
      ...(section.seo ? { seo: section.seo } : {}),
    }
  })
}
