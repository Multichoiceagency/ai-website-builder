#!/usr/bin/env node
/**
 * Sync MotionSites thumbs + videos + prompts from Dropbox into the monorepo.
 *
 * Usage:
 *   node scripts/sync-motionsites-media.mjs
 *   node scripts/sync-motionsites-media.mjs --source ~/Dropbox/MotionSites
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { extname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const sourceArg = args.indexOf('--source')
const SOURCE = resolve(
  sourceArg >= 0 && args[sourceArg + 1]
    ? args[sourceArg + 1]
    : process.env.MOTIONSITES_SOURCE ?? join(homedir(), 'Dropbox', 'MotionSites'),
)

const repo = resolve(import.meta.dirname, '..')

const pairs = [
  [
    join(SOURCE, 'motionsites-sections/preview-videos'),
    join(repo, 'apps/dashboard/public/motionsites/sections/videos'),
  ],
  [
    join(SOURCE, 'motionsites-sections/thumbnails'),
    join(repo, 'apps/dashboard/public/motionsites/sections/thumbs'),
  ],
  [
    join(SOURCE, 'motionsites-sections/prompt_texts'),
    join(repo, 'packages/templates/motionsites-prompts/prompt_texts'),
  ],
  [
    join(SOURCE, 'motionsites-sections/our_prompts'),
    join(repo, 'packages/templates/motionsites-prompts/our_prompts'),
  ],
  [
    join(SOURCE, 'motionsites-backgrounds/videos'),
    join(repo, 'apps/dashboard/public/motionsites/backgrounds/videos'),
  ],
  [
    join(SOURCE, 'motionsites-backgrounds/thumbnails'),
    join(repo, 'apps/dashboard/public/motionsites/backgrounds/thumbs'),
  ],
]

/** Dropbox sometimes ships WebP bytes under a `.png` name — browsers reject that MIME. */
function fixMislabeledWebp(dir) {
  if (!existsSync(dir)) return 0
  let fixed = 0
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (extname(name).toLowerCase() !== '.png') continue
    let head
    try {
      head = readFileSync(file).subarray(0, 16)
    } catch {
      continue
    }
    if (head.toString('ascii', 0, 4) !== 'RIFF' || head.toString('ascii', 8, 12) !== 'WEBP') {
      continue
    }
    const dest = file.slice(0, -4) + '.webp'
    if (!existsSync(dest)) {
      renameSync(file, dest)
      fixed += 1
    }
  }
  return fixed
}

function mirror(src, dest) {
  if (!existsSync(src)) {
    console.warn(`skip missing ${src}`)
    return 0
  }
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
  fixMislabeledWebp(dest)
  // also mirror media into storefront public
  const storefront = dest.replace('/apps/dashboard/public/', '/apps/storefront/public/')
  if (storefront !== dest && dest.includes('/public/motionsites/')) {
    mkdirSync(storefront, { recursive: true })
    cpSync(src, storefront, { recursive: true })
    fixMislabeledWebp(storefront)
  }
  return readdirSync(dest).length
}

let total = 0
for (const [src, dest] of pairs) {
  const count = mirror(src, dest)
  console.log(`${count} → ${dest}`)
  total += count
}
console.log(`Done. Synced from ${SOURCE}`)
