import { AiGateway, type CopyContext, type CopySlots, type RevisionField } from '../src/lib/ai/gateway.js'
import { AnthropicCopyProvider } from '../src/lib/ai/providers/anthropic.js'
import { DeterministicCopyProvider } from '../src/lib/ai/providers/deterministic.js'
import { GeminiCopyProvider } from '../src/lib/ai/providers/gemini.js'
import { costOf, withGeminiModel } from './models.js'

/**
 * The arms under test, declared as data.
 *
 * Adding an arm is adding an entry to `ALL_ARMS`. Nothing else in the harness
 * knows how many arms there are or what they are called — which is the point of
 * the credential story: an Anthropic arm is already in the list, already
 * costed, already reported, and the only thing standing between it and a result
 * is `ANTHROPIC_API_KEY`. The day that key exists it runs, with no code change.
 *
 * An arm whose provider is unavailable is marked skipped and printed as skipped.
 * It is never quietly dropped: a comparison table that silently omits the arm
 * you were most curious about is worse than one that says "not run, no key".
 */

// region Result shapes

/** One model round-trip, metered. */
export interface ArmCall {
  /** What this call was for: `full`, `hero-positioning`, `body`, `critique`. */
  purpose: string
  model: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  /**
   * What the provider itself billed. Recorded next to the harness figure
   * because they disagree: `gemini.ts` applies one hard-coded rate pair to
   * every Gemini model, so its number for a Pro call is a Flash price.
   */
  providerReportedCostUsd: number
  /** Recomputed from this harness's rate card. See models.ts on its provenance. */
  costUsd: number
}

export type ArmOutcome =
  | { status: 'ok'; slots: CopySlots; calls: ArmCall[]; notes: string[] }
  | { status: 'failed'; error: string; calls: ArmCall[]; notes: string[] }

export interface EvalArm {
  id: string
  label: string
  /** What this arm is a test of, in one sentence. */
  hypothesis: string
  /** Provider ids that must report `isAvailable()` for this arm to run. */
  requiresProviders: string[]
  /** Model ids this arm calls, for preflight verification and cost estimation. */
  models: string[]
  /** Model calls per fixture, for the cost estimate printed before spending. */
  callsPerFixture: number
  run: (context: CopyContext) => Promise<ArmOutcome>
}

// endregion

// region Metering helpers

/** `gemini:gemini-3.6-pro` → `gemini-3.6-pro`. */
function modelId(reported: string): string {
  const colon = reported.indexOf(':')
  return colon === -1 ? reported : reported.slice(colon + 1)
}

interface Usage {
  inputTokens: number
  outputTokens: number
  costUsd: number
}

function meter(purpose: string, reportedModel: string, usage: Usage, latencyMs: number): ArmCall {
  const model = modelId(reportedModel)
  return {
    purpose,
    model,
    latencyMs,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    providerReportedCostUsd: usage.costUsd,
    costUsd: costOf(model, usage.inputTokens, usage.outputTokens),
  }
}

// endregion

// region Single-provider gateways

/**
 * A gateway holding exactly one provider.
 *
 * `AiGateway` is used rather than the provider directly so that every arm goes
 * through the same routing, error handling and interface the platform itself
 * uses. One provider means no fallback, which is what an experiment wants: an
 * arm that fails must be recorded as that arm failing, not silently answered by
 * the deterministic composer and scored as if the model had written it.
 */
function soloGateway(provider: 'gemini' | 'anthropic' | 'deterministic'): AiGateway {
  if (provider === 'gemini') return new AiGateway([new GeminiCopyProvider()])
  if (provider === 'anthropic') return new AiGateway([new AnthropicCopyProvider()])
  return new AiGateway([new DeterministicCopyProvider()])
}

async function runSingle(
  context: CopyContext,
  gateway: AiGateway,
  purpose: string,
): Promise<{ slots: CopySlots; call: ArmCall }> {
  const started = Date.now()
  const result = await gateway.generateCopy(context)
  return { slots: result.slots, call: meter(purpose, result.model, result.usage, Date.now() - started) }
}

async function guard(
  notes: string[],
  calls: ArmCall[],
  body: () => Promise<{ slots: CopySlots; notes: string[] }>,
): Promise<ArmOutcome> {
  try {
    const { slots, notes: extra } = await body()
    return { status: 'ok', slots, calls, notes: [...notes, ...extra] }
  } catch (error) {
    // Message only. A provider error may quote a request, and a request
    // contains a customer's business facts.
    return {
      status: 'failed',
      error: error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown failure',
      calls,
      notes,
    }
  }
}

// endregion

// region Arm 4: the orchestration under test

/**
 * The slots Pro writes in the orchestrated arm.
 *
 * "Hero and positioning" is read as: everything a visitor sees before scrolling,
 * plus the two places the site states what it is to someone who is not looking
 * at it — the calls to action and the search result. These are the slots where
 * one good sentence is worth more than ten adequate ones, which is the whole
 * premise of paying for a larger model on part of a page.
 */
