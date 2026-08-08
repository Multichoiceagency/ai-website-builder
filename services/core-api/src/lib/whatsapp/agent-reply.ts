/**
 * Short WhatsApp agent replies. Prefer Gemini when configured; otherwise a
 * deterministic handoff so the desk never silently drops the customer.
 */

import { generateGeminiContent, geminiApiKey, resolveGeminiModel } from '../ai/providers/gemini-client.js'

export interface WhatsappAiReplyInput {
  systemPrompt: string
  customerMessage: string
  contactName?: string
}

export interface WhatsappAiReplyResult {
  text: string
  model: string
  handoff: boolean
}

export async function draftWhatsappAgentReply(
  input: WhatsappAiReplyInput,
  handoffKeywords: string[],
): Promise<WhatsappAiReplyResult> {
  const lowered = input.customerMessage.toLowerCase()
  const handoff = handoffKeywords.some((keyword) => keyword && lowered.includes(keyword.toLowerCase()))
  if (handoff) {
    return {
      text: 'I am connecting you with a human teammate — one moment.',
      model: 'handoff',
      handoff: true,
    }
  }

  if (!geminiApiKey()) {
    return {
      text:
        'Thanks for your message. A teammate will reply shortly. (AI reply is offline until GEMINI_API_KEY is set.)',
      model: 'fallback',
      handoff: false,
    }
  }

  const model = resolveGeminiModel()
  const system = `${input.systemPrompt}

Rules:
- Reply in the customer's language when clear.
- Keep answers under 500 characters for WhatsApp.
- Never invent order IDs, prices, or policies.
- If unsure, say a human will follow up.
- Plain text only — no markdown.`

  try {
    const result = await generateGeminiContent({
      model,
      systemInstruction: system,
      userText: `Customer${input.contactName ? ` (${input.contactName})` : ''}: ${input.customerMessage.slice(0, 1500)}`,
      maxOutputTokens: 400,
      temperature: 0.4,
      thinking: 'off',
      timeoutMs: 20_000,
    })
    return { text: result.text.slice(0, 500), model: `google:${model}`, handoff: false }
  } catch {
    return {
      text: 'Thanks — we received your message and a teammate will reply soon.',
      model: 'fallback',
      handoff: false,
    }
  }
}
