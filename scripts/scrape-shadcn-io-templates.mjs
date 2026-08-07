#!/usr/bin/env node
/**
 * Catalog scrape for https://www.shadcn.io/template (+ categories / authors).
 *
 * Writes gitignored `reference/shadcn-io-templates/catalog.json`.
 *
 * Legal gates:
 * - Never log in or scrape Pro auth-gated downloads / ZIPs.
 * - Record Pro listings as `isPro: true` and skip code fetch.
 * - Flag community GitHub URLs that the page labels MIT (`mitGithub: true`).
 * - Observe only — never import `reference/` into shipped packages (ADR-0003).
 *
 * Usage:
 *   node scripts/scrape-shadcn-io-templates.mjs [--limit N] [--headed] [--delay-ms 400]
 *
 * Resume: re-runs skip slugs already present in catalog.json.
 */
import { join } from 'node:path'
import {
  REPO_ROOT,
  goto,
  loadCatalog,
  parseScrapeArgs,
  saveCatalog,
  sleep,
  withBrowser,
} from './lib/scrape-catalog.mjs'

const BASE = 'https://www.shadcn.io'
const OUT_DIR = join(REPO_ROOT, 'reference', 'shadcn-io-templates')
const CATALOG_PATH = join(OUT_DIR, 'catalog.json')

const SKIP_SLUGS = new Set([
  'categories',
  'category',
  'author',
  'authors',
  'pricing',
  'dashboard',
  'search',
])

/** Author index pages reliably list community templates even when category RSC fails. */
const AUTHOR_SEEDS = [
  'mickasmt',
  'sadmann7',
  'redpangilinan',
  'ibelick',
  'niazmorshed2007',
  'sujjeee',
  'shreyas-29',
  'ln-dev7',
  'stack-auth',
  'codehagen',
]

const CATEGORY_SEEDS = [
  'tailwind',
  'react',
  'nextjs',
  'fullstack',
  'vite',
  'dashboard',
  'saas',
  'portfolio',
]

const { limit, headed, delayMs } = parseScrapeArgs()

function emptyCatalog() {
  return {
    source: BASE + '/template',
    scrapedAt: new Date().toISOString(),
    notes: [
      'Public metadata only. Pro auth content is never fetched.',
      'Clone MIT/Apache GitHub repos manually into reference/shadcn-io-templates/repos/<slug>/ after verifying LICENSE.',
      'Never import reference/ into apps/, packages/, or services/.',
    ],
    templates: [],
  }
}

function isTemplateSlug(slug) {
  if (!slug || SKIP_SLUGS.has(slug)) return false
  if (slug.startsWith('category') || slug.startsWith('author')) return false
  // RSC HTML also embeds cover paths like `/template/foo.webp` — not templates.
  if (/\.(webp|png|jpe?g|gif|svg|avif|mp4|webm)$/i.test(slug)) return false
  return /^[a-z0-9][a-z0-9_-]*$/i.test(slug)
}

