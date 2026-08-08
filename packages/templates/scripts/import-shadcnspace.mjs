#!/usr/bin/env node
/**
 * Normalise the Shadcn Space free library into template *metadata*.
 *
 * Source: local checkout of https://github.com/shadcnspace/shadcnspace (MIT).
 * Free blocks only — Pro-locked names from `pro-forbidden.json` / manifest
 * `proLocked` are skipped. Never stores React/TSX, CSS, or CDN URLs in the
 * catalogue (ADR-0003). Each entry is a rebuild brief + registry block recipe.
 *
 * Usage:
 *   node scripts/import-shadcnspace.mjs [--source <dir>] [--dry-run]
 *
 * Writes:
 *   packages/templates/src/shadcnspace.generated.ts
 *   packages/assets/scripts/shadcnspace-demos.generated.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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
    : process.env.SHADCNSPACE_SOURCE ?? join(process.env.HOME ?? '', 'Documents', 'shadcnspace-library'),
)

const CATALOG_OUT = join(packageRoot, 'src', 'shadcnspace.generated.ts')
const DEMOS_OUT = join(repoRoot, 'packages', 'assets', 'scripts', 'shadcnspace-demos.generated.json')
const MAX_SOURCE_PROMPT = 4000
const ID_PREFIX = 'shadcnspace-'

/** Family → browsable collection (same vocabulary as MotionSites). */
const COLLECTION_BY_FAMILY = {
  hero: 'hero',
  feature: 'features',
  features: 'features',
  services: 'features',
  'bento-grid': 'features',
  'about-us-section': 'story',
  team: 'story',
  timeline: 'story',
  faq: 'story',
  blog: 'story',
  cta: 'conversion',
  contact: 'conversion',
  newsletter: 'conversion',
  pricing: 'conversion',
  download: 'conversion',
  forms: 'conversion',
  testimonial: 'proof',
  testimonials: 'proof',
  statistics: 'proof',
  'logo-cloud': 'proof',
  footer: 'footer',
  navbar: 'interactive',
  gallery: 'interactive',
  portfolio: 'agency',
  'bio-link': 'agency',
  'product-category': 'ecommerce',
  'product-listing': 'ecommerce',
  'product-overview': 'ecommerce',
  checkout: 'ecommerce',
  'dashboard-shell': 'saas',
  chart: 'saas',
  datatable: 'saas',
  sidebar: 'saas',
  topbar: 'saas',
  widget: 'saas',
  'empty-state': 'utility',
  'cookie-consent': 'utility',
  'dialog-block': 'utility',
  table: 'utility',
  login: 'utility',
  register: 'utility',
  'forgot-password': 'utility',
  'verify-email': 'utility',
  'two-factor-authentication': 'utility',
  receipt: 'utility',
  'chat-application': 'saas',
  'kanban-application': 'saas',
}

/** Family → registry block category (`null` = no equivalent; seed via brief). */
const ROLE_BY_FAMILY = {
  hero: 'hero',
  feature: 'features',
  features: 'features',
  services: 'features',
  'bento-grid': 'features',
  'about-us-section': 'about',
  team: 'about',
  timeline: 'content',
  faq: 'faq',
  blog: 'blog',
  cta: 'cta',
  contact: 'contact',
  newsletter: 'cta',
  pricing: 'pricing',
  download: 'cta',
  forms: 'contact',
  testimonial: 'testimonials',
  testimonials: 'testimonials',
  statistics: 'stats',
  'logo-cloud': 'logos',
  footer: 'footer',
  navbar: 'header',
  gallery: 'gallery',
  portfolio: 'gallery',
  'bio-link': 'content',
  'product-category': 'gallery',
  'product-listing': 'gallery',
  'product-overview': 'features',
  checkout: null,
  'dashboard-shell': null,
  chart: null,
  datatable: null,
  sidebar: null,
  topbar: null,
  widget: null,
  'empty-state': null,
  'cookie-consent': null,
  'dialog-block': null,
  table: null,
  login: null,
  register: null,
  'forgot-password': null,
  'verify-email': null,
  'two-factor-authentication': null,
  receipt: null,
  'chat-application': null,
  'kanban-application': null,
}

