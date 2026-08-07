#!/usr/bin/env node
/**
 * Normalise the MotionSites library into template *metadata* + local previews.
 *
 * The source is a set of prompts describing hand-written React/Tailwind
 * sections, each pinned to a third party's CDN assets, fonts and tables. CDN
 * URLs must not become platform output (ADR-0003). This importer keeps:
 *
 *   style direction · motion character · page archetype · block recipe
 *   sanitised sourcePrompt (exact brief text, URLs stripped)
 *   same-origin previewImage / previewVideo under /motionsites/sections/
 *
 * The block recipe is resolved against the *live* registry at import time, so
 * a recipe can only ever name blocks that actually exist. Where the registry
 * has no equivalent for a source section, the slot is dropped — never invented.
 *
 * Usage:
 *   node scripts/import-motionsites.mjs [--source <dir>] [--dry-run]
 *
 * Reads the source directory. Writes:
 *   packages/templates/src/catalog.generated.ts
 *   apps/dashboard/public/motionsites/sections/{thumbs,videos}/
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { searchBlocks } from '@platform/blocks'

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

const SECTIONS_DIR = join(SOURCE, 'motionsites-sections')
const THUMBS_SRC = join(SECTIONS_DIR, 'thumbnails')
const VIDEOS_SRC = join(SECTIONS_DIR, 'preview-videos')
const MEDIA_ROOT = join(repoRoot, 'apps', 'dashboard', 'public', 'motionsites', 'sections')
const THUMBS_OUT = join(MEDIA_ROOT, 'thumbs')
const VIDEOS_OUT = join(MEDIA_ROOT, 'videos')
const PUBLIC_THUMB = '/motionsites/sections/thumbs'
const PUBLIC_VIDEO = '/motionsites/sections/videos'
const CATALOG_OUT = join(packageRoot, 'src', 'catalog.generated.ts')
const MAX_SOURCE_PROMPT = 12000

// region Vocabulary

/**
 * Source category → browsable collection. The source has 63 categories, most
 * of them holding one entry; a left rail of 63 links is not navigation, so they
 * collapse into twelve groups that answer "what am I looking for?".
 */
const COLLECTION_BY_CATEGORY = {
  hero: ['hero', 'hero section'],
  landing: ['landing page', 'website', '3d website', 'travel', 'automotive', 'interactive'],
  saas: ['saas', 'ai / saas', 'ai', 'dashboard', 'dashboard demo', 'fintech', 'web3', 'use case'],
  agency: ['agency', 'portfolio', 'projects', 'case studies', 'presentation', 'investor presentations'],
  ecommerce: ['ecommerce', 'e-commerce', 'product', 'products', 'categories'],
  features: ['features', 'features section', 'feature', 'benefits', 'why us', 'bento', 'process', 'services'],
  conversion: ['cta', 'cta section', 'pricing', 'waitlist', 'signup', 'sign in form', 'form', 'contact us', 'email marketing'],
  proof: ['testimonials', 'testimonial', 'stats'],
  story: ['about', 'blog', 'info', 'faq', 'accordion'],
  interactive: ['cards', 'carousal', 'slider', 'marquee', 'tabs', 'component', 'social media'],
  footer: ['footer', 'footer section'],
  utility: ['404'],
}

/** Fallback when a category is unknown: the structural type still tells us something. */
const COLLECTION_BY_TYPE = {
  hero: 'hero',
  landing: 'landing',
  features: 'features',
  cta: 'conversion',
  pricing: 'conversion',
  form: 'conversion',
  testimonials: 'proof',
  stats: 'proof',
  about: 'story',
  blog: 'story',
  faq: 'story',
  footer: 'footer',
  carousel: 'interactive',
  'social-media': 'interactive',
  dashboard: 'saas',
  '404': 'utility',
}

