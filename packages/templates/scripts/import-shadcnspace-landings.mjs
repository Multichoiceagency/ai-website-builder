#!/usr/bin/env node
/**
 * Import Shadcn Space *full landing page* templates as rebuild briefs.
 *
 * Source: local scrape of https://shadcnspace.com/templates
 *   (default: ~/Documents/shadcnspace-templates — catalog.json + <slug>.md)
 *
 * Separate from `import-shadcnspace.mjs` (UI *blocks*). These entries are
 * whole-page recipes (`pageType: landing`) so generation can assemble a
 * complete homepage from platform blocks.
 *
 * Never stores React/TSX, CSS, screenshot CDN URLs, or third-party assets
 * (ADR-0003). Markdown is sanitised into `sourcePrompt` only.
 *
 * Usage:
 *   node scripts/import-shadcnspace-landings.mjs [--source <dir>] [--dry-run]
 *
 * Writes:
 *   packages/templates/src/shadcnspace-landings.generated.ts
 *   packages/assets/scripts/shadcnspace-landings-demos.generated.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
    : process.env.SHADCNSPACE_TEMPLATES_SOURCE
      ?? join(process.env.HOME ?? '', 'Documents', 'shadcnspace-templates'),
)

const CATALOG_OUT = join(packageRoot, 'src', 'shadcnspace-landings.generated.ts')
const DEMOS_OUT = join(repoRoot, 'packages', 'assets', 'scripts', 'shadcnspace-landings-demos.generated.json')
const MAX_SOURCE_PROMPT = 12000
const ID_PREFIX = 'shadcnspace-landing-'

const COLLECTION_META = {
  landing: ['Landing pages', 'Whole-page starting points, hero through closing call to action.'],
  saas: ['SaaS & product', 'Product-led pages: dashboards, plans, feature proof.'],
  agency: ['Agency & portfolio', 'Studio and case-study work where the craft is the pitch.'],
}

/** Per-slug collection + industry + section order for the platform recipe. */
const TEMPLATE_META = {
  atomist: {
    collection: 'saas',
    industry: ['saas', '*'],
    style: ['minimal', 'modern'],
    roles: ['hero', 'features', 'stats', 'pricing', 'testimonials', 'faq', 'cta'],
  },
  awake: {
    collection: 'agency',
    industry: ['agency', 'portfolio', 'creative'],
    style: ['modern', 'minimal'],
    roles: ['hero', 'features', 'gallery', 'testimonials', 'about', 'cta', 'contact'],
  },
  crypgo: {
    collection: 'landing',
    industry: ['web3', 'fintech', 'saas'],
    style: ['bold', 'modern'],
    roles: ['hero', 'features', 'stats', 'testimonials', 'pricing', 'cta'],
  },
  'digital-arc': {
    collection: 'agency',
    industry: ['agency', 'portfolio', 'creative'],
    style: ['premium', 'bold'],
    roles: ['hero', 'gallery', 'features', 'testimonials', 'cta', 'contact'],
  },
  gleamer: {
    collection: 'landing',
    industry: ['local', '*'],
    style: ['modern', 'minimal'],
    roles: ['hero', 'features', 'about', 'testimonials', 'faq', 'cta', 'contact'],
  },
  homely: {
    collection: 'landing',
    industry: ['real_estate', 'local'],
    style: ['modern', 'premium'],
    roles: ['hero', 'gallery', 'features', 'testimonials', 'faq', 'cta', 'contact'],
  },
  resume: {
    collection: 'agency',
    industry: ['portfolio', '*'],
    style: ['minimal', 'modern'],
    roles: ['hero', 'about', 'features', 'gallery', 'cta'],
  },
  saazio: {
    collection: 'saas',
    industry: ['saas', '*'],
    style: ['modern', 'minimal'],
    roles: ['hero', 'features', 'about', 'testimonials', 'cta', 'contact'],
  },
  studiova: {
    collection: 'agency',
    industry: ['agency', 'creative', 'portfolio'],
    style: ['premium', 'modern'],
    roles: ['hero', 'gallery', 'features', 'testimonials', 'cta', 'contact'],
  },
  typefolio: {
    collection: 'agency',
    industry: ['portfolio', 'creative'],
    style: ['minimal', 'editorial'],
    roles: ['hero', 'about', 'gallery', 'features', 'cta'],
  },
}

const ROLE_FALLBACK = {
  about: 'content',
  blog: 'content',
  gallery: 'features',
}

const lower = (value) => String(value ?? '').toLowerCase()

