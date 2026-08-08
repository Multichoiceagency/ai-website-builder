/**
 * Shared Gemini HTTP client.
 *
 * Every call path (copy, assist, Motionsites codegen) goes through here so we
 * get one default model, one retry policy, and one place to disable runaway
 * "thinking" that otherwise eats the entire maxOutputTokens budget and returns
 * empty candidates (the dominant cause of Gemini API failures in this product).
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Balanced, GA flash model. Prefer this over Pro for product paths: Pro is
 * thinking-only and routinely finishes with MAX_TOKENS + empty text.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

/** Codegen needs more room; still flash, not Pro. */
export const DEFAULT_CODEGEN_MODEL = 'gemini-2.5-flash'

const RETRYABLE = new Set([429, 503, 500])
const MAX_ATTEMPTS = 3

export interface GeminiGenerateInput {
  model?: string
  systemInstruction?: string
  userText: string
  /**
   * Optional multimodal images (Gemini vision). Base64 without the data-URL
   * prefix. When present they are sent as `inline_data` parts after the text.
   */
  inlineImages?: { mimeType: string; data: string }[]
  responseMimeType?: 'application/json' | 'text/plain'
  responseSchema?: unknown
  maxOutputTokens?: number
  temperature?: number
  /**
   * Disable or cap model "thinking". Flash models accept `thinkingBudget: 0`.
   * Gemini 3.x prefers `thinkingLevel: 'MINIMAL'`. When omitted we pick based
   * on the model id.
   */
  thinking?: 'off' | 'minimal' | 'default'
  timeoutMs?: number
}

export interface GeminiGenerateResult {
  text: string
  model: string
  finishReason: string | null
  usage: {
    promptTokenCount: number
    candidatesTokenCount: number
    thoughtsTokenCount: number
  }
  raw: {
    candidates?: {
      finishReason?: string
      content?: { parts?: { text?: string }[] }
    }[]
    usageMetadata?: {
      promptTokenCount?: number
      candidatesTokenCount?: number
      thoughtsTokenCount?: number
    }
  }
}

/**
 * Accepted Gemini API key shapes:
 * - Classic Google AI Studio keys: `AIza…`
 * - Newer Generative Language keys: `AQ.…` (verified against generateContent)
 *
 * Reject empty / clearly non-key values so a Places-only misconfiguration is
 * still caught at boot rather than as an opaque 401 mid-request.
 */
export function isLikelyGeminiApiKey(value: string): boolean {
  const trimmed = value.trim()
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(trimmed)) return true
  if (/^AQ\.[A-Za-z0-9_-]{20,}$/.test(trimmed)) return true
  return false
}

export function geminiApiKey(): string | undefined {
  const primary = process.env.GEMINI_API_KEY?.trim()
  if (primary && isLikelyGeminiApiKey(primary)) return primary
  return undefined
}

export function geminiApiKeyProblem(): string | null {
  const primary = process.env.GEMINI_API_KEY?.trim()
  if (primary && isLikelyGeminiApiKey(primary)) return null
  if (primary && !isLikelyGeminiApiKey(primary)) {
    return (
      'GEMINI_API_KEY does not look like a Generative Language key '
      + '(expected AIza… or AQ.…). Create one at https://aistudio.google.com/apikey.'
    )
  }
  return 'GEMINI_API_KEY is not configured. Create a key at https://aistudio.google.com/apikey'
}

export function resolveGeminiModel(override?: string): string {
  return override?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
}

function thinkingConfigFor(model: string, mode: GeminiGenerateInput['thinking']): Record<string, unknown> | undefined {
  const resolved = mode ?? 'off'
  if (resolved === 'default') return undefined

  // Gemini 3.x rejects thinkingBudget: 0; use thinkingLevel instead.
  if (/^gemini-3/i.test(model)) {
    return { thinkingLevel: 'MINIMAL' }
  }

  // 2.5 Pro cannot disable thinking — callers should not use it for product paths.
  if (/gemini-2\.5-pro/i.test(model)) {
    return { thinkingBudget: 1024 }
  }

  if (resolved === 'off') return { thinkingBudget: 0 }
  return { thinkingBudget: 256 }
}

