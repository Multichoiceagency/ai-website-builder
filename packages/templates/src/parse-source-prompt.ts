/**
 * Extract theme-steering hints from a MotionSites `sourcePrompt`.
 *
 * Output is tokens and plain-language constraints only — never markup, never
 * React source (ADR-0003). Callers map fonts/colours onto site theme props and
 * fold spacing hints into the copy/design brief.
 */

export interface SourcePromptDesignHints {
  /** Display / heading face when the prompt names one. */
  fontHeading?: string
  /** Body / UI face when the prompt names one. */
  fontBody?: string
  /** Distinct `#rrggbb` colours found in the prompt (order preserved). */
  colors: string[]
  /** Best guess for theme `colorPrimary` (labelled primary/cta, else first vivid). */
  primaryHint?: string
  /** Best guess for theme `colorAccent` (labelled accent/secondary/cta). */
  accentHint?: string
  /**
   * Plain-language spacing/breakpoint reminders for the brief, e.g.
   * "respect MotionSites spacing: px-6 sm:px-10 lg:px-16".
   */
  spacingConstraints: string[]
}

/** Cap so briefs stay within typical LLM context budgets. */
export const SOURCE_PROMPT_BRIEF_MAX = 6000

const GENERIC_FACES = new Set(
  [
    'sans-serif',
    'serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
    'emoji',
    'math',
    'fangsong',
    'inherit',
    'initial',
    'unset',
    'arial',
    'helvetica',
    'times',
    'times new roman',
    'georgia',
    'verdana',
    'tahoma',
    'courier',
    'courier new',
    'segoe ui',
    'roboto',
    'oxygen',
    'ubuntu',
    'cantarell',
    'blinkmacsystemfont',
    '-apple-system',
  ].map((name) => name.toLowerCase()),
)

/** Well-known Google / design faces that appear in MotionSites briefs. */
const KNOWN_FACES = [
  'Playfair Display',
  'Cormorant Garamond',
  'Instrument Serif',
  'Instrumental Serif',
  'Source Serif',
  'Source Sans',
  'IBM Plex Sans',
  'IBM Plex Serif',
  'IBM Plex Mono',
  'Space Grotesk',
  'Space Mono',
  'DM Sans',
  'DM Serif Display',
  'DM Serif Text',
  'Noto Sans',
  'Noto Serif',
  'Open Sans',
  'Work Sans',
  'PT Sans',
  'PT Serif',
  'Fira Sans',
  'Fira Code',
  'JetBrains Mono',
  'Red Hat Display',
  'Red Hat Text',
  'Exo 2',
  'Almarai',
  'Orbitron',
  'Barlow',
  'Kanit',
  'Figtree',
  'Rubik',
  'Inter',
  'Manrope',
  'Sora',
  'Outfit',
  'Syne',
  'Archivo',
  'Poppins',
  'Montserrat',
  'Raleway',
  'Lato',
  'Nunito',
  'Oswald',
  'Roboto Slab',
  'Merriweather',
  'Libre Baskerville',
  'Libre Franklin',
  'Josefin Sans',
  'Quicksand',
  'Mulish',
  'Cabin',
  'Karla',
  'Inconsolata',
  'Pacifico',
  'Lobster',
  'Bebas Neue',
  'Anton',
  'Abril Fatface',
  'Cormorant',
  'Lora',
  'Crimson Text',
  'Crimson Pro',
]

