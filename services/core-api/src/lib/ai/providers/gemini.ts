import {
  COPY_SLOT_ORDER,
  FEATURE_ICONS,
  REVISION_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  buildRevisionUserMessage,
  copySlotsSchema,
  distillFacts,
  keepDeclaredPaths,
  revisionValuesSchema,
} from '../copy-contract.js'
import type { AiProvider, CopyContext, CopyResult, RevisionContext, RevisionResult } from '../gateway.js'

/**
 * Google Gemini provider.
 *
 * Reads its key from the environment and reports itself unavailable when there
 * is none, so the gateway simply routes elsewhere — the platform never depends
 * on a key existing.
 *
 * Where Anthropic forces structure with a tool schema, Gemini does it with
 * `responseMimeType: application/json` plus a `responseSchema`: the model
 * cannot answer with prose. That constrains the shape but does not guarantee
 * it, so the parsed result still goes through the same Zod schemas the
 * Anthropic provider uses. A mismatch throws and the gateway falls back rather
 * than writing malformed copy into a customer's website.
 *
 * The key travels in the `x-goog-api-key` header and never in the query string,
 * which would put it in every proxy log and access log on the way.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Verified against Google's model list rather than recalled: model ids churn.
 * `gemini-3.6-flash` is the current GA balanced model. `GEMINI_MODEL` overrides
 * it without a deploy.
 */
const DEFAULT_MODEL = 'gemini-3.6-flash'

/**
 * Generous, because on the 3.x thinking models the reasoning tokens are drawn
 * from this same budget. A tight limit truncates the JSON mid-object, which
 * costs a whole request and then falls back anyway.
 */
const MAX_OUTPUT_TOKENS = 8192

/**
 * Pricing is configuration, not a constant of nature — it moves, and Google
 * publishes a different pair of rates for every model. These are the published
 * paid-tier rates for DEFAULT_MODEL; point `GEMINI_MODEL` at something else and
 * the reported cost becomes an estimate rather than an invoice.
 */
const COST_PER_MTOK_INPUT = 1.5
const COST_PER_MTOK_OUTPUT = 7.5

/** Gemini's `Schema` is JSON Schema with UPPER_SNAKE_CASE type names. */
const STRING = { type: 'STRING' } as const

const COPY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    heroEyebrow: STRING,
    heroHeadline: STRING,
    heroSubheadline: STRING,
    primaryCta: STRING,
    secondaryCta: STRING,
    servicesHeading: STRING,
    servicesIntro: STRING,
    featuresHeading: STRING,
    features: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'OBJECT',
        // Constrained at the transport too, not only in Zod: an icon the blocks
        // cannot render would fail validation and throw away the whole answer.
        properties: { icon: { type: 'STRING', enum: [...FEATURE_ICONS] }, title: STRING, description: STRING },
        required: ['icon', 'title', 'description'],
        propertyOrdering: ['icon', 'title', 'description'],
      },
    },
    aboutHeading: STRING,
    aboutBody: STRING,
    ctaHeading: STRING,
    ctaBody: STRING,
    faq: {
      type: 'ARRAY',
      minItems: 2,
      maxItems: 6,
      items: {
        type: 'OBJECT',
        properties: { question: STRING, answer: STRING },
        required: ['question', 'answer'],
        propertyOrdering: ['question', 'answer'],
      },
    },
    seoTitle: STRING,
    seoDescription: STRING,
  },
  required: COPY_SLOT_ORDER,
  propertyOrdering: COPY_SLOT_ORDER,
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
  }
}

export class GeminiCopyProvider implements AiProvider {
  /**
   * Matches `aiProviderIdSchema` (`google`), not the product name. The models
   * route compares this id to `AI_MODELS[].provider` — a mismatch marked every
   * Gemini model unavailable even with `GEMINI_API_KEY` set.
   */
  readonly id = 'google'

