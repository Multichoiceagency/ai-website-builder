import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMixkitSearchPageUrl, mixkitStockProvider } from '../src/adapters/stock/mixkit.js'
import { pexelsStockProvider } from '../src/adapters/stock/pexels.js'
import { isAllowedRemoteImageUrl } from '../src/lib/media/remote-import.js'
import { draftFreeformSite, sectionsFromFreeformRoot } from '../src/lib/ai/freeform-site.js'
import { LAYOUT_CANVAS_BLOCK_ID } from '@platform/schemas'

const VIDEO_HTML = `
<html><body>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"VideoObject","@id":"https://mixkit.co/free-stock-video/aerial-wave-48525/#video",
   "name":"Aerial wave","contentUrl":"https://assets.mixkit.co/videos/48525/48525-720.mp4",
   "thumbnailUrl":"https://assets.mixkit.co/videos/48525/48525-thumb-720-0.jpg",
   "embedUrl":"https://assets.mixkit.co/videos/48525/48525-360.mp4",
   "license":"https://mixkit.co/license/#videoFree"}
]}
</script>
<a href="/free-stock-video/aerial-wave-48525/"><img src="https://assets.mixkit.co/videos/48525/48525-thumb-360-0.jpg" /></a>
<a href="/free-stock-video/seagulls-15209/"><img src="https://assets.mixkit.co/videos/15209/15209-thumb-360-0.jpg" /></a>
<a href="/free-stock-video/ocean/?page=2">Next</a>
</body></html>
`

const ART_HTML = `
<html><body>
<a href="/free-stock-art/year-of-the-rat-530/"><img src="https://assets.mixkit.co/art/530/530-square.png-500h.png" /></a>
<a href="/free-stock-art/cat-ramen-240/"><img src="https://assets.mixkit.co/art/240/240-square.png-500h.png" /></a>
</body></html>
`

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.PEXELS_API_KEY
})

describe('MixkitStockProvider', () => {
  it('allowlists only Mixkit CDN download paths', () => {
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://assets.mixkit.co/videos/48525/48525-720.mp4')).toBe(true)
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://assets.mixkit.co/art/530/530-original.png')).toBe(true)
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://evil.example/videos/1/1-720.mp4')).toBe(false)
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://assets.mixkit.co/videos/48525/../../../etc/passwd')).toBe(false)
  })

  it('builds category tag URLs for video and art', () => {
    expect(buildMixkitSearchPageUrl('video', '', 1, 'nature')).toBe(
      'https://mixkit.co/free-stock-video/nature/',
    )
    expect(buildMixkitSearchPageUrl('video', '', 2, 'fitness')).toBe(
      'https://mixkit.co/free-stock-video/fitness/?page=2',
    )
    expect(buildMixkitSearchPageUrl('image', '', 1, 'abstract')).toBe(
      'https://mixkit.co/free-stock-art/abstract/',
    )
    expect(buildMixkitSearchPageUrl('video', 'ocean waves', 1)).toContain('/discover/ocean-waves/')
  })

  it('searches videos from public Mixkit HTML + JSON-LD', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(VIDEO_HTML, { status: 200, headers: { 'content-type': 'text/html' } })),
    )

    const result = await mixkitStockProvider.search({
      q: 'ocean',
      kind: 'video',
      provider: 'mixkit',
      page: 1,
      limit: 24,
    })

    expect(result.provider).toBe('mixkit')
    expect(result.items.length).toBeGreaterThanOrEqual(2)
    const first = result.items.find((item) => item.externalId === '48525')
    expect(first?.title).toBe('Aerial wave')
    expect(first?.downloadUrl).toContain('assets.mixkit.co/videos/48525/')
    expect(first?.kind).toBe('video')
    expect(result.hasMore).toBe(true)
  })

  it('searches art illustrations from public Mixkit HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(ART_HTML, { status: 200, headers: { 'content-type': 'text/html' } })),
    )

    const result = await mixkitStockProvider.search({
      q: 'nature',
      kind: 'image',
      provider: 'mixkit',
      page: 1,
      limit: 24,
    })

    expect(result.items.map((item) => item.externalId).sort()).toEqual(['240', '530'])
    expect(result.items[0]?.downloadUrl).toMatch(/\/art\/\d+\/\d+-original\.png$/)
  })
})

describe('PexelsStockProvider', () => {
  it('allowlists Pexels image CDN paths', () => {
    expect(
      pexelsStockProvider.isAllowedDownloadUrl('https://images.pexels.com/photos/1/pexels-photo-1.jpeg'),
    ).toBe(true)
    expect(pexelsStockProvider.isAllowedDownloadUrl('https://evil.example/photos/1/x.jpg')).toBe(false)
  })

  it('searches photos when API key is set', async () => {
    process.env.PEXELS_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            page: 1,
            per_page: 2,
            total_results: 2,
            photos: [
              {
                id: 42,
                width: 1000,
                height: 800,
                url: 'https://www.pexels.com/photo/42/',
                photographer: 'Ada',
                alt: 'Gym workout',
                src: {
                  original: 'https://images.pexels.com/photos/42/original.jpeg',
                  large2x: 'https://images.pexels.com/photos/42/large.jpeg',
                  medium: 'https://images.pexels.com/photos/42/medium.jpeg',
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )

    const result = await pexelsStockProvider.search({
      q: 'fitness',
      kind: 'image',
      provider: 'pexels',
      page: 1,
      limit: 24,
      category: '',
    })

    expect(result.provider).toBe('pexels')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.externalId).toBe('42')
    expect(result.items[0]?.downloadUrl).toContain('images.pexels.com')
  })

  it('errors clearly when API key is missing', async () => {
    await expect(
      pexelsStockProvider.search({
        q: 'fitness',
        kind: 'image',
        provider: 'pexels',
        page: 1,
        limit: 24,
        category: '',
      }),
    ).rejects.toThrow(/PEXELS_API_KEY/)
  })
})

describe('remote image allowlist', () => {
  it('allows Sanity CDN and blocks private hosts', () => {
    expect(isAllowedRemoteImageUrl('https://cdn.sanity.io/images/abc/xyz.jpg')).toBe(true)
    expect(isAllowedRemoteImageUrl('https://images.pexels.com/photos/1/x.jpg')).toBe(true)
    expect(isAllowedRemoteImageUrl('http://cdn.sanity.io/images/abc/xyz.jpg')).toBe(false)
    expect(isAllowedRemoteImageUrl('https://127.0.0.1/secret.png')).toBe(false)
    expect(isAllowedRemoteImageUrl('https://evil.example/a.png')).toBe(false)
  })
})

describe('freeform site draft', () => {
  it('returns only layout-canvas-01 sections', async () => {
    const draft = await draftFreeformSite({
      prompt: 'Build me a fitness website with classes and coaching',
      locale: 'en',
      siteName: 'Peak Fit',
    })

    expect(draft.pages.length).toBeGreaterThanOrEqual(1)
    for (const page of draft.pages) {
      const sections = sectionsFromFreeformRoot(page.root)
      expect(sections).toHaveLength(1)
      expect(sections[0]?.block).toBe(LAYOUT_CANVAS_BLOCK_ID)
      expect(sections[0]?.props).toHaveProperty('root')
    }
  })
})
