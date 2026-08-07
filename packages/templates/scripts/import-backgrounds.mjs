#!/usr/bin/env node
/**
 * Normalise MotionSites backgrounds into rebuild metadata + local previews.
 *
 * The Dropbox library ships titles + gated CDN thumbnails/videos. None of the
 * CDN URLs may reach a customer page (ADR-0003). This importer keeps:
 *   · id, title, free/premium flag
 *   · a sanitised rebuild prompt the section AI can honour
 *   · a seed registry block id to insert before the rebuild
 *   · same-origin previewImage / previewVideo under /motionsites/backgrounds/
 *
 * Usage:
 *   node scripts/import-backgrounds.mjs [--source <dir>] [--dry-run]
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBlock } from '@platform/blocks'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, '..')
const repoRoot = resolve(packageRoot, '..', '..')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const sourceArg = args.indexOf('--source')
const SOURCE = resolve(
  sourceArg >= 0 && args[sourceArg + 1]
    ? args[sourceArg + 1]
    : process.env.MOTIONSITES_SOURCE ?? join(process.env.HOME ?? '', 'Dropbox', 'MotionSites'),
)

const BACKGROUNDS_DIR = join(SOURCE, 'motionsites-backgrounds')
const THUMBS_SRC = join(BACKGROUNDS_DIR, 'thumbnails')
const VIDEOS_SRC = join(BACKGROUNDS_DIR, 'videos')
const DEMOS_SRC = join(BACKGROUNDS_DIR, 'demo-videos')
const MEDIA_ROOT = join(repoRoot, 'apps', 'dashboard', 'public', 'motionsites', 'backgrounds')
const THUMBS_OUT = join(MEDIA_ROOT, 'thumbs')
const VIDEOS_OUT = join(MEDIA_ROOT, 'videos')
const OUT = join(packageRoot, 'src', 'backgrounds.generated.ts')

const PUBLIC_THUMB = '/motionsites/backgrounds/thumbs'
const PUBLIC_VIDEO = '/motionsites/backgrounds/videos'

const DEFAULT_SEED = 'hero-cover-statement-01'
const FALLBACK_SEED = 'hero-aurora-01'
const MAX_PROMPT = 16000

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov'])

/** Loose mood tags from the title — never fetched, never a CDN. */
const TAG_RULES = [
  { re: /music|sound|audio|beat/i, tags: ['music', 'rhythm'] },
  { re: /sky|cloud|dawn|dusk|sunset|sunrise/i, tags: ['sky', 'atmospheric'] },
  { re: /flower|floral|garden|botanic/i, tags: ['floral', 'organic'] },
  { re: /sea|ocean|wave|water|fluid/i, tags: ['water', 'fluid'] },
  { re: /dark|noir|night|shadow/i, tags: ['dark', 'cinematic'] },
  { re: /energy|neon|glow|plasma|particle/i, tags: ['energy', 'glow'] },
  { re: /3d|space|cosmos|orbit/i, tags: ['3d', 'space'] },
  { re: /grain|noise|texture/i, tags: ['texture'] },
  { re: /gradient|mesh|blob/i, tags: ['gradient'] },
  { re: /person|portrait|figure|human/i, tags: ['figurative'] },
  { re: /nature|forest|leaf|organic/i, tags: ['nature'] },
  { re: /abstract|geometry|shape/i, tags: ['abstract'] },
]

function tagsFor(title) {
  const tags = new Set()
  for (const rule of TAG_RULES) {
    if (rule.re.test(title)) for (const tag of rule.tags) tags.add(tag)
  }
  if (!tags.size) tags.add('atmospheric')
  return [...tags].slice(0, 6)
}

function seedFor(title, tags) {
  if (tags.includes('dark') || tags.includes('glow') || tags.includes('energy')) {
    return getBlock(FALLBACK_SEED) ? FALLBACK_SEED : DEFAULT_SEED
  }
  return getBlock(DEFAULT_SEED) ? DEFAULT_SEED : FALLBACK_SEED
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function videoStemName(thumbFile) {
  if (!thumbFile) return null
  const ext = extname(thumbFile).toLowerCase()
  if (VIDEO_EXT.has(ext)) return thumbFile
  return `${thumbFile.slice(0, -ext.length)}.mp4`
}

function resolveVideoSource(entry, videoName) {
  const candidates = []
  if (videoName) {
    candidates.push(join(VIDEOS_SRC, videoName))
    candidates.push(join(DEMOS_SRC, videoName))
  }
  // Gradient (and similar) store a CloudFront basename in video_url / thumbnail_url.
  for (const url of [entry.video_url, entry.thumbnail_url]) {
    if (!url || typeof url !== 'string') continue
    const base = url.split('?')[0].split('/').pop()
    if (base && /\.(mp4|webm)$/i.test(base)) {
      candidates.push(join(VIDEOS_SRC, base))
      candidates.push(join(DEMOS_SRC, base))
    }
  }
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return null
}

function copyMedia(src, dest) {
  if (dryRun) return true
  ensureDir(dirname(dest))
  copyFileSync(src, dest)
  return true
}

/**
 * Rebuild brief: fuller visual direction, no stack, no CDN, no vendor.
 * When a local preview video exists, reference that same-origin path instead
 * of any CloudFront / higgs URL (ADR-0003 / ADR-0007).
 */
function rebuildPromptFor(title, tags, { previewVideo, previewImage, isFree }) {
  const mood = tags.join(', ')
  const parts = [
    `Rebuild this section's atmosphere to match a MotionSites background called "${title}".`,
    `Mood tags: ${mood}.`,
    `Visual brief: treat "${title}" as the dominant cinematic field — full-bleed, motion-led, ` +
      `edge-to-edge atmosphere that fills the first viewport. Prefer theme colours and local ` +
      `motion over stock photography. Keep the business message; change tone, density, typography ` +
      `weight, and visual direction so the section feels like that background.`,
    `Direction notes: shorter headlines, vivid supporting copy, generous negative space where the ` +
      `background needs to breathe, and restrained UI chrome so the field stays primary.`,
    `Constraints: theme colours only — no third-party images, fonts, video URLs, CloudFront, Mux, ` +
      `or higgs CDN assets. Do not emit component source; rewrite copy and props only.`,
    isFree
      ? 'Library tier: free background — lean into accessible, reusable motion.'
      : 'Library tier: premium-looking background — richer contrast, denser atmosphere, cinematic grade.',
  ]

  if (previewVideo) {
    parts.push(
      `Local preview video (dashboard browsing only, same-origin — do not hotlink externally): ${previewVideo}. ` +
        `Approximate the motion character of that loop with platform-safe motion; never embed the file on published pages as a hard dependency.`,
    )
  }
  if (previewImage) {
    parts.push(
      `Local preview still (dashboard browsing only): ${previewImage}. Use it as mood reference only.`,
    )
  }

  return parts.join(' ').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT)
}

