#!/usr/bin/env node
/**
 * Normalise Magic UI (free MIT repo) into template *metadata*.
 *
 * Source: https://github.com/magicuidesign/magicui — local checkout under
 * `reference/magicui` (or MAGICUI_SOURCE / --source). Magic UI Pro templates
 * are a separate paid product and must never be imported.
 *
 * Never stores React/TSX, CSS, or CDN URLs (ADR-0003). Each entry is a rebuild
 * brief + registry block recipe.
 *
 * Usage:
 *   node scripts/import-magicui.mjs [--source <dir>] [--dry-run]
 *
 * Writes:
 *   packages/templates/src/magicui.generated.ts
 *   packages/assets/scripts/magicui-demos.generated.json
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
    : process.env.MAGICUI_SOURCE ?? join(repoRoot, 'reference', 'magicui'),
)

const CATALOG_OUT = join(packageRoot, 'src', 'magicui.generated.ts')
const DEMOS_OUT = join(repoRoot, 'packages', 'assets', 'scripts', 'magicui-demos.generated.json')
const MAX_SOURCE_PROMPT = 4000
const ID_PREFIX = 'magicui-'

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

const ROLE_FALLBACK = {
  about: 'content',
  blog: 'content',
  gallery: 'features',
}

/**
 * Keyword → collection / registry role / motion hints for Magic UI slugs.
 * Order matters: first matching rule wins.
 */
const CLASSIFY = [
  { match: /hero-video|warp-background|light-rays|particles|meteors|flickering-grid|retro-grid|animated-grid|interactive-grid|grid-pattern|dot-pattern|hexagon|striped-pattern|ripple$|noise-texture|glyph-matrix/, collection: 'hero', role: 'hero', motion: ['entrance', 'particles'] },
  { match: /bento-grid|animated-beam|orbiting|icon-cloud|globe|neon-gradient|magic-card|shine-border|border-beam|glare-hover|backlight/, collection: 'features', role: 'features', motion: ['entrance', 'hover'] },
  { match: /marquee|avatar-circles|tweet-card|client-tweet/, collection: 'proof', role: 'logos', motion: ['marquee'] },
  { match: /number-ticker|animated-circular-progress/, collection: 'proof', role: 'stats', motion: ['entrance', 'text-effect'] },
  { match: /shiny-button|shimmer-button|pulsating-button|ripple-button|rainbow-button|interactive-hover-button/, collection: 'conversion', role: 'cta', motion: ['hover', 'entrance'] },
  { match: /iphone|safari|android|lens|pixel-image|video-text/, collection: 'interactive', role: 'gallery', motion: ['entrance', 'hover'] },
  { match: /terminal|code-comparison|file-tree|script-copy/, collection: 'saas', role: 'content', motion: ['entrance'] },
  { match: /dock/, collection: 'interactive', role: 'header', motion: ['hover'] },
  { match: /text-reveal|dia-text|hyper-text|aurora-text|morphing-text|line-shadow|animated-shiny|animated-gradient|word-rotate|typing-animation|sparkles-text|spinning-text|comic-text|text-animate|kinetic-text|text-3d|highlighter|scroll-based-velocity|flip-text|box-reveal|scratch-to-reveal/, collection: 'hero', role: 'hero', motion: ['text-effect', 'entrance'] },
  { match: /animated-list|blur-fade|progressive-blur|scroll-progress|arc-timeline|grid-beams/, collection: 'interactive', role: 'content', motion: ['scroll-reveal', 'entrance'] },
  { match: /confetti|cool-mode|pointer|smooth-cursor|animated-theme|animated-subscribe/, collection: 'utility', role: null, motion: ['hover'] },
]

/** Hand-authored layout recipes from Magic UI’s free docs (not Pro). */
const RECIPES = [
  {
    slug: 'recipe-hero-depth',
    title: 'Magic UI — Hero with visual depth',
    description:
      'Hero with animated background depth, blur-fade headline entrance, and one primary CTA. Keep at most two high-motion effects.',
    collection: 'hero',
    role: 'hero',
    stack: ['warp-background', 'blur-fade', 'shiny-button'],
    motion: ['entrance', 'scroll-reveal', 'particles'],
  },
  {
    slug: 'recipe-trust-marquee',
    title: 'Magic UI — Testimonial and logo trust rail',
    description:
      'Social proof as a horizontal marquee with optional avatar clusters. Pause on hover/focus; keep copy short.',
    collection: 'proof',
    role: 'logos',
    stack: ['marquee', 'avatar-circles'],
    motion: ['marquee', 'entrance'],
  },
  {
    slug: 'recipe-feature-bento',
    title: 'Magic UI — Feature grid with motion highlights',
    description:
      'Bento feature grid with motion emphasis on one or two cards only. Short, scannable card copy.',
    collection: 'features',
    role: 'features',
    stack: ['bento-grid', 'text-animate'],
    motion: ['entrance', 'hover', 'text-effect'],
  },
]

