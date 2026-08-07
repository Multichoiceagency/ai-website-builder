/**
 * WCAG 2.1 contrast.
 *
 * This is the hard gate for every palette this package generates. A theme may
 * be overridden into an unreadable state by a human who insists — but nothing
 * generated here is allowed to emit a failing pair silently. `ensureContrast`
 * walks lightness until the pair passes rather than returning a warning nobody
 * reads.
 */

import { clamp, hexToOklch, oklchToHex, isHexColor } from './color.js'

// region Thresholds

/** Body text, WCAG 2.1 SC 1.4.3. */
export const AA_BODY = 4.5
/** Text ≥ 24px, or ≥ 18.66px bold. WCAG 2.1 SC 1.4.3. */
export const AA_LARGE = 3
/** Borders, icons, form outlines. WCAG 2.1 SC 1.4.11. */
export const AA_UI = 3
/** Body text at the enhanced level, SC 1.4.6. */
export const AAA_BODY = 7
/** Large text at the enhanced level, SC 1.4.6. */
export const AAA_LARGE = 4.5

export type ContrastUsage = 'body' | 'large' | 'ui'

export const MINIMUM_FOR_USAGE: Record<ContrastUsage, number> = {
  body: AA_BODY,
  large: AA_LARGE,
  ui: AA_UI,
}

// endregion

// region Ratio

/**
 * WCAG 2.1 relative luminance.
 *
 * Note the 0.03928 knee: that is the value the WCAG text specifies, and it is
 * what every published reference ratio was computed against. The sRGB standard
 * itself says 0.04045; using it here would drift the third decimal away from
 * the numbers auditors check against.
 */
