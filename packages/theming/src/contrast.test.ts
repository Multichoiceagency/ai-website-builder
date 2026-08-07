import { describe, expect, it } from 'vitest'
import { hexToOklch, isHexColor, oklchToHex } from './color.js'
import {
  AA_BODY,
  AA_LARGE,
  AAA_BODY,
  contrastRatio,
  ensureContrast,
  meetsContrast,
  readableInk,
  relativeLuminance,
} from './contrast.js'

describe('relative luminance', () => {
  it('matches the WCAG endpoints', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6)
  })

  it('weights green heaviest, then red, then blue', () => {
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 4)
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 4)
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 4)
  })

  it('rejects anything that is not #rrggbb', () => {
    expect(() => relativeLuminance('white')).toThrow()
  })
})

describe('contrast ratio against published reference values', () => {
  // Every expectation here is a ratio published in WCAG guidance or produced by
  // the reference checkers, to three decimals. If the maths drifts, these move.
  const cases: [string, string, number][] = [
    ['#000000', '#ffffff', 21],
    ['#ffffff', '#ffffff', 1],
    // The canonical "smallest grey that passes AA on white" and its neighbour
    // one step lighter, which does not.
    ['#767676', '#ffffff', 4.542],
    ['#777777', '#ffffff', 4.478],
    // The canonical AAA and large-text greys on white.
    ['#595959', '#ffffff', 7.005],
    ['#949494', '#ffffff', 3.034],
    ['#0000ff', '#ffffff', 8.592],
    ['#ffff00', '#000000', 19.556],
    ['#ff0000', '#ffffff', 3.998],
    ['#008000', '#ffffff', 5.137],
  ]

  for (const [foreground, background, expected] of cases) {
    it(`${foreground} on ${background} is ${expected}:1`, () => {
      expect(contrastRatio(foreground, background)).toBeCloseTo(expected, 2)
    })
  }

  it('is symmetric', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#767676'), 10)
  })
})

describe('meetsContrast', () => {
  it('draws the AA line exactly where the reference greys do', () => {
    expect(meetsContrast('#767676', '#ffffff', AA_BODY)).toBe(true)
    expect(meetsContrast('#777777', '#ffffff', AA_BODY)).toBe(false)
    expect(meetsContrast('#949494', '#ffffff', AA_LARGE)).toBe(true)
    expect(meetsContrast('#595959', '#ffffff', AAA_BODY)).toBe(true)
  })
})

describe('ensureContrast', () => {
  it('leaves a passing colour alone', () => {
    expect(ensureContrast('#18181b', '#ffffff', AA_BODY)).toBe('#18181b')
  })

  it('darkens a foreground that fails on a light background', () => {
    const repaired = ensureContrast('#fde047', '#ffffff', AA_BODY)
    expect(meetsContrast(repaired, '#ffffff', AA_BODY)).toBe(true)
    expect(hexToOklch(repaired).l).toBeLessThan(hexToOklch('#fde047').l)
  })

  it('lightens a foreground that fails on a dark background', () => {
    const repaired = ensureContrast('#1e3a5f', '#111111', AA_BODY)
    expect(meetsContrast(repaired, '#111111', AA_BODY)).toBe(true)
    expect(hexToOklch(repaired).l).toBeGreaterThan(hexToOklch('#1e3a5f').l)
  })

  it('keeps the hue it was given', () => {
    const repaired = ensureContrast('#fde047', '#ffffff', AA_BODY)
    expect(hexToOklch(repaired).h).toBeCloseTo(hexToOklch('#fde047').h, 0)
  })

  it('always returns something passing, at every hue, on every realistic surface', () => {
    const surfaces = ['#ffffff', '#f5f5f4', '#e7e5e4', '#18181b', '#0b0b0f']
    for (let hue = 0; hue < 360; hue += 5) {
      // Start from the worst case: a mid-lightness, fully saturated colour,
      // which fails against light and dark surfaces alike.
      const start = oklchToHex({ l: 0.65, c: 0.2, h: hue })
      for (const background of surfaces) {
        const repaired = ensureContrast(start, background, AA_BODY)
        expect(isHexColor(repaired)).toBe(true)
        expect(meetsContrast(repaired, background, AA_BODY)).toBe(true)
      }
    }
  })

  it('falls back to an extreme when no lightness of that hue can pass', () => {
    // Mid-grey: nothing reaches 7:1 in either direction, so the escape hatch runs.
    const repaired = ensureContrast('#808080', '#808080', AAA_BODY)
    expect(['#000000', '#ffffff']).toContain(repaired)
  })
})

describe('readableInk', () => {
  it('picks light ink on a dark fill and dark ink on a light fill', () => {
    expect(relativeLuminance(readableInk('#1d4ed8'))).toBeGreaterThan(0.5)
    expect(relativeLuminance(readableInk('#fde047'))).toBeLessThan(0.5)
  })

  it('always clears AA against the fill it was asked about', () => {
    const fills = ['#1d4ed8', '#fde047', '#0f766e', '#f43f5e', '#ffffff', '#000000', '#71717a', '#a3e635']
    for (const fill of fills) {
      expect(meetsContrast(readableInk(fill), fill, AA_BODY)).toBe(true)
    }
  })

  it('cannot clear AA against a mid-grey and says so by returning the best extreme', () => {
    const ink = readableInk('#767676')
    expect(['#000000', '#ffffff']).toContain(ink)
  })
})