  /**
   * `GEMINI_API_KEY` only. `GOOGLE_API_KEY` is the Places / Business Profile
   * key used by discovery; the two are separate credentials with separate
   * scopes and must not be treated as interchangeable.
   */
  #apiKey(): string | undefined {
    const key = process.env.GEMINI_API_KEY
    return key && key.trim().length > 0 ? key : undefined
  }

  #model(): string {
    return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  }

  isAvailable(): boolean {
    return Boolean(this.#apiKey())
  }

  async generateCopy(context: CopyContext): Promise<CopyResult> {
    // Facts, not the raw crawl: smaller, cheaper, and it removes any chance of
    // instructions from a scraped page reaching the model.
    const facts = distillFacts(context)

    const payload = await this.#call({
      systemInstruction: SYSTEM_PROMPT,
      userText: `Business profile (the only facts you may use):\n\n${JSON.stringify(facts, null, 2)}`,
      responseSchema: COPY_RESPONSE_SCHEMA,
    })

    // Validated, not trusted — a schema mismatch falls back to the next provider.
    const slots = copySlotsSchema.parse(this.#json(payload))

    return {
      slots,
      model: `${this.id}:${this.#model()}`,
      usage: this.#usage(payload),
    }
  }

  /**
   * Rewrite the copy of one placed section.
   *
   * The response schema is built from the fields the caller declared editable,
   * so the model has no way to name a prop that is not one of them, and no way
   * to express "use a different block" or "add a section" at all — the shape of
   * the request is the first half of ADR-0007's guarantee. The caller still
   * validates the result against the block's own schema, which is the second.
   */
  async reviseCopy(context: RevisionContext): Promise<RevisionResult> {
    const editable = context.fields
    if (!editable.length) throw new Error('No editable fields were offered.')

    const properties = Object.fromEntries(
      editable.map((field) => [
        field.path,
        {
          type: 'STRING',
          description: `${field.label}${field.required ? ' (must not be empty)' : ''} — currently: ${JSON.stringify(field.value)}`,
        },
      ]),
    )

    const payload = await this.#call({
      systemInstruction: REVISION_SYSTEM_PROMPT,
      userText: buildRevisionUserMessage(context),
      // Nothing is required: the prompt asks for changed fields only.
      responseSchema: { type: 'OBJECT', properties, required: [] },
    })

    const raw = revisionValuesSchema.parse(this.#json(payload))

    // A path the model invented is dropped rather than trusted: only fields the
    // caller declared editable can survive this filter.
    const values = keepDeclaredPaths(raw, editable)

    return {
      values,
      notes: [`Rewrote ${Object.keys(values).length} field(s) from your instruction.`],
      model: `${this.id}:${this.#model()}`,
      usage: this.#usage(payload),
    }
  }

  async #call(request: {
    systemInstruction: string
    userText: string
    responseSchema: unknown
  }): Promise<GeminiResponse> {
    const apiKey = this.#apiKey()
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(this.#model())}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // In the header, never the query string: a key in a URL is a key in
        // every access log between here and Google.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: request.userText }] }],
        generationConfig: {
          // Prose is not an allowed answer: the model emits JSON or nothing.
          responseMimeType: 'application/json',
          responseSchema: request.responseSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    })

    // Status only. The body of a Gemini error can quote the request back, and
    // an error string is exactly the kind of thing that ends up in a log.
    if (!response.ok) throw new Error(`Gemini API returned ${response.status}`)

    return (await response.json()) as GeminiResponse
  }

  /** The one JSON document the model was told to produce. */
  #json(payload: GeminiResponse): unknown {
    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()

    if (!text) throw new Error('Gemini returned no structured output.')

    try {
      return JSON.parse(text)
    } catch {
      // Never include the text: it is model output about a customer's business.
      throw new Error('Gemini returned output that is not valid JSON.')
    }
  }

  /**
   * Thinking tokens are reported apart from the answer but billed at the output
   * rate, so they are counted as output here. Cost accounting that ignored them
   * would under-report every request to a 3.x model.
   */
  #usage(payload: GeminiResponse): { inputTokens: number; outputTokens: number; costUsd: number } {
    const inputTokens = payload.usageMetadata?.promptTokenCount ?? 0
    const outputTokens =
      (payload.usageMetadata?.candidatesTokenCount ?? 0) + (payload.usageMetadata?.thoughtsTokenCount ?? 0)

    return { inputTokens, outputTokens, costUsd: this.#cost(inputTokens, outputTokens) }
  }

  #cost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1_000_000) * COST_PER_MTOK_INPUT + (outputTokens / 1_000_000) * COST_PER_MTOK_OUTPUT
    )
  }
}
