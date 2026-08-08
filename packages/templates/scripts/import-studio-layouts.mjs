#!/usr/bin/env node
/**
 * Import Studio layout recipes from allowlisted local marketing site repos.
 *
 * Scans sibling GitHub checkouts under Documents/GitHub for homepage section
 * order (component *names* only) and emits SiteTemplate metadata:
 *   blockRecipe (live registry ids) + sourcePrompt (layout brief prose).
 *
 * Never stores React/Next/Vue source, Tailwind class strings, or third-party
 * asset URLs in the catalogue (ADR-0003).
 *
 * Usage:
 *   node scripts/import-studio-layouts.mjs [--github-root <dir>] [--dry-run]
 *
 * Writes:
 *   packages/templates/src/studio-layouts.generated.ts
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { searchBlocks } from '@platform/blocks'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, '..')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const rootArg = args.indexOf('--github-root')
const GITHUB_ROOT = resolve(
  rootArg >= 0 && args[rootArg + 1]
    ? args[rootArg + 1]
    : process.env.STUDIO_GITHUB_ROOT
      ?? join(process.env.HOME ?? '', 'Documents', 'GitHub'),
)

const CATALOG_OUT = join(packageRoot, 'src', 'studio-layouts.generated.ts')
const MAX_SOURCE_PROMPT = 6000
const ID_PREFIX = 'studio-'

/**
 * Allowlisted studio reference sites. Only these folders are scanned.
 * Curated titles / industry / style steer the brief; section order comes from
 * the homepage when detectable, else `fallbackRoles`.
 */
const ALLOWLIST = [
  {
    slug: 'gardenluxveranda',
    title: 'Gardenlux Veranda',
    collection: 'landing',
    industry: ['local', '*'],
    style: ['premium', 'modern'],
    summary:
      'Local outdoor-living retailer: product hero, proof bands, project gallery energy, and a strong quote CTA.',
    fallbackRoles: ['header', 'hero', 'features', 'gallery', 'stats', 'faq', 'cta', 'contact', 'footer'],
  },
  {
    slug: 'maasstad-installaties',
    title: 'Maasstad Installaties (Spindler)',
    collection: 'landing',
    industry: ['local', '*'],
    style: ['modern', 'bold'],
    summary:
      'Installation / construction company homepage: disciplines, projects, stats, sustainability story, jobs.',
    fallbackRoles: ['header', 'hero', 'about', 'features', 'gallery', 'stats', 'cta', 'footer'],
  },
  {
    slug: 'mama-manolya',
    title: 'Mama Manolya Kapsalon',
    collection: 'landing',
    industry: ['local', 'creative'],
    style: ['premium', 'editorial'],
    summary:
      'Salon brand landing: cinematic hero, about, services, gallery, testimonials, booking/contact close.',
    fallbackRoles: ['header', 'hero', 'about', 'features', 'gallery', 'testimonials', 'contact', 'footer'],
  },
  {
    slug: 'fitbyemre',
    title: 'Fit by Emre',
    collection: 'landing',
    industry: ['healthcare', 'local'],
    style: ['bold', 'modern'],
    summary:
      'Personal training studio: hero, services, stats, about, process, testimonials, intake CTA, contact.',
    fallbackRoles: ['hero', 'features', 'stats', 'about', 'testimonials', 'cta', 'contact', 'footer'],
  },
  {
    slug: 'rijschool-zumrut-nextjs',
    title: 'Rijschool Zumrut',
    collection: 'landing',
    industry: ['education', 'local'],
    style: ['modern', 'bold'],
    summary:
      'Driving-school marketing site: confident hero, packages/features, social proof, FAQ, enrolment CTA.',
    fallbackRoles: ['header', 'hero', 'features', 'pricing', 'testimonials', 'faq', 'cta', 'contact', 'footer'],
  },
  {
    slug: 'mc-agent-landing-page',
    title: 'MC Agent Landing',
    collection: 'saas',
    industry: ['saas', '*'],
    style: ['modern', 'minimal'],
    summary:
      'Product landing: nav, hero, feature grid, showcase, testimonials, closing CTA, footer.',
    fallbackRoles: ['header', 'hero', 'features', 'gallery', 'testimonials', 'cta', 'footer'],
  },
  {
    slug: 'essmarketing-v0',
    title: 'ESS Marketing',
    collection: 'agency',
    industry: ['agency', '*'],
    style: ['modern', 'premium'],
    summary:
      'Agency marketing homepage: framed hero, trust/services bento, featured cases, conversion close.',
    fallbackRoles: ['header', 'hero', 'features', 'gallery', 'testimonials', 'cta', 'contact', 'footer'],
  },
  {
    slug: 'maanenzonwebsite',
    title: 'Maan & Zon Thuiszorg',
    collection: 'landing',
    industry: ['healthcare', 'local'],
    style: ['minimal', 'modern'],
    summary:
      'Home-care service site: banner hero, services, why-us, team, testimonials, contact.',
    fallbackRoles: ['header', 'hero', 'features', 'about', 'team', 'testimonials', 'contact', 'footer'],
  },
]