const lower = (value) => String(value ?? '').toLowerCase()

function classify(name, title, description) {
  const hay = lower(`${name} ${title} ${description}`)
  for (const rule of CLASSIFY) {
    if (rule.match.test(hay) || rule.match.test(name)) return rule
  }
  return { collection: 'interactive', role: null, motion: ['entrance', 'hover'] }
}

function performanceClassFor(motionTypes, name) {
  const heavy = /globe|particles|cobe|webgl|three|cursor|pointer|smooth-cursor|orbiting|icon-cloud/
  if (heavy.test(name) || motionTypes.includes('three-d') || motionTypes.includes('particles')) return 'C'
  if (motionTypes.some((type) => ['marquee', 'carousel', 'hover', 'scroll-reveal', 'text-effect', 'entrance'].includes(type))) {
    return 'B'
  }
  return 'A'
}

function complexityFor(performanceClass, motionTypes) {
  if (performanceClass === 'C') return 'advanced'
  if (performanceClass === 'B') return motionTypes.length >= 3 ? 'advanced' : 'moderate'
  return 'simple'
}

function briefFor({ title, description, name, stack }) {
  const lines = [
    `Rebuild a marketing section in the spirit of Magic UI “${title}”.`,
    description?.trim() ? description.trim() : '',
    name ? `Component: ${name}.` : '',
    stack?.length ? `Suggested Magic UI stack (inspiration only): ${stack.join(', ')}.` : '',
    'Layout and motion character only — use platform blocks and theme tokens.',
    'Do not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.',
  ].filter(Boolean)
  let text = lines.join('\n\n')
  if (text.length > MAX_SOURCE_PROMPT) text = text.slice(0, MAX_SOURCE_PROMPT).trimEnd()
  return text
}