export function relativeLuminance(hex: string): number {
  if (!isHexColor(hex)) throw new Error(`Not a #rrggbb colour: ${hex}`)
  const value = hex.slice(1)

  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Ratio between 1 (identical) and 21 (black on white). Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsContrast(foreground: string, background: string, minimum: number): boolean {
  // Round to two places first: 4.4996 is 4.5 to every checker a user will run,
  // and failing it would send them chasing a difference they cannot see.
  return Math.round(contrastRatio(foreground, background) * 100) / 100 >= minimum
}

// endregion

// region Repair

const LIGHTNESS_STEP = 0.004
const LIGHTNESS_FLOOR = 0.0
const LIGHTNESS_CEILING = 1.0

/**
 * Return `foreground` if it already clears `minimum` against `background`,
 * otherwise the nearest colour of the same hue that does.
 *
 * Only lightness moves. Hue and chroma are the parts a designer picked on
 * purpose; darkening a brand blue keeps it recognisably that blue, while
 * desaturating it does not. Direction is chosen by which way has room: away
 * from the background's own lightness.
 */
export function ensureContrast(foreground: string, background: string, minimum: number): string {
  if (meetsContrast(foreground, background, minimum)) return foreground

  const source = hexToOklch(foreground)
  const backgroundIsLight = relativeLuminance(background) > 0.18
  const direction = backgroundIsLight ? -1 : 1

  // Preferred direction first, then the other way — a mid-grey background can
  // be impossible to beat downwards but trivial upwards.
  for (const sign of [direction, -direction]) {
    for (let step = 1; step <= Math.ceil(1 / LIGHTNESS_STEP); step += 1) {
      const lightness = clamp(source.l + sign * step * LIGHTNESS_STEP, LIGHTNESS_FLOOR, LIGHTNESS_CEILING)
      const candidate = oklchToHex({ ...source, l: lightness })
      if (meetsContrast(candidate, background, minimum)) return candidate
      if (lightness === LIGHTNESS_FLOOR || lightness === LIGHTNESS_CEILING) break
    }
  }

  // Nothing of this hue works — this happens against mid-greys, where the
  // maximum achievable ratio is under 4.5 in both directions. Take whichever
  // pure extreme is furthest away and let the report flag it.
  const onBlack = contrastRatio('#000000', background)
  const onWhite = contrastRatio('#ffffff', background)
  return onBlack >= onWhite ? '#000000' : '#ffffff'
}

function inkCandidates(background: string): string[] {
  const { c, h } = hexToOklch(background)
  // A near-white tinted with the fill's own hue reads as part of the same
  // palette; pure white next to a warm brand colour reads as a foreign element.
  // Both pure values stay in the list as the guaranteed fallbacks.
  return [
    oklchToHex({ l: 0.985, c: Math.min(c * 0.08, 0.02), h }),
    oklchToHex({ l: 0.16, c: Math.min(c * 0.18, 0.04), h }),
    '#ffffff',
    '#000000',
  ]
}

/**
 * The text colour to put *on* a filled surface — the "primary foreground"
 * problem.
 */
export function readableInk(background: string, minimum = AA_BODY): string {
  return readableInkFor([background], minimum)
}

/**
 * One ink that works on *every* one of `backgrounds`.
 *
 * A button label has to survive its own hover state. Choosing the ink against
 * the resting fill alone is how a teal button ends up with a readable label
 * that fails the moment the pointer touches it — a bug nobody catches in a
 * static design review.
 */
export function readableInkFor(backgrounds: string[], minimum = AA_BODY): string {
  const first = backgrounds[0]
  if (!first) throw new Error('readableInkFor needs at least one background')

  const candidates = inkCandidates(first)
  const worst = (ink: string) => Math.min(...backgrounds.map((background) => contrastRatio(ink, background)))

  const passing = candidates.filter((ink) => backgrounds.every((bg) => meetsContrast(ink, bg, minimum)))
  if (passing.length) return passing.sort((a, b) => worst(b) - worst(a))[0]!

  // Nothing clears the bar on every background. Return the best available and
  // let the report say so, rather than pretending with a tinted near-miss.
  return worst('#ffffff') >= worst('#000000') ? '#ffffff' : '#000000'
}

/** A filled control: the fill, its hover state, and the ink readable on both. */
export interface Fill {
  fill: string
  hover: string
  ink: string
}

const HOVER_SHIFTS = [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02]

/**
 * Build a button-shaped set of colours that is readable in every state.
 *
 * Three constraints have to hold at once, and satisfying any two of them
 * naively breaks the third:
 *
 * 1. the fill must clear 3:1 against the surface it sits on (SC 1.4.11),
 * 2. some ink must clear 4.5:1 on the fill,
 * 3. that same ink must still clear 4.5:1 on the hover state.
 *
 * So the hover direction is chosen from the *ink*, not from the surface: a
 * dark label wants a lighter hover, a light label a darker one. If no shift
 * satisfies all three, the fill keeps its colour on hover — blocks also move
 * and shadow on hover, so a colour-static hover is a visual compromise, while
 * an unreadable label is a defect.
 */
export function buildFill(fill: string, surface: string, minimum = AA_BODY, uiMinimum = AA_UI): Fill {
  const base = ensureInkable(ensureContrast(fill, surface, uiMinimum), minimum)
  const ink = readableInkFor([base], minimum)
  const lch = hexToOklch(base)
  const inkIsLight = relativeLuminance(ink) > 0.5

  for (const sign of inkIsLight ? [-1, 1] : [1, -1]) {
    for (const shift of HOVER_SHIFTS) {
      const hover = oklchToHex({ ...lch, l: clamp(lch.l + sign * shift) })
      if (!meetsContrast(hover, surface, uiMinimum)) continue
      if (!meetsContrast(ink, hover, minimum)) continue
      return { fill: base, hover, ink }
    }
  }

  return { fill: base, hover: base, ink }
}

/**
 * Nudge a fill until *some* ink can be read on it.
 *
 * There is a narrow band of mid lightnesses where neither black nor white
 * reaches 4.5:1. A brand colour that lands in it cannot carry body-sized text
 * at all, so it gets moved out — darker, because a darker button reads as more
 * deliberate than a paler one.
 */
export function ensureInkable(fill: string, minimum = AA_BODY): string {
  if (meetsContrast(readableInkFor([fill], minimum), fill, minimum)) return fill

  const lch = hexToOklch(fill)
  for (const sign of [-1, 1]) {
    for (let step = 1; step <= Math.ceil(1 / LIGHTNESS_STEP); step += 1) {
      const candidate = oklchToHex({ ...lch, l: clamp(lch.l + sign * step * LIGHTNESS_STEP) })
      if (meetsContrast(readableInkFor([candidate], minimum), candidate, minimum)) return candidate
    }
  }

  return fill
}

// endregion
