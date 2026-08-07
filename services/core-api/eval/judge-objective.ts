import type { BusinessProfile } from '@platform/schemas'
import { copySlotsSchema } from '../src/lib/ai/copy-contract.js'
import type { CopySlots } from '../src/lib/ai/gateway.js'

/**
 * The objective half of the judging.
 *
 * Everything here is a pure function of (slots, profile, locale). No network, no
 * model, no randomness — so the numbers it produces can be re-derived from the
 * raw JSON of a run months later, and its own unit tests can pin every check
 * with fixed inputs.
 *
 * These checks are deliberately *mechanical*. They do not know what good copy
 * is. What they know is what copy must not be: malformed, off-language,
 * over-length, full of words the prompt forbids, or making a claim the business
 * never gave us. Each check states its own blind spots in the comment above it,
 * and `OBJECTIVE_CHECK_LIMITS` repeats them into the report so a reader is never
 * left guessing what a clean score does and does not prove.
 */

// region Banned language

export interface BannedPhrase {
  phrase: string
  /**
   * `system-prompt` — named verbatim in SYSTEM_PROMPT, so a hit is the model
   * disobeying an explicit instruction.
   * `harness` — filler this harness objects to on the prompt's general "no
   * marketing filler" clause. A hit is evidence, not a rule violation, and is
   * counted separately for exactly that reason.
   */
  source: 'system-prompt' | 'harness'
  locale: 'en' | 'nl' | 'any'
}

/**
 * The first four are quoted from SYSTEM_PROMPT's own list; "in today's
 * fast-paced world" is the fifth. Everything after them is this harness
 * editorialising, which is why the two are never summed into one number.
 */
export const BANNED_PHRASES: BannedPhrase[] = [
  { phrase: 'unlock', source: 'system-prompt', locale: 'en' },
  { phrase: 'elevate', source: 'system-prompt', locale: 'en' },
  { phrase: 'seamless', source: 'system-prompt', locale: 'en' },
  { phrase: 'cutting-edge', source: 'system-prompt', locale: 'en' },
  { phrase: 'cutting edge', source: 'system-prompt', locale: 'en' },
  { phrase: "in today's fast-paced world", source: 'system-prompt', locale: 'en' },

  { phrase: 'empower', source: 'harness', locale: 'en' },
  { phrase: 'leverage', source: 'harness', locale: 'en' },
  { phrase: 'best-in-class', source: 'harness', locale: 'en' },
  { phrase: 'world-class', source: 'harness', locale: 'en' },
  { phrase: 'state-of-the-art', source: 'harness', locale: 'en' },
  { phrase: 'one-stop shop', source: 'harness', locale: 'en' },
  { phrase: 'take it to the next level', source: 'harness', locale: 'en' },
  { phrase: 'game-changing', source: 'harness', locale: 'en' },
  { phrase: 'revolutionise', source: 'harness', locale: 'en' },
  { phrase: 'revolutionize', source: 'harness', locale: 'en' },
  { phrase: 'synergy', source: 'harness', locale: 'en' },
  { phrase: 'passionate about', source: 'harness', locale: 'en' },

  { phrase: 'ontzorgen', source: 'harness', locale: 'nl' },
  { phrase: 'naar een hoger niveau', source: 'harness', locale: 'nl' },
  { phrase: 'op maat gemaakte oplossing', source: 'harness', locale: 'nl' },
  { phrase: 'de beste van nederland', source: 'harness', locale: 'nl' },
  { phrase: 'toonaangevend', source: 'harness', locale: 'nl' },
  { phrase: 'innovatieve oplossingen', source: 'harness', locale: 'nl' },
  { phrase: 'in de snel veranderende wereld', source: 'harness', locale: 'nl' },
]

// endregion

// region Claim vocabulary

/**
 * Words that turn a sentence into a claim a regulator or a competitor could
 * challenge. Presence is not a violation; presence *without* support in the
 * input profile is.
 */