/** Pull `/template/<slug>` from DOM hrefs *and* raw HTML (RSC payloads). */
async function extractTemplateSlugs(page) {
  const fromDom = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/template/"]')].map((a) => a.getAttribute('href') || ''),
  )
  const html = await page.content()
  const fromHtml = [...html.matchAll(/\/template\/([a-z0-9][a-z0-9_-]*)/gi)].map((m) => m[1])
  const slugs = new Set()
  for (const href of fromDom) {
    const match = href.match(/\/template\/([^/?#]+)/)
    if (match && isTemplateSlug(match[1])) slugs.add(decodeURIComponent(match[1]))
  }
  for (const slug of fromHtml) {
    if (isTemplateSlug(slug)) slugs.add(slug)
  }
  return [...slugs]
}

async function collectListingLinks(page) {
  const templateSlugs = new Set()

  const seeds = [
    `${BASE}/template`,
    `${BASE}/template/categories`,
    ...CATEGORY_SEEDS.map((c) => `${BASE}/template/category/${c}`),
    ...AUTHOR_SEEDS.map((a) => `${BASE}/template/author/${a}`),
  ]

  for (const url of seeds) {
    try {
      await goto(page, url, delayMs)
      for (const slug of await extractTemplateSlugs(page)) templateSlugs.add(slug)
    } catch (error) {
      console.warn(`[shadcn.io] listing failed ${url}:`, error instanceof Error ? error.message : error)
    }
  }

  return [...templateSlugs].sort().map((slug) => `${BASE}/template/${slug}`)
}

async function extractTemplate(page, url) {
  await goto(page, url, delayMs)

  return page.evaluate((pageUrl) => {
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim() || ''
    const title =
      meta('meta[property="og:title"]') ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title
    const description =
      meta('meta[property="og:description"]') ||
      meta('meta[name="description"]')
    const cover = meta('meta[property="og:image"]')
    const bodyText = document.body?.innerText || ''

    const ldScripts = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((el) => {
        try {
          return JSON.parse(el.textContent || 'null')
        } catch {
          return null
        }
      })
      .filter(Boolean)

    const githubLinks = [
      ...new Set(
        [...document.querySelectorAll('a[href*="github.com"]')]
          .map((a) => a.href.split(/[?#]/)[0])
          .filter((href) => /github\.com\/[^/]+\/[^/]+/.test(href))
          .filter((href) => !href.includes('github.com/shadcnio/')),
      ),
    ]

    // Also scrape bare github URLs from HTML text / RSC when anchors are missing.
    const htmlGithub = [...(document.documentElement.innerHTML.matchAll(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g) || [])]
      .map((m) => m[0].replace(/\\+$/, ''))
      .filter((href) => !href.includes('github.com/shadcnio/'))
    for (const href of htmlGithub) githubLinks.push(href)
    const uniqueGithub = [...new Set(githubLinks)]

    const demoCandidates = [...document.querySelectorAll('a[href]')]
      .map((a) => ({ href: a.href, text: (a.textContent || '').trim().toLowerCase() }))
      .filter(
        (a) =>
          a.text.includes('live') ||
          a.text.includes('demo') ||
          a.text.includes('preview') ||
          /\.vercel\.app|netlify\.app|pages\.dev/i.test(a.href),
      )
      .map((a) => a.href)

    const author =
      meta('meta[property="article:author"]') ||
      [...document.querySelectorAll('a[href*="/template/author/"]')]
        .map((a) => a.textContent?.trim())
        .find(Boolean) ||
      ''

    const categories = [
      ...new Set(
        [...document.querySelectorAll('a[href*="/template/category/"]')].map((a) =>
          (a.textContent || '').trim(),
        ),
      ),
    ].filter(Boolean)

    const faqProYes = /do i need a pro subscription[\s\S]{0,160}?\byes\b/i.test(bodyText)
    const freeSignal =
      /\bfree\b/i.test(title) ||
      (uniqueGithub.length > 0 && /\bMIT\b/.test(bodyText + document.documentElement.innerHTML.slice(0, 200_000)))
    const isPro = faqProYes || (!freeSignal && /unlock .* with one pro plan/i.test(bodyText))

    const mitNearGithub =
      uniqueGithub.length > 0 &&
      (/\bMIT\b/.test(bodyText) ||
        /MIT/.test(document.documentElement.innerHTML) ||
        /\bfree\b/i.test(title))

    const slug = pageUrl.split('/').pop()

    return {
      slug,
      url: pageUrl,
      title,
      description,
      cover: cover || null,
      demoUrl: demoCandidates[0] || null,
      githubUrls: uniqueGithub,
      /** True when the listing surfaces a non-shadcn.io GitHub URL with an MIT cue. */
      mitGithub: Boolean(mitNearGithub),
      author,
      categories,
      licenseHint: mitNearGithub ? 'MIT (page cue)' : faqProYes ? 'Pro (page cue)' : null,
      isPro: Boolean(faqProYes || (isPro && !freeSignal)),
      jsonLd: ldScripts,
      scrapedAt: new Date().toISOString(),
    }
  }, url)
}

function prioritizeUrls(urls) {
  // Prefer community/author-prefixed slugs so --limit N is useful for MIT observation.
  return [...urls].sort((a, b) => {
    const sa = a.split('/').pop()
    const sb = b.split('/').pop()
    const score = (slug) => {
      if (AUTHOR_SEEDS.some((author) => slug.startsWith(`${author}-`))) return 0
      if (slug.includes('-')) return 1
      return 2
    }
    return score(sa) - score(sb) || sa.localeCompare(sb)
  })
}

async function main() {
  const existing = loadCatalog(CATALOG_PATH) || emptyCatalog()
  const bySlug = new Map(existing.templates.map((row) => [row.slug, row]))

  console.log(`[shadcn.io] resume=${bySlug.size} limit=${Number.isFinite(limit) ? limit : '∞'} headed=${headed}`)

  await withBrowser({ headed }, async (page) => {
    const listing = prioritizeUrls(await collectListingLinks(page))
    console.log(`[shadcn.io] discovered ${listing.length} template URLs`)

    let processed = 0
    for (const url of listing) {
      if (processed >= limit) break
      const slug = url.split('/').pop()
      if (bySlug.has(slug)) continue

      try {
        const row = await extractTemplate(page, url)
        if (row.isPro) row.skippedReason = 'Pro listing — metadata only, no code fetch'
        bySlug.set(row.slug, row)
        processed += 1
        console.log(
          `[shadcn.io] ${processed}/${Number.isFinite(limit) ? limit : '…'} ${row.slug}` +
            ` pro=${row.isPro} mitGithub=${row.mitGithub}`,
        )
      } catch (error) {
        console.warn(`[shadcn.io] failed ${url}:`, error instanceof Error ? error.message : error)
      }

      saveCatalog(CATALOG_PATH, {
        ...emptyCatalog(),
        scrapedAt: new Date().toISOString(),
        templates: [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
      })
      await sleep(delayMs)
    }
  })

  const finalCatalog = {
    ...emptyCatalog(),
    scrapedAt: new Date().toISOString(),
    templates: [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
  }
  saveCatalog(CATALOG_PATH, finalCatalog)
  console.log(`[shadcn.io] wrote ${finalCatalog.templates.length} rows → ${CATALOG_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
