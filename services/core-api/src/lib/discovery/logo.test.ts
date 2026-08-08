import { describe, expect, it } from 'vitest'
import { parse } from 'node-html-parser'
import { extractLogos, extractPage } from './extract.js'
import { extractColorsFromSvg, pickBestLogo, scoreLogoCandidate } from './logo.js'

describe('logo scoring', () => {
  it('ranks JSON-LD and logo imgs above og:image', () => {
    const jsonld = scoreLogoCandidate({
      url: 'https://example.com/mark.svg',
      source: 'jsonld',
    })
    const named = scoreLogoCandidate({
      url: 'https://example.com/assets/logo.png',
      source: 'img-logo',
      alt: 'Acme logo',
    })
    const og = scoreLogoCandidate({
      url: 'https://example.com/hero.jpg',
      source: 'og',
    })
    expect(jsonld).toBeGreaterThan(named)
    expect(named).toBeGreaterThan(og)
  })

  it('picks the highest-scoring unique URL', () => {
    const best = pickBestLogo([
      { url: 'https://example.com/hero.jpg', score: 15, source: 'og' },
      { url: 'https://example.com/logo.svg', score: 110, source: 'jsonld' },
      { url: 'https://example.com/favicon.ico', score: 25, source: 'favicon' },
    ])
    expect(best?.url).toBe('https://example.com/logo.svg')
  })
})

describe('extractLogos', () => {
  it('finds JSON-LD logo, header img, and apple-touch-icon', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"Organization","logo":"https://example.com/brand.svg"}
        </script>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <meta property="og:image" content="https://example.com/social-card.jpg">
      </head>
      <body>
        <header><a class="site-logo" href="/"><img src="/img/logo.png" alt="Acme"></a></header>
      </body></html>
    `
    const root = parse(html)
    const logos = extractLogos(root, new URL('https://example.com/'), 'https://example.com/social-card.jpg')
    const urls = logos.map((entry) => entry.url)
    expect(urls).toContain('https://example.com/brand.svg')
    expect(urls).toContain('https://example.com/img/logo.png')
    expect(urls).toContain('https://example.com/apple-touch-icon.png')

    const page = extractPage('https://example.com/', html)
    expect(pickBestLogo(page.logos)?.url).toBe('https://example.com/brand.svg')
  })
})

describe('extractColorsFromSvg', () => {
  it('returns brand fills and skips near-white', () => {
    const colors = extractColorsFromSvg(
      `<svg><rect fill="#0B5FFF"/><path stroke="#111111"/><circle fill="#FFFFFF"/></svg>`,
    )
    expect(colors).toContain('#0b5fff')
    expect(colors).not.toContain('#ffffff')
  })
})