const COLLECTION_META = {
  hero: ['Hero sections', 'The first screen: one statement, one action.'],
  landing: ['Landing pages', 'Whole-page starting points, hero through closing call to action.'],
  saas: ['SaaS & product', 'Product-led pages: dashboards, plans, feature proof.'],
  agency: ['Agency & portfolio', 'Studio and case-study work where the craft is the pitch.'],
  ecommerce: ['Commerce', 'Storefront-shaped pages: catalogue, product, category.'],
  features: ['Features & benefits', 'Explaining what the thing does, in bands.'],
  conversion: ['Conversion', 'Calls to action, pricing, sign-up and contact.'],
  proof: ['Social proof', 'Testimonials, ratings and numbers.'],
  story: ['Story & content', 'About, editorial, FAQ — the reading parts.'],
  interactive: ['Interactive', 'Carousels, tabs, marquees and cards that respond.'],
  footer: ['Footers', 'The last band: navigation, legal, contact.'],
  utility: ['Utility', 'Error pages and the small necessary screens.'],
}

/** Source structural type → registry block category. `null` = no equivalent. */
const ROLE_BY_TYPE = {
  hero: 'hero',
  features: 'features',
  cta: 'cta',
  about: 'about',
  footer: 'footer',
  carousel: 'gallery',
  pricing: 'pricing',
  testimonials: 'testimonials',
  stats: 'stats',
  faq: 'faq',
  form: 'contact',
  blog: 'blog',
  '3d website': 'hero',
  dashboard: null,
  'social-media': null,
  '404': null,
  landing: 'hero',
}

/**
 * A handful of categories describe the band better than the type does — a
 * "Contact us" entry typed `hero` is a contact section with a big headline.
 */
const ROLE_BY_CATEGORY = {
  'contact us': 'contact',
  signup: 'contact',
  waitlist: 'contact',
  'sign in form': 'contact',
  pricing: 'pricing',
  stats: 'stats',
  marquee: 'logos',
  404: null,
}

/**
 * The nearest registry equivalent when a category has no block of its own.
 * A substitution, not an invention: an "about" band really is a content block
 * with a heading and prose. Roles absent from this table stay unmapped.
 */
const ROLE_FALLBACK = {
  about: 'content',
  blog: 'content',
  gallery: 'features',
}

/** Whole-page recipes, per collection. Ordered as the page reads. */
const LANDING_ROLES = {
  saas: ['hero', 'features', 'stats', 'pricing', 'testimonials', 'cta'],
  agency: ['hero', 'gallery', 'features', 'testimonials', 'cta'],
  ecommerce: ['hero', 'gallery', 'features', 'testimonials', 'cta'],
  default: ['hero', 'features', 'stats', 'testimonials', 'cta'],
}

const STYLE_KEYWORDS = {
  minimal: ['minimal', 'understated', 'restrained', 'sparse', 'quiet', 'whitespace', 'white space', 'airy'],
  editorial: ['editorial', 'magazine', 'serif', 'typograph', 'swiss', 'grotesk', 'playfair', 'cormorant'],
  premium: ['premium', 'luxur', 'elegant', 'refined', 'cinematic', 'sophisticat', 'glass', 'aurora', 'ethereal', 'atmospheric'],
  bold: ['bold', 'brutal', 'oversized', 'high contrast', 'high-contrast', 'massive', 'loud', 'uppercase', 'stark'],
  modern: ['modern', 'saas', 'clean', 'sleek', 'gradient', 'rounded', 'soft shadow'],
}

const INDUSTRY_KEYWORDS = {
  saas: ['saas', 'dashboard', 'platform', 'subscription', 'b2b', 'workspace', 'analytics'],
  agency: ['agency', 'studio', 'creative agency'],
  ecommerce: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'product page'],
  fintech: ['fintech', 'bank', 'finance', 'payment', 'invest', 'trading'],
  web3: ['web3', 'crypto', 'blockchain', 'nft', 'token', 'wallet'],
  portfolio: ['portfolio', 'case stud', 'my work', 'selected works'],
  creative: ['art', 'design studio', 'creative', 'gallery', 'photograph', 'film', 'music'],
  healthcare: ['health', 'medical', 'clinic', 'wellness', 'therapy'],
  restaurant: ['restaurant', 'menu', 'cafe', 'coffee', 'dining', 'culinary'],
  automotive: ['automotive', 'vehicle', 'motorcycle', 'car brand', 'supercar'],
  real_estate: ['real estate', 'property', 'apartment', 'architecture firm', 'housing'],
  travel: ['travel', 'destination', 'hotel', 'resort', 'itinerary', 'flight'],
  education: ['course', 'learning', 'education', 'academy', 'curriculum'],
  local: ['local business', 'service area', 'plumber', 'contractor'],
}