function assetCollectionFor(collection, role) {
  if (role === 'pricing') return 'pricing'
  if (role === 'header' || role === 'footer') return 'navigation'
  switch (collection) {
    case 'hero':
      return 'hero'
    case 'features':
    case 'agency':
      return 'features'
    case 'proof':
      return 'proof'
    case 'conversion':
      return 'conversion'
    case 'story':
    case 'interactive':
      return 'content'
    case 'saas':
    case 'utility':
      return 'utility'
    case 'footer':
      return 'footer'
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

function buildTemplate({ id, title, category, collection, role, motionType, sourcePrompt, style = ['modern', 'bold'] }) {
  const performanceClass = performanceClassFor(motionType, id)
  const template = {
    id,
    title,
    collection,
    category,
    pageType: 'section',
    style,
    industry: ['saas', '*'],
    motionType,
    complexity: complexityFor(performanceClass, motionType),
    mobileSafe: !motionType.includes('cursor') && !/pointer|smooth-cursor|globe/.test(id),
    performanceClass,
    previewImage: '',
    previewVideo: '',
    islandReady: false,
    isFree: true,
    sourcePrompt,
    blockRecipe: [],
  }
  if (role) {
    const blockId = selectRecipeBlock(role, template, new Set())
    if (blockId) template.blockRecipe = [blockId]
  }
  return template
}

function loadUiItems() {
  const registryPath = join(SOURCE, 'registry.json')
  const alt = join(SOURCE, 'apps', 'www', 'registry.json')
  const path = existsSync(registryPath) ? registryPath : alt
  if (!existsSync(path)) {
    console.error(`Magic UI registry.json not found under ${SOURCE}. Pass --source or pull the repo:`)
    console.error(`  pnpm --filter @platform/assets pull -- "Magic UI"`)
    process.exit(1)
  }
  const registry = JSON.parse(readFileSync(path, 'utf8'))
  return (registry.items ?? []).filter((item) => item.type === 'registry:ui')
}

function main() {
  const items = loadUiItems()
  const stats = { total: items.length, withRecipe: 0, withoutRecipe: [], recipes: 0 }
  const templates = []
  const demos = []
  const seen = new Set()

  for (const item of items) {
    const name = String(item.name)
    if (seen.has(name)) continue
    seen.add(name)

    const title = item.title || name
    const description = item.description || ''
    const rule = classify(name, title, description)
    const motionType = [...new Set(rule.motion)].slice(0, 6)

    const template = buildTemplate({
      id: `${ID_PREFIX}${name}`,
      title: `Magic UI — ${title}`,
      category: name,
      collection: rule.collection,
      role: rule.role,
      motionType,
      sourcePrompt: briefFor({ title, description, name }),
      style: /text|aurora|morph|sparkle|comic|kinetic/.test(name)
        ? ['bold', 'modern']
        : /marquee|bento|hero|warp|particle|meteor/.test(name)
          ? ['premium', 'modern']
          : ['modern'],
    })

    if (template.blockRecipe.length) stats.withRecipe += 1
    else stats.withoutRecipe.push(name)

    templates.push(template)

    if (template.blockRecipe.length) {
      demos.push({
        id: `mu-${name}`,
        library: 'Magic UI',
        demo: name,
        name: template.title,
        description: description || `Layout derived from Magic UI ${name}.`,
        collection: assetCollectionFor(template.collection, rule.role),
        tags: [name, 'magic-ui', 'free'],
        blocks: template.blockRecipe,
        derivation: 'layout-observed',
      })
    }
  }

  for (const recipe of RECIPES) {
    const template = buildTemplate({
      id: `${ID_PREFIX}${recipe.slug}`,
      title: recipe.title,
      category: 'recipe',
      collection: recipe.collection,
      role: recipe.role,
      motionType: recipe.motion,
      sourcePrompt: briefFor({
        title: recipe.title,
        description: recipe.description,
        stack: recipe.stack,
      }),
      style: ['premium', 'modern'],
    })
    if (template.blockRecipe.length) stats.withRecipe += 1
    else stats.withoutRecipe.push(recipe.slug)
    templates.push(template)
    stats.recipes += 1

    if (template.blockRecipe.length) {
      demos.push({
        id: `mu-${recipe.slug}`,
        library: 'Magic UI',
        demo: recipe.slug,
        name: recipe.title,
        description: recipe.description,
        collection: assetCollectionFor(recipe.collection, recipe.role),
        tags: ['recipe', 'magic-ui', 'free', ...recipe.stack],
        blocks: template.blockRecipe,
        derivation: 'layout-adapted',
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
      'Magic UI free MIT registry (magicuidesign/magicui). Metadata + platform block recipes only — no React/TSX or CDN URLs. Pro excluded (ADR-0003).',
    collections,
    templates,
  }

  if (!dryRun) {
    writeFileSync(CATALOG_OUT, render(catalog), 'utf8')
    writeFileSync(DEMOS_OUT, `${JSON.stringify(demos, null, 2)}\n`, 'utf8')
  }

  console.log(`ui components:  ${stats.total}`)
  console.log(`recipes:        ${stats.recipes}`)
  console.log(`templates:      ${templates.length}`)
  console.log(`with a recipe:  ${stats.withRecipe}`)
  console.log(`without:        ${stats.withoutRecipe.length}`)
  for (const miss of stats.withoutRecipe.slice(0, 25)) console.log(`   · ${miss}`)
  if (stats.withoutRecipe.length > 25) console.log(`   · … +${stats.withoutRecipe.length - 25} more`)
  console.log(`asset demos:    ${demos.length}`)
  console.log(`collections:    ${collections.map((c) => `${c.id}=${c.count}`).join(' ')}`)
  if (dryRun) console.log('(dry run — nothing written)')
}

function render(catalog) {
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/templates/scripts/import-magicui.mjs\` from the
 * Magic UI free MIT registry. Metadata + platform block recipes only.
 * No third-party asset URLs or component source (ADR-0003). Pro excluded.
 *
 * Regenerate with: pnpm --filter @platform/templates import:magicui
 */
import type { TemplateCatalog } from '@platform/schemas'

export const MAGICUI_CATALOG: TemplateCatalog = ${JSON.stringify(catalog, null, 2)}
`
}

main()