function sanitisePrompt(markdown, title) {
  let body = String(markdown ?? '')

  // Drop scrape chrome / image lines / external links (ADR-0003).
  body = body.replace(/^Title:.*$/gim, '')
  body = body.replace(/^URL Source:.*$/gim, '')
  body = body.replace(/^Markdown Content:\s*/gim, '')
  body = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  body = body.replace(/```[\s\S]*?```/g, '\n')

  const kept = []
  for (const line of body.split('\n')) {
    if (/https?:\/\//i.test(line)) continue
    if (/:\/\//.test(line)) continue
    if (/\[[^\]]*\]\(\s*https?:/i.test(line)) continue
    if (/src\s*=\s*["']\s*https?:/i.test(line)) continue
    if (/images\.shadcnspace\.com/i.test(line)) continue
    kept.push(line)
  }

  let cleaned = kept
    .join('\n')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const header = [
    `Rebuild a full marketing landing page in the spirit of Shadcn Space “${title}”.`,
    'Whole-page layout and hierarchy only — use platform blocks and theme tokens.',
    'Do not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.',
    '',
  ].join('\n')

  cleaned = `${header}${cleaned}`

  if (cleaned.length <= MAX_SOURCE_PROMPT) return cleaned
  const window = cleaned.slice(0, MAX_SOURCE_PROMPT)
  const lastPara = window.lastIndexOf('\n\n')
  if (lastPara > MAX_SOURCE_PROMPT * 0.6) return window.slice(0, lastPara).trim()
  return window.trimEnd()
}

function performanceClassFor() {
  return 'B'
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

function recipeFor(roles, template) {
  const taken = new Set()
  const recipe = []
  for (const role of roles) {
    const blockId = selectRecipeBlock(role, template, taken)
    if (!blockId) continue
    taken.add(blockId)
    recipe.push(blockId)
  }
  return recipe
}

function loadCatalog() {
  const catalogPath = join(SOURCE, 'catalog.json')
  if (!existsSync(catalogPath)) {
    console.error(`Shadcn Space templates catalog not found at ${catalogPath}.`)
    console.error('Pass --source <dir> pointing at the scrape (index.html + *.md + catalog.json).')
    process.exit(1)
  }
  return JSON.parse(readFileSync(catalogPath, 'utf8'))
}

function main() {
  const catalogRows = loadCatalog()
  const stats = { total: catalogRows.length, withRecipe: 0, withoutRecipe: [], missingMd: [] }
  const templates = []
  const demos = []

  for (const row of catalogRows) {
    const slug = String(row.slug)
    const mdPath = join(SOURCE, `${slug}.md`)
    if (!existsSync(mdPath)) {
      stats.missingMd.push(slug)
      continue
    }

    const meta = TEMPLATE_META[slug] ?? {
      collection: 'landing',
      industry: ['*'],
      style: ['modern'],
      roles: ['hero', 'features', 'testimonials', 'cta'],
    }

    const markdown = readFileSync(mdPath, 'utf8')
    const title = row.title || slug
    const performanceClass = performanceClassFor()

    const template = {
      id: `${ID_PREFIX}${slug}`,
      title,
      collection: meta.collection,
      category: 'landing-page',
      pageType: 'landing',
      style: meta.style,
      industry: meta.industry,
      motionType: ['entrance', 'scroll-reveal'],
      complexity: 'moderate',
      mobileSafe: true,
      performanceClass,
      previewImage: '',
      previewVideo: '',
      islandReady: false,
      isFree: true,
      sourcePrompt: sanitisePrompt(markdown, title),
      blockRecipe: [],
    }

    template.blockRecipe = recipeFor(meta.roles, template)
    if (template.blockRecipe.length >= 3) stats.withRecipe += 1
    else stats.withoutRecipe.push(`${slug} (${template.blockRecipe.length} blocks)`)

    templates.push(template)

    if (template.blockRecipe.length) {
      demos.push({
        id: `ss-landing-${slug}`,
        library: 'Shadcn Space',
        demo: `landing-${slug}`,
        name: title,
        description:
          row.og_description?.replace(/&amp;/g, '&')
          || `Full landing page layout derived from Shadcn Space ${slug}.`,
        collection: 'conversion',
        tags: [slug, 'landing', 'shadcn-space', 'free', 'full-page'],
        blocks: template.blockRecipe,
        derivation: 'layout-observed',
      })
    }
  }

  // Also pick up any *.md that is not in catalog.json (except index).
  for (const file of readdirSync(SOURCE)) {
    if (!file.endsWith('.md') || file.startsWith('00-') || lower(file) === 'readme.md') continue
    const slug = file.slice(0, -3)
    if (templates.some((template) => template.id === `${ID_PREFIX}${slug}`)) continue
    stats.missingMd.push(`orphan:${slug}`)
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
      'Shadcn Space free landing templates (shadcnspace.com/templates). Metadata + platform block recipes only — markdown sanitised, no React/TSX or CDN URLs (ADR-0003).',
    collections,
    templates,
  }

  if (!dryRun) {
    writeFileSync(CATALOG_OUT, render(catalog), 'utf8')
    writeFileSync(DEMOS_OUT, `${JSON.stringify(demos, null, 2)}\n`, 'utf8')
  }

  console.log(`source:         ${SOURCE}`)
  console.log(`catalog rows:   ${stats.total}`)
  console.log(`templates:      ${templates.length}`)
  console.log(`with recipe≥3:  ${stats.withRecipe}`)
  console.log(`thin recipes:   ${stats.withoutRecipe.length}`)
  for (const miss of stats.withoutRecipe) console.log(`   · ${miss}`)
  if (stats.missingMd.length) {
    console.log(`missing / orphan md: ${stats.missingMd.join(', ')}`)
  }
  console.log(`asset demos:    ${demos.length}`)
  console.log(`collections:    ${collections.map((c) => `${c.id}=${c.count}`).join(' ')}`)
  if (dryRun) console.log('(dry run — nothing written)')
}

function render(catalog) {
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/templates/scripts/import-shadcnspace-landings.mjs\`
 * from the local Shadcn Space templates scrape (markdown briefs). Metadata +
 * platform block recipes only. No third-party asset URLs or component source
 * (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:shadcnspace-landings
 */
import type { TemplateCatalog } from '@platform/schemas'

export const SHADCNSPACE_LANDINGS_CATALOG: TemplateCatalog = ${JSON.stringify(catalog, null, 2)}
`
}

main()
