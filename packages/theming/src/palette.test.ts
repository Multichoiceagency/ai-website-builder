import { PALETTE_STEPS } from '@platform/schemas'
import { describe, expect, it } from 'vitest'
import { hexToOklch, isHexColor, oklchToHex } from './color.js'
import { generateThemeTokens, lightTokens, darkTokens, generatePalette } from './palette.js'
import { generateNeutralRamp, generateRamp, nearestStep } from './ramp.js'
import { contrastReport } from './report.js'

/**
 * A spread of seeds chosen to break things: the pale yellow that motivates the
 * whole contrast gate, a near-black, a near-white, a fully desaturated grey,
 * and the saturated corners of the hue circle.
 */
const SEEDS = [
  '#1d4ed8',
  '#0f766e',
  '#fde047',
  '#f9a8d4',
  '#0a0a0a',
  '#fafafa',
  '#71717a',
  '#ef4444',
  '#22c55e',
  '#06b6d4',
  '#a855f7',
  '#f97316',
  '#84cc16',
  '#e11d48',
]

describe('generateRamp', () => {
  it('produces all eleven steps as valid hex', () => {
    for (const seed of SEEDS) {
      const ramp = generateRamp(seed)
      expect(Object.keys(ramp)).toHaveLength(PALETTE_STEPS.length)
      for (const step of PALETTE_STEPS) {
        expect(isHexColor(ramp[String(step) as keyof typeof ramp])).toBe(true)
      }
    }
  })

  it('is monotonically darker from 50 to 950', () => {
    for (const seed of SEEDS) {
      const ramp = generateRamp(seed)
      const lightnesses = PALETTE_STEPS.map((step) => hexToOklch(ramp[String(step) as keyof typeof ramp]).l)
      for (let i = 1; i < lightnesses.length; i += 1) {
        expect(lightnesses[i]!).toBeLessThan(lightnesses[i - 1]!)
      }
    }
  })

  it('steps evenly in perceptual lightness', () => {
    // 950 is excluded: like Tailwind's, it is a deliberate deep jump past the
    // end of the even run, used for near-black text rather than as a ramp step.
    const steps = PALETTE_STEPS.filter((step) => step !== 950)
    const ramp = generateRamp('#1d4ed8')
    const lightnesses = steps.map((step) => hexToOklch(ramp[String(step) as keyof typeof ramp]).l)
    const gaps = lightnesses.slice(1).map((value, index) => lightnesses[index]! - value)
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(3)
  })

  it('keeps the seed hue at every step that has chroma to carry one', () => {
    // The 50 and 100 steps hold so little chroma that 8-bit quantisation moves
    // the measured hue by several degrees. That is rounding, not drift, and
    // asserting on it would be asserting on the hex format.
    const seed = '#0f766e'
    const hue = hexToOklch(seed).h
    const ramp = generateRamp(seed)
    for (const step of PALETTE_STEPS) {
      const value = ramp[String(step) as keyof typeof ramp]
      if (hexToOklch(value).c < 0.05) continue
      // Two degrees is the width of one 8-bit step at this chroma.
      expect(Math.abs(hexToOklch(value).h - hue), `${step} = ${value}`).toBeLessThan(2)
    }
  })

  it('gives the same lightness at the same step regardless of hue', () => {
    // The property HSL cannot provide: yellow-600 and blue-600 are equally dark.
    const yellow = hexToOklch(generateRamp('#eab308')['600']).l
    const blue = hexToOklch(generateRamp('#3b82f6')['600']).l
    expect(yellow).toBeCloseTo(blue, 2)
  })

  it('leaves a grey seed grey', () => {
    // Including the Tailwind grey families, which carry just enough chroma to
    // be mistaken for a colour by a naive minimum-chroma floor.
    for (const grey of ['#737373', '#71717a', '#78716c', '#6b7280']) {
      const ramp = generateRamp(grey)
      for (const step of PALETTE_STEPS) {
        expect(hexToOklch(ramp[String(step) as keyof typeof ramp]).c).toBeLessThan(0.035)
      }
    }
  })

  it('carries a trace of the brand hue into the neutrals', () => {
    const neutral = generateNeutralRamp('#1d4ed8')
    const mid = hexToOklch(neutral['500'])
    expect(mid.c).toBeGreaterThan(0)
    expect(mid.c).toBeLessThan(0.02)
  })

  it('finds the nearest step for a colour', () => {
    const ramp = generateRamp('#1d4ed8')
    expect(nearestStep(ramp, ramp['600'])).toBe(600)
    expect(nearestStep(ramp, '#ffffff')).toBe(50)
    expect(nearestStep(ramp, '#000000')).toBe(950)
  })
})

describe('generated palettes pass WCAG AA', () => {
  for (const seed of SEEDS) {
    it(`${seed} produces no failing pair in either mode`, () => {
      const { light, dark } = generateThemeTokens(seed)
      const report = contrastReport(light, dark)

      // The assertion message matters here: a bare `toBe(true)` on a palette
      // failure tells whoever broke it nothing.
      expect(
        report.failures.map((pair) => `${pair.id} ${pair.ratio}:1 needs ${pair.minimum}:1`),
      ).toEqual([])
      expect(report.passes).toBe(true)
    })
  }

  it('passes for every hue on the circle', () => {
    for (let hue = 0; hue < 360; hue += 15) {
      const seed = oklchToHex({ l: 0.62, c: 0.18, h: hue })
      const { light, dark } = generateThemeTokens(seed)
      const report = contrastReport(light, dark)
      expect(report.failures.map((pair) => `${seed} ${pair.id} ${pair.ratio}`)).toEqual([])
    }
  })

  it('passes for washed-out and near-black seeds alike', () => {
    for (const lightness of [0.12, 0.3, 0.5, 0.7, 0.9]) {
      for (const chroma of [0, 0.02, 0.08, 0.16, 0.24]) {
        const seed = oklchToHex({ l: lightness, c: chroma, h: 250 })
        const { light, dark } = generateThemeTokens(seed)
        const report = contrastReport(light, dark)
        expect(report.failures.map((pair) => `${seed} ${pair.id}`)).toEqual([])
      }
    }
  })
})

describe('token assignment', () => {
  it('makes light mode light and dark mode dark', () => {
    const palette = generatePalette('#1d4ed8')
    expect(hexToOklch(lightTokens(palette).surface).l).toBeGreaterThan(0.9)
    expect(hexToOklch(darkTokens(palette).surface).l).toBeLessThan(0.25)
  })

  it('takes the dark primary from the light end of the ramp, not the dark end', () => {
    const palette = generatePalette('#1d4ed8')
    expect(hexToOklch(darkTokens(palette).primary).l).toBeGreaterThan(hexToOklch(lightTokens(palette).primary).l)
  })

  it('emits every token as valid hex', () => {
    const { light, dark } = generateThemeTokens('#f97316')
    for (const tokens of [light, dark]) {
      for (const value of Object.values(tokens)) {
        expect(isHexColor(value)).toBe(true)
      }
    }
  })
})