export const PRO_SLOTS = [
  'heroEyebrow',
  'heroHeadline',
  'heroSubheadline',
  'primaryCta',
  'secondaryCta',
  'ctaHeading',
  'ctaBody',
  'seoTitle',
  'seoDescription',
] as const

/** Take the named keys from `pro` and everything else from `flash`. */
export function mergeSlots(pro: CopySlots, flash: CopySlots, fromPro: readonly string[]): CopySlots {
  const merged: Record<string, unknown> = { ...flash }
  for (const key of fromPro) {
    if (key in pro) merged[key] = (pro as unknown as Record<string, unknown>)[key]
  }
  return merged as unknown as CopySlots
}

/**
 * Every string in a copy set, as the editable fields `reviseCopy` expects.
 *
 * Repeatable entries get dotted paths (`features.2.title`), which is exactly
 * the addressing `RevisionField.path` documents and which `keepDeclaredPaths`
 * already filters against — so a critique pass cannot name a field that is not
 * on this list.
 */
export function slotsAsFields(slots: CopySlots): RevisionField[] {
  const fields: RevisionField[] = []

  for (const [key, value] of Object.entries(slots)) {
    if (typeof value === 'string') {
      fields.push({
        path: key,
        label: key,
        kind: value.length > 90 ? 'textarea' : 'text',
        value,
        required: value.trim().length > 0,
      })
      continue
    }

    if (!Array.isArray(value)) continue

    value.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return
      for (const [field, fieldValue] of Object.entries(entry as Record<string, unknown>)) {
        // The icon is an enum the blocks render, not copy. Offering it as an
        // editable string invites a critique pass to invent one.
        if (field === 'icon' || typeof fieldValue !== 'string') continue
        fields.push({
          path: `${key}.${index}.${field}`,
          label: `${key}[${index}].${field}`,
          kind: fieldValue.length > 90 ? 'textarea' : 'text',
          value: fieldValue,
          required: fieldValue.trim().length > 0,
        })
      }
    })
  }

  return fields
}

/** Write revised values back into a copy set, by the same dotted addressing. */
export function applyRevisionValues(slots: CopySlots, values: Record<string, string>): CopySlots {
  const next = structuredClone(slots) as unknown as Record<string, unknown>

  for (const [path, value] of Object.entries(values)) {
    const parts = path.split('.')

    if (parts.length === 1) {
      if (typeof next[parts[0]!] === 'string') next[parts[0]!] = value
      continue
    }

    if (parts.length !== 3) continue
    const [key, indexRaw, field] = parts as [string, string, string]
    const list = next[key]
    const index = Number(indexRaw)
    if (!Array.isArray(list) || !Number.isInteger(index)) continue
    const entry = list[index]
    if (!entry || typeof entry !== 'object') continue
    if (typeof (entry as Record<string, unknown>)[field] !== 'string') continue
    ;(entry as Record<string, unknown>)[field] = value
  }

  return next as unknown as CopySlots
}

/**
 * The instruction the critique pass is given.
 *
 * It permits a no-op explicitly. Without that, a model asked to review
 * something will find something to change whether or not anything is wrong, and
 * "the critique changed 34 fields" would tell us nothing about whether the
 * critique was worth its cost. With it, the count of changed fields becomes a
 * measurement.
 */
export const CRITIQUE_INSTRUCTION = `Two different models wrote this page. One wrote the hero and the positioning lines; another wrote the body sections. Read the whole set as one page and fix only what is actually wrong.

Things worth changing: a headline that does not say what the business does or what the customer gets; a section that just restates the hero; a tone that shifts between sections; generic filler; a claim that the business facts do not support; a call to action that does not match the page around it.

Leave everything else alone. Return only the fields you changed. Changing nothing at all is a correct answer if the page is already coherent.`

async function runOrchestrated(context: CopyContext, proModel: string, flashModel: string): Promise<ArmOutcome> {
  const calls: ArmCall[] = []
  const gateway = soloGateway('gemini')

  return guard([], calls, async () => {
    // 1. Pro writes a full set; only the hero and positioning slots are kept.
    //
    // The provider interface has no way to ask for a subset of slots —
    // `generateCopy` returns a whole `CopySlots` or throws — so the honest
    // implementation is to pay for a full Pro set and discard the two thirds we
    // are not using. That waste IS the finding: it is what "orchestration"
    // costs on top of this interface, and it is priced into the arm rather than
    // hidden by pretending a partial call happened.
    const pro = await withGeminiModel(proModel, () => runSingle(context, gateway, 'hero-positioning'))
    calls.push(pro.call)

    // 2. Flash writes a full set; everything outside the Pro slots is kept.
    const flash = await withGeminiModel(flashModel, () => runSingle(context, gateway, 'body'))
    calls.push(flash.call)

    const merged = mergeSlots(pro.slots, flash.slots, PRO_SLOTS)

    // 3. Pro reads the assembled page and may revise it.
    //
    // This rides on `reviseCopy`, the interface's own "change the wording of
    // these declared fields" primitive: the model can only return paths that
    // were offered, cannot add or remove a section, and gets the profile so its
    // edits stay inside the same facts. What it is NOT is a purpose-built
    // critique call — REVISION_SYSTEM_PROMPT frames the job as editing one
    // section of a page, and we are handing it a whole page. See the report:
    // that mismatch is a limitation of this arm, not a bug in it.
    const fields = slotsAsFields(merged)
    const critiqueStarted = Date.now()
    const revision = await withGeminiModel(proModel, () =>
      gateway.reviseCopy({
        blockId: 'eval-copy-set',
        blockName: 'Full page copy set',
        instruction: CRITIQUE_INSTRUCTION,
        locale: context.locale,
        fields,
        profile: context.profile,
      }),
    )
    calls.push(meter('critique', revision.model, revision.usage, Date.now() - critiqueStarted))

    const changed = Object.keys(revision.values)
    const final = applyRevisionValues(merged, revision.values)

    return {
      slots: final,
      notes: [
        `Pro wrote ${PRO_SLOTS.length} hero/positioning slots; Flash wrote the remaining body slots.`,
        `Critique pass offered ${fields.length} fields and changed ${changed.length}: ${changed.length ? changed.join(', ') : '(none)'}.`,
        'The Pro call produced a full copy set of which only the hero/positioning slots were used; the interface cannot request a subset. The discarded output is paid for and is included in this arm’s cost.',
      ],
    }
  })
}

