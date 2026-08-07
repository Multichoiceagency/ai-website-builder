#!/usr/bin/env node
/**
 * Pull a cleared UI library into `reference/` for local observation.
 *
 * ADR-0003: nothing here may land in apps/, packages/, or services/ as a
 * shipped dependency. The CLI mirrors the "npx add" workflow libraries use —
 * clone or print the official npx command — then you map layouts into
 * `library-demos.json` and run `import:library-demos`.
 *
 * Usage:
 *   pnpm --filter @platform/assets pull -- Flowbite
 *   pnpm --filter @platform/assets pull -- shadcn-vue
 *   pnpm --filter @platform/assets pull -- --list
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..')
const sources = JSON.parse(readFileSync(join(here, 'sources.json'), 'utf8'))

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const listOnly = args.includes('--list')
const name = args.find((arg) => !arg.startsWith('--'))

function printList() {
  console.log('UI libraries in the licence register:\n')
  for (const source of sources) {
    const install = source.install ?? { method: 'none', command: '' }
    const flag = source.importable ? 'ok' : 'REFUSED'
    console.log(`  [${flag}] ${source.library}`)
    console.log(`         licence: ${source.licence}`)
    if (install.command) console.log(`         install: ${install.command}`)
    if (install.referenceDir) console.log(`         reference: ${install.referenceDir}`)
    console.log('')
  }
  console.log('Pull one: pnpm --filter @platform/assets pull -- "<library>"')
}

function findSource(query) {
  const needle = query.trim().toLowerCase()
  return sources.find(
    (entry) =>
      entry.library.toLowerCase() === needle ||
      entry.library.toLowerCase().replace(/[\s/]+/g, '-') === needle,
  )
}

function pull(source) {
  if (!source.importable) {
    console.error(`Refused: ${source.library} (${source.licence}).\n${source.notes}`)
    process.exitCode = 1
    return
  }

  const install = source.install ?? { method: 'none', command: '', cloneUrl: '', referenceDir: '' }

  if (install.method === 'none' || source.library === 'platform') {
    console.log(`${source.library}: nothing to pull (platform-owned or no install path).`)
    return
  }

  if (install.method === 'npx') {
    console.log(`\n${source.library} uses an official CLI (npx-style):\n`)
    console.log(`  ${install.command}\n`)
    if (install.docsUrl) console.log(`Docs: ${install.docsUrl}`)
    console.log(
      '\nRun that in a scratch folder or against reference tooling only —\n' +
        'do not add the generated files under apps/ or packages/ (ADR-0003).\n',
    )
    if (install.cloneUrl && install.referenceDir) {
      console.log('Also cloning the source repo into reference/ for layout observation…\n')
      cloneReference(install.cloneUrl, install.referenceDir)
    }
    return
  }

  if (install.method === 'git-clone') {
    if (!install.cloneUrl || !install.referenceDir) {
      console.error(`${source.library}: install.register is missing cloneUrl / referenceDir.`)
      process.exitCode = 1
      return
    }
    cloneReference(install.cloneUrl, install.referenceDir)
    console.log(`\nNext: observe layouts → add recipes to library-demos.json →`)
    console.log(`  pnpm --filter @platform/assets import:library-demos\n`)
    return
  }

  console.error(`Unknown install method: ${install.method}`)
  process.exitCode = 1
}

function cloneReference(cloneUrl, referenceDir) {
  const target = join(repoRoot, referenceDir)
  if (existsSync(target)) {
    console.log(`Already present: ${referenceDir}`)
    return
  }

  console.log(`git clone --depth 1 ${cloneUrl} ${referenceDir}`)
  const result = spawnSync('git', ['clone', '--depth', '1', cloneUrl, target], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
  }
}

if (listOnly || !name) {
  printList()
  if (!name && !listOnly) {
    console.log('\nPass a library name to pull it, e.g. Flowbite or shadcn-vue.')
  }
  process.exit(0)
}

const source = findSource(name)
if (!source) {
  console.error(`Unknown library "${name}". Use --list to see names.`)
  process.exitCode = 1
} else {
  pull(source)
}
