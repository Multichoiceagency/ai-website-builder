/**
 * Colour conversion: sRGB ⇄ linear RGB ⇄ OKLab ⇄ OKLCH.
 *
 * Hand-rolled rather than pulled from a library. It is ~120 lines of published
 * matrix maths (Björn Ottosson, 2020) and the alternative is a runtime
 * dependency in a package whose whole job is to be small enough that the
 * storefront never pays for it.
 *
 * Ramps are generated in OKLCH because that is the only one of these spaces
 * where "one step lighter" means the same amount of lighter at every hue. The
 * result is converted straight back to hex, so every consumer downstream —
 * database column, CSS custom property, colour input — keeps working unchanged.
 */

// region Types

/** Channels in 0..1. */
export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Oklab {
  /** Perceptual lightness, 0..1. */
  l: number
  a: number
  b: number
}

export interface Oklch {
  /** Perceptual lightness, 0..1. */
  l: number
  /** Chroma. 0 is grey; sRGB tops out around 0.37. */
  c: number
  /** Hue angle in degrees, 0..360. */
  h: number
}

// endregion

// region Hex ⇄ sRGB

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value)
}

function clamp(value: number, min = 0, max = 1): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Parse `#rrggbb` into 0..1 channels. Throws on anything else: a silent
 * fallback to black is the kind of bug that only shows up in a customer's
 * published site.
 */
export function hexToRgb(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`Not a #rrggbb colour: ${hex}`)
  const value = hex.slice(1)
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  }
}

function channelToHex(channel: number): string {
  return Math.round(clamp(channel) * 255)
    .toString(16)
    .padStart(2, '0')
}

export function rgbToHex(rgb: Rgb): string {
  return `#${channelToHex(rgb.r)}${channelToHex(rgb.g)}${channelToHex(rgb.b)}`
}

// endregion

// region sRGB ⇄ linear RGB

/** The sRGB transfer function. IEC 61966-2-1 threshold, not WCAG's rounded one. */
export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055
}

// endregion

// region linear RGB ⇄ OKLab

export function linearRgbToOklab(rgb: Rgb): Oklab {
  const l = 0.4122214708 * rgb.r + 0.5363325363 * rgb.g + 0.0514459929 * rgb.b
  const m = 0.2119034982 * rgb.r + 0.6806995451 * rgb.g + 0.1073969566 * rgb.b
  const s = 0.0883024619 * rgb.r + 0.2817188376 * rgb.g + 0.6299787005 * rgb.b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

export function oklabToLinearRgb(lab: Oklab): Rgb {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

// endregion

// region OKLab ⇄ OKLCH

export function oklabToOklch(lab: Oklab): Oklch {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  // A near-grey colour has no meaningful hue; report 0 rather than the noise
  // that atan2 produces from two values hovering around ±1e-17.
  const h = c < 1e-6 ? 0 : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360
  return { l: lab.l, c, h }
}

export function oklchToOklab(lch: Oklch): Oklab {
  const radians = (lch.h * Math.PI) / 180
  return { l: lch.l, a: lch.c * Math.cos(radians), b: lch.c * Math.sin(radians) }
}

// endregion

// region Composed conversions

export function hexToOklch(hex: string): Oklch {
  const rgb = hexToRgb(hex)
  return oklabToOklch(
    linearRgbToOklab({ r: srgbToLinear(rgb.r), g: srgbToLinear(rgb.g), b: srgbToLinear(rgb.b) }),
  )
}

function oklchToLinear(lch: Oklch): Rgb {
  return oklabToLinearRgb(oklchToOklab(lch))
}

const GAMUT_EPSILON = 1 / 512

function inGamut(rgb: Rgb): boolean {
  return (
    rgb.r >= -GAMUT_EPSILON &&
    rgb.r <= 1 + GAMUT_EPSILON &&
    rgb.g >= -GAMUT_EPSILON &&
    rgb.g <= 1 + GAMUT_EPSILON &&
    rgb.b >= -GAMUT_EPSILON &&
    rgb.b <= 1 + GAMUT_EPSILON
  )
}

/**
 * OKLCH → hex, gamut-mapped by reducing chroma.
 *
 * Lightness and hue are held fixed and chroma is bisected down until the colour
 * fits in sRGB. Clipping the RGB channels instead would be simpler and wrong:
 * it shifts both hue and lightness, so a ramp built that way stops being an
 * even ramp exactly where it matters — at the saturated end.
 */
export function oklchToHex(lch: Oklch): string {
  const lightness = clamp(lch.l)
  const hue = ((lch.h % 360) + 360) % 360
  const target: Oklch = { l: lightness, c: Math.max(0, lch.c), h: hue }

  if (inGamut(oklchToLinear(target))) return toHex(target)

  let low = 0
  let high = target.c
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2
    if (inGamut(oklchToLinear({ ...target, c: mid }))) low = mid
    else high = mid
  }

  return toHex({ ...target, c: low })
}

function toHex(lch: Oklch): string {
  const linear = oklchToLinear(lch)
  return rgbToHex({
    r: linearToSrgb(clamp(linear.r)),
    g: linearToSrgb(clamp(linear.g)),
    b: linearToSrgb(clamp(linear.b)),
  })
}

// endregion

// region Convenience

/** Same hue and chroma, new perceptual lightness. */
export function withLightness(hex: string, lightness: number): string {
  const lch = hexToOklch(hex)
  return oklchToHex({ ...lch, l: clamp(lightness) })
}

/** Scale chroma — 0 desaturates to grey, 1 leaves the colour alone. */
export function withChromaScale(hex: string, scale: number): string {
  const lch = hexToOklch(hex)
  return oklchToHex({ ...lch, c: Math.max(0, lch.c * scale) })
}

/** Mix two colours in OKLab. `weight` is how much of `a` survives. */
export function mix(a: string, b: string, weight: number): string {
  const first = hexToOklch(a)
  const second = hexToOklch(b)
  const labA = oklchToOklab(first)
  const labB = oklchToOklab(second)
  const t = clamp(weight)
  return oklchToHex(
    oklabToOklch({
      l: labA.l * t + labB.l * (1 - t),
      a: labA.a * t + labB.a * (1 - t),
      b: labA.b * t + labB.b * (1 - t),
    }),
  )
}

export { clamp }

// endregion