const COLLECTION_META = {
  landing: ['Landing pages', 'Whole-page starting points, hero through closing call to action.'],
  saas: ['SaaS & product', 'Product-led pages: dashboards, plans, feature proof.'],
  agency: ['Agency & portfolio', 'Studio and case-study work where the craft is the pitch.'],
}

/** Filename / component-name tokens → registry role. */
const ROLE_PATTERNS = [
  { role: 'header', re: /\b(header|navbar|nav-bar|site-header|dealer-header)\b/i },
  { role: 'hero', re: /\b(hero|banner|video-slider|page-hero|framed-hero)\b/i },
  { role: 'features', re: /\b(feature|features|services|disciplines|service|benefits|process|chooseus|why|trust-bento)\b/i },
  { role: 'about', re: /\b(about|over-ons|story|intro)\b/i },
  { role: 'gallery', re: /\b(gallery|galerij|projects?|projecten|showcase|cases|portfolio|photo-gallery)\b/i },
  { role: 'stats', re: /\b(stats?|counter|numbers|cijfers)\b/i },
  { role: 'testimonials', re: /\b(testimonial|reviews?|social-proof)\b/i },
  { role: 'pricing', re: /\b(pricing|prijzen|packages?|tarieven)\b/i },
  { role: 'faq', re: /\b(faq|veelgestelde)\b/i },
  { role: 'team', re: /\b(team|vacancies|vacatures|jobs)\b/i },
  { role: 'cta', re: /\b(cta|intake|offerte|waitlist|signup)\b/i },
  { role: 'contact', re: /\b(contact|booking|boeking)\b/i },
  { role: 'footer', re: /\b(footer|site-footer)\b/i },
  { role: 'logos', re: /\b(logos?|certificates|partners|marquee)\b/i },
]

const ROLE_FALLBACK = {
  about: 'content',
  team: 'about',
  gallery: 'features',
}

const SKIP_DIR = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.output',
  'coverage',
  '.turbo',
  'public',
  'cms',
])

const HOME_CANDIDATES = [
  'app/page.tsx',
  'app/page.jsx',
  'app/(main)/page.tsx',
  'src/app/page.tsx',
  'src/app/page.jsx',
  'app/[locale]/page.tsx',
  'pages/index.vue',
  'pages/index.tsx',
  'frontend/src/App.tsx',
  'src/App.tsx',
]

function lower(value) {
  return String(value ?? '').toLowerCase()
}

function roleFromName(name) {
  const base = lower(name).replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-')
  for (const entry of ROLE_PATTERNS) {
    if (entry.re.test(base)) return entry.role
  }
  return null
}

