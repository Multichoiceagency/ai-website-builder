#!/usr/bin/env node
/**
 * The component registry CLI.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALL TIME vs RUNTIME
 * ─────────────────────────────────────────────────────────────────────────────
 * This CLI is the *install-time* half of the registry, built on the shadcn
 * model: `registry add <id>` copies a component's SOURCE into this repository,
 * where it is reviewed, versioned, diffed and type-checked like any other code.
 *
 * The *runtime* half is unrelated and much smaller: a tenant enables an entry
 * that is already installed, which is one id in one table. No component source
 * is ever fetched, compiled or executed at runtime — doing so would mean
 * running arbitrary code on our infrastructure and inside customer sites, which
 * ADR-0003 and §35 of the product spec forbid.
 *
 * If you are reading this because someone asked for "download a component into
 * the builder at runtime": this is that feature, done safely. Do not add the
 * other one.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Zero dependencies on purpose — plain Node, no build step, works in a fresh
 * checkout as soon as `packages/blocks` has been built.
 *
 *   node packages/registry/bin/registry.mjs list [--collection=x] [--tag=y] [--json]
 *   node packages/registry/bin/registry.mjs info <id>
 *   node packages/registry/bin/registry.mjs add <id> [--dry-run] [--force]
 *   node packages/registry/bin/registry.mjs verify
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  REPO_ROOT,
  RENDERER_MAP,
  VENDOR_DIR,
  buildManifest,
  readRendererMap,
  readTemplates,
  validateManifest,
} from '../src/manifest.mjs'

const [, , command = 'help', ...rest] = process.argv
const flags = new Set(rest.filter((argument) => argument.startsWith('--')))
const positional = rest.filter((argument) => !argument.startsWith('--'))

function flagValue(name) {
  const match = rest.find((argument) => argument.startsWith(`--${name}=`))
  return match ? match.slice(name.length + 3) : undefined
}

const CLASS_NOTE = { A: 'static', B: 'light motion', C: 'scroll-linked', D: 'cinematic' }

function fail(message) {
  process.stderr.write(`\n  ${message}\n\n`)
  process.exit(1)
}

// region list

async function list() {
  const manifest = await buildManifest()
  const collection = flagValue('collection')
  const tag = flagValue('tag')

  let entries = manifest.entries
  if (collection) entries = entries.filter((entry) => entry.collection === collection)
  if (tag) entries = entries.filter((entry) => entry.tags.includes(tag))

  if (flags.has('--json')) {
    process.stdout.write(`${JSON.stringify({ ...manifest, entries }, null, 2)}\n`)
    return
  }

  const { validated } = await validateManifest(manifest)

  process.stdout.write(`\n  Component registry — ${entries.length} entries${validated ? '' : ' (manifest unvalidated: build @platform/schemas)'}\n`)

  for (const meta of manifest.collections) {
    const inCollection = entries.filter((entry) => entry.collection === meta.id)
    if (!inCollection.length) continue

    process.stdout.write(`\n  ${meta.name.toUpperCase()} — ${meta.styleDirection}\n`)
    process.stdout.write(`  ${meta.description}\n\n`)

    for (const entry of inCollection) {
      const state = entry.installed ? '  ' : '+ '
      process.stdout.write(
        `  ${state}${entry.id.padEnd(30)} ${entry.performanceClass}  ${String(entry.scores.performance).padStart(3)}  ${entry.title}\n`,
      )
    }
  }

  const available = entries.filter((entry) => !entry.installed)
  if (available.length) {
    process.stdout.write(`\n  + not installed. Add one with:  pnpm registry:add ${available[0].id}\n`)
  }
  process.stdout.write('\n')
}

// endregion

// region info

async function info() {
  const id = positional[0]
  if (!id) fail('Usage: registry info <id>')

  const manifest = await buildManifest()
  const entry = manifest.entries.find((candidate) => candidate.id === id)
  if (!entry) fail(`No registry entry called "${id}". Try:  pnpm registry:list`)

  const collection = manifest.collections.find((candidate) => candidate.id === entry.collection)

  process.stdout.write(`\n  ${entry.title}\n  ${entry.id}\n\n`)
  process.stdout.write(`  ${entry.description}\n\n`)
  process.stdout.write(`  Collection    ${collection?.name ?? entry.collection}\n`)
  process.stdout.write(`  Category      ${entry.category}\n`)
  process.stdout.write(`  Tags          ${entry.tags.join(', ') || '—'}\n`)
  process.stdout.write(`  Class         ${entry.performanceClass} (${CLASS_NOTE[entry.performanceClass]})\n`)
  process.stdout.write(
    `  Scores        performance ${entry.scores.performance} · accessibility ${entry.scores.accessibility} · mobile ${entry.scores.mobile}\n`,
  )
  process.stdout.write(`  Dependencies  ${entry.dependencies.join(', ') || 'none beyond the platform'}\n`)
  process.stdout.write(`  Status        ${entry.installed ? 'installed' : 'available — pnpm registry:add ' + entry.id}\n`)
  if (collection) process.stdout.write(`  Licence       ${collection.licence}\n`)

  process.stdout.write('\n  Files\n')
  for (const file of entry.files) process.stdout.write(`    ${file.role.padEnd(11)} ${file.path}\n`)
  process.stdout.write('\n')
}

// endregion

// region add

/** Insert a line just above an anchor comment, refusing if the anchor is gone. */
function insertAtAnchor(source, anchor, line, path) {
  const marker = `// registry:${anchor}:end`
  const index = source.indexOf(marker)
  if (index === -1) fail(`${path} has lost its "${marker}" anchor. Restore it before installing.`)

  const lineStart = source.lastIndexOf('\n', index) + 1
  const indent = source.slice(lineStart, index)
  return `${source.slice(0, lineStart)}${indent}${line}\n${source.slice(lineStart)}`
}