const ROLE_FALLBACK = {
  about: 'content',
  blog: 'content',
  gallery: 'features',
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

const STYLE_KEYWORDS = {
  minimal: ['minimal', 'understated', 'restrained', 'sparse', 'quiet', 'whitespace', 'airy', 'clean'],
  editorial: ['editorial', 'magazine', 'serif', 'typograph'],
  premium: ['premium', 'luxur', 'elegant', 'refined', 'glass', 'gradient'],
  bold: ['bold', 'brutal', 'oversized', 'high contrast', 'massive', 'loud'],
  modern: ['modern', 'saas', 'sleek', 'rounded', 'agency', 'startup'],
}

const INDUSTRY_KEYWORDS = {
  saas: ['saas', 'dashboard', 'platform', 'subscription', 'startup', 'b2b'],
  agency: ['agency', 'studio', 'creative'],
  ecommerce: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'product'],
  portfolio: ['portfolio', 'case stud'],
  creative: ['art', 'design', 'gallery'],
  local: ['local business', 'service'],
}

const MOTION_KEYWORDS = [
  ['carousel', ['carousel', 'slider', 'swiper']],
  ['marquee', ['marquee', 'ticker', 'infinite']],
  ['hover', ['hover', 'tilt', 'magnetic']],
  ['scroll-reveal', ['scroll', 'reveal', 'sticky']],
  ['entrance', ['animate', 'motion', 'fade', 'framer']],
  ['text-effect', ['typewriter', 'ticker', 'animated text']],
]

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
  return found.length ? found.slice(0, 6) : ['entrance', 'scroll-reveal']
}

function performanceClassFor(motionTypes) {
  if (motionTypes.some((type) => ['three-d', 'particles', 'cursor', 'horizontal-scroll'].includes(type))) {
    return 'C'
  }
  if (motionTypes.some((type) => ['carousel', 'marquee', 'hover', 'scroll-reveal', 'entrance', 'text-effect'].includes(type))) {
    return 'B'
  }
  return 'A'
}

function complexityFor(performanceClass, motionTypes) {
  if (performanceClass === 'C') return 'advanced'
  if (performanceClass === 'B') return motionTypes.length >= 3 ? 'advanced' : 'moderate'
  return 'simple'
}

function briefFor(item) {
  const lines = [
    `Rebuild a marketing section in the spirit of Shadcn Space “${item.title}”.`,
    item.description?.trim() ? item.description.trim() : '',
    `Family: ${item.family}. Layout and hierarchy only — use platform blocks and theme tokens.`,
    'Do not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.',
  ].filter(Boolean)
  let text = lines.join('\n\n')
  if (text.length > MAX_SOURCE_PROMPT) text = text.slice(0, MAX_SOURCE_PROMPT).trimEnd()
  return text
}

/** Map template collections onto `@platform/assets` collection ids. */
function assetCollectionFor(collection, family) {
  if (family === 'pricing') return 'pricing'
  if (family === 'footer' || collection === 'footer') return 'footer'
  if (family === 'navbar') return 'navigation'
  switch (collection) {
    case 'hero':
      return 'hero'
    case 'features':
    case 'agency':
      return 'features'
    case 'proof':
      return 'proof'
    case 'conversion':
    case 'ecommerce':
      return 'conversion'
    case 'story':
    case 'interactive':
      return 'content'
    case 'saas':
    case 'utility':
      return 'utility'
    default:
      return 'content'
  }
}

function selectRecipeBlock(role, template, taken) {
  if (!role) return null
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
    return styleOverlap * 3 + (block.scores.performance + block.scores.accessibility) / 100
  }

  return [...candidates].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0].id
}

function loadProLocked() {
  const locked = new Set()
  const forbiddenPath = join(SOURCE, 'pro-forbidden.json')
  if (existsSync(forbiddenPath)) {
    const raw = JSON.parse(readFileSync(forbiddenPath, 'utf8'))
    const list = Array.isArray(raw) ? raw : (raw.names ?? raw.proLocked ?? [])
    for (const name of list) locked.add(String(name))
  }
  const manifestPath = join(SOURCE, 'manifest.json')
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    for (const name of manifest.proLocked ?? []) locked.add(String(name))
  }
  return locked
}