/**
 * Motion vocabulary, heaviest first. Order matters twice: it decides which
 * characteristics survive the cap, and the first match decides the class.
 */
const MOTION_KEYWORDS = [
  ['three-d', ['three.js', 'threejs', 'webgl', 'react-three', 'r3f', 'spline', '3d scene', 'shader']],
  ['particles', ['particle', 'meteor', 'starfield', 'noise field', 'confetti']],
  ['cursor', ['cursor-following', 'follows the cursor', 'follow the cursor', 'custom cursor', 'mouse position', 'mousemove', 'pointer follows', 'spotlight that follows', 'tracks the mouse']],
  ['horizontal-scroll', ['horizontal scroll', 'scrolls horizontally', 'horizontally as you']],
  ['sticky-scroll', ['sticky', 'pinned', 'pin the', 'scrolltrigger']],
  ['parallax', ['parallax', 'depth layers', 'moves slower than']],
  ['morph', ['morph', 'clip-path', 'clippath', 'svg path', 'mask reveal']],
  ['text-effect', ['split text', 'splittext', 'typewriter', 'letter by letter', 'word by word', 'scramble', 'text reveal']],
  ['marquee', ['marquee', 'ticker', 'infinite loop', 'endless strip']],
  ['carousel', ['carousel', 'slider', 'swiper', 'embla', 'slides']],
  ['video', ['<video', 'video background', 'autoplay loop', 'muted playsinline']],
  ['scroll-reveal', ['whileinview', 'while in view', 'on scroll', 'intersectionobserver', 'reveal as you scroll']],
  ['hover', ['hover', 'tilt', 'magnetic', 'on mouse enter']],
  ['entrance', ['framer-motion', 'framer motion', 'gsap', 'fade up', 'fadeup', 'initial={{', 'animate={{']],
]

/** Which registry tags a motion characteristic hopes to find on a block. */
const MOTION_TAGS = {
  'three-d': ['3d', 'tilt'],
  particles: ['meteor', 'ambient'],
  cursor: ['hover', 'interactive'],
  'horizontal-scroll': ['horizontal', 'scroll'],
  'sticky-scroll': ['sticky', 'pinned', 'scroll'],
  parallax: ['parallax', 'scroll'],
  morph: ['clip-path', 'reveal'],
  'text-effect': ['text-effect', 'typewriter', 'typography'],
  marquee: ['marquee', 'loop'],
  carousel: ['carousel', 'slider'],
  video: [],
  'scroll-reveal': ['scroll', 'reveal'],
  hover: ['hover'],
  entrance: ['motion'],
  static: [],
}

const HEAVY_MOTION = new Set(['three-d', 'particles', 'cursor', 'horizontal-scroll', 'sticky-scroll', 'parallax'])
const LIGHT_MOTION = new Set(['morph', 'text-effect', 'marquee', 'carousel', 'video', 'scroll-reveal', 'hover', 'entrance'])
const MOBILE_HOSTILE = new Set(['cursor', 'horizontal-scroll', 'three-d'])

// endregion

// region Derivation

const lower = (value) => String(value ?? '').toLowerCase()

function countHits(haystack, keywords) {
  let hits = 0
  for (const keyword of keywords) if (haystack.includes(keyword)) hits += 1
  return hits
}

function rank(haystack, table, { max, fallback }) {
  const scored = Object.entries(table)
    .map(([key, keywords]) => [key, countHits(haystack, keywords)])
    .filter(([, hits]) => hits > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)

  return scored.length ? scored.slice(0, max) : [fallback]
}

function motionTypesFor(haystack) {
  const found = MOTION_KEYWORDS.filter(([, keywords]) => countHits(haystack, keywords) > 0).map(([id]) => id)
  // Prefer entrance over static so every Motionsites recipe gets Framer-like motion.
  return found.length ? found.slice(0, 6) : ['entrance', 'scroll-reveal']
}

function performanceClassFor(motionTypes) {
  if (motionTypes.includes('three-d')) return 'D'
  if (motionTypes.some((type) => HEAVY_MOTION.has(type))) return 'C'
  if (motionTypes.some((type) => LIGHT_MOTION.has(type))) return 'B'
  return 'A'
}

function complexityFor(performanceClass, motionTypes) {
  if (performanceClass === 'D' || performanceClass === 'C') return 'advanced'
  if (performanceClass === 'B') return motionTypes.length >= 3 ? 'advanced' : 'moderate'
  return 'simple'
}

