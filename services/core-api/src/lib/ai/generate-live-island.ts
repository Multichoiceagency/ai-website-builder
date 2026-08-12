import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { generateMotionsitesComponent } from './motionsites-codegen.js'
import { parseDependenciesHeader } from './motionsites-codegen-prompt.js'

/**
 * Generate a Motionsites React island from a catalogue brief, write it under
 * `packages/motionsites-islands/src/sections/{id}`, mark ready, and build so
 * `motion-section-01` can load `/motionsites/islands/{id}/` (ADR-0003).
 */

/** Appended to every live-generate brief — overrides catalogue prompts that bake in chrome. */
export const LIVE_ISLAND_PLATFORM_RULES = `PLATFORM RULES (override any conflicting instructions in the brief):
1. Do NOT include a site header, logo bar, primary navigation, hamburger menu, or Sign Up / Login chrome. The host page injects navigation outside this island.
2. Do NOT use catalogue thumbnails (\`/thumbs/\`) or small centered preview images. Full-bleed background video or large same-origin Motionsites media only.
3. Preferred pattern: full-bleed \`<video>\` (or full-bleed image) + overlay text (headline, short copy, one CTA). Overlay text is encouraged.
4. Root is a single \`<main>\` or \`<section>\` hero body — never a full marketing page shell.`

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../')
}

function islandsPkgRoot(): string {
  const override = process.env.MOTIONSITES_ISLANDS_DIR?.trim()
  if (override) return resolve(override)
  return join(repoRoot(), 'packages/motionsites-islands')
}

export function slugifyIslandId(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || `island-${Date.now().toString(36)}`
}

export function isCatalogueThumbPath(url: string): boolean {
  return /\/thumbs\//i.test(url)
}