function walkFiles(root, predicate, out = [], depth = 0) {
  if (depth > 8 || out.length > 400) return out
  let entries = []
  try {
    entries = readdirSync(root)
  } catch {
    return out
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue
    const full = join(root, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walkFiles(full, predicate, out, depth + 1)
    else if (predicate(full, name)) out.push(full)
  }
  return out
}

function findHomePage(repoPath) {
  for (const rel of HOME_CANDIDATES) {
    const full = join(repoPath, rel)
    if (existsSync(full)) return full
  }
  // Locale / group folders: first shallow page.tsx that is not under admin/api/docs.
  const pages = walkFiles(
    repoPath,
    (full, name) =>
      (name === 'page.tsx' || name === 'page.jsx') &&
      !/\/(admin|api|docs|dashboard|auth)\//i.test(full),
  )
  const homeish = pages.find((p) => /\/page\.tsx?$/.test(p) && /\/(app|src\/app)\/[^/]+\/page\.tsx?$/.test(p) === false)
  return homeish || pages[0] || null
}

/**
 * Extract ordered section roles from a homepage file without keeping source.
 * Uses import paths + JSX tag names only.
 */
function rolesFromHomeSource(source) {
  const roles = []
  const seen = new Set()

  const push = (raw) => {
    const role = roleFromName(raw)
    if (!role || seen.has(role)) return
    // Keep structural order: header early, footer last preferred later.
    seen.add(role)
    roles.push(role)
  }

  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const pathPart = match[1].split('/').pop() ?? ''
    push(pathPart)
  }

  for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
    push(match[1])
  }

  return roles
}

