#!/usr/bin/env node
/**
 * Sync MotionSites thumbs + videos + prompts from Dropbox into the monorepo.
 *
 * Usage:
 *   node scripts/sync-motionsites-media.mjs
 *   node scripts/sync-motionsites-media.mjs --source ~/Dropbox/MotionSites
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

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

function mirror(src, dest) {
  if (!existsSync(src)) {
    console.warn(`skip missing ${src}`)
    return 0
  }
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
  // also mirror media into storefront public
  const storefront = dest.replace('/apps/dashboard/public/', '/apps/storefront/public/')
  if (storefront !== dest && dest.includes('/public/motionsites/')) {
    mkdirSync(storefront, { recursive: true })
    cpSync(src, storefront, { recursive: true })
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
