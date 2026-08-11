import { z } from 'zod'
import { aiGateway } from '../generation/index.js'
import { buildAssistCatalogueContext, type CatalogueHit } from './catalogue-context.js'
import {
  ensurePlatformKnowledgeSeeded,
  formatKnowledgeForPrompt,
  searchKnowledge,
} from './knowledge-rag.js'
import { analyzeMotionsitesBrief } from './motionsites-brief-agent.js'
import { getPrompt } from './prompt-registry.js'
import { generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'

/**
 * Free-text answers for the dashboard assistant panel.
 *
 * Mutations are suggested as structured `actions` the UI may apply. When no
 * language-model provider is configured the caller should fall back to the
 * keyword matcher, not invent a reply here.
 *
 * Catalogue digests (blocks + Motionsites / studio templates) are injected so
 * the model can cite real ids the UI can insert — never invented components.
 */

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(2_000),
})

const contentWidthValueSchema = z.union([
  z.enum(['full', 'content', 'wide', '1280', '1440', '1600']),
  z.number().int().min(320).max(2400),
])

const assistActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('setContentWidth'),
    /** CSS px or preset tokens: full | 1280 | 1440 | 1600 */
    width: contentWidthValueSchema,
  }),
  z.object({
    type: z.literal('setPageLayout'),
    maxWidth: contentWidthValueSchema,
  }),
  z.object({
    type: z.literal('setHeaderLogo'),
    url: z.string().url().max(2_048),
  }),
  z.object({
    type: z.literal('setHeaderLogoSize'),
    size: z.enum(['sm', 'md', 'lg', 'xl']),
  }),
  z.object({
    type: z.literal('insertBlock'),
    blockId: z.string().min(1).max(120),
  }),
  z.object({
    type: z.literal('insertLayoutCanvas'),
    /** Optional hint — UI always inserts layout-canvas-01. */
    title: z.string().max(120).optional(),
  }),
  z.object({
    type: z.literal('replaceLayoutRoot'),
    sectionId: z.string().min(1).max(120),
    /** Full layout-canvas props.root tree (validated client-side). */
    root: z.record(z.unknown()),
  }),
  z.object({
    type: z.literal('patchSectionProps'),
    sectionId: z.string().min(1).max(120),
    props: z.record(z.unknown()).refine((value) => Object.keys(value).length > 0, {
      message: 'props must not be empty',
    }),
  }),
])

const assistResponseSchema = z.object({
  answer: z.string().trim().min(1).max(2_000),
  actions: z.array(assistActionSchema).max(8).optional().default([]),
})

export type AssistAction = z.infer<typeof assistActionSchema>

/**
 * Gemini sometimes ignores JSON mime and returns prose ("I can't…").
 * Never throw that at the dashboard as a parse stack.
 */
export function parseAssistModelText(raw: string): z.infer<typeof assistResponseSchema> {
  const text = raw.trim()
  if (!text) {
    return { answer: 'I could not form a reply. Try again in a moment.', actions: [] }
  }

  const tryParse = (candidate: string) => {
    try {
      const parsed = JSON.parse(candidate) as unknown
      const result = assistResponseSchema.safeParse(parsed)
      if (result.success) return result.data
      const answerOnly = answerSchema.safeParse(parsed)
      if (answerOnly.success) return { answer: answerOnly.data.answer, actions: [] as AssistAction[] }
      // Object with answer but invalid actions — keep the answer, drop bad actions.
      if (parsed && typeof parsed === 'object' && 'answer' in parsed) {
        const answer = String((parsed as { answer: unknown }).answer ?? '').trim()
        if (answer) return { answer: answer.slice(0, 2_000), actions: [] as AssistAction[] }
      }
    } catch {
      /* continue */
    }
    return null
  }

  const direct = tryParse(text)
  if (direct) return direct

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const fromFence = tryParse(fenced[1].trim())
    if (fromFence) return fromFence
  }

  const brace = text.match(/\{[\s\S]*\}/)
  if (brace?.[0]) {
    const fromBrace = tryParse(brace[0])
    if (fromBrace) return fromBrace
  }

  return { answer: text.slice(0, 2_000), actions: [] }
}

