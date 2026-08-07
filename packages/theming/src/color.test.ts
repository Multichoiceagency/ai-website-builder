import { describe, expect, it } from 'vitest'
import {
  hexToOklch,
  hexToRgb,
  isHexColor,
  linearRgbToOklab,
  mix,
  oklchToHex,
  rgbToHex,
  srgbToLinear,
  withLightness,
} from './color.js'

describe('hex parsing', () => {
  it('accepts #rrggbb and rejects everything else', () => {
    expect(isHexColor('#1d4ed8')).toBe(true)
    expect(isHexColor('#FFF')).toBe(false)
    expect(isHexColor('rgb(0,0,0)')).toBe(false)
    expect(isHexColor('1d4ed8')).toBe(false)
  })

  it('throws rather than defaulting to black on bad input', () => {
    expect(() => hexToRgb('#fff')).toThrow()
  })

  it('round-trips through rgb', () => {
    for (const hex of ['#000000', '#ffffff', '#1d4ed8', '#f43f5e', '#0a0a0a']) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex)
    }
  })
})

describe('OKLab conversion', () => {
  // Ottosson's published reference table: sRGB red is OKLab (0.627955, 0.224863, 0.125846).
  it('matches the reference value for sRGB red', () => {
    const linear = { r: srgbToLinear(1), g: srgbToLinear(0), b: srgbToLinear(0) }
    const lab = linearRgbToOklab(linear)
    expect(lab.l).toBeCloseTo(0.627955, 5)
    expect(lab.a).toBeCloseTo(0.224863, 5)
    expect(lab.b).toBeCloseTo(0.125846, 5)
  })

  it('puts white at L=1 and black at L=0 with no chroma', () => {
    const white = hexToOklch('#ffffff')
    expect(white.l).toBeCloseTo(1, 4)
    expect(white.c).toBeCloseTo(0, 4)

    const black = hexToOklch('#000000')
    expect(black.l).toBeCloseTo(0, 4)
    expect(black.c).toBeCloseTo(0, 4)
  })

  it('gives red the reference chroma and hue', () => {
    const red = hexToOklch('#ff0000')
    expect(red.l).toBeCloseTo(0.6279554, 4)
    expect(red.c).toBeCloseTo(0.2577, 3)
    expect(red.h).toBeCloseTo(29.23, 1)
  })
})

describe('OKLCH round trip', () => {
  it('returns the same hex it started from', () => {
    const samples = ['#000000', '#ffffff', '#1d4ed8', '#0f766e', '#f59e0b', '#71717a', '#ec4899', '#18181b']
    for (const hex of samples) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
    }
  })

  it('gamut-maps out-of-range chroma instead of clipping channels', () => {
    // Chroma 0.5 does not exist in sRGB at any hue. The result must still be a
    // valid colour of roughly the requested lightness and hue.
    const mapped = oklchToHex({ l: 0.6, c: 0.5, h: 250 })
    expect(isHexColor(mapped)).toBe(true)

    const back = hexToOklch(mapped)
    expect(back.l).toBeCloseTo(0.6, 2)
    expect(back.h).toBeCloseTo(250, 0)
    expect(back.c).toBeLessThan(0.5)
  })

  it('clamps lightness outside 0..1', () => {
    expect(oklchToHex({ l: 2, c: 0, h: 0 })).toBe('#ffffff')
    expect(oklchToHex({ l: -1, c: 0, h: 0 })).toBe('#000000')
  })
})

describe('helpers', () => {
  it('withLightness keeps the hue', () => {
    const lighter = withLightness('#1d4ed8', 0.85)
    expect(hexToOklch(lighter).h).toBeCloseTo(hexToOklch('#1d4ed8').h, 0)
    expect(hexToOklch(lighter).l).toBeCloseTo(0.85, 2)
  })

  it('mix at the extremes returns the endpoints', () => {
    expect(mix('#1d4ed8', '#ffffff', 1)).toBe('#1d4ed8')
    expect(mix('#1d4ed8', '#ffffff', 0)).toBe('#ffffff')
  })

  it('mix lands between the two lightnesses', () => {
    const midpoint = hexToOklch(mix('#000000', '#ffffff', 0.5)).l
    expect(midpoint).toBeGreaterThan(0.4)
    expect(midpoint).toBeLessThan(0.6)
  })
})