function sleep(ms: number): Promise<void> {
  if (process.env.NODE_ENV === 'test') return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers?.get?.('retry-after')
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 20_000)
  }
  return Math.min(400 * 2 ** attempt, 8_000)
}

async function readGeminiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string; status?: string } }
    const message = body.error?.message?.trim()
    if (message) return message.slice(0, 240)
  } catch {
    // ignore
  }
  return ''
}

function authFailureHint(status: number, detail: string): string {
  const problem = geminiApiKeyProblem()
  if (problem) return problem
  if (status === 401 || status === 403) {
    return (
      `Gemini API returned ${status}${detail ? `: ${detail}` : ''}. `
      + 'Check GEMINI_API_KEY at https://aistudio.google.com/apikey and enable the Generative Language API.'
    )
  }
  return `Gemini API returned ${status}${detail ? `: ${detail}` : ''}`
}

/**
 * Call `generateContent` with retries on transient Google errors.
 * Never logs the API key or the request body (may contain customer data).
 */
export async function generateGeminiContent(input: GeminiGenerateInput): Promise<GeminiGenerateResult> {
  const problem = geminiApiKeyProblem()
  const apiKey = geminiApiKey()
  if (!apiKey) throw new Error(problem ?? 'GEMINI_API_KEY is not configured.')
  if (problem && !isLikelyGeminiApiKey(apiKey)) throw new Error(problem)

  const model = resolveGeminiModel(input.model)
  const thinking = thinkingConfigFor(model, input.thinking)
  const timeoutMs = input.timeoutMs ?? 60_000

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: input.maxOutputTokens ?? 8192,
  }
  if (input.temperature !== undefined) generationConfig.temperature = input.temperature
  if (input.responseMimeType) generationConfig.responseMimeType = input.responseMimeType
  if (input.responseSchema) generationConfig.responseSchema = input.responseSchema
  if (thinking) generationConfig.thinkingConfig = thinking

  const body = {
    ...(input.systemInstruction
      ? { systemInstruction: { parts: [{ text: input.systemInstruction }] } }
      : {}),
    contents: [
      {
        role: 'user',
        parts: [
          { text: input.userText },
          ...(input.inlineImages ?? []).map((image) => ({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          })),
        ],
      },
    ],
    generationConfig,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const detail = await readGeminiErrorMessage(response)
        const err = new Error(authFailureHint(response.status, detail))
        if (RETRYABLE.has(response.status) && attempt < MAX_ATTEMPTS - 1) {
          await sleep(retryAfterMs(response, attempt))
          lastError = err
          continue
        }
        throw err
      }

      const raw = (await response.json()) as GeminiGenerateResult['raw']
      const candidate = raw.candidates?.[0]
      const finishReason = candidate?.finishReason ?? null
      const text = (candidate?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim()

      if (!text && finishReason === 'MAX_TOKENS' && attempt < MAX_ATTEMPTS - 1) {
        generationConfig.maxOutputTokens = Math.min(
          ((generationConfig.maxOutputTokens as number) || 8192) * 2,
          32_768,
        )
        lastError = new Error('Gemini returned empty output (thinking exhausted the token budget).')
        await sleep(200)
        continue
      }

      if (!text) {
        throw new Error(
          finishReason === 'MAX_TOKENS'
            ? 'Gemini returned empty output (token budget exhausted by thinking).'
            : 'Gemini returned no structured output.',
        )
      }

      return {
        text,
        model,
        finishReason,
        usage: {
          promptTokenCount: raw.usageMetadata?.promptTokenCount ?? 0,
          candidatesTokenCount: raw.usageMetadata?.candidatesTokenCount ?? 0,
          thoughtsTokenCount: raw.usageMetadata?.thoughtsTokenCount ?? 0,
        },
        raw,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`Gemini request timed out after ${timeoutMs}ms.`)
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(retryAfterMs(new Response(null, { status: 503 }), attempt))
          continue
        }
        throw lastError
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError ?? new Error('Gemini request failed.')
}
