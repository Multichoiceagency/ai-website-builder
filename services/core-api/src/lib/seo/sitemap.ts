import type { SeoSettings } from '@platform/schemas'
import type { SeoPageInput } from './document.js'

/**
 * Sitemap and robots.txt, generated from **published** pages only.
 *
 * A sitemap that lists a draft tells search engines to crawl a 404, and it
 * leaks the address of work in progress. The filter here is the same rule the
 * public API enforces (ADR: `published_*` is the only public read model), which
 * is why both read `status`/`publishedAt` rather than a separate flag.
 */

/** A site's canonical origin: its verified domain, else its preview address. */
export function siteOrigin(site: { slug: string; primaryHostname: string | null }): string {
  return site.primaryHostname ? `https://${site.primaryHostname}` : `http://${site.slug}.localhost`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Home matters most, top-level pages next, deep pages least. */
function priorityFor(path: string): string {
  if (path === '/') return '1.0'
  const depth = path.split('/').filter(Boolean).length
  return depth <= 1 ? '0.8' : '0.6'
}

export interface SitemapInput {
  origin: string
  pages: SeoPageInput[]
  settings: Pick<SeoSettings, 'indexingEnabled' | 'excludedPaths'>
}

/** The pages that may appear publicly: published, indexable, not excluded. */
export function sitemapPages(input: SitemapInput): SeoPageInput[] {
  if (!input.settings.indexingEnabled) return []
  const excluded = new Set(input.settings.excludedPaths)

  return input.pages
    .filter((page) => page.status === 'published' && page.publishedAt)
    .filter((page) => !page.seo.noIndex)
    .filter((page) => !excluded.has(page.path))
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function buildSitemap(input: SitemapInput): string {
  const entries = sitemapPages(input)
    .map((page) => {
      const lastmod = page.publishedAt ?? page.updatedAt
      return [
        '  <url>',
        `    <loc>${escapeXml(`${input.origin}${page.path}`)}</loc>`,
        `    <lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>`,
        `    <priority>${priorityFor(page.path)}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

export interface RobotsInput {
  origin: string
  pages: SeoPageInput[]
  settings: Pick<SeoSettings, 'indexingEnabled' | 'excludedPaths' | 'robotsExtra'>
}

export function buildRobots(input: RobotsInput): string {
  const lines = ['User-agent: *']

  if (!input.settings.indexingEnabled) {
    // One switch, honoured in both places: nothing is crawlable and the
    // sitemap is empty, so a staging site cannot be indexed by forgetting one.
    lines.push('Disallow: /')
  } else {
    const disallowed = new Set<string>(input.settings.excludedPaths)
    for (const page of input.pages) {
      if (page.seo.noIndex) disallowed.add(page.path)
    }

    lines.push('Allow: /')
    for (const path of [...disallowed].sort()) lines.push(`Disallow: ${path}`)
    lines.push('', `Sitemap: ${input.origin}/sitemap.xml`)
  }

  const extra = input.settings.robotsExtra.trim()
  if (extra) lines.push('', extra)

  return `${lines.join('\n')}\n`
}