function main() {
  const file = join(BACKGROUNDS_DIR, 'backgrounds.json')
  if (!existsSync(file)) {
    console.error(`MotionSites backgrounds not found at ${file}. Pass --source <dir>.`)
    process.exit(1)
  }

  if (!dryRun) {
    ensureDir(THUMBS_OUT)
    ensureDir(VIDEOS_OUT)
  }

  const entries = JSON.parse(readFileSync(file, 'utf8'))
  const backgrounds = []
  const seen = new Set()
  const mediaStats = { thumbsCopied: 0, videosCopied: 0, thumbMissing: 0, videoMissing: 0 }

  for (const entry of entries) {
    if (!entry?.id || seen.has(entry.id)) continue
    seen.add(entry.id)

    const title = String(entry.title || '').trim() || 'Untitled background'
    const tags = tagsFor(title)
    const seedBlockId = seedFor(title, tags)

    let previewImage = ''
    let previewVideo = ''

    const thumbFile = entry._thumb_file ? String(entry._thumb_file) : ''
    const thumbExt = thumbFile ? extname(thumbFile).toLowerCase() : ''

    if (thumbFile && IMAGE_EXT.has(thumbExt)) {
      const src = join(THUMBS_SRC, thumbFile)
      if (existsSync(src)) {
        const dest = join(THUMBS_OUT, thumbFile)
        copyMedia(src, dest)
        previewImage = `${PUBLIC_THUMB}/${thumbFile}`
        mediaStats.thumbsCopied += 1
      } else {
        mediaStats.thumbMissing += 1
      }
    } else if (thumbFile && !VIDEO_EXT.has(thumbExt)) {
      mediaStats.thumbMissing += 1
    }

    const videoName = videoStemName(thumbFile) || (thumbFile && VIDEO_EXT.has(thumbExt) ? thumbFile : null)
    const outVideoName =
      videoName && VIDEO_EXT.has(extname(videoName).toLowerCase())
        ? videoName
        : videoName
          ? `${videoName}.mp4`
          : null

    if (outVideoName) {
      const videoSrc = resolveVideoSource(entry, outVideoName)
      if (videoSrc) {
        const dest = join(VIDEOS_OUT, outVideoName)
        copyMedia(videoSrc, dest)
        previewVideo = `${PUBLIC_VIDEO}/${outVideoName}`
        mediaStats.videosCopied += 1
      } else {
        mediaStats.videoMissing += 1
      }
    }

    backgrounds.push({
      id: entry.id,
      title,
      isFree: entry.is_premium !== true,
      rebuildPrompt: rebuildPromptFor(title, tags, {
        previewVideo,
        previewImage,
        isFree: entry.is_premium !== true,
      }),
      previewImage,
      previewVideo,
      seedBlockId,
      tags,
    })
  }

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source:
      'MotionSites backgrounds library, normalised to rebuild prompts + local /motionsites preview paths. No CDN URLs.',
    backgrounds,
  }

  if (!dryRun) {
    writeFileSync(
      OUT,
      `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/templates/scripts/import-backgrounds.mjs\` from the
 * MotionSites backgrounds library. Rebuild prompts + same-origin preview paths
 * under /motionsites/backgrounds/. No third-party asset URLs (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:backgrounds
 */
import type { MotionBackgroundCatalog } from '@platform/schemas'

export const MOTIONSITES_BACKGROUNDS: MotionBackgroundCatalog = ${JSON.stringify(catalog, null, 2)}
`,
      'utf8',
    )
  }

  console.log(`backgrounds considered: ${entries.length}`)
  console.log(`backgrounds emitted:    ${backgrounds.length}`)
  console.log(`free:                   ${backgrounds.filter((b) => b.isFree).length}`)
  console.log(`premium (listed):       ${backgrounds.filter((b) => !b.isFree).length}`)
  console.log(`thumbs copied:          ${mediaStats.thumbsCopied}`)
  console.log(`videos copied:          ${mediaStats.videosCopied}`)
  console.log(`thumbs missing:         ${mediaStats.thumbMissing}`)
  console.log(`videos missing:         ${mediaStats.videoMissing}`)
  console.log(`with previewImage:      ${backgrounds.filter((b) => b.previewImage).length}`)
  console.log(`with previewVideo:      ${backgrounds.filter((b) => b.previewVideo).length}`)
  if (dryRun) console.log('(dry run — nothing written)')
}

main()
