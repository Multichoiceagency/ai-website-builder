import type { PaletteRamp, ShadcnTokens, ThemePreset, ThemeTokens } from '@platform/schemas'
import { hexToOklch, oklchToHex } from './color.js'
import { AA_BODY, AA_UI, buildFill, ensureContrast, readableInk } from './contrast.js'
import { generateNeutralRamp, generateRamp } from './ramp.js'

/**
 * The shadcn/ui base themes.
 *
 * Five neutral families and sixteen coloured ones, each with a full light and
 * dark token set under shadcn's own names — `background`, `foreground`, `card`,
 * `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`,
 * `border`, `input`, `ring` — so a preset ported from shadcn is recognisably
 * the same thing.
 *
 * The token *assignments* are shadcn's (background is white in light mode,
 * `muted-foreground` is the mid neutral, `ring` follows `primary`, and so on).
 * The token *values* are generated from each family's canonical seed through
 * our own OKLCH ramp rather than transcribed, which buys two things
 * transcription does not: every value is gamut-safe, and every text pair is
 * run through `ensureContrast` at build time, so the catalogue cannot contain
 * a failing pair. The tests assert exactly that.
 */

// region Family seeds

interface PresetSpec {
  id: string
  label: string
  /** The colour the brand ramp is generated from. */
  seed: string
  /** Which neutral family supplies surfaces, borders and muted text. */
  neutral: string
  family: 'neutral' | 'colour'
}

const NEUTRAL_SEEDS = {
  zinc: '#71717a',
  slate: '#64748b',
  stone: '#78716c',
  gray: '#6b7280',
  neutral: '#737373',
} as const

/** shadcn pairs every coloured theme with the zinc neutrals. */
const DEFAULT_NEUTRAL = NEUTRAL_SEEDS.zinc

const COLOUR_SEEDS: { id: string; label: string; seed: string }[] = [
  { id: 'red', label: 'Red', seed: '#ef4444' },
  { id: 'rose', label: 'Rose', seed: '#f43f5e' },
  { id: 'orange', label: 'Orange', seed: '#f97316' },
  { id: 'amber', label: 'Amber', seed: '#f59e0b' },
  { id: 'yellow', label: 'Yellow', seed: '#eab308' },
  { id: 'green', label: 'Green', seed: '#22c55e' },
  { id: 'emerald', label: 'Emerald', seed: '#10b981' },
  { id: 'teal', label: 'Teal', seed: '#14b8a6' },
  { id: 'cyan', label: 'Cyan', seed: '#06b6d4' },
  { id: 'sky', label: 'Sky', seed: '#0ea5e9' },
  { id: 'blue', label: 'Blue', seed: '#3b82f6' },
  { id: 'indigo', label: 'Indigo', seed: '#6366f1' },
  { id: 'violet', label: 'Violet', seed: '#8b5cf6' },
  { id: 'purple', label: 'Purple', seed: '#a855f7' },
  { id: 'fuchsia', label: 'Fuchsia', seed: '#d946ef' },
  { id: 'pink', label: 'Pink', seed: '#ec4899' },
]

const SPECS: PresetSpec[] = [
  ...(Object.entries(NEUTRAL_SEEDS) as [keyof typeof NEUTRAL_SEEDS, string][]).map(([id, seed]) => ({
    id,
    label: `${id[0]!.toUpperCase()}${id.slice(1)}`,
    seed,
    neutral: seed,
    family: 'neutral' as const,
  })),
  ...COLOUR_SEEDS.map((entry) => ({ ...entry, neutral: DEFAULT_NEUTRAL, family: 'colour' as const })),
]

// endregion

// region Surface lightnesses

/** shadcn light mode grounds on pure white; the tint enters at `muted` and below. */
const LIGHT = { background: 0.9995, muted: 0.968, sunken: 0.938, border: 0.898, lineStrong: 0.78 } as const
const DARK = { background: 0.148, card: 0.205, muted: 0.252, sunken: 0.12, border: 0.288, lineStrong: 0.41 } as const

const STATUS = {
  positive: { h: 149, c: 0.14 },
  warning: { h: 74, c: 0.14 },
  danger: { h: 27, c: 0.17 },
} as const

const LIGHT_STATUS_L = 0.52
const DARK_STATUS_L = 0.76
const ACCENT_HUE_SHIFT = 152

/** Same hue and chroma as `reference`, at a chosen lightness. */
function shadeOf(reference: string, lightness: number): string {
  const { c, h } = hexToOklch(reference)
  return oklchToHex({ l: lightness, c, h })
}

function shade(ramp: PaletteRamp, lightness: number): string {
  return shadeOf(ramp['500'], lightness)
}

function statusColor(kind: keyof typeof STATUS, lightness: number): string {
  return oklchToHex({ l: lightness, c: STATUS[kind].c, h: STATUS[kind].h })
}

/** Only reached for coloured families; neutrals keep a neutral accent. */
function accentRampFor(seed: string): PaletteRamp {
  const { l, c, h } = hexToOklch(seed)
  return generateRamp(oklchToHex({ l, c, h: (h + ACCENT_HUE_SHIFT) % 360 }))
}

// endregion

// region Builders