async function add() {
  const id = positional[0]
  if (!id) fail('Usage: registry add <id>')

  const template = readTemplates().find((candidate) => candidate.id === id)
  if (!template) {
    const available = readTemplates().map((candidate) => candidate.id)
    fail(
      `No installable template called "${id}".\n  Available: ${available.join(', ') || 'none'}\n` +
        '  Already-installed components need no install — enable them per tenant instead.',
    )
  }

  const definitionTarget = join(VENDOR_DIR, `${id}.ts`)
  const rendererTarget = join(REPO_ROOT, 'packages/blocks-nuxt/components/Block', `${template.component}.vue`)
  const vendorIndex = join(VENDOR_DIR, 'index.ts')

  const existingRenderers = readRendererMap()
  if (existingRenderers.has(id) && !flags.has('--force')) {
    fail(`"${id}" is already installed. Re-install with --force if you mean to overwrite it.`)
  }
  for (const target of [definitionTarget, rendererTarget]) {
    if (existsSync(target) && !flags.has('--force')) fail(`${target} already exists. Use --force to overwrite.`)
  }

  const plan = [
    ['write', definitionTarget],
    ['write', rendererTarget],
    ['patch', vendorIndex],
    ['patch', RENDERER_MAP],
  ]

  if (flags.has('--dry-run')) {
    process.stdout.write(`\n  Would install ${id}:\n`)
    for (const [action, path] of plan) process.stdout.write(`    ${action.padEnd(6)} ${path.replace(`${REPO_ROOT}/`, '')}\n`)
    process.stdout.write('\n')
    return
  }

  mkdirSync(VENDOR_DIR, { recursive: true })
  mkdirSync(dirname(rendererTarget), { recursive: true })
  copyFileSync(join(template.dir, 'definition.ts'), definitionTarget)
  copyFileSync(join(template.dir, 'renderer.vue'), rendererTarget)

  let vendorSource = readFileSync(vendorIndex, 'utf8')
  if (!vendorSource.includes(`from './${id}.js'`)) {
    vendorSource = insertAtAnchor(vendorSource, 'imports', `import { ${template.exportName} } from './${id}.js'`, vendorIndex)
    vendorSource = insertAtAnchor(vendorSource, 'blocks', `${template.exportName},`, vendorIndex)
    writeFileSync(vendorIndex, vendorSource)
  }

  let rendererSource = readFileSync(RENDERER_MAP, 'utf8')
  if (!rendererSource.includes(`'${id}':`)) {
    rendererSource = insertAtAnchor(rendererSource, 'imports', `Block${template.component},`, RENDERER_MAP)
    rendererSource = insertAtAnchor(
      rendererSource,
      'renderers',
      `'${id}': Block${template.component},`,
      RENDERER_MAP,
    )
    writeFileSync(RENDERER_MAP, rendererSource)
  }

  process.stdout.write(`\n  Installed ${id} (${template.title})\n\n`)
  for (const [action, path] of plan) process.stdout.write(`    ${action.padEnd(6)} ${path.replace(`${REPO_ROOT}/`, '')}\n`)
  process.stdout.write(
    '\n  Next:\n' +
      '    pnpm --filter @platform/blocks build\n' +
      '    pnpm --filter @platform/blocks test\n' +
      '    git diff   — the component is now source in this repo; review it like any other\n\n',
  )
}

// endregion

// region verify

async function verify() {
  const manifest = await buildManifest()
  const { validated } = await validateManifest(manifest)
  const renderers = readRendererMap()

  const problems = []
  for (const entry of manifest.entries.filter((candidate) => candidate.installed)) {
    if (!renderers.has(entry.id)) problems.push(`${entry.id} is registered but has no Nuxt renderer`)
    for (const file of entry.files) {
      if (!existsSync(join(REPO_ROOT, file.path))) problems.push(`${entry.id} points at a missing file: ${file.path}`)
    }
  }

  const registered = new Set(manifest.entries.map((entry) => entry.id))
  for (const id of renderers.keys()) {
    if (!registered.has(id)) problems.push(`Renderer.vue maps "${id}", which is not a registered block`)
  }

  if (problems.length) {
    process.stderr.write(`\n  ${problems.length} problem(s):\n`)
    for (const problem of problems) process.stderr.write(`    ✗ ${problem}\n`)
    process.stderr.write('\n')
    process.exit(1)
  }

  process.stdout.write(
    `\n  Registry is consistent — ${manifest.entries.filter((entry) => entry.installed).length} installed entries, ` +
      `${manifest.collections.length} collections, manifest ${validated ? 'validated' : 'unvalidated'}.\n\n`,
  )
}

// endregion

const COMMANDS = { list, info, add, verify }

async function main() {
  const run = COMMANDS[command]
  if (!run) {
    process.stdout.write(
      '\n  Component registry\n\n' +
        '    pnpm registry:list [--collection=motion] [--tag=scroll] [--json]\n' +
        '    pnpm registry:info <id>\n' +
        '    pnpm registry:add  <id> [--dry-run] [--force]\n' +
        '    pnpm registry:verify\n\n' +
        '  `add` vendors a component\'s source into this repo at build time.\n' +
        '  Nothing is ever fetched or executed at runtime.\n\n',
    )
    process.exit(command === 'help' ? 0 : 1)
  }

  await run()
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
