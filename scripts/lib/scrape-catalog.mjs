/**
 * Shared helpers for Playwright catalog scrapers.
 *
 * Catalogs land under gitignored `reference/`. Never import those into shipped
 * packages (docs/UI-LIBRARIES.md, ADR-0003).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(here, '..', '..')

export function parseScrapeArgs(argv = process.argv.slice(2)) {
  let limit = Number.POSITIVE_INFINITY
  let headed = false
  let delayMs = 400

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--limit' && argv[i + 1]) {
      limit = Math.max(0, Number(argv[++i]) || 0)
      continue
    }
    if (arg === '--delay-ms' && argv[i + 1]) {
      delayMs = Math.max(0, Number(argv[++i]) || 0)
      continue
    }
    if (arg === '--headed') {
      headed = true
      continue
    }
  }

  return { limit, headed, delayMs }
}

export function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

export function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true })
}

export function loadCatalog(catalogPath) {
  if (!existsSync(catalogPath)) return null
  try {
    return JSON.parse(readFileSync(catalogPath, 'utf8'))
  } catch {
    return null
  }
}

export function saveCatalog(catalogPath, catalog) {
  ensureDir(catalogPath)
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
}

export async function withBrowser(options, run) {
  const browser = await chromium.launch({ headless: !options.headed })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (compatible; PlatformReferenceScraper/1.0; +https://github.com/local/ai-website-builder)',
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  try {
    return await run(page, context)
  } finally {
    await context.close()
    await browser.close()
  }
}

export async function goto(page, url, delayMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(Math.min(delayMs, 1500))
}

/** Absolute URL helper that keeps same-origin paths. */
export function absolutize(base, href) {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))]
}
