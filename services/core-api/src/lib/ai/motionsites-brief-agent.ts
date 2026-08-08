import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { detectExactIslandIntent } from '@platform/templates'

/**
 * Motionsites brief preprocessor (LangChain tools).
 *
 * Classifies long React+Tailwind build briefs, matches ready islands, and can
 * download allowlisted media URLs into same-origin `/motionsites/...` storage.
 * Never writes remote CDN URLs into page props (ADR-0003).
 */

export type BriefKind = 'exact_island' | 'atmosphere_rebuild' | 'copy_edit'

export interface MotionsitesBriefResult {
  kind: BriefKind
  islandId: string | null
  media: { sourceUrl: string; localPath: string }[]
  copy: {
    headline?: string
    cta?: string
    stats?: string
    testimonial?: string
  }
  notes: string[]
  model: string
}

const ALLOWED_MEDIA_HOSTS = new Set([
  'd8j0ntlcm91z4.cloudfront.net',
  'cloudfront.net',
  'i.pravatar.cc',
])

function repoRoot(): string {
  // services/core-api/src/lib/ai → repo root (5 levels up)
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../')
}

function mediaRoot(): string {
  const override = process.env.MOTIONSITES_MEDIA_DIR?.trim()
  if (override) return resolve(override)
  return join(repoRoot(), 'apps/dashboard/public/motionsites/sections/videos')
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (ALLOWED_MEDIA_HOSTS.has(host)) return true
  for (const allowed of ALLOWED_MEDIA_HOSTS) {
    if (host.endsWith(`.${allowed}`) || host === allowed) return true
  }
  return host.endsWith('.cloudfront.net')
}

export function classifyBrief(instruction: string): BriefKind {
  const text = instruction.trim()
  if (!text) return 'copy_edit'

  if (detectExactIslandIntent(text)) return 'exact_island'

  const exactStack =
    /React/i.test(text) &&
    /Tailwind/i.test(text) &&
    /(lucide-react|GSAP|framer-motion|Vite|TypeScript)/i.test(text) &&
    (text.length > 400 || /full-?bleed|h-screen|glassmorphism|backdrop-blur/i.test(text))

  if (exactStack) return 'exact_island'

  if (/rebuild|atmosphere|MotionSites background|cinematic field/i.test(text) && text.length > 120) {
    return 'atmosphere_rebuild'
  }

  return 'copy_edit'
}

export function matchIsland(instruction: string): string | null {
  return detectExactIslandIntent(instruction)
}

export function extractCopy(instruction: string): MotionsitesBriefResult['copy'] {
  const headline =
    instruction.match(/Ship AI workers that grind while you rest/i)?.[0] ??
    instruction.match(/>\s*([^\n<]{12,120})\s*</)?.[1]?.trim()
  const cta = /Get started/i.test(instruction) ? 'Get started' : undefined
  const stats = instruction.match(/42,?500\+?/)?.[0]
  const testimonial = instruction.match(
    /"With Nexum we went from managing tedious operational work to having AI agents that handle everything\."/,
  )?.[0]

  return {
    ...(headline ? { headline } : {}),
    ...(cta ? { cta } : {}),
    ...(stats ? { stats } : {}),
    ...(testimonial ? { testimonial } : {}),
  }
}

