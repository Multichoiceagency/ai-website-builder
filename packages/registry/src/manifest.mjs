/**
 * Registry manifest generation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALL TIME vs RUNTIME — the distinction the whole package exists to keep
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * "Download a component into the builder" is implemented the way shadcn does
 * it, and deliberately NOT the way it sounds:
 *
 *   INSTALL (build time)  `pnpm registry:add <id>` copies a component's SOURCE
 *                         into this repository. It is then reviewed, diffed,
 *                         type-checked and committed like any other code.
 *
 *   ENABLE  (runtime)     a tenant switches on an entry that is already
 *                         installed. That is one id in one table. No source is
 *                         fetched, compiled or executed at runtime, ever.
 *
 * Fetching component source at runtime and executing it would mean running
 * arbitrary code on our infrastructure and inside customer sites. That breaks
 * ADR-0003 and §35 of the product spec, so it is not built and must not be.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The manifest below is GENERATED from the live block definitions and from the
 * Nuxt renderer map, never hand-written, so it cannot drift from what the
 * platform actually renders.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export const REPO_ROOT = resolve(here, '../../..')
export const BLOCKS_SRC = join(REPO_ROOT, 'packages/blocks/src')
export const RENDERER_DIR = join(REPO_ROOT, 'packages/blocks-nuxt/components/Block')
export const RENDERER_MAP = join(RENDERER_DIR, 'Renderer.vue')
export const TEMPLATES_DIR = join(here, '../templates')
export const VENDOR_DIR = join(BLOCKS_SRC, 'collections/vendor')

const MANIFEST_VERSION = 1

/**
 * Load the built block registry.
 *
 * Imported by path rather than by package name so the CLI works in a fresh
 * checkout, before anything has linked `@platform/registry` into node_modules.
 */
export async function loadBlocks() {
  const distEntry = join(REPO_ROOT, 'packages/blocks/dist/index.js')
  if (!existsSync(distEntry)) {
    throw new Error(
      'packages/blocks is not built.\n' +
        'The registry reads the real block definitions rather than a copy of them, so build first:\n' +
        '  pnpm --filter @platform/blocks build',
    )
  }
  return import(`file://${distEntry}`)
}

/** `'hero-aurora-01': BlockHeroAurora01,` → Map<blockId, componentName>. */
export function readRendererMap() {
  const source = readFileSync(RENDERER_MAP, 'utf8')
  return new Map([...source.matchAll(/'([a-z0-9-]+)':\s*Block([A-Za-z0-9]+),/g)].map((match) => [match[1], match[2]]))
}

/** Find the file a block id is declared in, so the manifest never guesses. */
function findDefinitionFile(blockId) {
  const needle = `id: '${blockId}'`

  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name)
      if (statSync(path).isDirectory()) {
        const found = walk(path)
        if (found) return found
        continue
      }
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue
      if (readFileSync(path, 'utf8').includes(needle)) return path
    }
    return null
  }

  const found = walk(BLOCKS_SRC)
  return found ? relative(REPO_ROOT, found) : null
}

/** Entries that exist as templates but have not been installed into the repo. */
export function readTemplates() {
  if (!existsSync(TEMPLATES_DIR)) return []

  return readdirSync(TEMPLATES_DIR)
    .filter((name) => existsSync(join(TEMPLATES_DIR, name, 'entry.json')))
    .map((name) => {
      const template = JSON.parse(readFileSync(join(TEMPLATES_DIR, name, 'entry.json'), 'utf8'))
      return { ...template, dir: join(TEMPLATES_DIR, name) }
    })
}

/**
 * Build the manifest: every installed block, plus every template that has not
 * been installed yet. An installed template disappears from the "available"
 * list because the generated half now reports it as a real registered block.
 */
export async function buildManifest() {
  const blocks = await loadBlocks()
  const renderers = readRendererMap()
  const counts = blocks.countBlocksByCollection()

  const installed = blocks.listBlockMetadata().map((block) => {
    const component = renderers.get(block.id)
    const definition = findDefinitionFile(block.id)

    return {
      id: block.id,
      collection: block.collection,
      title: block.name,
      description: block.description,
      tags: block.tags,
      category: block.category,
      performanceClass: block.performanceClass,
      scores: block.scores,
      dependencies: [],
      registryDependencies: [],
      files: [
        ...(definition ? [{ path: definition, role: 'definition', framework: 'agnostic' }] : []),
        ...(component
          ? [
              {
                path: `packages/blocks-nuxt/components/Block/${component}.vue`,
                role: 'renderer',
                framework: 'nuxt',
              },
            ]
          : []),
      ],
      preview: `${block.category} · class ${block.performanceClass} · ${block.capabilities.join(', ')}`,
      installed: true,
    }
  })

  const installedIds = new Set(installed.map((entry) => entry.id))

  const available = readTemplates()
    .filter((template) => !installedIds.has(template.id))
    .map((template) => ({
      id: template.id,
      collection: template.collection,
      title: template.title,
      description: template.description,
      tags: template.tags ?? [],
      category: template.category,
      performanceClass: template.performanceClass,
      scores: template.scores,
      dependencies: template.dependencies ?? [],
      registryDependencies: template.registryDependencies ?? [],
      files: [
        { path: `packages/blocks/src/collections/vendor/${template.id}.ts`, role: 'definition', framework: 'agnostic' },
        {
          path: `packages/blocks-nuxt/components/Block/${template.component}.vue`,
          role: 'renderer',
          framework: 'nuxt',
        },
      ],
      preview: template.preview ?? '',
      installed: false,
    }))

  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    collections: blocks.COLLECTIONS.map((collection) => ({
      ...collection,
      entryCount: counts[collection.id] ?? 0,
    })),
    entries: [...installed, ...available],
  }
}

/**
 * Validate the generated manifest against the published contract.
 *
 * Optional on purpose: the CLI must still list components in a checkout where
 * `@platform/schemas` has not been built, and a manifest that cannot be
 * validated is still worth printing.
 */
export async function validateManifest(manifest) {
  const schemasEntry = join(REPO_ROOT, 'packages/schemas/dist/index.js')
  if (!existsSync(schemasEntry)) return { validated: false, manifest }

  const schemas = await import(`file://${schemasEntry}`)
  return { validated: true, manifest: schemas.registryManifestSchema.parse(manifest) }
}