function loadItems() {
  const builderPath = join(SOURCE, 'builder', 'index.json')
  if (!existsSync(builderPath)) {
    console.error(`Shadcn Space builder index not found at ${builderPath}. Pass --source <dir>.`)
    process.exit(1)
  }
  const builder = JSON.parse(readFileSync(builderPath, 'utf8'))
  return builder.items ?? []
}

function main() {
  const locked = loadProLocked()
  const items = loadItems().filter((item) => item.type === 'blocks' && !locked.has(item.name))

  const stats = { total: items.length, withRecipe: 0, withoutRecipe: [], skippedLocked: locked.size }
  const templates = []
  const demos = []

  for (const item of items) {
    const family = lower(item.family)
    const haystack = lower(`${item.title} ${item.description} ${item.family}`)
    const motionType = motionTypesFor(haystack)
    const performanceClass = performanceClassFor(motionType)
    const role = Object.prototype.hasOwnProperty.call(ROLE_BY_FAMILY, family)
      ? ROLE_BY_FAMILY[family]
      : null

    const template = {
      id: `${ID_PREFIX}${item.name}`,
      title: item.title,
      collection: COLLECTION_BY_FAMILY[family] ?? 'utility',
      category: item.family,
      pageType: 'section',
      style: rank(haystack, STYLE_KEYWORDS, { max: 3, fallback: 'modern' }),
      industry: rank(haystack, INDUSTRY_KEYWORDS, { max: 4, fallback: '*' }),
      motionType,
      complexity: complexityFor(performanceClass, motionType),
      mobileSafe: true,
      performanceClass,
      previewImage: '',
      previewVideo: '',
      islandReady: false,
      isFree: true,
      sourcePrompt: briefFor(item),
      blockRecipe: [],
    }

    if (role) {
      const blockId = selectRecipeBlock(role, template, new Set())
      if (blockId) {
        template.blockRecipe = [blockId]
        stats.withRecipe += 1
      } else {
        stats.withoutRecipe.push(`${item.name} (${family}/${role})`)
      }
    } else {
      stats.withoutRecipe.push(`${item.name} (${family}/unmapped)`)
    }

    templates.push(template)

    if (template.blockRecipe.length) {
      demos.push({
        id: `ss-${item.name}`,
        library: 'Shadcn Space',
        demo: item.name,
        name: item.title,
        description: item.description || `Layout derived from Shadcn Space ${item.name}.`,
        collection: assetCollectionFor(template.collection, family),
        tags: [item.family, 'shadcn-space', 'free'],
        blocks: template.blockRecipe,
        derivation: 'layout-observed',
      })
    }
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
      'Shadcn Space free blocks (MIT). Metadata + platform block recipes only — no React/TSX or CDN URLs (ADR-0003).',
    collections,
    templates,
  }

  if (!dryRun) {
    writeFileSync(CATALOG_OUT, render(catalog), 'utf8')
    writeFileSync(DEMOS_OUT, `${JSON.stringify(demos, null, 2)}\n`, 'utf8')
  }

  console.log(`free blocks:    ${stats.total}`)
  console.log(`with a recipe:  ${stats.withRecipe}`)
  console.log(`without:        ${stats.withoutRecipe.length}`)
  for (const miss of stats.withoutRecipe.slice(0, 40)) console.log(`   · ${miss}`)
  if (stats.withoutRecipe.length > 40) console.log(`   · … +${stats.withoutRecipe.length - 40} more`)
  console.log(`pro locked skip list size: ${stats.skippedLocked}`)
  console.log(`asset demos:    ${demos.length}`)
  console.log(`collections:    ${collections.map((c) => `${c.id}=${c.count}`).join(' ')}`)
  if (dryRun) console.log('(dry run — nothing written)')
}

function render(catalog) {
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/templates/scripts/import-shadcnspace.mjs\` from the
 * Shadcn Space free block library. Metadata + platform block recipes only.
 * No third-party asset URLs or component source (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:shadcnspace
 */
import type { TemplateCatalog } from '@platform/schemas'

export const SHADCNSPACE_CATALOG: TemplateCatalog = ${JSON.stringify(catalog, null, 2)}
`
}

main()