function collectionFor(category, type) {
  const key = lower(category)
  for (const [collection, categories] of Object.entries(COLLECTION_BY_CATEGORY)) {
    if (categories.includes(key)) return collection
  }
  return COLLECTION_BY_TYPE[lower(type)] ?? 'hero'
}

function roleFor(category, type) {
  const categoryKey = lower(category)
  if (categoryKey in ROLE_BY_CATEGORY) return ROLE_BY_CATEGORY[categoryKey]
  const typeKey = lower(type)
  return typeKey in ROLE_BY_TYPE ? ROLE_BY_TYPE[typeKey] : null
}

/**
 * Keep as much of the exact MotionSites prompt as Rebuild AI needs, while
 * stripping code fences and any line that would smuggle an external URL
 * (http(s), CloudFront, Mux, higgs). Caps at ~12000 chars (schema max 16000).
 */
function sanitisePrompt(markdown) {
  let body = String(markdown ?? '')
  const promptAt = body.indexOf('## Prompt')
  if (promptAt >= 0) body = body.slice(promptAt + '## Prompt'.length)

  // Drop fenced code (implementation detail); keep surrounding prose intact.
  body = body.replace(/```[\s\S]*?```/g, '\n')

  const kept = []
  for (const line of body.split('\n')) {
    if (/https?:\/\//i.test(line)) continue
    if (/:\/\//.test(line)) continue
    if (/(cloudfront|mux\.com|higgs\.ai|stream\.mux)/i.test(line)) continue
    // Markdown / HTML links whose target is external — drop the whole line.
    if (/\[[^\]]*\]\(\s*https?:/i.test(line)) continue
    if (/src\s*=\s*["']\s*https?:/i.test(line)) continue
    kept.push(line)
  }

  let cleaned = kept
    .join('\n')
    // Inline URL leftovers (rare after line filter).
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(?:d[0-9a-z]+\.)?cloudfront\.net\S*/gi, '')
    .replace(/\bmux\.com\S*/gi, '')
    .replace(/\bhiggs\.ai\S*/gi, '')
    // Collapse runaway blank lines but preserve paragraph structure.
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (cleaned.length <= MAX_SOURCE_PROMPT) return cleaned

  const window = cleaned.slice(0, MAX_SOURCE_PROMPT)
  const lastPara = window.lastIndexOf('\n\n')
  const lastStop = window.lastIndexOf('. ')
  if (lastPara > MAX_SOURCE_PROMPT * 0.6) return window.slice(0, lastPara).trim()
  if (lastStop > MAX_SOURCE_PROMPT * 0.6) return window.slice(0, lastStop + 1).trim()
  return window.trimEnd()
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function copyMedia(src, dest) {
  if (dryRun) return
  ensureDir(dirname(dest))
  copyFileSync(src, dest)
}

/** Resolve thumb/video filenames from `_thumb_file` or `NNN_` index prefix. */
function resolveSectionMedia(entry, thumbByIndex, videoByIndex) {
  let thumbFile = entry._thumb_file ? String(entry._thumb_file) : ''
  if (thumbFile && !existsSync(join(THUMBS_SRC, thumbFile))) thumbFile = ''
  if (!thumbFile && Number.isFinite(entry.index)) {
    thumbFile = thumbByIndex.get(entry.index) ?? ''
  }

  let videoFile = ''
  if (thumbFile) {
    const stem = thumbFile.replace(/\.(png|jpe?g|webp|gif|avif)$/i, '')
    const candidate = `${stem}.mp4`
    if (existsSync(join(VIDEOS_SRC, candidate))) videoFile = candidate
  }
  if (!videoFile && Number.isFinite(entry.index)) {
    videoFile = videoByIndex.get(entry.index) ?? ''
  }

  return { thumbFile, videoFile }
}

function indexMediaMaps() {
  const thumbByIndex = new Map()
  const videoByIndex = new Map()
  if (existsSync(THUMBS_SRC)) {
    for (const file of readdirSync(THUMBS_SRC)) {
      const match = file.match(/^(\d{3})_/)
      if (match) thumbByIndex.set(Number.parseInt(match[1], 10), file)
    }
  }
  if (existsSync(VIDEOS_SRC)) {
    for (const file of readdirSync(VIDEOS_SRC)) {
      const match = file.match(/^(\d{3})_/)
      if (match) videoByIndex.set(Number.parseInt(match[1], 10), file)
    }
  }
  return { thumbByIndex, videoByIndex }
}

/**
 * The text characteristics are detected from: the whole brief minus the code.
 *
 * Code fences and `className` strings are where Tailwind's `hover:`, `sticky`
 * and `scroll-` utilities live, and counting those would make every template
 * class C. Prose keeps the honest signals — "the card tilts on hover", "pinned
 * while the copy scrolls".
 */
function detectionTextFor(markdown) {
  return lower(
    markdown
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/class(Name)?=(".*?"|'.*?'|\{[^}]*\})/g, ' '),
  )
}

// endregion

// region Block recipe

/**
 * Resolve one role to the registry block that best approximates the template.
 *
 * `searchBlocks` is the same query the editor's block picker and the AI
 * selector use, so a recipe can never name a block a human could not place.
 * The ceiling passed here is the *template's* class; the site's own ceiling is
 * applied again at generation time and always wins.
 */
function selectRecipeBlock(role, template, taken) {
  if (!role) return null

  const wantedTags = new Set(template.motionType.flatMap((type) => MOTION_TAGS[type] ?? []))

  // Widening order: the template's own class and style first, then class only,
  // then the whole category, then the nearest equivalent category. The last two
  // steps can name a block heavier than the template — harmless, because the
  // *site's* ceiling is applied again in `planSite` and always wins.
  const pools = [
    { category: role, maxPerformanceClass: template.performanceClass, style: template.style[0] },
    { category: role, maxPerformanceClass: template.performanceClass },
    { category: role },
    ROLE_FALLBACK[role] ? { category: ROLE_FALLBACK[role] } : null,
  ].filter(Boolean)

  let candidates = []
  for (const query of pools) {
    candidates = searchBlocks(query).filter((block) => !taken.has(block.id))
    if (candidates.length) break
  }
  if (!candidates.length) return null

  const score = (block) => {
    const styleOverlap = block.style.filter((entry) => template.style.includes(entry)).length
    const tagOverlap = block.tags.filter((tag) => wantedTags.has(tag)).length
    return styleOverlap * 3 + tagOverlap * 2 + (block.scores.performance + block.scores.accessibility) / 100
  }

  return [...candidates].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0].id
}

function recipeFor(entry, template) {
  const roles =
    template.pageType === 'landing'
      ? LANDING_ROLES[template.collection] ?? LANDING_ROLES.default
      : [roleFor(entry.category, entry.type)]

  const taken = new Set()
  const recipe = []
  for (const role of roles) {
    const blockId = selectRecipeBlock(role, template, taken)
    // No registry equivalent: drop the slot rather than invent one.
    if (!blockId) continue
    taken.add(blockId)
    recipe.push(blockId)
  }
  return recipe
}

// endregion

// region Import

function loadPrompts() {
  /** Prompt files are named `NNN_Title.md`, where NNN is the entry's index. */
  const byIndex = new Map()
  for (const folder of ['our_prompts', 'prompt_texts']) {
    const dir = join(SECTIONS_DIR, folder)
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue
      const index = Number.parseInt(file.slice(0, 3), 10)
      if (!Number.isFinite(index) || byIndex.has(index)) continue
      byIndex.set(index, join(dir, file))
    }
  }
  return byIndex
}

