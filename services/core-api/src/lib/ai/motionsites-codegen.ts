import { z } from 'zod'
import {
  formatWorkingMemoryForPrompt,
  remember,
  retrieveWorkingMemory,
} from './agent-memory.js'
import {
  MOTIONSITES_CODEGEN_SYSTEM_PROMPT,
  parseDependenciesHeader,
  validateCodegenOutput,
} from './motionsites-codegen-prompt.js'
import {
  DEFAULT_CODEGEN_MODEL,
  generateGeminiContent,
  geminiApiKey,
  geminiApiKeyProblem,
} from './providers/gemini-client.js'

/**
 * Motionsites single-file React codegen.
 *
 * Uses procedural memory (engine rules) + retrieved semantic/episodic context,
 * then calls Gemini or Anthropic. Output is island-bound (ADR-0003) — never
 * written into page props by this module.
 */

export interface MotionsitesCodegenResult {
  ok: boolean
  model: string
  packages: string[]
  code: string
  raw: string
  errors: string[]
  memoryTokens: number
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:jsx|tsx|javascript|typescript)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

async function callGemini(system: string, user: string): Promise<{ text: string; model: string }> {
  const problem = geminiApiKeyProblem()
  if (!geminiApiKey()) throw new Error(problem ?? 'GEMINI_API_KEY is not configured.')
  // Never default to gemini-2.5-pro: thinking-only, often empty MAX_TOKENS (~13s).
  const model =
    process.env.GEMINI_CODEGEN_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_CODEGEN_MODEL
  const temperature = Number.parseFloat(process.env.MOTIONSITES_CODEGEN_TEMPERATURE ?? '0.15')
  const result = await generateGeminiContent({
    model,
    systemInstruction: system,
    userText: user,
    maxOutputTokens: 16_384,
    temperature: Number.isFinite(temperature) ? temperature : 0.15,
    thinking: 'off',
    timeoutMs: 90_000,
  })
  return { text: result.text, model: `google:${model}` }
}

async function callAnthropic(system: string, user: string): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')
  const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 16_384,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!response.ok) throw new Error(`Anthropic API returned ${response.status}`)
  const payload = (await response.json()) as {
    content?: { type: string; text?: string }[]
  }
  const text = (payload.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('Anthropic returned empty codegen output.')
  return { text, model: `anthropic:${model}` }
}

export async function generateMotionsitesComponent(brief: string): Promise<MotionsitesCodegenResult> {
  const working = await retrieveWorkingMemory(brief, { maxTokens: 3_500 })
  const memoryBlock = formatWorkingMemoryForPrompt(working)

  const system = [
    MOTIONSITES_CODEGEN_SYSTEM_PROMPT,
    '',
    'Retrieved agent memory (follow procedural rules above all):',
    memoryBlock,
  ].join('\n')

  const user = `UI-opdracht / Motionsites brief:\n\n${brief.slice(0, 14_000)}`

  let raw = ''
  let model = 'unavailable'
  const errors: string[] = []
  try {
    const geminiProblem = geminiApiKeyProblem()
    const hasGemini = Boolean(geminiApiKey()) && !geminiProblem
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim())

    if (geminiProblem && !hasGemini && !hasAnthropic) {
      return {
        ok: false,
        model,
        packages: [],
        code: '',
        raw: '',
        errors: [geminiProblem],
        memoryTokens: working.estimatedTokens,
      }
    }

    if (hasGemini) {
      try {
        const result = await callGemini(system, user)
        raw = result.text
        model = result.model
      } catch (geminiError) {
        const message = geminiError instanceof Error ? geminiError.message : 'Gemini codegen failed.'
        errors.push(message)
        if (hasAnthropic) {
          const result = await callAnthropic(system, user)
          raw = result.text
          model = result.model
          errors.length = 0
        } else {
          return {
            ok: false,
            model,
            packages: [],
            code: '',
            raw: '',
            errors,
            memoryTokens: working.estimatedTokens,
          }
        }
      }
    } else if (hasAnthropic) {
      const result = await callAnthropic(system, user)
      raw = result.text
      model = result.model
    } else {
      return {
        ok: false,
        model,
        packages: [],
        code: '',
        raw: '',
        errors: [
          'No LLM provider configured for Motionsites codegen. Set GEMINI_API_KEY (AIza… or AQ.…) or ANTHROPIC_API_KEY.',
        ],
        memoryTokens: working.estimatedTokens,
      }
    }
  } catch (error) {
    return {
      ok: false,
      model,
      packages: [],
      code: '',
      raw: '',
      errors: [error instanceof Error ? error.message : 'Codegen provider failed.', ...errors],
      memoryTokens: working.estimatedTokens,
    }
  }

  const cleaned = stripMarkdownFences(raw)
  const validated = validateCodegenOutput(cleaned)

  if (validated.ok) {
    const deps = parseDependenciesHeader(cleaned)
    await remember({
      kind: 'episodic',
      key: `episodic:codegen:${Date.now()}`,
      content: `Generated Motionsites component. packages=${JSON.stringify(deps.packages)}. brief=${brief.slice(0, 280).replace(/\s+/g, ' ')}`,
      tags: ['codegen', 'episodic', ...deps.packages],
    })
  }

  return {
    ok: validated.ok,
    model,
    packages: validated.packages,
    code: validated.code,
    raw: cleaned,
    errors: validated.errors,
    memoryTokens: working.estimatedTokens,
  }
}

export const motionsitesCodegenResultSchema = z.object({
  ok: z.boolean(),
  model: z.string(),
  packages: z.array(z.string()),
  code: z.string(),
  errors: z.array(z.string()),
})