// endregion

// region The arm list

const GEMINI_FLASH = 'gemini-3.6-flash'
const GEMINI_PRO = 'gemini-3.6-pro'

export const ALL_ARMS: EvalArm[] = [
  {
    id: 'deterministic-composer',
    label: 'Deterministic composer (baseline, free)',
    hypothesis:
      'The floor. It costs nothing, never fails and can only say what discovery found. Any paid arm that does not clear it is not worth its money on that profile.',
    requiresProviders: ['deterministic-composer'],
    models: ['deterministic-composer'],
    callsPerFixture: 0,
    run: async (context) => {
      const calls: ArmCall[] = []
      return guard([], calls, async () => {
        const { slots, call } = await runSingle(context, soloGateway('deterministic'), 'full')
        calls.push(call)
        return { slots, notes: [] }
      })
    },
  },
  {
    id: 'gemini-flash',
    label: `Gemini Flash — whole page (${GEMINI_FLASH})`,
    hypothesis: 'The cheap model writing everything. The arm the platform runs today.',
    requiresProviders: ['gemini'],
    models: [GEMINI_FLASH],
    callsPerFixture: 1,
    run: async (context) => {
      const calls: ArmCall[] = []
      return guard([], calls, async () => {
        const { slots, call } = await withGeminiModel(GEMINI_FLASH, () =>
          runSingle(context, soloGateway('gemini'), 'full'),
        )
        calls.push(call)
        return { slots, notes: [] }
      })
    },
  },
  {
    id: 'gemini-pro',
    label: `Gemini Pro — whole page (${GEMINI_PRO})`,
    hypothesis: 'The expensive model writing everything. The ceiling a single Gemini model can reach.',
    requiresProviders: ['gemini'],
    models: [GEMINI_PRO],
    callsPerFixture: 1,
    run: async (context) => {
      const calls: ArmCall[] = []
      return guard([], calls, async () => {
        const { slots, call } = await withGeminiModel(GEMINI_PRO, () =>
          runSingle(context, soloGateway('gemini'), 'full'),
        )
        calls.push(call)
        return { slots, notes: [] }
      })
    },
  },
  {
    id: 'orchestrated-pro-flash',
    label: `Orchestrated — Pro hero + Flash body + Pro critique`,
    hypothesis:
      'THE HYPOTHESIS UNDER TEST. Spend the expensive model only where one sentence carries the page, let the cheap model fill the rest, then let the expensive model read the whole thing once. If this does not beat plain Pro, orchestration is buying nothing here.',
    requiresProviders: ['gemini'],
    models: [GEMINI_PRO, GEMINI_FLASH],
    callsPerFixture: 3,
    run: (context) => runOrchestrated(context, GEMINI_PRO, GEMINI_FLASH),
  },
  {
    id: 'anthropic-sonnet',
    label: 'Claude Sonnet — whole page (claude-sonnet-5)',
    hypothesis:
      'A second vendor, so the comparison is not four Gemini models grading each other. Configured and costed; runs the day ANTHROPIC_API_KEY exists.',
    requiresProviders: ['anthropic'],
    models: ['claude-sonnet-5'],
    callsPerFixture: 1,
    run: async (context) => {
      const calls: ArmCall[] = []
      return guard([], calls, async () => {
        const { slots, call } = await runSingle(context, soloGateway('anthropic'), 'full')
        calls.push(call)
        return { slots, notes: [] }
      })
    },
  },
]

/**
 * Which providers report themselves usable right now.
 *
 * Asked of the providers themselves rather than of `process.env`, so the answer
 * is the same one the platform would get.
 */
export function availableProviderIds(): Set<string> {
  const providers = [new GeminiCopyProvider(), new AnthropicCopyProvider(), new DeterministicCopyProvider()]
  return new Set(providers.filter((provider) => provider.isAvailable()).map((provider) => provider.id))
}