/** Map \`.../thumbs/001_Foo.jpg\` → \`.../videos/001_Foo.mp4\` when the path shape matches. */
export function thumbPathToVideoPath(url: string): string | null {
  const match = url.match(/^(.*\/)thumbs\/([^/?#]+)\.(jpe?g|png|webp|gif)(\?[^"'`)\\s]*)?$/i)
  if (!match) return null
  const stem = match[2]!.replace(/\.(jpe?g|png|webp|gif)$/i, '')
  return `${match[1]}videos/${stem}.mp4`
}

export function resolveLiveMedia(media: { previewImage?: string; previewVideo?: string }): {
  video: string
  image: string
} {
  const video = media.previewVideo?.trim() || ''
  const rawImage = media.previewImage?.trim() || ''
  // Never inject catalogue thumbs into island source — they render as a floating card.
  const image = rawImage && !isCatalogueThumbPath(rawImage) ? rawImage : ''
  return { video, image }
}

/**
 * Strip in-island site chrome. Platform header lives outside the Motionsites design.
 */
export function stripIslandChrome(code: string): string {
  let next = code
  // Fixed / absolute top nav shells (including multi-line JSX).
  next = next.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
  // Mobile menu-only blocks that often remain after nav strip.
  next = next.replace(
    /<div\b[^>]*className="[^"]*\bmd:hidden\b[^"]*"[^>]*>\s*<button[\s\S]*?<\/button>\s*<\/div>/gi,
    '',
  )
  // Drop unused Menu import when no Menu usage remains.
  if (!/\bMenu\b/.test(next.replace(/import\s*\{[^}]*\}\s*from\s*['"]lucide-react['"]/, ''))) {
    next = next.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]\s*;?/,
      (_full, names: string) => {
        const kept = names
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part && part !== 'Menu')
        if (!kept.length) return ''
        return `import { ${kept.join(', ')} } from 'lucide-react'\n`
      },
    )
  }
  return next
}

/**
 * Section catalogue videos are screen recordings of the finished UI (baked-in
 * headlines/nav/CTAs). Underlaying them under React overlays causes ghost text.
 */
export function isSectionDemoVideo(url: string): boolean {
  return /\/motionsites\/sections\/videos\//i.test(url)
}

function injectFullBleedVideo(code: string, video: string): string {
  if (!video || isSectionDemoVideo(video)) return code
  if (/<video\b/i.test(code)) return code
  // Image-spotlight heroes already have backgrounds — do not stack a video under them.
  if (/backgroundImage|BG_IMAGE_|bg-cover/i.test(code)) return code
  // Scroll-scrub / frame-pack islands must not get an autoplay loop underlay.
  if (/frames\/\d+\.(?:jpg|jpeg|png|webp)|createImageBitmap|scroll[- ]?scrub|frameCount|frameIndex/i.test(code)) {
    return code
  }
  const videoEl = `<video className="absolute inset-0 z-[1] h-full w-full object-cover" src="${video}" autoPlay muted loop playsInline />`
  if (/<(section|main)\b[^>]*>/i.test(code)) {
    return code.replace(/<(section|main)\b[^>]*>/i, (open) => `${open}\n        ${videoEl}`)
  }
  return code
}

/**
 * Rewrite gated CDNs / thumbs to same-origin Motionsites media.
 * Never underlays section demo videos; never substitutes catalogue thumbnails.
 */
export function sanitizeIslandSource(
  code: string,
  media: { previewImage?: string; previewVideo?: string },
): string {
  const { video, image } = resolveLiveMedia(media)
  let next = stripIslandChrome(code)

  // Existing thumb URLs in generated source → clear (card-sized).
  next = next.replace(/(["'`])(\/motionsites\/[^"'`]*\/thumbs\/[^"'`]+)\1/gi, '$1$1')

  // Prefer mirrored section assets when the brief used gated CDNs.
  // Browser workaround: same-origin `/motionsites/cdn-proxy?url=` (allowlisted hosts).
  const assetBase = '/motionsites/sections/assets/001_Interactive-Discovery-base.webp'
  const assetReveal = '/motionsites/sections/assets/001_Interactive-Discovery-reveal.webp'
  const toCdnProxy = (remote: string) =>
    `/motionsites/cdn-proxy?url=${encodeURIComponent(remote)}`

  let higgsIndex = 0
  next = next.replace(/https?:\/\/images\.higgs\.ai\/[^\s"'`)]+/gi, (match) => {
    higgsIndex += 1
    // Prefer local Motionsites assets when we have them; else same-origin proxy.
    if (higgsIndex === 1 && image) return image
    if (higgsIndex === 1) return assetBase
    if (higgsIndex === 2) return assetReveal
    return toCdnProxy(match)
  })
  next = next.replace(/https?:\/\/[a-z0-9.-]*cloudfront\.net\/[^\s"'`)]+/gi, (match) => {
    if (/\.(mp4|webm)(\?|$)/i.test(match) && video && !isSectionDemoVideo(video)) return video
    if (/\.(mp4|webm)(\?|$)/i.test(match)) return toCdnProxy(match)
    if (image) return image
    return toCdnProxy(match)
  })
  // Scaffold / brief placeholders like `/assets/solar-house.jpg` → local media.
  next = next.replace(/(["'`])\/assets\/[^"'`]+?\.(jpe?g|png|webp|gif|mp4|webm)\1/gi, (_full, quote: string) => {
    const thumb = media.previewImage?.trim()
    const fill =
      (video && !isSectionDemoVideo(video) ? video : '') ||
      thumb ||
      image ||
      assetBase
    return `${quote}${fill}${quote}`
  })
  next = next.replace(/https?:\/\/[^\s"'`)]+\.(png|jpe?g|webp|gif)(\?[^\s"'`)]*)?/gi, (match) => {
    if (match.includes('/motionsites/')) {
      if (isCatalogueThumbPath(match)) return image || assetBase
      return match
    }
    if (/cloudfront\.net|higgs\.ai/i.test(match)) return toCdnProxy(match)
    return image || assetBase
  })

  if (video && !isSectionDemoVideo(video)) {
    next = next.replace(/https?:\/\/[^\s"'`)]+\.(mp4|webm)(\?[^\s"'`)]*)?/gi, (match) => {
      if (match.includes('/motionsites/')) return match
      return video
    })
    next = injectFullBleedVideo(next, video)
  } else {
    // Keep CloudFront videos playable via same-origin proxy when no safe local video.
    next = next.replace(/https?:\/\/[^\s"'`)]+\.(mp4|webm)(\?[^\s"'`)]*)?/gi, (match) => {
      if (match.includes('/motionsites/')) return match
      if (/cloudfront\.net|higgs\.ai/i.test(match)) return toCdnProxy(match)
      return match
    })
  }

  // Strip any demo-video tags that codegen copied from the catalogue preview.
  next = next.replace(
    /<video\b[^>]*src=["'][^"']*\/motionsites\/sections\/videos\/[^"']+["'][^>]*\/>/gi,
    '',
  )
  next = next.replace(
    /<video\b[^>]*src=["'][^"']*\/motionsites\/sections\/videos\/[^"']+["'][^>]*>\s*<\/video>/gi,
    '',
  )

  return next
}

function ensureDefaultExport(code: string): string {
  if (/export\s+default\s+function/.test(code) || /export\s+\{\s*default\s*\}/.test(code)) {
    return code
  }
  if (/function\s+App\s*\(/.test(code)) {
    return `${code}\nexport default App\n`
  }
  return code
}

function wrapBrief(brief: string): string {
  return `${LIVE_ISLAND_PLATFORM_RULES}\n\n---\n\n${brief}`
}

async function writeIslandScaffold(sectionId: string, appSource: string): Promise<string> {
  const dir = join(islandsPkgRoot(), 'src/sections', sectionId)
  await mkdir(dir, { recursive: true })

  await writeFile(
    join(dir, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${sectionId}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`,
    'utf8',
  )

  // No StrictMode — double-mount leaves ghost overlay text during entrance animations.
  await writeFile(
    join(dir, 'main.tsx'),
    `import { createRoot } from 'react-dom/client'
import '@shared/index.css'
import { reportIslandHeight } from '@shared/reportHeight'
import App from './App'

reportIslandHeight('${sectionId}')
createRoot(document.getElementById('root')!).render(<App />)
`,
    'utf8',
  )

  await writeFile(join(dir, 'App.tsx'), `${appSource.trim()}\n`, 'utf8')
  return dir
}

async function markReady(sectionId: string): Promise<void> {
  const file = join(islandsPkgRoot(), 'ready.json')
  let list: string[] = []
  try {
    list = JSON.parse(await readFile(file, 'utf8')) as string[]
  } catch {
    list = []
  }
  if (!list.includes(sectionId)) {
    list.push(sectionId)
    await writeFile(file, `${JSON.stringify(list, null, 2)}\n`, 'utf8')
  }
}

function runIslandBuild(sectionId: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const root = islandsPkgRoot()
    const script = join(root, 'scripts/build-one.mjs')
    if (!existsSync(script)) {
      reject(
        new Error(
          `Motionsites islands package missing at ${root}. Set MOTIONSITES_ISLANDS_DIR or ship @platform/motionsites-islands with the API image.`,
        ),
      )
      return
    }
    const child = spawn(process.execPath, [script, sectionId], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(stderr.trim() || `Island build failed for ${sectionId} (exit ${code})`))
    })
  })
}

export interface GenerateLiveIslandInput {
  brief: string
  templateId?: string
  title?: string
  previewImage?: string
  previewVideo?: string
  /** Skip Vite build (tests / dry-run). */
  skipBuild?: boolean
}

export interface GenerateLiveIslandResult {
  ok: boolean
  sectionId: string
  model: string
  packages: string[]
  errors: string[]
  built: boolean
}

export async function generateLiveIsland(
  input: GenerateLiveIslandInput,
): Promise<GenerateLiveIslandResult> {
  const sectionId = slugifyIslandId(input.templateId || input.title || 'generated-island')
  const generated = await generateMotionsitesComponent(wrapBrief(input.brief))

  if (!generated.ok) {
    return {
      ok: false,
      sectionId,
      model: generated.model,
      packages: generated.packages,
      errors: generated.errors,
      built: false,
    }
  }

  // `generated.code` is already DEPENDENCIES-stripped + validated.
  let appSource = ensureDefaultExport(
    sanitizeIslandSource(generated.code || parseDependenciesHeader(generated.raw).code, {
      previewImage: input.previewImage,
      previewVideo: input.previewVideo,
    }),
  )

  // If sanitization emptied critical strings, fall back to a live video stage
  // that still uses Motionsites media — never a Vue CMS hero.
  if (appSource.length < 80) {
    const video = input.previewVideo?.trim() || '/motionsites/backgrounds/videos/005_Dark-flowers.mp4'
    const title = input.title?.trim() || sectionId
    appSource = `export default function App() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      <video className="absolute inset-0 h-full w-full object-cover" src="${video}" autoPlay muted loop playsInline />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      <h1 className="relative z-10 max-w-3xl px-6 text-center font-serif text-5xl italic sm:text-7xl">${title.replace(/`/g, '')}</h1>
    </main>
  )
}
`
  }

  await writeIslandScaffold(sectionId, appSource)
  await markReady(sectionId)

  let built = false
  const errors: string[] = []
  if (!input.skipBuild) {
    try {
      await runIslandBuild(sectionId)
      built = true
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Island build failed')
    }
  }

  return {
    ok: built || Boolean(input.skipBuild),
    sectionId,
    model: generated.model,
    packages: generated.packages,
    errors,
    built,
  }
}