export const CLAIM_TERMS: { term: string; locale: 'en' | 'nl' | 'any' }[] = [
  { term: 'award', locale: 'en' },
  { term: 'awarded', locale: 'en' },
  { term: 'award-winning', locale: 'en' },
  { term: 'certified', locale: 'en' },
  { term: 'certification', locale: 'en' },
  { term: 'accredited', locale: 'en' },
  { term: 'guarantee', locale: 'en' },
  { term: 'guaranteed', locale: 'en' },
  { term: 'warranty', locale: 'en' },
  { term: 'market leader', locale: 'en' },
  { term: 'leading', locale: 'en' },
  { term: 'number one', locale: 'en' },
  { term: 'no. 1', locale: 'en' },
  { term: '#1', locale: 'en' },
  { term: 'iso', locale: 'any' },
  { term: 'trusted by', locale: 'en' },
  { term: 'insured', locale: 'en' },
  { term: 'licensed', locale: 'en' },

  { term: 'gecertificeerd', locale: 'nl' },
  { term: 'certificaat', locale: 'nl' },
  { term: 'keurmerk', locale: 'nl' },
  { term: 'garantie', locale: 'nl' },
  { term: 'gegarandeerd', locale: 'nl' },
  { term: 'marktleider', locale: 'nl' },
  { term: 'award', locale: 'nl' },
  { term: 'bekroond', locale: 'nl' },
  { term: 'erkend', locale: 'nl' },
  { term: 'verzekerd', locale: 'nl' },
  { term: 'prijswinnend', locale: 'nl' },
]

// endregion

// region Shared text extraction

/** Every string in the copy set, paired with the slot path it came from. */
export function copyStrings(slots: CopySlots): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = []

  for (const [key, value] of Object.entries(slots)) {
    if (typeof value === 'string') {
      out.push({ path: key, value })
      continue
    }

    if (!Array.isArray(value)) continue

    value.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return
      for (const [field, fieldValue] of Object.entries(entry as Record<string, unknown>)) {
        if (typeof fieldValue === 'string') out.push({ path: `${key}.${index}.${field}`, value: fieldValue })
      }
    })
  }

  return out
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Word-boundary match, case-insensitive.
 *
 * `\b` is used at both ends, so "unlock" matches "Unlock" and "unlock," but not
 * "unlocked" — a deliberate under-match. Stemming without a dependency would
 * mean hand-rolling one per language, and a stemmer that is wrong in Dutch
 * produces false accusations, which are worse here than misses.
 */
export function containsPhrase(haystack: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(haystack)
}

// endregion

// region Numbers

/**
 * Numeric tokens in a piece of text.
 *
 * Digit runs only. Numbers written as words ("twintig jaar", "twenty years")
 * are invisible to this and are called out as a known miss.
 */
export function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => match[0]!.replace(',', '.'))
}

/**
 * The numbers the business actually gave us.
 *
 * Contact numbers, postcodes and coordinates are stripped out before the set is
 * built. Keeping them in would make "20 years of experience" pass silently
 * because "20" happens to appear in a phone number — a false negative on the
 * single check that most needs to fail loudly. Removing them costs some false
 * positives instead, which is the right side to be wrong on.
 */
export function inputNumberSet(profile: BusinessProfile): Set<string> {
  const scrubbed: unknown = {
    company: profile.company,
    locations: profile.locations.map((location) => ({
      label: location.label,
      street: location.street,
      city: location.city,
      region: location.region,
      country: location.country,
      hours: location.hours,
    })),
    services: profile.services,
    brand: profile.brand,
    reviews: profile.reviews,
    warnings: profile.warnings,
  }

  const numbers = new Set<string>()
  for (const token of extractNumbers(JSON.stringify(scrubbed))) numbers.add(token)

  // Counts the business can legitimately state about itself, derived rather
  // than quoted: "3 reviews", "4 services", "2 locations".
  numbers.add(String(profile.reviews.length))
  numbers.add(String(profile.services.length))
  numbers.add(String(profile.locations.length))

  return numbers
}

/** All input text a claim term could plausibly be supported by. */
export function inputText(profile: BusinessProfile): string {
  return [
    profile.company.name,
    profile.company.legalName,
    profile.company.description,
    profile.company.shortDescription,
    profile.company.industry,
    ...profile.company.categories,
    ...profile.services.flatMap((service) => [service.name, service.description]),
    ...profile.reviews.map((review) => review.text),
    profile.brand.positioning,
    profile.brand.audience,
    ...profile.brand.adjectives,
    ...profile.locations.map((location) => `${location.city} ${location.region} ${location.country}`),
  ].join('\n')
}

// endregion

// region Language

const STOPWORDS: Record<'nl' | 'en', string[]> = {
  nl: ['de', 'het', 'een', 'en', 'van', 'voor', 'met', 'wij', 'uw', 'je', 'ons', 'onze', 'die', 'dat', 'niet', 'aan', 'ook', 'bij', 'wat', 'zijn'],
  en: ['the', 'a', 'an', 'and', 'of', 'for', 'with', 'we', 'your', 'our', 'you', 'that', 'this', 'not', 'to', 'in', 'on', 'is', 'are', 'what'],
}

