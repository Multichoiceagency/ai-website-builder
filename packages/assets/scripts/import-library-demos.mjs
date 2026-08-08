#!/usr/bin/env node
/**
 * Normalise third-party UI-library demos into platform asset presets.
 *
 * ===========================================================================
 * READ THIS BEFORE ADDING A SOURCE
 * ===========================================================================
 *
 * WHAT THIS IMPORTER TAKES, AND WHAT IT REFUSES TO TAKE
 *
 * It takes exactly one thing from a library demo: the *shape of the page* —
 * which kinds of section appear, in what order. That is a layout idea, and it
 * is expressed here as an ordered list of ids that already exist in our own
 * block registry.
 *
 * It never takes, copies, vendors, transforms or stores:
 *   · component source, JSX/HTML markup, CSS or Tailwind class strings
 *   · images, fonts, videos, icons or any other binary asset
 *   · a URL pointing at somebody else's bucket or CDN — putting one in a
 *     customer page makes our customers' traffic that third party's bandwidth
 *     bill, and it is not ours to spend. The templates importer refuses this
 *     for the same reason, and `assetSchema.thumbnail` enforces it at the
 *     schema boundary so this script cannot get it wrong.
 *
 * The output is therefore data about *our own* blocks. A preset that says
 * "header, then a split hero, then a logo strip, then a pricing table" renders
 * entirely from code we wrote. Nothing new executes at runtime, which is the
 * requirement ADR-0003 exists to hold.
 *
 * WHY THE LICENCE STILL MATTERS EVEN THOUGH WE COPY NO CODE
 *
 * Because "we only took the arrangement" is an argument, not a certainty, and
 * an argument is a bad thing to be holding when a letter arrives. Two rules,
 * neither of which is negotiable:
 *
 *   1. A source with an explicit permissive licence (MIT, Apache-2.0,
 *      BSD-3-Clause, CC0) may be used, with its attribution retained and
 *      carried into the UI.
 *
 *   2. A source WITHOUT an explicit permissive licence is recorded with
 *      `licence: "unknown"` and `importable: false`, and every demo belonging
 *      to it is skipped. "Free to look at" is not a licence. "The site says
 *      copy and paste" is not a licence unless it is written down somewhere
 *      that survives the site being redesigned. A missing licence means all
 *      rights reserved by default, and the fact that a component is visible in
 *      a browser changes nothing about that.
 *
 * There is no third rule where a judgement call gets made at import time. If
 * you cannot point at a LICENSE file, the answer is `unknown` and a human
 * decides later. Getting this wrong exposes the business to a real claim, and
 * "an AI copied it" is not a defence.
 *
 * WHERE THE LICENCE FACTS LIVE
 *
 * `scripts/sources.json`. Every source ever considered stays in that file,
 * including — especially including — the refused ones, each with the URL where
 * the licence was read or the note recording that none was found. A source
 * that vanishes from the register looks like a source that was never checked.
 *
 * ===========================================================================
 *
 * Usage:
 *   node scripts/import-library-demos.mjs [--dry-run]
 *
 * Reads:
 *   scripts/sources.json        — the licence register
 *   scripts/library-demos.json  — demo → block-recipe mappings
 *
 * Writes:
 *   packages/assets/src/catalog.generated.ts
 *   services/core-api/src/lib/asset-presets.generated.ts
 *
 * The second output is a copy, not a second source of truth: the service
 * cannot yet depend on `@platform/assets`, and a compiled-in catalogue beats a
 * runtime fetch. Delete it and import the package once that dependency exists.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSection, getBlock, PERFORMANCE_CLASS_ORDER } from '@platform/blocks'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, '..')
const repoRoot = resolve(packageRoot, '..', '..')

const dryRun = process.argv.slice(2).includes('--dry-run')

const SOURCES_IN = join(here, 'sources.json')
const DEMOS_IN = join(here, 'library-demos.json')
const CATALOG_OUT = join(packageRoot, 'src', 'catalog.generated.ts')
const SERVICE_OUT = join(repoRoot, 'services', 'core-api', 'src', 'lib', 'asset-presets.generated.ts')

/** Licences under which a derived layout may actually ship. Mirrors the schema. */
const SHIPPABLE = new Set(['platform-owned', 'mit', 'apache-2.0', 'bsd-3-clause', 'cc0'])