function main() {
  if (!existsSync(SECTIONS_DIR)) {
    console.error(`MotionSites source not found at ${SECTIONS_DIR}. Pass --source <dir>.`)
    process.exit(1)
  }

  const entries = JSON.parse(readFileSync(join(SECTIONS_DIR, 'sections.json'), 'utf8'))
  const prompts = loadPrompts()
  const { thumbByIndex, videoByIndex } = indexMediaMaps()

  if (!dryRun) {
    ensureDir(THUMBS_OUT)
    ensureDir(VIDEOS_OUT)
  }

  const stats = {
    total: entries.length,
    withRecipe: 0,
    withoutRecipe: [],
    prompts: 0,
    thumbsCopied: 0,
    videosCopied: 0,
  }
  const seen = new Set()
  const templates = []

  for (const entry of entries) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)

    const promptFile = prompts.get(entry.index)
    const brief = promptFile ? readFileSync(promptFile, 'utf8') : ''
    const sourcePrompt = brief ? sanitisePrompt(brief) : ''
    if (promptFile) stats.prompts += 1

    const { thumbFile, videoFile } = resolveSectionMedia(entry, thumbByIndex, videoByIndex)
    let previewImage = ''
    let previewVideo = ''

    if (thumbFile) {
      const src = join(THUMBS_SRC, thumbFile)
      if (existsSync(src)) {
        copyMedia(src, join(THUMBS_OUT, thumbFile))
        previewImage = `${PUBLIC_THUMB}/${thumbFile}`
        stats.thumbsCopied += 1
      }
    }
    if (videoFile) {
      const src = join(VIDEOS_SRC, videoFile)
      if (existsSync(src)) {
        copyMedia(src, join(VIDEOS_OUT, videoFile))
        previewVideo = `${PUBLIC_VIDEO}/${videoFile}`
        stats.videosCopied += 1
      }
    }

    // Detection reads the whole brief minus its code — the motion is described
    // in the prose, not only in the opening line. Only the excerpt is stored.
    const haystack = `${lower(`${entry.title} ${entry.category} ${entry.type}`)} ${detectionTextFor(brief)}`

    const motionType = motionTypesFor(haystack)
    const performanceClass = performanceClassFor(motionType)

    const template = {
      id: entry.id,
      title: entry.title,
      collection: collectionFor(entry.category, entry.type),
      category: entry.category,
      pageType: entry.page_type === 'landing' ? 'landing' : 'section',
      style: rank(haystack, STYLE_KEYWORDS, { max: 3, fallback: 'modern' }),
      industry: rank(haystack, INDUSTRY_KEYWORDS, { max: 4, fallback: '*' }),
      motionType,
      complexity: complexityFor(performanceClass, motionType),
      mobileSafe: !motionType.some((type) => MOBILE_HOSTILE.has(type)),
      performanceClass,
      previewImage,
      previewVideo,
      islandReady: false,
      isFree: Boolean(entry.is_free),
      sourcePrompt,
      blockRecipe: [],
    }

    template.blockRecipe = recipeFor(entry, template)
    if (template.blockRecipe.length) stats.withRecipe += 1
    else stats.withoutRecipe.push(`${entry.id} (${entry.category}/${entry.type})`)

    templates.push(template)
  }

  const counts = {}
  for (const template of templates) counts[template.collection] = (counts[template.collection] ?? 0) + 1

  const collections = Object.entries(COLLECTION_META)
    .map(([id, [label, description]]) => ({ id, label, description, count: counts[id] ?? 0 }))
    .filter((collection) => collection.count > 0)

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source:
      'MotionSites section library, normalised to metadata + local /motionsites preview paths. No CDN URLs.',
    collections,
    templates,
  }

  if (!dryRun) writeFileSync(CATALOG_OUT, render(catalog), 'utf8')

  console.log(`templates:      ${stats.total}`)
  console.log(`with a recipe:  ${stats.withRecipe}`)
  console.log(`without:        ${stats.withoutRecipe.length}`)
  for (const miss of stats.withoutRecipe) console.log(`   · ${miss}`)
  console.log(`design briefs:  ${stats.prompts}`)
  console.log(`thumbs copied:  ${stats.thumbsCopied}`)
  console.log(`videos copied:  ${stats.videosCopied}`)
  console.log(`with previewImage: ${templates.filter((t) => t.previewImage).length}`)
  console.log(`with previewVideo: ${templates.filter((t) => t.previewVideo).length}`)
  console.log(`collections:    ${collections.map((c) => `${c.id}=${c.count}`).join(' ')}`)
  if (dryRun) console.log('(dry run — nothing written)')
}

/** Emit the catalogue as a typed, committed module rather than a fetched file. */
function render(catalog) {
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/templates/scripts/import-motionsites.mjs\` from the
 * MotionSites section library. Metadata + same-origin preview paths under
 * /motionsites/sections/. No third-party asset URLs (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:motionsites
 */
import type { TemplateCatalog } from '@platform/schemas'

export const MOTIONSITES_CATALOG: TemplateCatalog = ${JSON.stringify(catalog, null, 2)}
`
}

main()

// endregion
