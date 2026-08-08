import { afterEach, describe, expect, it, vi } from 'vitest'
import { mixkitStockProvider } from '../src/adapters/stock/mixkit.js'

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
})

describe('MixkitStockProvider', () => {
  it('allowlists only Mixkit CDN download paths', () => {
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://assets.mixkit.co/videos/48525/48525-720.mp4')).toBe(true)
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://assets.mixkit.co/art/530/530-original.png')).toBe(true)
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://evil.example/videos/1/1-720.mp4')).toBe(false)
    expect(mixkitStockProvider.isAllowedDownloadUrl('https://assets.mixkit.co/videos/48525/../../../etc/passwd')).toBe(false)
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