/**
 * Which of the two supported languages the copy reads as, by stopword density.
 *
 * A crude signal chosen because it needs no dependency and no network. It is
 * reliable on a full page of copy and unreliable on a headline, which is why it
 * is only ever run over the whole concatenated set. `null` means neither
 * language won clearly enough to call.
 */
export function detectLanguage(text: string): { language: 'nl' | 'en' | null; nlHits: number; enHits: number } {
  const words = text.toLowerCase().match(/[a-zà-ÿ']+/g) ?? []
  const counts = new Map<string, number>()
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)

  const hits = (list: string[]) => list.reduce((total, word) => total + (counts.get(word) ?? 0), 0)
  const nlHits = hits(STOPWORDS.nl)
  const enHits = hits(STOPWORDS.en)

  // Ambiguous words ("in", "van"/"a") make small margins meaningless.
  if (nlHits === 0 && enHits === 0) return { language: null, nlHits, enHits }
  if (Math.abs(nlHits - enHits) < 3) return { language: null, nlHits, enHits }

  return { language: nlHits > enHits ? 'nl' : 'en', nlHits, enHits }
}

// endregion

// region The report

export interface Finding {
  /** Slot path the finding was found in, e.g. `heroHeadline` or `faq.1.answer`. */
  path: string
  detail: string
}

export interface ObjectiveReport {
  schemaValid: boolean
  schemaErrors: string[]

  /** Hits on phrases SYSTEM_PROMPT names outright. */
  bannedPromptWords: Finding[]
  /** Hits on filler this harness objects to. Weaker evidence, kept apart. */
  bannedHarnessWords: Finding[]
  /** Words the tenant's own brand profile forbids. */
  prohibitedBrandWords: Finding[]

  /** Digit tokens in the copy with no counterpart in the input profile. */
  unsupportedNumbers: Finding[]
  /** Award / certification / guarantee vocabulary with no support in the input. */
  unsupportedClaims: Finding[]

  /** Slots longer than `copySlotsSchema` allows, with by how much. */
  lengthViolations: Finding[]
  /** Slots the schema permits to be empty that came back empty anyway. */
  emptySlots: string[]

  languageExpected: 'nl' | 'en'
  languageDetected: 'nl' | 'en' | null
  languageMatches: boolean

  /**
   * Every hard violation, summed: schema failure, prompt-named banned words,
   * brand-prohibited words, unsupported numbers, unsupported claims, length
   * overflow, wrong language. Lower is better. Harness-editorial filler is
   * excluded on purpose — this number should only contain things that are
   * defensibly wrong.
   */
  violations: number
}

/** Character budgets, read off `copySlotsSchema` rather than restated. */
const MAX_LENGTHS: Record<string, number> = {
  heroEyebrow: 60,
  heroHeadline: 90,
  heroSubheadline: 240,
  primaryCta: 40,
  secondaryCta: 40,
  servicesHeading: 80,
  servicesIntro: 240,
  featuresHeading: 80,
  aboutHeading: 80,
  aboutBody: 1200,
  ctaHeading: 80,
  ctaBody: 200,
  seoTitle: 60,
  seoDescription: 155,
  'features.title': 60,
  'features.description': 160,
  'faq.question': 140,
  'faq.answer': 500,
}

function maxLengthFor(path: string): number | undefined {
  if (MAX_LENGTHS[path] !== undefined) return MAX_LENGTHS[path]
  // `features.2.title` → `features.title`
  const parts = path.split('.')
  if (parts.length === 3) return MAX_LENGTHS[`${parts[0]}.${parts[2]}`]
  return undefined
}

export function judgeObjective(
  slots: CopySlots,
  profile: BusinessProfile,
  locale: string,
): ObjectiveReport {
  const expected: 'nl' | 'en' = locale.toLowerCase().startsWith('nl') ? 'nl' : 'en'
  const strings = copyStrings(slots)
  const allText = strings.map((entry) => entry.value).join('\n')

  const parsed = copySlotsSchema.safeParse(slots)
  const schemaErrors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)

  // Banned language.
  const bannedPromptWords: Finding[] = []
  const bannedHarnessWords: Finding[] = []
  for (const entry of strings) {
    for (const banned of BANNED_PHRASES) {
      if (banned.locale !== 'any' && banned.locale !== expected) continue
      if (!containsPhrase(entry.value, banned.phrase)) continue
      const finding: Finding = { path: entry.path, detail: `"${banned.phrase}"` }
      if (banned.source === 'system-prompt') bannedPromptWords.push(finding)
      else bannedHarnessWords.push(finding)
    }
  }

  // Brand-level prohibitions, which are per-tenant rather than global.
  const prohibitedBrandWords: Finding[] = []
  for (const entry of strings) {
    for (const word of profile.brand.prohibitedWords) {
      if (!word.trim()) continue
      if (containsPhrase(entry.value, word.trim())) {
        prohibitedBrandWords.push({ path: entry.path, detail: `brand-prohibited "${word}"` })
      }
    }
  }

  // Numbers with no counterpart in the input.
  const known = inputNumberSet(profile)
  const unsupportedNumbers: Finding[] = []
  for (const entry of strings) {
    for (const token of extractNumbers(entry.value)) {
      if (known.has(token)) continue
      unsupportedNumbers.push({ path: entry.path, detail: `number "${token}" is not in the input profile` })
    }
  }

  // Claim vocabulary with no support in the input.
  const supportText = inputText(profile)
  const unsupportedClaims: Finding[] = []
  for (const entry of strings) {
    for (const claim of CLAIM_TERMS) {
      if (claim.locale !== 'any' && claim.locale !== expected) continue
      if (!containsPhrase(entry.value, claim.term)) continue
      if (containsPhrase(supportText, claim.term)) continue
      unsupportedClaims.push({ path: entry.path, detail: `claim "${claim.term}" has no support in the input profile` })
    }
  }

  // Length.
  const lengthViolations: Finding[] = []
  const emptySlots: string[] = []
  for (const entry of strings) {
    const max = maxLengthFor(entry.path)
    if (max !== undefined && entry.value.length > max) {
      lengthViolations.push({ path: entry.path, detail: `${entry.value.length} chars, limit ${max}` })
    }
    if (entry.value.trim().length === 0) emptySlots.push(entry.path)
  }

  const detection = detectLanguage(allText)
  const languageMatches = detection.language === expected

  const violations =
    (parsed.success ? 0 : 1) +
    bannedPromptWords.length +
    prohibitedBrandWords.length +
    unsupportedNumbers.length +
    unsupportedClaims.length +
    lengthViolations.length +
    (languageMatches ? 0 : 1)

  return {
    schemaValid: parsed.success,
    schemaErrors,
    bannedPromptWords,
    bannedHarnessWords,
    prohibitedBrandWords,
    unsupportedNumbers,
    unsupportedClaims,
    lengthViolations,
    emptySlots,
    languageExpected: expected,
    languageDetected: detection.language,
    languageMatches,
    violations,
  }
}