/** Human labels for the attribution line. */
const LICENCE_LABEL = {
  mit: 'the MIT License',
  'apache-2.0': 'the Apache License 2.0',
  'bsd-3-clause': 'the BSD 3-Clause License',
  cc0: 'CC0',
}

/**
 * Build the attribution from the *verbatim* copyright notice in the register.
 *
 * Composed here rather than hand-written there, because reproducing the notice
 * is MIT's one substantive obligation and a typed approximation of it fails the
 * licence it cites. The failure this prevents is specific and real: an earlier
 * revision credited `themesberg/flowbite` to "Themesberg", the GitHub org — the
 * LICENSE says `Copyright (c) 2023 Bergside Inc.`, and the sibling repo
 * `flowbite-vue` says `Crafty Dwarf LLC`. Neither is guessable from the org, so
 * the notice is transcribed and this function only frames it.
 */
function buildAttribution(source) {
  const licence = LICENCE_LABEL[source.licence] ?? `the ${source.licence} licence`
  return `Layout derived from ${source.library}. ${source.copyrightNotice} Licensed under ${licence}.`
}

// region Composition helpers
//
// Copies of `src/document.ts`, because a `.mjs` script cannot import the
// package's own TypeScript. Behaviour must match exactly — a preset whose
// fingerprint disagrees with the service's would never be recognised as the
// same arrangement a user saved.

function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonicalise(entry)]),
    )
  }
  return value
}

function hash(input, salt) {
  let value = 0x811c9dc5 ^ salt
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value.toString(16).padStart(8, '0')
}

