import { describe, expect, it } from 'vitest'
import {
  isCatalogueThumbPath,
  resolveLiveMedia,
  sanitizeIslandSource,
  stripIslandChrome,
  thumbPathToVideoPath,
} from '../src/lib/ai/generate-live-island.js'

describe('generate-live-island media sanitization', () => {
  it('rejects catalogue thumbs as safe image fill', () => {
    expect(isCatalogueThumbPath('/motionsites/sections/thumbs/001_Interactive-Discovery.jpg')).toBe(
      true,
    )
    expect(resolveLiveMedia({ previewImage: '/motionsites/sections/thumbs/001_x.jpg' })).toEqual({
      video: '',
      image: '',
    })
    expect(
      resolveLiveMedia({
        previewImage: '/motionsites/sections/thumbs/001_x.jpg',
        previewVideo: '/motionsites/sections/videos/001_x.mp4',
      }),
    ).toEqual({
      video: '/motionsites/sections/videos/001_x.mp4',
      image: '',
    })
  })

  it('maps thumb paths to sibling video paths', () => {
    expect(
      thumbPathToVideoPath('/motionsites/sections/thumbs/001_Interactive-Discovery.jpg'),
    ).toBe('/motionsites/sections/videos/001_Interactive-Discovery.mp4')
  })

  it('strips in-island nav chrome', () => {
    const source = `import { Menu } from 'lucide-react'
export default function App() {
  return (
    <main>
      <nav className="fixed top-0 left-0 right-0 z-[100]">
        <span>Lithos</span>
        <button>Course</button>
        <button>Sign Up</button>
      </nav>
      <h1>Layers hold</h1>
    </main>
  )
}`
    const stripped = stripIslandChrome(source)
    expect(stripped).not.toMatch(/<nav\b/)
    expect(stripped).not.toMatch(/\bMenu\b/)
    expect(stripped).toMatch(/Layers hold/)
  })

  it('maps higgs assets locally and never underlays section demo videos', () => {
    const source = `export default function App() {
  const BG_IMAGE_1 = "https://images.higgs.ai/foo.png"
  const BG_IMAGE_2 = "https://images.higgs.ai/bar.png"
  return (
    <section className="relative h-screen">
      <div className="bg-cover" style={{ backgroundImage: \`url(\${BG_IMAGE_1})\` }} />
      <nav className="fixed top-0"><span>Course</span></nav>
      <h1 className="absolute z-50">Layers hold tales of time.</h1>
    </section>
  )
}`
    const next = sanitizeIslandSource(source, {
      previewImage: '/motionsites/sections/thumbs/001_Interactive-Discovery.jpg',
      previewVideo: '/motionsites/sections/videos/001_Interactive-Discovery.mp4',
    })
    expect(next).not.toMatch(/\/thumbs\//)
    expect(next).not.toMatch(/<nav\b/)
    expect(next).not.toMatch(/<video\b/)
    expect(next).not.toMatch(/sections\/videos\//)
    expect(next).toMatch(/001_Interactive-Discovery-base\.webp/)
    expect(next).toMatch(/001_Interactive-Discovery-reveal\.webp/)
    expect(next).toMatch(/Layers hold/)
  })

  it('rewrites CloudFront video URLs to the same-origin CDN proxy', () => {
    const source = `export default function App() {
  return <video src="https://d8j0ntlcm91z4.cloudfront.net/user/x.mp4" autoPlay muted loop playsInline />
}`
    const next = sanitizeIslandSource(source, {})
    expect(next).toMatch(/\/motionsites\/cdn-proxy\?url=/)
    expect(next).toMatch(/cloudfront\.net/)
    expect(next).not.toMatch(/src="https:\/\/d8j0/)
  })

  it('rewrites /assets/ placeholders to catalogue preview media', () => {
    const source = `export default function App() {
  return <img src="/assets/solar-house.jpg" alt="" />
}`
    const next = sanitizeIslandSource(source, {
      previewImage: '/motionsites/sections/thumbs/050_Solar-Energy-Hero.jpg',
    })
    expect(next).toMatch(/050_Solar-Energy-Hero\.jpg/)
    expect(next).not.toMatch(/\/assets\//)
  })
})