function extractMediaUrls(instruction: string): string[] {
  const urls = instruction.match(/https?:\/\/[^\s)"'`<>]+/gi) ?? []
  return [...new Set(urls.map((url) => url.replace(/[.,;]+$/, '')))]
}

export async function fetchMedia(sourceUrl: string): Promise<{ sourceUrl: string; localPath: string }> {
  let parsed: URL
  try {
    parsed = new URL(sourceUrl)
  } catch {
    throw new Error('Invalid media URL.')
  }

  if (!hostAllowed(parsed.hostname)) {
    throw new Error(`Host not allowlisted for Motionsites media: ${parsed.hostname}`)
  }

  const ext = extname(parsed.pathname).toLowerCase() || '.bin'
  const safeExt = ['.mp4', '.webm', '.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    ? ext
    : '.bin'
  const leaf = `fetched-${Buffer.from(parsed.pathname).toString('base64url').slice(0, 24)}${safeExt}`
  const destDir = mediaRoot()
  await mkdir(destDir, { recursive: true })
  const destFile = join(destDir, leaf)

  const response = await fetch(sourceUrl, {
    headers: {
      accept: '*/*',
      'user-agent': 'Mozilla/5.0 (compatible; MotionsitesMediaFetch/1.0)',
      // Some MotionSites CDN distributions gate on a site referer.
      referer: 'https://www.motionsites.com/',
    },
    redirect: 'follow',
  })
  if (!response.ok || !response.body) {
    throw new Error(`Could not download media (${response.status}).`)
  }

  // Node 18+ fetch body is a web stream — convert for pipeline.
  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
  await pipeline(nodeStream, createWriteStream(destFile))

  // Mirror to storefront when writing under dashboard public.
  const storefrontMirror = destFile.replace(
    `${join('apps', 'dashboard', 'public')}`,
    `${join('apps', 'storefront', 'public')}`,
  )
  if (storefrontMirror !== destFile) {
    try {
      await mkdir(dirname(storefrontMirror), { recursive: true })
      const { copyFile } = await import('node:fs/promises')
      await copyFile(destFile, storefrontMirror)
    } catch {
      /* optional mirror */
    }
  }

  const localPath = `/motionsites/sections/videos/${leaf}`
  // Tiny sidecar so operators can see provenance without baking CDN into pages.
  await writeFile(`${destFile}.source.txt`, sourceUrl, 'utf8').catch(() => {})

  return { sourceUrl, localPath }
}

/** LangChain tool wrappers — used by the agent and unit-tested via the plain functions. */
export function createMotionsitesBriefTools() {
  return [
    new DynamicStructuredTool({
      name: 'classify_brief',
      description: 'Classify a Motionsites / section AI instruction.',
      schema: z.object({ instruction: z.string() }),
      func: async ({ instruction }) => classifyBrief(instruction),
    }),
    new DynamicStructuredTool({
      name: 'match_island',
      description: 'Match an instruction to a ready Motionsites React island id.',
      schema: z.object({ instruction: z.string() }),
      func: async ({ instruction }) => matchIsland(instruction) ?? '',
    }),
    new DynamicStructuredTool({
      name: 'fetch_media',
      description: 'Download an allowlisted remote media URL into local /motionsites storage.',
      schema: z.object({ url: z.string().url() }),
      func: async ({ url }) => {
        const result = await fetchMedia(url)
        return JSON.stringify(result)
      },
    }),
    new DynamicStructuredTool({
      name: 'extract_copy',
      description: 'Extract headline/CTA/stats/testimonial strings from a Motionsites brief.',
      schema: z.object({ instruction: z.string() }),
      func: async ({ instruction }) => JSON.stringify(extractCopy(instruction)),
    }),
  ]
}

/**
 * Run the Motionsites brief pipeline without requiring an LLM round-trip.
 * Tools are LangChain-structured so a future LangGraph agent can call them;
 * classification/matching stay deterministic and fast.
 */
export async function analyzeMotionsitesBrief(
  instruction: string,
  options: { fetchRemoteMedia?: boolean } = {},
): Promise<MotionsitesBriefResult> {
  const notes: string[] = []
  const kind = classifyBrief(instruction)
  const islandId = kind === 'exact_island' ? matchIsland(instruction) : null
  const copy = extractCopy(instruction)
  const media: MotionsitesBriefResult['media'] = []

  if (options.fetchRemoteMedia) {
    for (const url of extractMediaUrls(instruction)) {
      try {
        const parsed = new URL(url)
        if (!/\.(mp4|webm|mov)(\?|$)/i.test(parsed.pathname) && !hostAllowed(parsed.hostname)) {
          continue
        }
        if (!hostAllowed(parsed.hostname)) continue
        // Prefer video downloads; skip tiny avatar URLs unless explicitly cloudfront.
        if (parsed.hostname === 'i.pravatar.cc') continue
        media.push(await fetchMedia(url))
        notes.push(`Mirrored ${url} → ${media.at(-1)!.localPath}`)
      } catch (error) {
        notes.push(
          `Skipped media ${url}: ${error instanceof Error ? error.message : 'download failed'}`,
        )
      }
    }
  }

  if (kind === 'exact_island' && islandId) {
    notes.push(`Exact Motionsites brief → insert island “${islandId}” (not a Vue prop rewrite).`)
  } else if (kind === 'exact_island' && !islandId) {
    notes.push(
      'Exact React Motionsites brief detected, but no ready island matches yet. Use POST /api/v1/ai/motionsites-codegen to generate a single-file React island (procedural engine), then register it — never store React in page JSON (ADR-0003).',
    )
  }

  return {
    kind,
    islandId,
    media,
    copy,
    notes,
    model: 'langchain:motionsites-brief-agent',
  }
}