export const ASSIST_SYSTEM_FALLBACK = `You are the in-product assistant for a multi-tenant website builder.
You help the signed-in customer with their website, pages, publishing, SEO,
and growth features.

Rules:
- Be concise (2–6 short sentences). Plain language.
- Do not invent facts about their business or their site.
- Do not claim you changed anything unless you also return structured actions.
- Prefer structured actions over instructing the user to click the inspector or settings.
  When they ask to change the site, return JSON actions the UI can apply — do not
  only describe how they could do it manually.
- Prefer a single JSON object: {"answer":"...","actions":[...]}.
  Allowed actions when the user asks to change layout, theme, header, or section props:
  - {"type":"setContentWidth","width":1600} or "full"|"1280"|"1440"|"1600"
  - {"type":"setPageLayout","maxWidth":1600} (same width tokens)
  - {"type":"setHeaderLogo","url":"https://…/logo.png"}
  - {"type":"setHeaderLogoSize","size":"sm"|"md"|"lg"|"xl"} (patches logoHeight on header-* sections)
  - {"type":"insertBlock","blockId":"scroll-video-scrub-01"}
  - {"type":"patchSectionProps","sectionId":"sec_…","props":{…}} (merge props onto one section)
- If you cannot use JSON, plain text is fine — never invent markup.
- If they ask to rewrite long copy and you lack a sectionId, tell them to select the
  section and use Ask AI on the canvas toolbar.
- If they ask to build a site, point them to Onboarding.
- When recommending a section or template, cite its exact id from the catalogue.
- For interactive 3D / scroll-scrub video, prefer block id \`scroll-video-scrub-01\`.
  Tell them to upload a video in Media first (frames extract automatically).`

export const ASSIST_FREEFORM_SYSTEM = `You are the AI Freeform assistant for a website builder.
You help the customer design pages as freeform layout trees only.

Hard rules:
- Build ONLY freeform layout trees (block id layout-canvas-01).
- NEVER cite Motionsites, registry heroes, scroll-video-scrub, or other component block ids.
- NEVER recommend the Insert marketplace or component catalogue.
- Prefer JSON: {"answer":"...","actions":[...]}.
  Allowed actions:
  - {"type":"insertLayoutCanvas"} — add an Empty section (layout canvas) to the page
  - {"type":"insertBlock","blockId":"layout-canvas-01"} — same as insertLayoutCanvas
  - {"type":"setContentWidth","width":1600} or "full"|"1280"|"1440"|"1600"
  - {"type":"setPageLayout","maxWidth":1600}
  - {"type":"patchSectionProps","sectionId":"sec_…","props":{…}} — only for layout-canvas sections
- Be concise. Guide them to edit Structure / Properties for nodes (text, image, button, container).
- If they ask to build a whole multi-page site, tell them to use Make website with AI Freeform
  (/website/new?mode=ai).`

function assistSystemPrompt(freeformMode: boolean): string {
  if (freeformMode) {
    return getPrompt('assist.freeform.system')?.text ?? ASSIST_FREEFORM_SYSTEM
  }
  return getPrompt('assist.system')?.text ?? ASSIST_SYSTEM_FALLBACK
}

export interface AssistOptions {
  /** When false, skip catalogue digest (tests / tiny prompts). Default true. */
  includeCatalogue?: boolean
  /** AI Freeform editor — no Motionsites / registry catalogue. */
  freeformMode?: boolean
  /** Tenant for RAG (platform chunks always included). */
  tenantId?: string | null
}

export interface AssistResult {
  answer: string
  model: string
  /** Ranked catalogue rows the UI can offer as one-click inserts. */
  catalogueHits: CatalogueHit[]
  /** Optional structured mutations the dashboard may apply after confirm. */
  actions?: AssistAction[]
}

/**
 * Returns null when no LLM provider is available — the UI keeps its tool-only
 * fallback instead of pretending.
 */
