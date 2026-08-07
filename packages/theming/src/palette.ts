import type { Palette, PaletteRamp, ThemeTokens } from '@platform/schemas'
import { hexToOklch, oklchToHex } from './color.js'
import { AA_BODY, AA_UI, buildFill, ensureContrast } from './contrast.js'
import { GREY_CHROMA, generateNeutralRamp, generateRamp } from './ramp.js'

/**
 * Seed colour → complete, contrast-checked palette.
 *
 * The rule this file exists to enforce: nothing leaves here failing WCAG AA.
 * Every text-on-surface pair is run through `ensureContrast`, which moves
 * lightness until the pair passes. That means a customer who picks a pale
 * yellow brand colour gets a *readable* pale-yellow theme rather than a warning
 * dialog they will dismiss and a button nobody can read.
 */

// region Tuning

/** Surfaces sit above the ramp's 50 step — a page ground should be paper, not grey. */
const LIGHT_SURFACE_L = 0.994
const LIGHT_SURFACE_ALT_L = 0.968
const LIGHT_SURFACE_SUNKEN_L = 0.938

const DARK_SURFACE_L = 0.168
const DARK_SURFACE_ALT_L = 0.218
const DARK_SURFACE_SUNKEN_L = 0.126

const LIGHT_LINE_L = 0.888
const LIGHT_LINE_STRONG_L = 0.78
const DARK_LINE_L = 0.288
const DARK_LINE_STRONG_L = 0.4

/** Hues for the status trio, fixed so "danger" is red on every site. */
const STATUS_HUE = { positive: 149, warning: 74, danger: 27 } as const
const STATUS_CHROMA = { positive: 0.14, warning: 0.14, danger: 0.17 } as const
const LIGHT_STATUS_L = 0.52
const DARK_STATUS_L = 0.76

/** Split-complement. A true complement (180°) fights the primary rather than supporting it. */
const ACCENT_HUE_SHIFT = 152

// endregion

// region Seed → palette

export function generatePalette(seed: string): Palette {
  return {
    seed: seed.toLowerCase(),
    brand: generateRamp(seed),
    neutral: generateNeutralRamp(seed),
  }
}

function accentSeed(seed: string): string {
  const { l, c, h } = hexToOklch(seed)
  if (c < GREY_CHROMA) return seed
  return oklchToHex({ l, c, h: (h + ACCENT_HUE_SHIFT) % 360 })
}

function tinted(neutral: PaletteRamp, lightness: number): string {
  const { c, h } = hexToOklch(neutral['500'])
  return oklchToHex({ l: lightness, c, h })
}

function status(kind: keyof typeof STATUS_HUE, lightness: number): string {
  return oklchToHex({ l: lightness, c: STATUS_CHROMA[kind], h: STATUS_HUE[kind] })
}

// endregion

// region Palette → semantic tokens

/**
 * The light half.
 *
 * Order matters: surfaces are decided first because every other decision is
 * "does this read against that surface", and the answer has to be checked
 * against the *worst* surface a token can land on, not the friendliest one.
 */
export function lightTokens(palette: Palette): ThemeTokens {
  const { brand, neutral } = palette
  const accentRamp = generateRamp(accentSeed(palette.seed))

  const surface = tinted(neutral, LIGHT_SURFACE_L)
  const surfaceAlt = tinted(neutral, LIGHT_SURFACE_ALT_L)
  const surfaceSunken = tinted(neutral, LIGHT_SURFACE_SUNKEN_L)

  // Muted text lands on any of the three surfaces, so it is checked against the
  // darkest one. Checking against `surface` alone is how muted labels end up
  // failing inside a card and passing on the page.
  const text = ensureContrast(neutral['950'], surfaceSunken, AA_BODY)
  const textMuted = ensureContrast(neutral['600'], surfaceSunken, AA_BODY)

  const primary = buildFill(brand['600'], surface)
  const accent = buildFill(accentRamp['600'], surface)

  return {
    surface,
    surfaceAlt,
    surfaceSunken,
    text,
    textMuted,
    // A hairline divider is decorative and exempt from 1.4.11; `lineStrong` is
    // the one blocks use for control boundaries, so that is the one gated —
    // against `surfaceAlt`, the harder of the two grounds it can land on.
    line: tinted(neutral, LIGHT_LINE_L),
    lineStrong: ensureContrast(tinted(neutral, LIGHT_LINE_STRONG_L), surfaceAlt, AA_UI),
    primary: primary.fill,
    primaryHover: primary.hover,
    primaryInk: primary.ink,
    accent: accent.fill,
    accentInk: accent.ink,
    positive: ensureContrast(status('positive', LIGHT_STATUS_L), surfaceSunken, AA_BODY),
    warning: ensureContrast(status('warning', LIGHT_STATUS_L), surfaceSunken, AA_BODY),
    danger: ensureContrast(status('danger', LIGHT_STATUS_L), surfaceSunken, AA_BODY),
    focus: ensureContrast(brand['600'], surface, AA_UI),
  }
}

/**
 * The dark half.
 *
 * Not an inversion. A brand colour that works as a 600 on white is too dark to
 * read on near-black, so the dark theme takes its primary from the *light* end
 * of the same ramp — and the ink on that primary flips to dark as a result.
 */
export function darkTokens(palette: Palette): ThemeTokens {
  const { brand, neutral } = palette
  const accentRamp = generateRamp(accentSeed(palette.seed))

  const surface = tinted(neutral, DARK_SURFACE_L)
  const surfaceAlt = tinted(neutral, DARK_SURFACE_ALT_L)
  const surfaceSunken = tinted(neutral, DARK_SURFACE_SUNKEN_L)

  // The lightest surface is the hardest background in dark mode.
  const text = ensureContrast(neutral['50'], surfaceAlt, AA_BODY)
  const textMuted = ensureContrast(neutral['400'], surfaceAlt, AA_BODY)

  const primary = buildFill(brand['400'], surface)
  const accent = buildFill(accentRamp['400'], surface)

  return {
    surface,
    surfaceAlt,
    surfaceSunken,
    text,
    textMuted,
    line: tinted(neutral, DARK_LINE_L),
    lineStrong: ensureContrast(tinted(neutral, DARK_LINE_STRONG_L), surfaceAlt, AA_UI),
    primary: primary.fill,
    primaryHover: primary.hover,
    primaryInk: primary.ink,
    accent: accent.fill,
    accentInk: accent.ink,
    positive: ensureContrast(status('positive', DARK_STATUS_L), surfaceAlt, AA_BODY),
    warning: ensureContrast(status('warning', DARK_STATUS_L), surfaceAlt, AA_BODY),
    danger: ensureContrast(status('danger', DARK_STATUS_L), surfaceAlt, AA_BODY),
    focus: ensureContrast(brand['400'], surface, AA_UI),
  }
}

export interface GeneratedPalette {
  palette: Palette
  light: ThemeTokens
  dark: ThemeTokens
}

/** One seed in, both modes out, everything already contrast-checked. */
export function generateThemeTokens(seed: string): GeneratedPalette {
  const palette = generatePalette(seed)
  return { palette, light: lightTokens(palette), dark: darkTokens(palette) }
}

// endregion
