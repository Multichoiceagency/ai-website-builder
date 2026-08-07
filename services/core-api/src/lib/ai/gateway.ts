import type { BusinessProfile } from '@platform/schemas'

/**
 * The AI Gateway (§9).
 *
 * Platform code asks for *copy*, never for "a call to Anthropic". Providers
 * implement one interface, the router picks the best available one and falls
 * back when a provider is unconfigured or fails, and every call is metered.
 *
 * The consequence that matters: the platform runs with zero AI credentials.
 * The deterministic provider is always available, so generation works out of
 * the box and improves — rather than starts working — when a key is added.
 */

export interface CopyContext {
  profile: BusinessProfile
  locale: string
  /** Page the copy is for, so the provider can vary intent. */
  goal: string
  /**
   * Template / MotionSites design brief — tone, typography cues and spacing
   * constraints only. Never markup or component source (ADR-0003).
   */
  designBrief?: string
}

export interface CopySlots {
  heroEyebrow: string
  heroHeadline: string
  heroSubheadline: string
  primaryCta: string
  secondaryCta: string
  servicesHeading: string
  servicesIntro: string
  featuresHeading: string
  features: { icon: string; title: string; description: string }[]
  aboutHeading: string
  aboutBody: string
  ctaHeading: string
  ctaBody: string
  faq: { question: string; answer: string }[]
  seoTitle: string
  seoDescription: string
}

export interface CopyResult {
  slots: CopySlots
  model: string
  /** Output tokens, for per-tenant cost accounting (§68). */
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
}

/**
 * One editable copy field of a placed section.
 *
 * `path` is a dotted address into the block's props — `headline`, or
 * `items.2.title` for the third entry of a repeatable list — because the unit a
 * user asks to change ("shorten the second service") is a leaf string, not the
 * whole prop object.
 */
export interface RevisionField {
  path: string
  label: string
  /** `text` is one line; `textarea` is prose. Providers shorten them differently. */
  kind: 'text' | 'textarea'
  value: string
  /**
   * True when the block's own default for this field is non-empty — the block
   * is designed to always show it. Emptying one of these is refused upstream.
   */
  required: boolean
}

export interface RevisionContext {
  blockId: string
  blockName: string
  /** What the user typed, verbatim. */
  instruction: string
  locale: string
  fields: RevisionField[]
  /**
   * What the platform knows about the business, when it knows anything. Used by
   * the "rewrite this from the profile" transform; providers must not invent
   * facts that are not in here.
   */
  profile: BusinessProfile | null
}

export interface RevisionResult {
  /** Revised values by field path. Paths not present are left alone. */
  values: Record<string, string>
  model: string
  /** Plain-language account of what was done, shown to the user beside the diff. */
  notes: string[]
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
}

/**
 * Thrown by a provider that understood the request and cannot carry it out —
 * as opposed to one that failed. The distinction matters: a failure is worth
 * retrying elsewhere, "I cannot rephrase without a language model" is not, and
 * must reach the user as an honest answer rather than as unchanged props
 * presented as a suggestion.
 */
export class UnsupportedInstructionError extends Error {
  readonly code = 'ai_instruction_unsupported'

  constructor(
    message: string,
    readonly supported: string[] = [],
  ) {
    super(message)
    this.name = 'UnsupportedInstructionError'
  }
}

export interface AiProvider {
  readonly id: string
  /** False when the provider has no credentials configured. */
  isAvailable(): boolean
  generateCopy(context: CopyContext): Promise<CopyResult>
  /**
   * Revise the copy already in a section. Optional: a provider that cannot do
   * it is simply skipped, rather than every provider having to fake it.
   */
  reviseCopy?(context: RevisionContext): Promise<RevisionResult>
}

export class AiGateway {
  readonly #providers: AiProvider[]

  constructor(providers: AiProvider[]) {
    this.#providers = providers
  }

  /** Providers in preference order that are actually usable right now. */
  available(): AiProvider[] {
    return this.#providers.filter((provider) => provider.isAvailable())
  }

  describe(): { id: string; available: boolean }[] {
    return this.#providers.map((provider) => ({ id: provider.id, available: provider.isAvailable() }))
  }

  /**
   * Try each available provider in order. A provider that throws is logged and
   * skipped — an LLM outage must degrade the quality of a generated site, not
   * prevent one from being generated.
   */
  async generateCopy(context: CopyContext): Promise<CopyResult> {
    const candidates = this.available()
    let lastError: unknown

    for (const provider of candidates) {
      try {
        return await provider.generateCopy(context)
      } catch (error) {
        lastError = error
        console.warn(`ai provider "${provider.id}" failed, falling back:`, error)
      }
    }

    throw lastError ?? new Error('No AI provider is available.')
  }

  /**
   * Revise the copy of one already-placed section.
   *
   * Same routing as `generateCopy`, with one difference: an
   * `UnsupportedInstructionError` is carried forward rather than swallowed, so
   * that when the last provider standing genuinely cannot honour the
   * instruction the caller learns *that*, not "no provider available".
   */
  async reviseCopy(context: RevisionContext): Promise<RevisionResult> {
    const candidates = this.available().filter((provider) => typeof provider.reviseCopy === 'function')
    let lastError: unknown

    for (const provider of candidates) {
      try {
        return await provider.reviseCopy!(context)
      } catch (error) {
        lastError = error
        if (!(error instanceof UnsupportedInstructionError)) {
          console.warn(`ai provider "${provider.id}" failed to revise, falling back:`, error)
        }
      }
    }

    throw lastError ?? new Error('No AI provider can revise copy.')
  }
}