export async function assistWithMessage(
  message: string,
  options: AssistOptions = {},
): Promise<AssistResult | null> {
  const freeformMode = options.freeformMode === true
  const includeCatalogue = freeformMode ? false : options.includeCatalogue !== false
  const { digest, hits } = includeCatalogue
    ? buildAssistCatalogueContext(message)
    : { digest: '', hits: [] as CatalogueHit[] }

  await ensurePlatformKnowledgeSeeded()
  let knowledgeBlock = ''
  try {
    const knowledgeHits = await searchKnowledge(message, {
      tenantId: options.tenantId,
      limit: 5,
    })
    knowledgeBlock = formatKnowledgeForPrompt(knowledgeHits)
  } catch {
    knowledgeBlock = ''
  }

  if (!freeformMode) {
    const brief = await analyzeMotionsitesBrief(message, { fetchRemoteMedia: true })
    if (brief.kind === 'exact_island' && brief.islandId) {
      return {
        answer: `That reads as an exact Motionsites React brief for the “${brief.islandId}” island. Open the page editor, select a section (or use Add → Templates / Generate with AI), paste the brief, and Apply — the platform inserts the curated island plus the shared header. It will not rewrite Vue props for this prompt.`,
        model: brief.model,
        catalogueHits: hits.filter((hit) => hit.id === brief.islandId).length
          ? hits.filter((hit) => hit.id === brief.islandId)
          : hits.slice(0, 6),
      }
    }
    if (brief.kind === 'exact_island') {
      return {
        answer:
          'That looks like a Motionsites React+Tailwind build brief, but no ready island matches yet. Call POST /api/v1/ai/motionsites-codegen with the brief to generate a single-file React component (DEPENDENCIES header + default export), then register it as an island. Ask AI will not invent React into page JSON (ADR-0003).',
        model: brief.model,
        catalogueHits: hits.slice(0, 6),
      }
    }

    const wantsScrollFrames =
      /\b(scroll[- ]?(scrub|video|3d)|frame\s*pack|interactive\s*3d|product\s*fly[- ]?through|scrub\s*(through|video)|apple[- ]style\s*scroll)\b/i.test(
        message,
      )
    if (wantsScrollFrames) {
      const scrubHit = hits.find((hit) => hit.id === 'scroll-video-scrub-01')
      return {
        answer:
          'For interactive 3D / scroll-driven video stories, use block `scroll-video-scrub-01`. Upload (or import) a video in Media — frames extract automatically — then insert that block and pick the video when Frames ready shows. Overlay headlines are editable in Content.',
        model: 'rule:scroll-video-scrub',
        catalogueHits: scrubHit
          ? [scrubHit, ...hits.filter((hit) => hit.id !== scrubHit.id).slice(0, 5)]
          : [
              {
                kind: 'block' as const,
                id: 'scroll-video-scrub-01',
                name: 'Scroll — video frame scrub',
                category: 'gallery',
                collection: 'motion',
                score: 99,
              },
              ...hits.slice(0, 5),
            ],
        actions: [{ type: 'insertBlock', blockId: 'scroll-video-scrub-01' }],
      }
    }
  }

  const llm = aiGateway.available().find((provider) => provider.id !== 'deterministic-composer')
  if (!llm) return null

  const parts = [assistSystemPrompt(freeformMode)]
  if (knowledgeBlock) parts.push(knowledgeBlock)
  if (digest) {
    parts.push(`Catalogue context (cite ids from this list only):\n${digest}`)
  }
  const system = parts.join('\n\n')

  const userText = knowledgeBlock
    ? `${message.slice(0, 800)}\n\n${knowledgeBlock.slice(0, 1_500)}`
    : message.slice(0, 1_000)

  if (llm.id === 'google') {
    return sanitizeAssistResult(await assistViaGemini(userText, system, hits), freeformMode)
  }

  if (llm.id === 'anthropic') {
    return sanitizeAssistResult(await assistViaAnthropic(userText, system, hits), freeformMode)
  }

  return null
}

function sanitizeAssistResult(result: AssistResult, freeformMode: boolean): AssistResult {
  if (!freeformMode) return result
  const actions: AssistAction[] = []
  for (const action of result.actions ?? []) {
    if (action.type === 'insertBlock' && action.blockId !== 'layout-canvas-01') {
      actions.push({ type: 'insertLayoutCanvas' })
      continue
    }
    if (
      action.type === 'insertBlock' ||
      action.type === 'insertLayoutCanvas' ||
      action.type === 'setContentWidth' ||
      action.type === 'setPageLayout' ||
      action.type === 'patchSectionProps' ||
      action.type === 'replaceLayoutRoot'
    ) {
      actions.push(action)
    }
  }

  return {
    ...result,
    catalogueHits: [],
    actions,
  }
}

async function assistViaGemini(
  message: string,
  system: string,
  hits: CatalogueHit[],
): Promise<AssistResult> {
  const model = resolveGeminiModel()
  const result = await generateGeminiContent({
    model,
    systemInstruction: system,
    userText: message.slice(0, 1_000),
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        answer: { type: 'STRING' },
        actions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING' },
              width: { type: 'STRING' },
              maxWidth: { type: 'STRING' },
              blockId: { type: 'STRING' },
              url: { type: 'STRING' },
              size: { type: 'STRING' },
              sectionId: { type: 'STRING' },
              props: { type: 'OBJECT' },
            },
            required: ['type'],
          },
        },
      },
      required: ['answer'],
    },
    maxOutputTokens: 1_024,
    thinking: 'off',
    timeoutMs: 30_000,
  })

  const parsed = parseAssistModelText(result.text)
  return {
    answer: parsed.answer,
    model: `google:${model}`,
    catalogueHits: hits,
    actions: parsed.actions,
  }
}

async function assistViaAnthropic(
  message: string,
  system: string,
  hits: CatalogueHit[],
): Promise<AssistResult> {
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
      system,
      messages: [{ role: 'user', content: message.slice(0, 1_000) }],
      tools: [
        {
          name: 'reply',
          description: 'Send the assistant reply (and optional layout actions) to the customer.',
          input_schema: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    width: {},
                    maxWidth: {},
                    blockId: { type: 'string' },
                    url: { type: 'string' },
                    size: { type: 'string' },
                    sectionId: { type: 'string' },
                    props: { type: 'object' },
                  },
                  required: ['type'],
                },
              },
            },
            required: ['answer'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'reply' },
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API returned ${response.status}`)

  const payload = (await response.json()) as {
    content?: { type: string; input?: unknown }[]
  }
  const tool = payload.content?.find((block) => block.type === 'tool_use')
  const parsed = parseAssistModelText(JSON.stringify(tool?.input ?? {}))
  return {
    answer: parsed.answer,
    model: `anthropic:${model}`,
    catalogueHits: hits,
    actions: parsed.actions,
  }
}