function expandHex(raw: string): string | null {
  const value = raw.replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value.toLowerCase()}`
  return null
}

function normaliseFace(raw: string): string | null {
  let name = raw
    .replace(/[_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,.*$/, '')
    .replace(/\bitalic\b/gi, '')
    .replace(/\b(weights?|wght|ital)\b.*$/i, '')
    .trim()

  if (!name || name.length < 2 || name.length > 60) return null
  if (GENERIC_FACES.has(name.toLowerCase())) return null
  if (!/^[A-Za-z][A-Za-z0-9 -]*$/.test(name)) return null

  // Title-case known faces; keep multi-word casing from the prompt otherwise.
  const known = KNOWN_FACES.find((face) => face.toLowerCase() === name.toLowerCase())
  if (known) return known === 'Instrumental Serif' ? 'Instrument Serif' : known

  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function extractFonts(prompt: string): { heading?: string; body?: string; all: string[] } {
  const found: string[] = []
  const push = (raw: string | undefined) => {
    if (!raw) return
    const face = normaliseFace(raw)
    if (!face) return
    if (!found.some((entry) => entry.toLowerCase() === face.toLowerCase())) found.push(face)
  }

  // Role-labelled pairs (prefer these for heading/body mapping).
  const rolePatterns: Array<{ re: RegExp; role: 'heading' | 'body' }> = [
    {
      role: 'heading',
      re: /(?:display|heading|headline|wordmark|title|font-heading|fontHeading|--font-display|--font-heading)[^:\n]{0,40}[:→=]\s*\*{0,2}([A-Za-z][A-Za-z0-9 _+-]*)/gi,
    },
    { role: 'heading', re: /Heading\s+\*\*([^*]+)\*\*/gi },
    {
      role: 'body',
      re: /(?:body|ui|nav|label|font-body|fontBody|--font-body)[^:\n]{0,40}[:→=]\s*\*{0,2}([A-Za-z][A-Za-z0-9 _+-]*)/gi,
    },
    { role: 'body', re: /Body\s+\*\*([^*]+)\*\*/gi },
  ]

  let heading: string | undefined
  let body: string | undefined

  for (const { re, role } of rolePatterns) {
    for (const match of prompt.matchAll(re)) {
      const face = normaliseFace(match[1] ?? '')
      if (!face) continue
      push(face)
      if (role === 'heading' && !heading) heading = face
      if (role === 'body' && !body) body = face
    }
  }

  // Google Fonts URL / family= fragments.
  for (const match of prompt.matchAll(/family=([A-Za-z0-9_+%-]+)/gi)) {
    push(decodeURIComponent((match[1] ?? '').split(':')[0] ?? ''))
  }

  // Quoted font-family / Tailwind arbitrary font names.
  for (const match of prompt.matchAll(/font(?:Family|-family)?\s*[:=]\s*["']([^"']+)["']/gi)) {
    for (const part of (match[1] ?? '').split(',')) push(part)
  }
  for (const match of prompt.matchAll(/font-\[["']?([^\]"']+)["']?\]/gi)) {
    push(match[1])
  }
  for (const match of prompt.matchAll(/\*\*([A-Za-z][A-Za-z0-9 ]{1,40})\*\*/g)) {
    const candidate = match[1] ?? ''
    if (KNOWN_FACES.some((face) => face.toLowerCase() === candidate.toLowerCase())) push(candidate)
  }
  for (const face of KNOWN_FACES) {
    const re = new RegExp(`\\b${face.replace(/ /g, '[ _]')}\\b`, 'i')
    if (re.test(prompt)) push(face)
  }

  if (!heading && found[0]) heading = found[0]
  if (!body && found[1]) body = found[1]
  if (!body && heading) body = heading

  return { heading, body, all: found }
}

function extractColors(prompt: string): {
  colors: string[]
  primaryHint?: string
  accentHint?: string
} {
  const colors: string[] = []
  const push = (hex: string | null) => {
    if (!hex) return
    if (!colors.includes(hex)) colors.push(hex)
  }

  for (const match of prompt.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    push(expandHex(match[0] ?? ''))
  }

  const labelled = (label: RegExp): string | undefined => {
    const match = prompt.match(label)
    return match?.[1] ? expandHex(match[1]) ?? undefined : undefined
  }

  const primaryHint =
    labelled(/(?:primary|cta)\s*[:`]?\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/i) ??
    labelled(/bg-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]/i) ??
    colors.find((hex) => hex !== '#000000' && hex !== '#ffffff')

  const accentHint =
    labelled(/(?:accent|secondary|cta)\s*[:`]?\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/i) ??
    colors.find((hex) => hex !== primaryHint && hex !== '#000000' && hex !== '#ffffff')

  return { colors, primaryHint, accentHint }
}

function extractSpacing(prompt: string): string[] {
  const tokens = new Set<string>()

  for (const match of prompt.matchAll(
    /\b(?:sm|md|lg|xl|2xl):(?:text-\[[^\]]+\]|text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)|[mp][xyltrb]?-\d+|px-\d+|py-\d+|p-\d+|gap-\d+|flex|block|hidden|grid)\b/g,
  )) {
    tokens.add(match[0]!)
  }

  for (const match of prompt.matchAll(/\b(?:px|py|p|pt|pb|pl|pr|mx|my|m|mt|mb|ml|mr|gap)-(?:\d+|\[([^\]]+)\])\b/g)) {
    tokens.add(match[0]!)
  }

  // Keep the brief readable — top unique tokens only.
  const list = [...tokens].slice(0, 24)
  if (!list.length) return []

  return [`Respect MotionSites spacing and breakpoints: ${list.join(', ')}.`]
}

/**
 * Parse a MotionSites source prompt into theme-steering hints.
 * Empty / missing prompts yield empty hints (callers keep brand defaults).
 */
export function parseSourcePrompt(sourcePrompt: string | undefined | null): SourcePromptDesignHints {
  const prompt = sourcePrompt?.trim() ?? ''
  if (!prompt) {
    return { colors: [], spacingConstraints: [] }
  }

  const fonts = extractFonts(prompt)
  const colors = extractColors(prompt)
  const spacingConstraints = extractSpacing(prompt)

  return {
    fontHeading: fonts.heading,
    fontBody: fonts.body,
    colors: colors.colors,
    primaryHint: colors.primaryHint,
    accentHint: colors.accentHint,
    spacingConstraints,
  }
}

/** Truncate a source prompt for inclusion in an AI brief. */
export function truncateSourcePrompt(sourcePrompt: string, max = SOURCE_PROMPT_BRIEF_MAX): string {
  const trimmed = sourcePrompt.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}
