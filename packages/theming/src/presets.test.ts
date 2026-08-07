import { shadcnTokensSchema, themePresetSchema } from '@platform/schemas'
import { describe, expect, it } from 'vitest'
import { hexToOklch, isHexColor } from './color.js'
import { AA_BODY, contrastRatio, meetsContrast } from './contrast.js'
import { THEME_PRESETS, THEME_PRESET_IDS, getPreset, toSiteTokens } from './presets.js'
import { contrastReport } from './report.js'

const EXPECTED_IDS = [
  'zinc',
  'slate',
  'stone',
  'gray',
  'neutral',
  'red',
  'rose',
  'orange',
  'amber',
  'yellow',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
]

describe('the preset catalogue', () => {
  it('ships all twenty-one shadcn base themes', () => {
    expect(THEME_PRESET_IDS).toHaveLength(21)
    expect([...THEME_PRESET_IDS].sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('validates against the schema', () => {
    for (const preset of THEME_PRESETS) {
      expect(() => themePresetSchema.parse(preset)).not.toThrow()
    }
  })

  it('carries the full shadcn token set for both modes', () => {
    for (const preset of THEME_PRESETS) {
      expect(() => shadcnTokensSchema.parse(preset.light)).not.toThrow()
      expect(() => shadcnTokensSchema.parse(preset.dark)).not.toThrow()
    }
  })

  it('resolves by id and returns null for anything else', () => {
    expect(getPreset('blue')?.label).toBe('Blue')
    expect(getPreset('chartreuse')).toBeNull()
  })

  it('grounds light mode on white and dark mode on near-black', () => {
    for (const preset of THEME_PRESETS) {
      expect(hexToOklch(preset.light.background).l).toBeGreaterThan(0.97)
      expect(hexToOklch(preset.dark.background).l).toBeLessThan(0.25)
    }
  })
})

describe('every preset passes WCAG AA in both modes', () => {
  for (const preset of THEME_PRESETS) {
    it(`${preset.label} has no failing pair`, () => {
      const report = contrastReport(toSiteTokens(preset, 'light'), toSiteTokens(preset, 'dark'))
      expect(
        report.failures.map((pair) => `${preset.id} ${pair.id} ${pair.ratio}:1 needs ${pair.minimum}:1`),
      ).toEqual([])
    })
  }

  it('keeps shadcn’s own foreground pairs readable too', () => {
    for (const preset of THEME_PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = preset[mode]
        const pairs: [string, string, string][] = [
          ['foreground/background', tokens.foreground, tokens.background],
          ['cardForeground/card', tokens.cardForeground, tokens.card],
          ['popoverForeground/popover', tokens.popoverForeground, tokens.popover],
          ['primaryForeground/primary', tokens.primaryForeground, tokens.primary],
          ['secondaryForeground/secondary', tokens.secondaryForeground, tokens.secondary],
          ['mutedForeground/muted', tokens.mutedForeground, tokens.muted],
          ['accentForeground/accent', tokens.accentForeground, tokens.accent],
          ['destructiveForeground/destructive', tokens.destructiveForeground, tokens.destructive],
        ]

        for (const [label, foreground, background] of pairs) {
          expect(
            meetsContrast(foreground, background, AA_BODY)
              ? null
              : `${preset.id}.${mode}.${label} is ${contrastRatio(foreground, background).toFixed(2)}:1`,
          ).toBeNull()
        }
      }
    }
  })
})

describe('mapping shadcn names onto --site-* tokens', () => {
  it('emits every site token as valid hex', () => {
    for (const preset of THEME_PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        for (const [key, value] of Object.entries(toSiteTokens(preset, mode))) {
          expect(isHexColor(value), `${preset.id}.${mode}.${key} = ${value}`).toBe(true)
        }
      }
    }
  })

  it('carries background, muted, border and primary straight across', () => {
    const blue = getPreset('blue')!
    const tokens = toSiteTokens(blue, 'light')
    expect(tokens.surface).toBe(blue.light.background)
    expect(tokens.surfaceAlt).toBe(blue.light.muted)
    expect(tokens.line).toBe(blue.light.border)
    expect(tokens.primary).toBe(blue.light.primary)
    expect(tokens.primaryInk).toBe(blue.light.primaryForeground)
    expect(tokens.focus).toBe(blue.light.ring)
    expect(tokens.danger).toBe(blue.light.destructive)
  })

  it('synthesises an accent with a different hue from the primary', () => {
    const blue = getPreset('blue')!
    const tokens = toSiteTokens(blue, 'light')
    const hueGap = Math.abs(hexToOklch(tokens.accent).h - hexToOklch(tokens.primary).h)
    expect(Math.min(hueGap, 360 - hueGap)).toBeGreaterThan(60)
  })

  it('leaves a neutral preset’s accent neutral', () => {
    const zinc = getPreset('zinc')!
    expect(hexToOklch(toSiteTokens(zinc, 'light').accent).c).toBeLessThan(0.03)
  })

  it('gives lineStrong more contrast than the hairline it strengthens', () => {
    for (const preset of THEME_PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = toSiteTokens(preset, mode)
        expect(contrastRatio(tokens.lineStrong, tokens.surface)).toBeGreaterThan(
          contrastRatio(tokens.line, tokens.surface),
        )
      }
    }
  })
})
