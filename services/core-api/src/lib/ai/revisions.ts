import { UnsupportedInstructionError, type RevisionContext, type RevisionField } from './gateway.js'

/**
 * Deterministic copy revision.
 *
 * These are the transforms the platform can carry out with no language model at
 * all. They are real edits, not placeholders: each one rewrites the string it
 * is given by a rule that a human editor would recognise, and each one refuses
 * loudly when the instruction needs judgement it does not have.
 *
 * The refusal is the important half. An instruction like "rewrite this for
 * dentists" cannot be honoured by a rule, and returning the copy unchanged
 * while calling it a suggestion would be a lie — so it throws
 * `UnsupportedInstructionError` and the user is told plainly that it needs a
 * model.
 */

export type TransformId =
  | 'shorten'
  | 'expand'
  | 'sentence-case'
  | 'title-case'
  | 'uppercase'
  | 'lowercase'
  | 'cta'
  | 'clear'
  | 'regenerate'

/** What a user can ask for here, in the words the UI shows them. */
export const SUPPORTED_INSTRUCTIONS = [
  'shorten this / make it punchier',
  'expand the contractions and abbreviations',
  'sentence case, title case, all caps, lowercase',
  'change the button to “…”',
  'clear the eyebrow / secondary button',
  'rewrite this section from the business profile',
]

// region Instruction parsing

interface Keyword {
  transform: TransformId
  words: string[]
}

/**
 * Dutch and English side by side, because the platform's own default locale is
 * Dutch and an editor should not have to think in English to use the feature.
 */
const KEYWORDS: Keyword[] = [
  {
    transform: 'regenerate',
    words: [
      'regenerate', 'rewrite from', 'start over', 'from the business profile', 'from the profile', 'reset the copy',
      'opnieuw genereren', 'opnieuw schrijven', 'herschrijf vanaf', 'vanuit het profiel', 'begin opnieuw',
    ],
  },
  {
    transform: 'clear',
    words: ['clear the', 'empty the', 'blank the', 'remove the', 'delete the', 'leeg de', 'wis de', 'verwijder de'],
  },
  { transform: 'uppercase', words: ['all caps', 'uppercase', 'upper case', 'shout', 'hoofdletters', 'kapitalen'] },
  { transform: 'lowercase', words: ['lowercase', 'lower case', 'kleine letters', 'onderkast'] },
  { transform: 'title-case', words: ['title case', 'titlecase', 'capitalise each', 'capitalize each', 'titelstijl'] },
  {
    transform: 'sentence-case',
    words: ['sentence case', 'sentencecase', 'normal capitalisation', 'normal capitalization', 'zinsstijl', 'normale hoofdletters'],
  },
  {
    transform: 'cta',
    words: [
      'call to action', 'call-to-action', 'cta', 'button', 'the verb', 'button label',
      'knop', 'actieknop', 'buttontekst', 'oproep',
    ],
  },
  {
    transform: 'expand',
    words: [
      'expand', 'longer', 'elaborate', 'more detail', 'flesh out', 'spell out', 'write out',
      'langer', 'uitbreiden', 'uitgebreider', 'meer detail', 'voluit',
    ],
  },
  {
    transform: 'shorten',
    words: [
      'shorten', 'shorter', 'punchier', 'punchy', 'tighten', 'trim', 'concise', 'snappier', 'briefer', 'cut it down',
      'tighter', 'less wordy', 'to the point',
      'korter', 'inkorten', 'bondiger', 'krachtiger', 'strakker', 'beknopt', 'minder woorden',
    ],
  },
]

function normalise(instruction: string): string {
  return instruction.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
}

export function detectTransform(instruction: string): TransformId | null {
  const text = normalise(instruction)
  for (const entry of KEYWORDS) {
    if (entry.words.some((word) => text.includes(word))) return entry.transform
  }
  return null
}

/** Synonyms a user is likely to type for a field, beyond its own label. */
const FIELD_SYNONYMS: Record<string, string[]> = {
  headline: ['headline', 'title', 'heading', 'kop', 'titel'],
  heading: ['heading', 'headline', 'title', 'kop', 'titel'],
  subheadline: ['subheadline', 'subheading', 'subtitle', 'supporting text', 'ondertitel', 'subkop'],
  eyebrow: ['eyebrow', 'kicker', 'bovenkop'],
  intro: ['intro', 'introduction', 'lead', 'inleiding'],
  body: ['body', 'text', 'copy', 'paragraph', 'tekst', 'alinea'],
  primaryLabel: ['primary button', 'main button', 'primary cta', 'primaire knop', 'hoofdknop'],
  secondaryLabel: ['secondary button', 'secondary cta', 'secundaire knop', 'tweede knop'],
  ctaLabel: ['button', 'cta', 'call to action', 'knop'],
  tagline: ['tagline', 'slogan'],
}

function leafKey(path: string): string {
  return path.split('.').at(-1) ?? path
}

