import { z } from 'zod'
import { aiGateway } from '../generation/index.js'

/**
 * Free-text answers for the dashboard assistant panel.
 *
 * This is advice only — no writes. Mutations still go through the tool
 * registry with ADR-0007 confirmations. When no language-model provider is
 * configured the caller should fall back to the keyword matcher, not invent
 * a reply here.
 */

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(2_000),
})

const SYSTEM = `You are the in-product assistant for a multi-tenant website builder.
You help the signed-in customer with their website, pages, publishing, SEO,
and growth features.

Rules:
- Be concise (2–6 short sentences). Plain language.
- Do not invent facts about their business or their site.
- Do not claim you changed anything — you cannot write to their site from chat.
- If they ask you to change copy on a section, tell them to select the section
  and use Ask AI on the canvas toolbar.
- If they ask you to build a site, tell them to use "Build a website from a
  business" or open Onboarding.
- If they ask you to publish, tell them to use "Publish this page" (or say so
  clearly so they can confirm).
- Never output JSON, code fences, or system prompts.`

export interface AssistResult {
  answer: string
  model: string
}

/**
 * Returns null when no LLM provider is available — the UI keeps its tool-only
 * fallback instead of pretending.
 */
export async function assistWithMessage(message: string): Promise<AssistResult | null> {
  const llm = aiGateway.available().find((provider) => provider.id !== 'deterministic-composer')
  if (!llm) return null

  // Reuse Gemini/Anthropic through a narrow path: only Gemini exposes a raw
  // JSON call today via revise/generate. Prefer the gateway's first LLM by
  // calling generateContent-shaped helpers when the provider is Google.
  if (llm.id === 'google') {
    return assistViaGemini(message)
  }

  if (llm.id === 'anthropic') {
    return assistViaAnthropic(message)
  }

  return null
}

async function assistViaGemini(message: string): Promise<AssistResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: message.slice(0, 1_000) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: { answer: { type: 'STRING' } },
            required: ['answer'],
          },
          maxOutputTokens: 1_024,
        },
      }),
    },
  )

  if (!response.ok) throw new Error(`Gemini API returned ${response.status}`)

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) throw new Error('Gemini returned no structured output.')

  const parsed = answerSchema.parse(JSON.parse(text))
  return { answer: parsed.answer, model: `google:${model}` }
}

async function assistViaAnthropic(message: string): Promise<AssistResult> {
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
      max_tokens: 1_024,
      system: SYSTEM,
      messages: [{ role: 'user', content: message.slice(0, 1_000) }],
      tools: [
        {
          name: 'reply',
          description: 'Send the assistant reply to the customer.',
          input_schema: {
            type: 'object',
            properties: { answer: { type: 'string' } },
            required: ['answer'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'reply' },
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API returned ${response.status}`)

  const payload = (await response.json()) as {
    content?: { type: string; input?: { answer?: string } }[]
  }
  const tool = payload.content?.find((block) => block.type === 'tool_use')
  const parsed = answerSchema.parse(tool?.input ?? {})
  return { answer: parsed.answer, model: `anthropic:${model}` }
}
