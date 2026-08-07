import {
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
 * Anthropic provider.
 *
 * Reads its key from the environment and reports itself unavailable when there
 * is none, so the gateway simply routes elsewhere — the platform never depends
 * on a key existing.
 *
 * Output is forced through a tool schema and validated with Zod. If the model
 * returns something that does not match, this throws and the gateway falls
 * back rather than writing malformed copy into a customer's website.
 *
 * The prompt, the fact distillation and the schemas come from
 * `copy-contract.ts`, so every model provider is held to the same rules.
 */

const MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 4096

// Pricing is configuration, not a constant of nature — it moves.
const COST_PER_MTOK_INPUT = 3
const COST_PER_MTOK_OUTPUT = 15

export class AnthropicCopyProvider implements AiProvider {
  readonly id = 'anthropic'

  #apiKey(): string | undefined {
    const key = process.env.ANTHROPIC_API_KEY
    return key && key.trim().length > 0 ? key : undefined
  }

  isAvailable(): boolean {
    return Boolean(this.#apiKey())
  }

  async generateCopy(context: CopyContext): Promise<CopyResult> {
    const apiKey = this.#apiKey()
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')

    // Facts, not the raw crawl: smaller, cheaper, and it removes any chance of
    // instructions from a scraped page reaching the model.
    const facts = distillFacts(context)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: 'write_website_copy',
            description: 'Return the complete copy set for this website.',
            input_schema: {
              type: 'object',
              properties: {
                heroEyebrow: { type: 'string' },
                heroHeadline: { type: 'string' },
                heroSubheadline: { type: 'string' },
                primaryCta: { type: 'string' },
                secondaryCta: { type: 'string' },
                servicesHeading: { type: 'string' },
                servicesIntro: { type: 'string' },
                featuresHeading: { type: 'string' },
                features: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      icon: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['icon', 'title', 'description'],
                  },
                },
                aboutHeading: { type: 'string' },
                aboutBody: { type: 'string' },
                ctaHeading: { type: 'string' },
                ctaBody: { type: 'string' },
                faq: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { question: { type: 'string' }, answer: { type: 'string' } },
                    required: ['question', 'answer'],
                  },
                },
                seoTitle: { type: 'string' },
                seoDescription: { type: 'string' },
              },
              required: [
                'heroEyebrow', 'heroHeadline', 'heroSubheadline', 'primaryCta', 'secondaryCta',
                'servicesHeading', 'servicesIntro', 'featuresHeading', 'features',
                'aboutHeading', 'aboutBody', 'ctaHeading', 'ctaBody', 'faq',
                'seoTitle', 'seoDescription',
              ],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'write_website_copy' },
        messages: [
          {
            role: 'user',
            content: `Business profile (the only facts you may use):\n\n${JSON.stringify(facts, null, 2)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API returned ${response.status}`)
    }

    const payload = (await response.json()) as {
      content: { type: string; name?: string; input?: unknown }[]
      usage?: { input_tokens: number; output_tokens: number }
    }

    const toolUse = payload.content.find((block) => block.type === 'tool_use')
    if (!toolUse?.input) throw new Error('Anthropic returned no structured output.')

    // Validated, not trusted — a schema mismatch falls back to the next provider.
    const slots = copySlotsSchema.parse(toolUse.input)

    const inputTokens = payload.usage?.input_tokens ?? 0
    const outputTokens = payload.usage?.output_tokens ?? 0

    return {
      slots,
      model: `${this.id}:${MODEL}`,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: this.#cost(inputTokens, outputTokens),
      },
    }
  }

  /**
   * Rewrite the copy of one placed section.
   *
   * The tool schema is built from the fields the caller declared editable, so
   * the model has no way to name a prop that is not one of them, and no way to
   * express "use a different block" or "add a section" at all — the shape of
   * the request is the first half of ADR-0007's guarantee. The caller still
   * validates the result against the block's own schema, which is the second.
   */
  async reviseCopy(context: RevisionContext): Promise<RevisionResult> {
    const apiKey = this.#apiKey()
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.')

    const editable = context.fields
    if (!editable.length) throw new Error('No editable fields were offered.')

    const properties = Object.fromEntries(
      editable.map((field) => [
        field.path,
        {
          type: 'string',
          description: `${field.label}${field.required ? ' (must not be empty)' : ''} — currently: ${JSON.stringify(field.value)}`,
        },
      ]),
    )

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: REVISION_SYSTEM_PROMPT,
        tools: [
          {
            name: 'revise_section_copy',
            description: 'Return the revised value for each field you changed.',
            input_schema: { type: 'object', properties, required: [] },
          },
        ],
        tool_choice: { type: 'tool', name: 'revise_section_copy' },
        messages: [
          { role: 'user', content: buildRevisionUserMessage(context) },
        ],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic API returned ${response.status}`)

    const payload = (await response.json()) as {
      content: { type: string; input?: unknown }[]
      usage?: { input_tokens: number; output_tokens: number }
    }

    const toolUse = payload.content.find((block) => block.type === 'tool_use')
    if (!toolUse?.input) throw new Error('Anthropic returned no structured output.')

    const raw = revisionValuesSchema.parse(toolUse.input)

    // A path the model invented is dropped rather than trusted: only fields the
    // caller declared editable can survive this filter.
    const values = keepDeclaredPaths(raw, editable)

    const inputTokens = payload.usage?.input_tokens ?? 0
    const outputTokens = payload.usage?.output_tokens ?? 0

    return {
      values,
      notes: [`Rewrote ${Object.keys(values).length} field(s) from your instruction.`],
      model: `${this.id}:${MODEL}`,
      usage: { inputTokens, outputTokens, costUsd: this.#cost(inputTokens, outputTokens) },
    }
  }

  #cost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1_000_000) * COST_PER_MTOK_INPUT + (outputTokens / 1_000_000) * COST_PER_MTOK_OUTPUT
    )
  }
}