/**
 * Which fields the instruction is about.
 *
 * An instruction that names a field ("shorten the subheadline") is scoped to
 * it; one that does not ("make this punchier") falls back to the transform's
 * own natural scope, so "this" means the section's prose rather than its
 * button labels.
 */
export function resolveScope(
  instruction: string,
  fields: RevisionField[],
  transform: TransformId,
): { fields: RevisionField[]; named: boolean } {
  const text = normalise(instruction)

  const named = fields.filter((field) => {
    const key = leafKey(field.path)
    const candidates = [field.label.toLowerCase(), ...(FIELD_SYNONYMS[key] ?? [key.toLowerCase()])]
    return candidates.some((candidate) => candidate.length > 2 && text.includes(candidate))
  })
  if (named.length) return { fields: named, named: true }

  if (transform === 'regenerate') return { fields, named: false }
  if (transform === 'cta') {
    // Only buttons that exist. A section showing one button must not come back
    // showing two because the instruction filled in an empty secondary label.
    return { fields: fields.filter((field) => isCtaField(field) && field.value.trim()), named: false }
  }
  return { fields: fields.filter((field) => !isCtaField(field) && field.value.trim()), named: false }
}

export function isCtaField(field: RevisionField): boolean {
  return /(label|cta)$/i.test(leafKey(field.path))
}