function buildLight(spec: PresetSpec): ShadcnTokens {
  const brand = generateRamp(spec.seed)
  const neutral = generateNeutralRamp(spec.neutral)

  const background = shade(neutral, LIGHT.background)
  const muted = shade(neutral, LIGHT.muted)
  const border = shade(neutral, LIGHT.border)
  // The synthesised third surface is darker than `muted`, so it — not `muted` —
  // is what every light-mode foreground has to survive.
  const sunken = shade(neutral, LIGHT.sunken)

  const foreground = ensureContrast(neutral['950'], sunken, AA_BODY)
  const mutedForeground = ensureContrast(neutral['600'], sunken, AA_BODY)
  // A neutral theme's primary is the near-black end of its own family — that is
  // what makes Zinc read as Zinc and not as "grey theme with a blue button".
  const primary = buildFill(spec.family === 'neutral' ? neutral['900'] : brand['600'], background)
  const destructive = ensureContrast(statusColor('danger', LIGHT_STATUS_L), sunken, AA_BODY)

  return {
    background,
    foreground,
    card: background,
    cardForeground: foreground,
    popover: background,
    popoverForeground: foreground,
    primary: primary.fill,
    primaryForeground: primary.ink,
    secondary: muted,
    secondaryForeground: ensureContrast(neutral['900'], sunken, AA_BODY),
    muted,
    mutedForeground,
    accent: muted,
    accentForeground: ensureContrast(neutral['900'], sunken, AA_BODY),
    destructive,
    destructiveForeground: readableInk(destructive, AA_BODY),
    border,
    input: border,
    ring: primary.fill,
  }
}

function buildDark(spec: PresetSpec): ShadcnTokens {
  const brand = generateRamp(spec.seed)
  const neutral = generateNeutralRamp(spec.neutral)

  const background = shade(neutral, DARK.background)
  const card = shade(neutral, DARK.card)
  const muted = shade(neutral, DARK.muted)
  const border = shade(neutral, DARK.border)

  // `muted` is the lightest ground anything sits on in dark mode, so it is the
  // background every foreground gets checked against.
  const foreground = ensureContrast(neutral['50'], muted, AA_BODY)
  const primary = buildFill(spec.family === 'neutral' ? neutral['50'] : brand['400'], background)
  const destructive = ensureContrast(statusColor('danger', DARK_STATUS_L), muted, AA_BODY)

  return {
    background,
    foreground,
    card,
    cardForeground: foreground,
    popover: card,
    popoverForeground: foreground,
    primary: primary.fill,
    primaryForeground: primary.ink,
    secondary: muted,
    secondaryForeground: foreground,
    muted,
    mutedForeground: ensureContrast(neutral['400'], muted, AA_BODY),
    accent: muted,
    accentForeground: foreground,
    destructive,
    destructiveForeground: readableInk(destructive, AA_BODY),
    border,
    input: border,
    ring: primary.fill,
  }
}

function buildPreset(spec: PresetSpec): ThemePreset {
  return {
    id: spec.id,
    label: spec.label,
    family: spec.family,
    seed: spec.seed,
    light: buildLight(spec),
    dark: buildDark(spec),
  }
}

// endregion

// region Catalogue

/** All 21 presets, in the order the picker shows them: neutrals, then hues. */
export const THEME_PRESETS: ThemePreset[] = SPECS.map(buildPreset)

export const THEME_PRESET_IDS: string[] = THEME_PRESETS.map((preset) => preset.id)

export function getPreset(id: string): ThemePreset | null {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? null
}

// endregion

// region shadcn names → --site-* tokens

/**
 * Map one shadcn token set onto the semantic tokens the blocks read.
 *
 * Three of ours have no shadcn equivalent and are synthesised:
 *
 * - `surfaceSunken` — shadcn stops at `muted`; a third surface level is what
 *   lets a card inside a section still read as raised.
 * - `lineStrong` — shadcn's `border` is a hairline and rightly exempt from
 *   SC 1.4.11. Control boundaries need 3:1, so they get their own token.
 * - `accent` — shadcn's `accent` is a neutral hover fill, not a brand accent.
 *   Ours is a split-complement of the seed, matching what `generatePalette`
 *   produces, so a preset and a generated palette behave the same downstream.
 */
export function toSiteTokens(preset: ThemePreset, mode: 'light' | 'dark'): ThemeTokens {
  const tokens = mode === 'light' ? preset.light : preset.dark
  const statusL = mode === 'light' ? LIGHT_STATUS_L : DARK_STATUS_L
  const sunkenL = mode === 'light' ? LIGHT.sunken : DARK.sunken
  const strongL = mode === 'light' ? LIGHT.lineStrong : DARK.lineStrong
  // `muted` carries the family's hue and chroma, so the synthesised surfaces
  // stay tinted the same way rather than dropping to flat grey.
  const neutralReference = tokens.muted

  // A neutral preset keeps a neutral accent. Rotating Zinc's hue by 152° would
  // hand it a lilac eyebrow, which is not what anyone picking Zinc asked for.
  const accentSource =
    preset.family === 'neutral'
      ? shadeOf(neutralReference, mode === 'light' ? 0.45 : 0.72)
      : accentRampFor(preset.seed)[mode === 'light' ? '600' : '400']
  const accent = buildFill(accentSource, tokens.background)

  // Rebuilt rather than read off `primary`, because hover is the state the
  // stored `primaryForeground` was already chosen to survive.
  const primary = buildFill(tokens.primary, tokens.background)

  return {
    surface: tokens.background,
    surfaceAlt: tokens.muted,
    surfaceSunken: shadeOf(neutralReference, sunkenL),
    text: tokens.foreground,
    textMuted: tokens.mutedForeground,
    line: tokens.border,
    lineStrong: ensureContrast(shadeOf(neutralReference, strongL), tokens.muted, AA_UI),
    primary: primary.fill,
    primaryHover: primary.hover,
    primaryInk: primary.ink,
    accent: accent.fill,
    accentInk: accent.ink,
    positive: ensureContrast(statusColor('positive', statusL), tokens.muted, AA_BODY),
    warning: ensureContrast(statusColor('warning', statusL), tokens.muted, AA_BODY),
    danger: tokens.destructive,
    focus: tokens.ring,
  }
}

// endregion