/**
 * What a clean objective score does NOT prove.
 *
 * Printed verbatim into every report, because the failure mode of this harness
 * is somebody reading "0 violations" as "safe to publish".
 */
export const OBJECTIVE_CHECK_LIMITS: string[] = [
  'Invented facts stated without digits are invisible. "Decennialange ervaring", "years of experience", "a team of experts" carry no numeric token and pass the number check untouched.',
  'The number check compares digit tokens, not meaning. "Open 7 days" passes if any 7 appears anywhere in the profile — a service price, a house number, an opening hour. It catches fabrication that invents a *new* number, not fabrication that reuses one.',
  'Phone numbers, postcodes and coordinates are deliberately excluded from the supported-number set, so a genuine reference to them is reported as unsupported. Those false positives are the price of not silently passing "20 years" because of a 020 area code.',
  'The claim check is a keyword list. A model that implies certification without using a listed word ("we work to the national standard") is not caught, and a model quoting a claim term that appears anywhere in the profile is passed even if it attaches it to the wrong service.',
  'Banned-word matching is whole-word and unstemmed. "Unlocking" and "elevated" are missed.',
  'Language detection is a stopword-density heuristic over the whole copy set. It can call a two-word-per-slot output wrong, and it cannot detect a fluent-but-wrong register, Flemish vs Dutch, or a single English sentence inside Dutch copy.',
  'No check here reads for truth. A model can attribute a real service to the wrong business, invert an opening hour, or promise a response time nobody agreed to, and score zero violations.',
  'Nothing here measures whether the copy is any good. That is what the rubric pass is for, and the rubric pass is subjective.',
]
