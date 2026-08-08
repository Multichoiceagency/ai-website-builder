import {
  DEFAULT_GEMINI_MODEL,
  generateGeminiContent,
  geminiApiKey,
  geminiApiKeyProblem,
  resolveGeminiModel,
} from './providers/gemini-client.js'

/**
 * Turn an optional reference image into text the Motionsites codegen brief can use.
 *
 * Prefer Gemini multimodal vision when a key is configured and bytes (or a
 * fetchable URL) are available. Otherwise fall back to embedding the URL/path
 * as a textual design reference — never fail the whole generation for vision.
 */

export type ReferenceMode = 'vision' | 'text-fallback' | 'none'

export interface DescribeReferenceImageResult {
  mode: ReferenceMode
  summary: string
  /** Hex colours suggested from the image (theme target). */
  suggestedColors: Partial<{
    colorPrimary: string
    colorAccent: string
    colorSurface: string
    colorText: string
  }>
}

const HEX_RE = /#([0-9a-fA-F]{6})\b/g

function extractHexes(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(HEX_RE)) {
    const hex = `#${match[1]!.toLowerCase()}`
    if (!found.includes(hex)) found.push(hex)
  }
  return found.slice(0, 6)
}

function parseDataUrl(value: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(value.trim())
  if (!match) return null
  return { mimeType: match[1]!, base64: match[2]!.replace(/\s+/g, '') }
}

function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'image/jpeg'
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ mimeType: string; base64: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { accept: 'image/*,*/*' },
      })
      if (!response.ok) return null
      const mimeType =
        response.headers.get('content-type')?.split(';')[0]?.trim() || guessMimeFromPath(url)
      if (!mimeType.startsWith('image/')) return null
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.byteLength < 32 || buffer.byteLength > 4_000_000) return null
      return { mimeType, base64: buffer.toString('base64') }
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

async function resolveImageParts(
  referenceImage: string,
): Promise<{ mimeType: string; base64: string } | null> {
  const data = parseDataUrl(referenceImage)
  if (data) return data

  const trimmed = referenceImage.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return fetchImageAsBase64(trimmed)
  }

  // Relative media paths are not fetchable from the API process without a
  // public base URL — callers should pass an absolute URL or data-URL.
  return null
}

/**
 * Describe a reference image for codegen / theme extraction.
 */
export async function describeReferenceImage(
  referenceImage: string | undefined,
  intent: string,
): Promise<DescribeReferenceImageResult> {
  const trimmed = referenceImage?.trim()
  if (!trimmed) {
    return { mode: 'none', summary: '', suggestedColors: {} }
  }

  const canVision = Boolean(geminiApiKey()) && !geminiApiKeyProblem()
  const image = canVision ? await resolveImageParts(trimmed) : null

  if (canVision && image) {
    try {
      const model = resolveGeminiModel(process.env.GEMINI_VISION_MODEL?.trim() || DEFAULT_GEMINI_MODEL)
      const result = await generateGeminiContent({
        model,
        systemInstruction:
          'You describe UI reference images for a website builder. Be concrete about layout, hierarchy, typography mood, spacing, materials, and colours. Reply in plain English. End with a line: COLOURS: #rrggbb, #rrggbb, … (up to 4 hex values).',
        userText: [
          `Design intent: ${intent.slice(0, 400)}`,
          'Describe this reference image so an engineer can rebuild the UX with Tailwind + React (layout, components, motion cues). Do not invent brand copy.',
        ].join('\n\n'),
        inlineImages: [{ mimeType: image.mimeType, data: image.base64 }],
        maxOutputTokens: 1_024,
        temperature: 0.2,
        thinking: 'off',
        timeoutMs: 45_000,
      })

      const hexes = extractHexes(result.text)
      return {
        mode: 'vision',
        summary: result.text.slice(0, 3_500),
        suggestedColors: {
          colorPrimary: hexes[0],
          colorAccent: hexes[1],
          colorSurface: hexes[2],
          colorText: hexes[3],
        },
      }
    } catch {
      // Fall through to text fallback.
    }
  }

  return {
    mode: 'text-fallback',
    summary: `Reference image (URL/path — use as visual inspiration, do not hotlink third-party CDNs): ${trimmed.slice(0, 500)}`,
    suggestedColors: {},
  }
}
