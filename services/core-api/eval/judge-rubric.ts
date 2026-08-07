import type { BusinessProfile } from '@platform/schemas'
import { z } from 'zod'
import type { CopySlots } from '../src/lib/ai/gateway.js'
import { costOf } from './models.js'

/**
 * The subjective half of the judging, and the half you should trust least.
 *
 * READ THIS BEFORE QUOTING A RUBRIC NUMBER.
 *
 * This asks a Gemini model to rank copy, and three of the four arms it ranks
 * are Gemini output. That is not neutral evidence. A model has a documented
 * tendency to prefer text that looks like its own, and nothing in this file
 * corrects for it — it cannot be corrected for from inside the same vendor. The
 * rubric is here because "which one reads better" is a real question that no
 * mechanical check answers, not because its answer is impartial.
 *
 * Two things are done to make it less bad, neither of which makes it good:
 *
 * 1. The judge is blinded. Candidates are labelled A, B, C… in a seeded shuffle
 *    and the model is never told which model wrote which, so it cannot simply
 *    reward the name it recognises. The mapping is kept in the raw JSON.
 * 2. All arms for a fixture are graded in one call, so the scores are relative
 *    to each other rather than to a remembered scale from a previous call.
 *
 * Rubric scores are never averaged into the objective violation counts. A
 * single blended "quality score" would launder a self-referential opinion into
 * something that looks like a measurement, which is the specific failure this
 * harness exists to avoid.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export const RUBRIC_SYSTEM_PROMPT = `You are grading website copy written for a real small business, for the business owner's benefit.

You will see the business facts, then several candidate copy sets for the same business, labelled A, B, C and so on. You do not know who or what wrote any of them. Judge only the text.

Score each candidate on three axes, 1 to 5:

heroStrength — does the hero say what this business does or what the customer gets, in a way a real person would say it? 5 is a line the owner would be glad to put on a van. 1 is a line that could belong to any business in any industry.

specificity — how much of this copy could only have been written about THIS business? 5 means the services, the place and the way they work are visible in the words. 1 means it is filler that would survive a find-and-replace of the company name.

toneMatch — does it match the requested tone and the language it was asked for, consistently across every section? 5 is one voice throughout. 1 is a register that lurches, or drifts into marketing-speak the brief ruled out.

Be a hard marker. 3 is competent and unremarkable; most copy is a 3. Reserve 5 for copy you would not change.

Give one short, concrete reason per candidate that names the specific line you are reacting to. Do not praise a candidate for a fact you cannot see in the business profile — if a candidate states something that is not in the facts, say so and mark it down for specificity.`

const scoreSchema = z.object({
  candidate: z.string(),
  heroStrength: z.number().min(1).max(5),
  specificity: z.number().min(1).max(5),
  toneMatch: z.number().min(1).max(5),
  reason: z.string().max(600),
})

const rubricResponseSchema = z.object({
  scores: z.array(scoreSchema).min(1),
})

const RUBRIC_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scores: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          candidate: { type: 'STRING' },
          heroStrength: { type: 'NUMBER' },
          specificity: { type: 'NUMBER' },
          toneMatch: { type: 'NUMBER' },
          reason: { type: 'STRING' },
        },
        required: ['candidate', 'heroStrength', 'specificity', 'toneMatch', 'reason'],
        propertyOrdering: ['candidate', 'heroStrength', 'specificity', 'toneMatch', 'reason'],
      },
    },
  },
  required: ['scores'],
}

/**
 * A tiny, seeded PRNG so the blinding shuffle is reproducible from the run's
 * seed alone. Re-running a report against the raw JSON must land on the same
 * candidate letters.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic Fisher–Yates. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  const random = mulberry32(seed)
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[out[index], out[swap]] = [out[swap]!, out[index]!]
  }
  return out
}

/** `0 → A`, `25 → Z`, `26 → AA`. */
export function candidateLabel(index: number): string {
  let label = ''
  let value = index
  do {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  } while (value >= 0)
  return label
}

export interface RubricCandidate {
  armId: string
  slots: CopySlots
}

export interface RubricScore {
  armId: string
  /** The blind label this arm was shown under. */
  candidate: string
  heroStrength: number
  specificity: number
  toneMatch: number
  reason: string
}

export interface RubricOutcome {
  status: 'ok' | 'skipped' | 'failed'
  reason?: string
  model: string
  scores: RubricScore[]
  /** Blind label → arm id, so a reader can check the judge was not told. */
  blinding: Record<string, string>
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
}