function fingerprintSections(sections) {
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

function derivePerformanceClass(sections) {
  let heaviest = 'A'
  for (const section of sections) {
    const definition = getBlock(section.block)
    const current = definition ? definition.performanceClass : 'D'
    if (PERFORMANCE_CLASS_ORDER[current] > PERFORMANCE_CLASS_ORDER[heaviest]) heaviest = current
  }
  return heaviest
}

// endregion

function main() {
  const register = JSON.parse(readFileSync(SOURCES_IN, 'utf8'))
  const demos = JSON.parse(readFileSync(DEMOS_IN, 'utf8'))
  const generatedDemos = readdirSync(here)
    .filter((file) => file.endsWith('-demos.generated.json'))
    .flatMap((file) => JSON.parse(readFileSync(join(here, file), 'utf8')))
  const allDemos = [...demos, ...generatedDemos]

  const sourceById = new Map(register.map((entry) => [entry.library, entry]))

  const presets = []
  const refused = []
  const skipped = []

  for (const demo of allDemos) {
    const source = sourceById.get(demo.library)

    // A demo whose source is not in the register is refused, not assumed
    // permissive. The register is the allowlist.
    if (!source) {
      refused.push(`${demo.id} — source "${demo.library}" is not in the licence register`)
      continue
    }

    if (!source.importable || !SHIPPABLE.has(source.licence)) {
      refused.push(`${demo.id} — ${demo.library} is licence "${source.licence}" (not importable)`)
      continue
    }

    // A third-party source must state what actually happened. `layout-observed`
    // and `layout-adapted` are different facts with different consequences, and
    // "a third party was involved, unspecified" reads as a derivation claim that
    // nobody can check. Refusing here is what stops attribution from becoming a
    // label someone attaches to an arrangement that is really ours — a false
    // provenance record is a different failure from copying, and just as bad.
    const isThirdParty = demo.library !== 'platform'
    const derivation = demo.derivation ?? 'none'
    // An importable third-party source must carry the notice it obliges us to
    // reproduce. Without it there is nothing to attribute with, and a preset
    // would ship crediting nobody.
    if (isThirdParty && !String(source.copyrightNotice ?? '').startsWith('Copyright')) {
      refused.push(
        `${demo.id} — ${demo.library} has no verbatim copyright notice in the register. ` +
          'Transcribe the `Copyright …` line from its LICENSE into `copyrightNotice`.',
      )
      continue
    }

    if (isThirdParty && derivation === 'none') {
      refused.push(
        `${demo.id} — claims source "${demo.library}" but declares no derivation. ` +
          'Set `derivation` to `layout-observed` or `layout-adapted`, or set `library` to `platform`.',
      )
      continue
    }
    if (!isThirdParty && derivation !== 'none') {
      refused.push(`${demo.id} — is platform-owned but declares derivation "${derivation}"`)
      continue
    }

    // Resolve the recipe against the *live* registry, so a preset can only ever
    // name blocks that exist. A slot with no equivalent is dropped, never
    // invented — same rule the templates importer follows.
    const resolved = []
    const missing = []
    for (const entry of demo.blocks) {
      const blockId = typeof entry === 'string' ? entry : entry.block
      if (!getBlock(blockId)) {
        missing.push(blockId)
        continue
      }
      resolved.push(createSection(blockId, typeof entry === 'string' ? {} : (entry.props ?? {})))
    }

    if (!resolved.length) {
      skipped.push(`${demo.id} — no registry equivalent for any of its sections`)
      continue
    }
    if (missing.length) skipped.push(`${demo.id} — dropped ${missing.length} unmapped slot(s): ${missing.join(', ')}`)

    // Section ids are regenerated on insert anyway, so a stable placeholder
    // keeps the committed catalogue diffable instead of churning every run.
    const sections = resolved.map((section, index) => ({ ...section, id: `sec_${demo.id}_${index}` }))

    presets.push({
      id: demo.id,
      tier: 'platform',
      name: demo.name,
      description: demo.description ?? '',
      collection: demo.collection,
      tags: demo.tags ?? [],
      sections,
      performanceClass: derivePerformanceClass(sections),
      thumbnail: '',
      licence: source.licence,
      attribution: isThirdParty ? buildAttribution(source) : '',
      source: {
        library: isThirdParty ? source.library : '',
        demo: demo.demo ?? '',
        url: isThirdParty ? source.url : '',
        derivation,
      },
      fingerprint: fingerprintSections(sections),
      createdBy: 'importer',
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
    })
  }

  const catalog = {
    version: 1,
    // Fixed rather than `new Date()`: a timestamp that changes on every run
    // makes the committed catalogue churn in every diff for no information.
    generatedAt: '1970-01-01T00:00:00.000Z',
    sources: register,
    presets,
  }

  if (!dryRun) {
    writeFileSync(CATALOG_OUT, renderCatalog(catalog), 'utf8')
    writeFileSync(SERVICE_OUT, renderServiceCopy(presets, register), 'utf8')
  }

  console.log(`sources in register: ${register.length}`)
  console.log(`  importable:        ${register.filter((s) => s.importable).length}`)
  console.log(`  refused:           ${register.filter((s) => !s.importable).map((s) => `${s.library}(${s.licence})`).join(' ') || '—'}`)
  console.log(`demos considered:    ${allDemos.length}`)
  console.log(`presets emitted:     ${presets.length}`)
  for (const note of refused) console.log(`   refused · ${note}`)
  for (const note of skipped) console.log(`   note    · ${note}`)
  if (dryRun) console.log('(dry run — nothing written)')
}

const BANNER = `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/assets/scripts/import-library-demos.mjs\`. Layout
 * arrangements only: no markup, no CSS, no component source, no third-party
 * asset URLs. Every \`block\` below is an id in our own registry, so a preset
 * renders entirely from code in this repository (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/assets import:library-demos
 */`

function renderCatalog(catalog) {
  return `${BANNER}
import type { AssetCatalog } from '@platform/schemas'

export const ASSET_CATALOG: AssetCatalog = ${JSON.stringify(catalog, null, 2)}
`
}

/** The service's compiled-in copy. Same data, no package dependency. */
function renderServiceCopy(presets, sources) {
  return `${BANNER}
import type { AssetPreset, AssetSourceRegisterEntry } from '@platform/schemas'

/**
 * Copied from \`packages/assets/src/catalog.generated.ts\` by the same run of
 * the same importer. It exists because \`@platform/core-api\` cannot yet depend
 * on \`@platform/assets\`; delete it and import the package once it can.
 */
export const ASSET_PRESETS: AssetPreset[] = ${JSON.stringify(presets, null, 2)}

/** Full licence register — every library shown in the Assets panel, cleared or refused. */
export const ASSET_SOURCES: AssetSourceRegisterEntry[] = ${JSON.stringify(sources, null, 2)}
`
}

main()
