/**
 * Model identity, pricing and the two things the provider interface does not
 * expose to a caller who wants to compare models.
 *
 * Nothing here modifies a provider. `gemini.ts`, `anthropic.ts`,
 * `deterministic.ts`, `copy-contract.ts` and `gateway.ts` are untouched by this
 * harness; where the interface is too narrow, that is recorded as a limitation
 * rather than papered over by widening it.
 */

export interface ModelPrice {
  /** USD per million input tokens. */
  inputPerMTok: number
  /** USD per million output tokens. Gemini thinking tokens bill at this rate. */
  outputPerMTok: number
  /**
   * Where the number came from. A rate marked `unverified` makes every cost
   * figure derived from it an estimate, and the report says so on its face.
   */
  provenance: 'repo-asserted' | 'unverified'
  note: string
}

/**
 * The rate card, stated as data so the report can print it and a reader can
 * check it.
 *
 * Only one of these rates is anchored to anything in this repository: the
 * flash pair is copied from the constants `gemini.ts` already bills with. The
 * others are placeholders, marked `unverified`, and they exist so the harness
 * can produce a number at all — not so anyone can trust that number.
 *
 * Because raw input/output token counts are recorded per call in the run JSON,
 * every cost in a report can be recomputed against a corrected rate card
 * afterwards without re-running anything. That is the property that matters;
 * the rate card is the disposable part.
 */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  'gemini-3.6-flash': {
    inputPerMTok: 1.5,
    outputPerMTok: 7.5,
    provenance: 'repo-asserted',
    note: 'Copied from COST_PER_MTOK_INPUT/OUTPUT in src/lib/ai/providers/gemini.ts, which bills every Gemini call at these rates regardless of which model ran.',
  },
  'gemini-3.6-pro': {
    inputPerMTok: 1.5,
    outputPerMTok: 7.5,
    provenance: 'unverified',
    note: 'PLACEHOLDER. Pro is priced above Flash in every Gemini generation Google has published; using the Flash rate here understates Pro and orchestrated spend. Verify against Google pricing before quoting any figure from this harness.',
  },
  'claude-sonnet-5': {
    inputPerMTok: 3,
    outputPerMTok: 15,
    provenance: 'repo-asserted',
    note: 'Copied from src/lib/ai/providers/anthropic.ts.',
  },
  'deterministic-composer': {
    inputPerMTok: 0,
    outputPerMTok: 0,
    provenance: 'repo-asserted',
    note: 'No model, no call, no cost.',
  },
}

export function priceFor(model: string): ModelPrice {
  return (
    MODEL_PRICES[model] ?? {
      inputPerMTok: 0,
      outputPerMTok: 0,
      provenance: 'unverified',
      note: `No rate card entry for "${model}". Cost reported as 0, which is certainly wrong.`,
    }
  )
}

export function costOf(model: string, inputTokens: number, outputTokens: number): number {
  const price = priceFor(model)
  return (inputTokens / 1_000_000) * price.inputPerMTok + (outputTokens / 1_000_000) * price.outputPerMTok
}

/** True when any model used in this run is priced from a placeholder rate. */
export function hasUnverifiedPricing(models: string[]): boolean {
  return models.some((model) => priceFor(model).provenance === 'unverified')
}

/**
 * Run `fn` with `GEMINI_MODEL` pointed at a specific model.
 *
 * WHY THIS EXISTS, and what it says about the interface: `GeminiCopyProvider`
 * resolves its model from `process.env.GEMINI_MODEL` on every call, and
 * `AiProvider` has no constructor argument, no options bag and no per-call
 * field for it. So a caller that wants to compare Flash against Pro has no
 * in-process way to ask for a specific model — the only lever is the
 * environment variable the provider reads.
 *
 * Mutating process-global state to pick a model is not something production
 * code should do. It is safe *here* only because the harness runs arms strictly
 * sequentially, never concurrently, and restores the previous value in a
 * `finally`. If this harness ever runs arms in parallel, this breaks silently
 * and every result becomes untrustworthy — hence the guard below.
 *
 * The proper fix is a provider that accepts its model as configuration. That is
 * a change to `gemini.ts`, which is out of scope for this task and is reported
 * rather than made.
 */
let modelOverrideDepth = 0

export async function withGeminiModel<T>(model: string, fn: () => Promise<T>): Promise<T> {
  if (modelOverrideDepth > 0) {
    throw new Error(
      'withGeminiModel() is already active. It mutates process.env.GEMINI_MODEL and is only safe when arms run one at a time.',
    )
  }

  modelOverrideDepth += 1
  const previous = process.env.GEMINI_MODEL
  process.env.GEMINI_MODEL = model

  try {
    return await fn()
  } finally {
    if (previous === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = previous
    modelOverrideDepth -= 1
  }
}

/**
 * Ask Google which models this key can actually call.
 *
 * A free call, made during preflight and before any confirmation prompt, so an
 * arm configured against a model id that has been renamed or retired is
 * reported as skipped with a reason instead of burning a run and failing four
 * times. Returns `null` when the listing itself failed — the difference between
 * "this model does not exist" and "we could not check" is worth keeping.
 */
export async function listGeminiModels(): Promise<string[] | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !apiKey.trim()) return null

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      // Header, never the query string — a key in a URL is a key in every
      // access log between here and Google.
      headers: { 'x-goog-api-key': apiKey },
    })

    // Status only. A Gemini error body can quote the request back at you.
    if (!response.ok) return null

    const payload = (await response.json()) as { models?: { name?: string }[] }
    return (payload.models ?? [])
      .map((model) => (model.name ?? '').replace(/^models\//, ''))
      .filter((name) => name.length > 0)
  } catch {
    return null
  }
}