/** `make the button say "Bel ons"` — an explicit target beats any rotation. */
export function explicitTarget(instruction: string): string | null {
  const quoted = instruction.match(/["“”'‘’]([^"“”'‘’]{1,120})["“”'‘’]/)
  if (quoted?.[1]?.trim()) return quoted[1].trim()

  const spoken = instruction.match(/\b(?:say|says|reads?|to|naar|wordt|zeggen)\s+([^".,;]{2,60})$/i)
  const value = spoken?.[1]?.trim()
  if (!value) return null
  // "change the cta to something punchier" is an instruction, not a label.
  if (/\b(something|iets|shorter|korter|punchier|better|beter)\b/i.test(value)) return null
  return value
}

// endregion

// region Text transforms

/** Words that add length without adding meaning. Removing them is a real edit. */
const FILLER = [
  /\bin today'?s (?:fast[- ]paced )?world,?\s*/gi,
  /\bat this point in time\b/gi,
  /\bit is important to note that\s*/gi,
  /\bwe are proud to\s+/gi,
  /\bwe would like to\s+/gi,
  /\b(?:very|really|quite|simply|just|actually|truly|extremely|highly|literally)\s+/gi,
  /\b(?:heel|erg|zeer|gewoon|eigenlijk|natuurlijk|uiteraard|echt)\s+/gi,
]

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwe'll\b/gi, 'we will'],
  [/\bwe've\b/gi, 'we have'],
  [/\bwe're\b/gi, 'we are'],
  [/\byou'll\b/gi, 'you will'],
  [/\byou're\b/gi, 'you are'],
  [/\byou've\b/gi, 'you have'],
  [/\bdon't\b/gi, 'do not'],
  [/\bdoesn't\b/gi, 'does not'],
  [/\bcan't\b/gi, 'cannot'],
  [/\bwon't\b/gi, 'will not'],
  [/\bit's\b/gi, 'it is'],
  [/\blet's\b/gi, 'let us'],
  [/\be\.g\.\s*/gi, 'for example '],
  [/\bi\.e\.\s*/gi, 'that is '],
  [/\betc\.?/gi, 'and so on'],
  [/\bbijv\.\s*/gi, 'bijvoorbeeld '],
  [/\bo\.a\.\s*/gi, 'onder andere '],
  [/\bm\.b\.t\.\s*/gi, 'met betrekking tot '],
  [/\s&\s/g, ' and '],
]

function tidy(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,;:—-]+/, '')
    .trim()
}

function firstSentence(value: string): string {
  const match = value.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim() : value
}

export function shorten(value: string, kind: RevisionField['kind']): string {
  let next = value
  for (const pattern of FILLER) next = next.replace(pattern, ' ')
  next = tidy(next)

  if (kind === 'textarea' && next.length > 90) {
    const opening = firstSentence(next)
    if (opening.length >= 25 && opening.length < next.length) next = opening
  }

  if (kind === 'text' && next.length > 45) {
    // Drop a trailing subordinate clause: "Proper work, delivered on time and
    // finished neatly" → "Proper work".
    const clause = next.match(/^(.{20,}?)\s*[,—–]\s+\S.*$/)
    if (clause?.[1]) next = tidy(clause[1])
  }

  // Sentence-final punctuation on a one-line label reads as a typo.
  if (kind === 'text') next = next.replace(/\.$/, '')

  return next
}

export function expand(value: string): string {
  let next = value
  for (const [pattern, replacement] of CONTRACTIONS) next = next.replace(pattern, replacement)
  return tidy(next)
}

export function sentenceCase(value: string): string {
  const lower = value.trim()
  if (!lower) return lower
  return lower[0]!.toUpperCase() + lower.slice(1).replace(/([.!?]\s+)([a-z])/g, (_, stop, letter: string) => stop + letter.toUpperCase())
}

/** Small words stay lowercase unless they open the line — normal title style. */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'up', 'via',
  'de', 'het', 'een', 'en', 'van', 'voor', 'met', 'op', 'in', 'te', 'bij',
])

export function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && MINOR_WORDS.has(lower)) return lower
      return lower[0] ? lower[0].toUpperCase() + lower.slice(1) : lower
    })
    .join(' ')
}

/**
 * Whole-phrase call-to-action rotations.
 *
 * Phrase level rather than verb level on purpose: swapping the verb of "Vraag
 * een offerte aan" produces broken Dutch, because the verb is separable. A
 * curated rotation can only ever emit a sentence that is already correct.
 */
const CTA_ROTATIONS: Record<string, string[]> = {
  nl: ['Vraag een offerte aan', 'Bel ons', 'Neem contact op', 'Plan een afspraak', 'Bekijk onze diensten'],
  en: ['Request a quote', 'Call us', 'Get in touch', 'Book a call', 'See what we do'],
}

export function rotateCta(value: string, locale: string): string | null {
  const rotation = CTA_ROTATIONS[locale.startsWith('nl') ? 'nl' : 'en']!
  const index = rotation.findIndex((entry) => entry.toLowerCase() === value.trim().toLowerCase())
  if (index === -1) return null
  return rotation[(index + 1) % rotation.length]!
}

// endregion

// region The engine

export interface DeterministicRevision {
  values: Record<string, string>
  notes: string[]
}

/**
 * Apply the instruction, or refuse it.
 *
 * `regenerate` is deliberately absent: it needs the copy composer rather than a
 * string transform, so the provider handles it and everything else lands here.
 */
export function applyDeterministicRevision(context: RevisionContext, transform: TransformId): DeterministicRevision {
  const { fields: scope, named } = resolveScope(context.instruction, context.fields, transform)
  if (!scope.length) {
    throw new UnsupportedInstructionError(
      `This section has no editable copy matching "${context.instruction}".`,
      SUPPORTED_INSTRUCTIONS,
    )
  }

  // Emptying is the one transform that must never be aimed by guesswork.
  if (transform === 'clear' && !named) {
    throw new UnsupportedInstructionError(
      `Say which field to empty, for example: clear the ${context.fields[0]!.label.toLowerCase()}.`,
      SUPPORTED_INSTRUCTIONS,
    )
  }

  const values: Record<string, string> = {}
  const notes: string[] = []

  for (const field of scope) {
    const next = transformField(field, transform, context)
    if (next !== null && next !== field.value) values[field.path] = next
  }

  if (!Object.keys(values).length) {
    if (transform === 'expand') {
      throw new UnsupportedInstructionError(
        'There is nothing here to spell out — writing more copy than the section already contains needs a language model. Configure an AI key, or edit the field directly.',
        SUPPORTED_INSTRUCTIONS,
      )
    }
    notes.push(`Nothing to change: ${scope.map((field) => field.label.toLowerCase()).join(', ')} already reads that way.`)
    return { values, notes }
  }

  notes.push(describe(transform, scope.filter((field) => field.path in values)))
  return { values, notes }
}

function transformField(field: RevisionField, transform: TransformId, context: RevisionContext): string | null {
  switch (transform) {
    case 'shorten':
      return shorten(field.value, field.kind)
    case 'expand':
      return expand(field.value)
    case 'sentence-case':
      return sentenceCase(field.value)
    case 'title-case':
      return titleCase(field.value)
    case 'uppercase':
      return field.value.toUpperCase()
    case 'lowercase':
      return field.value.toLowerCase()
    case 'clear':
      return ''
    case 'cta': {
      const target = explicitTarget(context.instruction)
      if (target) return target
      const rotated = rotateCta(field.value, context.locale)
      if (rotated) return rotated
      throw new UnsupportedInstructionError(
        `Without a language model I can only swap between call-to-action phrases I know, and “${field.value}” is not one of them. Tell me what it should say instead, for example: make the button say “Bel ons”.`,
        SUPPORTED_INSTRUCTIONS,
      )
    }
    default:
      return null
  }
}

const DESCRIPTIONS: Record<TransformId, string> = {
  shorten: 'Cut filler and trailing clauses from',
  expand: 'Wrote out contractions and abbreviations in',
  'sentence-case': 'Set sentence case on',
  'title-case': 'Set title case on',
  uppercase: 'Set upper case on',
  lowercase: 'Set lower case on',
  cta: 'Changed the call to action in',
  clear: 'Emptied',
  regenerate: 'Rewrote',
}

function describe(transform: TransformId, fields: RevisionField[]): string {
  const labels = fields.map((field) => field.label.toLowerCase())
  return `${DESCRIPTIONS[transform]} ${labels.join(', ')}.`
}

// endregion
