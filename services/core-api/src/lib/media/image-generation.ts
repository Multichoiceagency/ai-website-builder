import { geminiApiKey, geminiApiKeyProblem } from '../ai/providers/gemini-client.js'

/**
 * AI image generation behind one interface, so site generation never depends on
 * a specific vendor. Only Gemini is implemented today.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

const SUPPORTED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export interface GeneratedImage {
  bytes: Buffer
  mimeType: string
  model: string
}

export interface ImageGenerationProvider {
  readonly id: string
  isConfigured(): boolean
  /** Rejects rather than returning a partial result; callers fall back to stock. */
  generate(prompt: string, options?: { timeoutMs?: number }): Promise<GeneratedImage>
}

interface GeminiImagePart {
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; mimeType?: string; data?: string }
}

interface GeminiImageResponse {
  candidates?: { content?: { parts?: GeminiImagePart[] } }[]
}

/** Gemini returns camelCase today and snake_case on older revisions of the API. */
function readInlineImage(part: GeminiImagePart): { mimeType: string; data: string } | null {
  const inline = part.inlineData ?? part.inline_data
  if (!inline?.data) return null
  const mimeType = (
    (inline as { mimeType?: string }).mimeType
    ?? (inline as { mime_type?: string }).mime_type
    ?? ''
  ).toLowerCase()
  return { mimeType, data: inline.data }
}

export class GeminiImageGenerationProvider implements ImageGenerationProvider {
  readonly id = 'gemini' as const

  /**
   * No default model on purpose: an unset `GEMINI_IMAGE_MODEL` disables AI
   * images rather than silently billing whichever model we guessed.
   */
  private model(): string {
    return (process.env.GEMINI_IMAGE_MODEL ?? '').trim()
  }

  isConfigured(): boolean {
    return Boolean(geminiApiKey()) && Boolean(this.model())
  }

  async generate(prompt: string, options?: { timeoutMs?: number }): Promise<GeneratedImage> {
    const apiKey = geminiApiKey()
    if (!apiKey) throw new Error(geminiApiKeyProblem() ?? 'GEMINI_API_KEY is not configured.')

    const model = this.model()
    if (!model) {
      throw new Error('GEMINI_IMAGE_MODEL is not configured — AI image generation is disabled.')
    }

    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 30_000),
    })

    if (!response.ok) {
      throw new Error(`Gemini image generation returned HTTP ${response.status}.`)
    }

    const body = (await response.json()) as GeminiImageResponse
    for (const part of body.candidates?.[0]?.content?.parts ?? []) {
      const inline = readInlineImage(part)
      if (!inline) continue
      if (!SUPPORTED_MIME.has(inline.mimeType)) continue
      return { bytes: Buffer.from(inline.data, 'base64'), mimeType: inline.mimeType, model }
    }

    throw new Error('Gemini image generation returned no image data.')
  }
}

export const geminiImageGenerationProvider = new GeminiImageGenerationProvider()
