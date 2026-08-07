import { PALETTE_STEPS, type PaletteRamp, type PaletteStep } from '@platform/schemas'
import { hexToOklch, oklchToHex } from './color.js'

/**
 * Ramp generation.
 *
 * A ramp is eleven steps of one hue at fixed perceptual lightnesses. Because
 * the lightness targets are OKLCH L values, step 600 of a yellow ramp is as
 * dark as step 600 of a blue one — which is the entire point, and the thing
 * HSL-based ramps get wrong badly enough that yellow buttons ship unreadable.
 */

/**
 * Lightness per step, in OKLCH L.
 *
 * Spaced to be visually even rather than arithmetically even: the eye resolves
 * far more difference at the light end, so 50→100 is a smaller L jump than
 * 800→900 despite reading as the same size of change.
 */
const LIGHTNESS: Record<PaletteStep, number> = {
  50: 0.971,
  100: 0.936,
  200: 0.885,
  300: 0.808,
  400: 0.712,
  500: 0.637,
  600: 0.567,
  700: 0.497,
  800: 0.434,
  900: 0.379,
  950: 0.264,
}

/**
 * Chroma multiplier per step, relative to the seed's chroma.
 *
 * Saturation has to fall away at both ends or the ramp stops working: a 50 with
 * full chroma is a highlighter, and a 950 with full chroma turns muddy because
 * there is no gamut left down there to hold it.
 */
const CHROMA: Record<PaletteStep, number> = {
  50: 0.11,
  100: 0.2,
  200: 0.38,
  300: 0.6,
  400: 0.85,
  500: 0.98,
  600: 1,
  700: 0.94,
  800: 0.84,
  900: 0.75,
  950: 0.55,
}

/**
 * Below this the seed is a neutral and the ramp stays neutral.
 *
 * The threshold sits above the Tailwind grey families (zinc 0.014, stone 0.012,
 * gray 0.023) on purpose: someone who picks a warm grey wants a warm grey
 * theme, not the saturated version of it that a naive minimum-chroma floor
 * would hand them.
 */
export const GREY_CHROMA = 0.03
/** Enough colour that a "blue" ramp reads as blue even from a washed-out seed. */
const MIN_BRAND_CHROMA = 0.07
/** Beyond this, ramps stop being usable as UI surfaces. */
const MAX_BRAND_CHROMA = 0.21

function rampFrom(hue: number, chroma: number): PaletteRamp {
  const entries = PALETTE_STEPS.map((step) => [
    String(step),
    oklchToHex({ l: LIGHTNESS[step], c: chroma * CHROMA[step], h: hue }),
  ])
  return Object.fromEntries(entries) as PaletteRamp
}

/**
 * Build an eleven-step ramp from any seed colour.
 *
 * The seed contributes hue and chroma; its lightness is discarded, because the
 * whole ramp's job is to supply lightnesses the seed does not have. A seed that
 * is nearly grey produces a nearly grey ramp — that is a legitimate choice
 * (see the Zinc/Slate/Stone presets), not an input to be "fixed".
 */
export function generateRamp(seed: string): PaletteRamp {
  const { c, h } = hexToOklch(seed)
  if (c < GREY_CHROMA) return rampFrom(h, c)
  return rampFrom(h, Math.min(Math.max(c, MIN_BRAND_CHROMA), MAX_BRAND_CHROMA))
}

/**
 * The matching neutral ramp: the same hue at a trace of chroma.
 *
 * Fully desaturated greys next to a saturated brand colour look dirty — the
 * eye reads the grey as tinted the *opposite* way. Carrying 4% of the brand
 * hue into the neutrals is what makes a palette feel designed rather than
 * assembled.
 */
export function generateNeutralRamp(seed: string, tint = 0.04): PaletteRamp {
  const { c, h } = hexToOklch(seed)
  return rampFrom(h, Math.min(c, MAX_BRAND_CHROMA) * tint)
}

/** Which step of `ramp` sits closest to `hex` perceptually. Used by the editor. */
export function nearestStep(ramp: PaletteRamp, hex: string): PaletteStep {
  const target = hexToOklch(hex)
  let best: PaletteStep = 500
  let bestDistance = Number.POSITIVE_INFINITY

  for (const step of PALETTE_STEPS) {
    const candidate = hexToOklch(ramp[String(step) as keyof PaletteRamp])
    const distance = Math.abs(candidate.l - target.l)
    if (distance < bestDistance) {
      bestDistance = distance
      best = step
    }
  }

  return best
}

export { LIGHTNESS as RAMP_LIGHTNESS, CHROMA as RAMP_CHROMA }
