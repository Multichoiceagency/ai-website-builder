#!/usr/bin/env node
/**
 * Catalog scrape for https://shadcnspace.com/ — blocks, components, templates.
 *
 * Writes gitignored `reference/shadcnspace/catalog.json` with free vs pro flags.
 *
 * Primary MIT mirror (preferred over HTML for free code):
 *   git clone --depth 1 https://github.com/shadcnspace/shadcnspace reference/shadcnspace/repo
 *
 * Legal gates:
 * - Record Pro-tier rows; never scrape Pro auth content or copy Pro source.
 * - Free items: observe from MIT clone + this catalog; port via library-demos.
 * - Never import `reference/` into shipped packages (ADR-0003).
 *
 * Usage:
 *   node scripts/scrape-shadcnspace.mjs [--limit N] [--headed] [--delay-ms 400]
 *
 * Resume: re-runs skip ids already present in catalog.json.
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

const BASE = 'https://shadcnspace.com'
const OUT_DIR = join(REPO_ROOT, 'reference', 'shadcnspace')
const CATALOG_PATH = join(OUT_DIR, 'catalog.json')
const MIT_REPO = 'https://github.com/shadcnspace/shadcnspace'

const { limit, headed, delayMs } = parseScrapeArgs()

function emptyCatalog() {
  return {
    source: BASE,
    scrapedAt: new Date().toISOString(),
    mitRepo: MIT_REPO,
    cloneHint: `git clone --depth 1 ${MIT_REPO} reference/shadcnspace/repo`,
    notes: [
      'Public marketing catalog only. Pro auth / paid registry content is never fetched.',
      'Shallow-clone the MIT GitHub repo into reference/shadcnspace/repo/ for free source.',
      'Never import reference/ into apps/, packages/, or services/.',
    ],
    items: [],
  }
}

function normalizeHref(href) {
  if (!href) return null
  try {
    // Site often emits relative paths without a leading slash (`templates/crypgo`).
    const withSlash = href.startsWith('http') || href.startsWith('/') || href.startsWith('#')
      ? href
      : `/${href}`
    const abs = new URL(withSlash, BASE)
    if (abs.origin !== BASE) return null
    return abs.href.split(/[?#]/)[0]
  } catch {
    return null
  }
}

async function extractTemplateCardsFromIndex(page) {
  await goto(page, `${BASE}/templates`, delayMs)
  const html = await page.content()
  const bodyText = await page.locator('body').innerText()

  return page.evaluate(
    ({ base, html, bodyText }) => {
      const cards = new Map()

      const tierFromText = (text) => {
        if (/\bFree\b/.test(text) && !/\bPro\b|\bPremium\b/.test(text)) return 'free'
        if (/\bPro\b|\bPremium\b/.test(text) && !/\bFree\b/.test(text)) return 'pro'
        if (/\bFree\b/.test(text) && /\bPro\b|\bPremium\b/.test(text)) return 'mixed'
        return 'unknown'
      }

      const tierForSlug = (slug, localText) => {
        const local = tierFromText(localText || '')
        if (local === 'free' || local === 'pro') return local
        // Body is ordered cards: "Name… Free|Pro" — find the slug/title neighbourhood.
        const name = slug.replace(/-/g, '[\\\\s-]+')
        const re = new RegExp(`${name}[\\\\s\\\\S]{0,280}?(Free|Pro|Premium)\\\\b`, 'i')
        const hit = bodyText.match(re)
        if (hit?.[1]) {
          const badge = hit[1].toLowerCase()
          return badge === 'free' ? 'free' : 'pro'
        }
        return local
      }

      const consider = (path, title, localText, cover) => {
        if (!path.startsWith('/templates/')) return
        const parts = path.split('/').filter(Boolean)
        if (parts.length !== 2 || parts[0] !== 'templates') return
        if (path.includes('/preview/')) return
        const slug = parts[1]
        const id = `template:${path}`
        const existing = cards.get(id)
        const tier = tierForSlug(slug, localText)
        const prefer = (next, prev) => {
          if (!prev || prev === 'unknown') return next
          if (next === 'unknown') return prev
          return next
        }
        cards.set(id, {
          id,
          kind: 'template',
          url: new URL(path, base).href,
          slug,
          category: 'templates',
          title: (title && title.length > 1 ? title : null) || existing?.title || slug,
          description: '',
          cover: cover || existing?.cover || null,
          previewUrl: null,
          tier: prefer(tier, existing?.tier),
          scrapedAt: new Date().toISOString(),
        })
      }

      for (const a of document.querySelectorAll('a[href]')) {
        const raw = a.getAttribute('href') || ''
        const withSlash = raw.startsWith('http') || raw.startsWith('/') || raw.startsWith('#') ? raw : `/${raw}`
        let path
        try {
          path = new URL(withSlash, base).pathname.replace(/\/+$/, '')
        } catch {
          continue
        }
        const root = a.closest('article, li, section, div') || a
        consider(path, (a.textContent || '').trim(), root.textContent || '', root.querySelector('img')?.src || null)
      }

      for (const match of html.matchAll(/(?:href=["']|")(?:\/)?templates\/([a-z0-9-]+)/gi)) {
        consider(`/templates/${match[1]}`, match[1], '', null)
      }

      return [...cards.values()]
    },
    { base: BASE, html, bodyText },
  )
}

async function collectCategoryLinks(page) {
  /** @type {{ kind: string, url: string }[]} */
  const queue = []

  for (const [kind, path] of [
    ['block-category', '/blocks'],
    ['component', '/components'],
  ]) {
    await goto(page, `${BASE}${path}`, delayMs)
    const html = await page.content()
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || ''),
    )
    const all = [...hrefs, ...[...html.matchAll(new RegExp(`${path}/[a-z0-9-]+(?:/[a-z0-9-]+)?`, 'gi'))].map((m) => m[0])]

    for (const href of all) {
      const abs = normalizeHref(href.startsWith('http') || href.startsWith('/') ? href : href)
      if (!abs) continue
      const pathname = new URL(abs).pathname
      if (kind === 'block-category' && pathname.startsWith('/blocks/') && pathname.split('/').length >= 4) {
        queue.push({ kind, url: abs })
      }
      if (kind === 'component' && pathname.startsWith('/components/') && pathname.split('/').length >= 3) {
        queue.push({ kind, url: abs })
      }
    }
  }

  const seen = new Set()
  return queue.filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}