function rolesFromFilenames(repoPath) {
  const files = walkFiles(
    repoPath,
    (_full, name) => /\.(tsx|jsx|vue|js)$/i.test(name) && !/\.test\./i.test(name) && !/\.spec\./i.test(name),
  )
  const roles = []
  const seen = new Set()
  for (const file of files) {
    const base = file.split(/[/\\]/).pop() ?? ''
    const role = roleFromName(base)
    if (!role || seen.has(role)) continue
    // Prefer files that look like page sections over ui primitives.
    if (/\/ui\//i.test(file) && !/hero|cta|footer|header/i.test(base)) continue
    seen.add(role)
    roles.push(role)
  }
  return roles
}

function orderRoles(roles, fallback) {
  const preferred = [
    'header',
    'hero',
    'logos',
    'features',
    'about',
    'stats',
    'gallery',
    'team',
    'testimonials',
    'pricing',
    'faq',
    'cta',
    'contact',
    'footer',
  ]
  const set = new Set(roles.length >= 3 ? roles : fallback)
  // Always ensure a landing spine.
  for (const must of ['hero', 'features', 'cta']) set.add(must)
  const ordered = preferred.filter((role) => set.has(role))
  // Cap length so recipes stay readable.
  return ordered.slice(0, 10)
}

function extractMetaProse(source) {
  const bits = []
  const title = source.match(/title:\s*['"`]([^'"`]{8,160})['"`]/)
  if (title) bits.push(title[1].trim())
  const desc = source.match(/description:\s*['"`]([^'"`]{20,320})['"`]/)
  if (desc) bits.push(desc[1].trim())
  return bits
    .map((line) => line.replace(/https?:\/\/\S+/gi, '').trim())
    .filter(Boolean)
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

function buildSourcePrompt({ title, summary, roles, metaProse, repoSlug }) {
  const bandList = roles.map((role, index) => `${index + 1}. ${role}`).join('\n')
  const meta = metaProse.length ? `\nObserved page chrome (prose only):\n${metaProse.map((m) => `· ${m}`).join('\n')}\n` : ''
  const body = [
    `Rebuild a full marketing landing page in the spirit of Studio reference “${title}” (${repoSlug}).`,
    'Whole-page layout and hierarchy only — use platform blocks and theme tokens.',
    'Do not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.',
    '',
    summary,
    meta,
    'Suggested section order (roles → platform blocks):',
    bandList,
    '',
    'Keep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.',
  ].join('\n')

  if (body.length <= MAX_SOURCE_PROMPT) return body
  return body.slice(0, MAX_SOURCE_PROMPT).trimEnd()
}

function main() {
  const stats = { scanned: 0, missing: [], thin: [] }
  const templates = []

  for (const site of ALLOWLIST) {
    const repoPath = join(GITHUB_ROOT, site.slug)
    if (!existsSync(repoPath)) {
      stats.missing.push(site.slug)
      continue
    }
    stats.scanned += 1

    const home = findHomePage(repoPath)
    let detected = []
    let metaProse = []
    if (home) {
      const source = readFileSync(home, 'utf8')
      // Read only for structure tokens — never emit this source into the catalogue.
      detected = rolesFromHomeSource(source)
      metaProse = extractMetaProse(source)
    }
    if (detected.length < 3) {
      const fromFiles = rolesFromFilenames(repoPath)
      detected = detected.length ? [...detected, ...fromFiles.filter((r) => !detected.includes(r))] : fromFiles
    }

    const roles = orderRoles(detected, site.fallbackRoles)
    const performanceClass = 'B'
    const template = {
      id: `${ID_PREFIX}${site.slug}`,
      title: site.title,
      collection: site.collection,
      category: 'landing-page',
      pageType: 'landing',
      style: site.style,
      industry: site.industry,
      motionType: ['entrance', 'scroll-reveal'],
      complexity: 'moderate',
      mobileSafe: true,
      performanceClass,
      previewImage: '',
      previewVideo: '',
      islandReady: false,
      isFree: true,
      sourcePrompt: '',
      blockRecipe: [],
    }

    template.blockRecipe = recipeFor(roles, template)
    template.sourcePrompt = buildSourcePrompt({
      title: site.title,
      summary: site.summary,
      roles,
      metaProse,
      repoSlug: site.slug,
    })

    if (template.blockRecipe.length < 3) {
      stats.thin.push(`${site.slug} (${template.blockRecipe.length})`)
    }

    templates.push(template)
  }

  const counts = {}
  for (const template of templates) {
    counts[template.collection] = (counts[template.collection] ?? 0) + 1
  }

  const collections = Object.entries(COLLECTION_META)
    .map(([id, [label, description]]) => ({ id, label, description, count: counts[id] ?? 0 }))
    .filter((collection) => collection.count > 0)

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source:
      'Studio layout recipes from allowlisted local marketing repos under Documents/GitHub. Metadata + platform block recipes only — no framework source or CDN URLs (ADR-0003).',
    collections,
    templates,
  }

  if (!dryRun) {
    writeFileSync(CATALOG_OUT, render(catalog), 'utf8')
  }

  console.log(`github root:    ${GITHUB_ROOT}`)
  console.log(`allowlist:      ${ALLOWLIST.map((s) => s.slug).join(', ')}`)
  console.log(`scanned:        ${stats.scanned}`)
  console.log(`templates:      ${templates.length}`)
  if (stats.missing.length) console.log(`missing repos:  ${stats.missing.join(', ')}`)
  if (stats.thin.length) console.log(`thin recipes:   ${stats.thin.join(', ')}`)
  for (const template of templates) {
    console.log(`  · ${template.id}  [${template.blockRecipe.join(' → ')}]`)
  }
  if (dryRun) console.log('(dry run — nothing written)')
}

function render(catalog) {
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`packages/templates/scripts/import-studio-layouts.mjs\`
 * from allowlisted local Studio marketing repos. Metadata + platform block
 * recipes only. No framework source or third-party asset URLs (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:studio-layouts
 */
import type { TemplateCatalog } from '@platform/schemas'

export const STUDIO_LAYOUTS_CATALOG: TemplateCatalog = ${JSON.stringify(catalog, null, 2)}
`
}

main()