/** The facts the judge is allowed to check specificity against. */
function judgeFacts(profile: BusinessProfile, locale: string, tone: string) {
  return {
    name: profile.company.name,
    description: profile.company.description,
    industry: profile.company.industry,
    city: profile.locations[0]?.city ?? '',
    services: profile.services.map((service) => ({ name: service.name, description: service.description })),
    foundedYear: profile.company.foundedYear ?? null,
    reviewCount: profile.reviews.length,
    prohibitedWords: profile.brand.prohibitedWords,
    tone,
    language: locale,
  }
}

export async function judgeRubric(input: {
  profile: BusinessProfile
  locale: string
  candidates: RubricCandidate[]
  model: string
  /** Seed for the blinding shuffle. Same seed, same letters. */
  seed: number
}): Promise<RubricOutcome> {
  const apiKey = process.env.GEMINI_API_KEY
  const empty = {
    model: input.model,
    scores: [] as RubricScore[],
    blinding: {} as Record<string, string>,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    latencyMs: 0,
  }

  if (!apiKey || !apiKey.trim()) {
    return { ...empty, status: 'skipped', reason: 'GEMINI_API_KEY is not configured, so no model can grade.' }
  }
  if (input.candidates.length < 2) {
    return { ...empty, status: 'skipped', reason: 'Fewer than two arms produced copy; there is nothing to compare.' }
  }

  const shuffled = seededShuffle(input.candidates, input.seed)
  const blinding: Record<string, string> = {}
  const labelled = shuffled.map((candidate, index) => {
    const label = candidateLabel(index)
    blinding[label] = candidate.armId
    return { label, candidate }
  })

  const body = [
    `Business facts:\n${JSON.stringify(judgeFacts(input.profile, input.locale, input.profile.brand.tone), null, 2)}`,
    '',
    'Candidates:',
    ...labelled.map(({ label, candidate }) => `\n--- Candidate ${label} ---\n${JSON.stringify(candidate.slots, null, 2)}`),
    '',
    `Score every candidate: ${labelled.map((entry) => entry.label).join(', ')}.`,
  ].join('\n')

  const started = Date.now()

  try {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(input.model)}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Header, never the query string.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RUBRIC_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: body }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RUBRIC_RESPONSE_SCHEMA,
          maxOutputTokens: 8192,
        },
      }),
    })

    // Status only: a Gemini error body can quote the request back.
    if (!response.ok) {
      return { ...empty, status: 'failed', reason: `Judge model returned ${response.status}`, blinding }
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
    }

    const text = (payload.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('').trim()
    if (!text) return { ...empty, status: 'failed', reason: 'Judge returned no structured output.', blinding }

    const parsed = rubricResponseSchema.parse(JSON.parse(text))

    const inputTokens = payload.usageMetadata?.promptTokenCount ?? 0
    const outputTokens =
      (payload.usageMetadata?.candidatesTokenCount ?? 0) + (payload.usageMetadata?.thoughtsTokenCount ?? 0)

    const scores: RubricScore[] = []
    for (const score of parsed.scores) {
      const armId = blinding[score.candidate.trim().toUpperCase()]
      // A label the judge invented is dropped rather than guessed at.
      if (!armId) continue
      scores.push({
        armId,
        candidate: score.candidate.trim().toUpperCase(),
        heroStrength: score.heroStrength,
        specificity: score.specificity,
        toneMatch: score.toneMatch,
        reason: score.reason,
      })
    }

    return {
      status: 'ok',
      model: input.model,
      scores,
      blinding,
      inputTokens,
      outputTokens,
      costUsd: costOf(input.model, inputTokens, outputTokens),
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    return {
      ...empty,
      status: 'failed',
      blinding,
      latencyMs: Date.now() - started,
      // Message only — never the model's text, which is about a real business.
      reason: error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown judge failure',
    }
  }
}

/** Stated in the report, next to every rubric table. */
export const RUBRIC_CAVEATS: string[] = [
  'A Gemini model graded these candidates, and most of these candidates are Gemini output. This is a vendor grading itself. Treat rubric numbers as one opinion, not as evidence.',
  'Rubric scores are NOT combined with the objective violation counts anywhere in this report. A single blended score would make a self-referential opinion look like a measurement.',
  'The judge is blinded — candidates are shuffled and labelled A, B, C with a seeded shuffle, and the model is never told which model wrote which. The mapping is in the raw JSON.',
  'Blinding does not remove self-preference. A model can still favour its own phrasing without being told whose it is.',
  'One judging call per fixture, one sample. No repeats, no cross-model panel, no confidence interval. A difference of half a point between two arms is noise.',
  'The judge sees more of the business profile than the writing models did — writers get distillFacts(), the judge gets a fuller fact set. That is deliberate, so it can catch invented facts, but it means the judge can penalise a writer for omitting something the writer never saw.',
]