async function extractListingCard(page, entry) {
  await goto(page, entry.url, delayMs)

  return page.evaluate((meta) => {
    const title =
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('h2')?.textContent?.trim() ||
      document.title
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || ''

    const badgeNodes = [...document.querySelectorAll('span, div, p, a, button')]
      .map((el) => (el.textContent || '').trim())
      .filter((text) => text === 'Free' || text === 'Pro' || text === 'Premium')

    let tier = 'unknown'
    if (badgeNodes.includes('Free') && !(badgeNodes.includes('Pro') || badgeNodes.includes('Premium'))) {
      tier = 'free'
    } else if (badgeNodes.includes('Pro') || badgeNodes.includes('Premium')) {
      tier = badgeNodes.includes('Free') ? 'mixed' : 'pro'
    } else if (/\bFree\b/.test(title)) {
      tier = 'free'
    } else if (/\bPro\b|\bPremium\b/.test(title)) {
      tier = 'pro'
    }

    const preview =
      [...document.querySelectorAll('a[href*="preview"]')].map((a) => a.href)[0] || null
    const cover =
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      document.querySelector('img')?.src ||
      null

    const path = new URL(meta.url).pathname.replace(/\/+$/, '')
    const segments = path.split('/').filter(Boolean)

    return {
      id: `${meta.kind}:${path}`,
      kind: meta.kind,
      url: meta.url,
      slug: segments[segments.length - 1] || '',
      category: segments.length >= 2 ? segments[1] : '',
      title,
      description,
      cover,
      previewUrl: preview,
      tier,
      scrapedAt: new Date().toISOString(),
    }
  }, entry)
}

function prioritizeItems(items) {
  const rank = (tier) => (tier === 'free' ? 0 : tier === 'mixed' ? 1 : tier === 'unknown' ? 2 : 3)
  return [...items].sort((a, b) => rank(a.tier) - rank(b.tier) || a.id.localeCompare(b.id))
}

async function main() {
  const existing = loadCatalog(CATALOG_PATH) || emptyCatalog()
  const byId = new Map(existing.items.map((row) => [row.id, row]))

  console.log(`[shadcnspace] resume=${byId.size} limit=${Number.isFinite(limit) ? limit : '∞'} headed=${headed}`)
  console.log(`[shadcnspace] MIT clone hint: ${emptyCatalog().cloneHint}`)

  await withBrowser({ headed }, async (page) => {
    let processed = 0

    const templateCards = prioritizeItems(await extractTemplateCardsFromIndex(page))
    console.log(`[shadcnspace] template cards ${templateCards.length}`)
    for (const card of templateCards) {
      if (processed >= limit) break
      if (byId.has(card.id)) continue
      if (card.tier === 'pro') card.skippedReason = 'Pro tier — metadata only, no code fetch'
      byId.set(card.id, card)
      processed += 1
      console.log(`[shadcnspace] ${processed}/${Number.isFinite(limit) ? limit : '…'} ${card.id} tier=${card.tier}`)
      saveCatalog(CATALOG_PATH, {
        ...emptyCatalog(),
        scrapedAt: new Date().toISOString(),
        items: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
      })
    }

    if (processed >= limit) return

    const queue = await collectCategoryLinks(page)
    console.log(`[shadcnspace] discovered ${queue.length} category/detail URLs`)

    for (const entry of queue) {
      if (processed >= limit) break
      const path = new URL(entry.url).pathname.replace(/\/+$/, '')
      const id = `${entry.kind}:${path}`
      if (byId.has(id)) continue

      try {
        const row = await extractListingCard(page, entry)
        if (row.tier === 'pro') row.skippedReason = 'Pro tier — metadata only, no code fetch'
        byId.set(row.id, row)
        processed += 1
        console.log(
          `[shadcnspace] ${processed}/${Number.isFinite(limit) ? limit : '…'} ${row.id} tier=${row.tier}`,
        )
      } catch (error) {
        console.warn(`[shadcnspace] failed ${entry.url}:`, error instanceof Error ? error.message : error)
      }

      saveCatalog(CATALOG_PATH, {
        ...emptyCatalog(),
        scrapedAt: new Date().toISOString(),
        items: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
      })
      await sleep(delayMs)
    }
  })

  const finalCatalog = {
    ...emptyCatalog(),
    scrapedAt: new Date().toISOString(),
    items: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
  saveCatalog(CATALOG_PATH, finalCatalog)
  console.log(`[shadcnspace] wrote ${finalCatalog.items.length} rows → ${CATALOG_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
