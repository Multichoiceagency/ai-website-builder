import { themeSchema, type Theme } from '@platform/schemas'
import { describe, expect, it } from 'vitest'
import { isHexColor, mix } from './color.js'
import { AA_BODY, meetsContrast } from './contrast.js'
import {
  resolveDarkTokens,
  resolveLightTokens,
  siteColorVariables,
  themeContrastReport,
  themeFromPreset,
  themeFromSeed,
  tokensForMode,
} from './theme.js'

/**
 * The shape a site theme has in the database *today*, written out literally.
 *
 * This object is what `sites.theme` JSONB rows contain for every site seeded or
 * generated before the palette system existed. If this test ever fails, live
 * storefronts stop rendering — so it is deliberately a hard-coded literal and
 * not derived from the schema it is checking.
 */
const STORED_THEME_TODAY = {
  colorPrimary: '#0b5d8f',
  colorAccent: '#c2410c',
  colorSurface: '#ffffff',
  colorSurfaceAlt: '#f1f5f9',
  colorText: '#18181b',
  colorTextMuted: '#52525b',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  radius: 'lg',
  maxPerformanceClass: 'B',
} as const

describe('backward compatibility with stored themes', () => {
  it('parses a theme row written before any of this existed', () => {
    expect(() => themeSchema.parse(STORED_THEME_TODAY)).not.toThrow()
  })

  it('leaves every pre-existing field exactly as stored', () => {
    const parsed = themeSchema.parse(STORED_THEME_TODAY)
    for (const [key, value] of Object.entries(STORED_THEME_TODAY)) {
      expect(parsed[key as keyof Theme]).toBe(value)
    }
  })

  it('defaults every new field to null, or light for the mode', () => {
    const parsed = themeSchema.parse(STORED_THEME_TODAY)
    expect(parsed.colorPrimaryHover).toBeNull()
    expect(parsed.colorPrimaryInk).toBeNull()
    expect(parsed.colorAccentInk).toBeNull()
    expect(parsed.colorLine).toBeNull()
    expect(parsed.colorLineStrong).toBeNull()
    expect(parsed.colorSurfaceSunken).toBeNull()
    expect(parsed.colorPositive).toBeNull()
    expect(parsed.colorWarning).toBeNull()
    expect(parsed.colorDanger).toBeNull()
    expect(parsed.colorFocus).toBeNull()
    expect(parsed.palette).toBeNull()
    expect(parsed.dark).toBeNull()
    expect(parsed.presetId).toBeNull()
    expect(parsed.mode).toBe('light')
  })

  it('still parses an empty object into the documented defaults', () => {
    const parsed = themeSchema.parse({})
    expect(parsed.colorPrimary).toBe('#1d4ed8')
    expect(parsed.radius).toBe('md')
    expect(parsed.mode).toBe('light')
    expect(parsed.dark).toBeNull()
  })

  it('still rejects a malformed colour', () => {
    expect(() => themeSchema.parse({ ...STORED_THEME_TODAY, colorPrimary: 'blue' })).toThrow()
  })

  it('accepts a partial patch the way the update endpoint sends one', () => {
    expect(() => themeSchema.partial().parse({ colorPrimary: '#1d4ed8' })).not.toThrow()
  })
})

describe('resolving an old theme reproduces the previous renderer', () => {
  const theme = themeSchema.parse(STORED_THEME_TODAY)

  it('derives the divider with the same OKLab mix the storefront used', () => {
    expect(resolveLightTokens(theme).line).toBe(mix(theme.colorText, theme.colorSurface, 0.13))
  })

  it('keeps white ink on the primary fill, which is what blocks hard-coded', () => {
    expect(resolveLightTokens(theme).primaryInk).toBe('#ffffff')
  })

  it('passes the six flat colours straight through', () => {
    const tokens = resolveLightTokens(theme)
    expect(tokens.surface).toBe(theme.colorSurface)
    expect(tokens.surfaceAlt).toBe(theme.colorSurfaceAlt)
    expect(tokens.text).toBe(theme.colorText)
    expect(tokens.textMuted).toBe(theme.colorTextMuted)
    expect(tokens.primary).toBe(theme.colorPrimary)
    expect(tokens.accent).toBe(theme.colorAccent)
  })

  it('reports no dark half, and renders light whatever the visitor prefers', () => {
    expect(resolveDarkTokens(theme)).toBeNull()
    expect(tokensForMode(theme, true)).toEqual(resolveLightTokens(theme))
  })

  it('reports clean, so an untouched site does not open the editor covered in warnings', () => {
    // The tokens an old theme never had are defaulted to values that pass, not
    // to values that merely exist.
    const report = themeContrastReport(theme)
    expect(report.failures.map((pair) => `${pair.id} ${pair.ratio} needs ${pair.minimum}`)).toEqual([])
  })

  it('emits every --site-* variable as a valid colour', () => {
    for (const [name, value] of Object.entries(siteColorVariables(resolveLightTokens(theme)))) {
      expect(isHexColor(value), `${name} = ${value}`).toBe(true)
    }
  })
})

describe('regenerating a theme', () => {
  const base = themeSchema.parse(STORED_THEME_TODAY)

  it('keeps typography and the performance ceiling', () => {
    const regenerated = themeFromSeed(base, '#7c3aed')
    expect(regenerated.fontHeading).toBe(base.fontHeading)
    expect(regenerated.fontBody).toBe(base.fontBody)
    expect(regenerated.radius).toBe(base.radius)
    expect(regenerated.maxPerformanceClass).toBe(base.maxPerformanceClass)
  })

  it('produces a theme that still validates', () => {
    expect(() => themeSchema.parse(themeFromSeed(base, '#7c3aed'))).not.toThrow()
    expect(() => themeSchema.parse(themeFromPreset(base, 'emerald'))).not.toThrow()
  })

  it('fills in the palette, the dark half and every extended token', () => {
    const regenerated = themeFromSeed(base, '#7c3aed', 'system')
    expect(regenerated.palette?.seed).toBe('#7c3aed')
    expect(regenerated.dark).not.toBeNull()
    expect(regenerated.mode).toBe('system')
    expect(regenerated.colorPrimaryInk).not.toBeNull()
    expect(regenerated.colorLineStrong).not.toBeNull()
    expect(regenerated.presetId).toBeNull()
  })

  it('reports clean contrast for a regenerated theme', () => {
    const report = themeContrastReport(themeFromSeed(base, '#fde047'))
    expect(report.failures.map((pair) => `${pair.id} ${pair.ratio}`)).toEqual([])
  })

  it('records which preset a theme came from', () => {
    const applied = themeFromPreset(base, 'violet')
    expect(applied.presetId).toBe('violet')
    expect(themeContrastReport(applied).passes).toBe(true)
  })

  it('rejects an unknown preset rather than silently doing nothing', () => {
    expect(() => themeFromPreset(base, 'chartreuse')).toThrow(/Unknown theme preset/)
  })

  it('switches to the dark set when the visitor prefers dark and the site follows the system', () => {
    const regenerated = themeFromSeed(base, '#0ea5e9', 'system')
    expect(tokensForMode(regenerated, true)).toEqual(regenerated.dark)
    expect(tokensForMode(regenerated, false)).toEqual(resolveLightTokens(regenerated))
  })

  it('ignores the visitor when the site is pinned to one mode', () => {
    const pinned = themeFromSeed(base, '#0ea5e9', 'dark')
    expect(tokensForMode(pinned, false)).toEqual(pinned.dark)
  })
})

describe('the report does not hide failures', () => {
  it('flags a hand-set unreadable pair with its ratio and the minimum it needed', () => {
    const broken = themeSchema.parse({
      ...STORED_THEME_TODAY,
      colorPrimary: '#fde047',
      colorPrimaryInk: '#ffffff',
    })

    const report = themeContrastReport(broken)
    expect(report.passes).toBe(false)

    const failure = report.failures.find((pair) => pair.id === 'light.primary-ink-on-primary')
    expect(failure).toBeDefined()
    expect(failure!.minimum).toBe(AA_BODY)
    expect(failure!.ratio).toBeLessThan(AA_BODY)
    expect(meetsContrast(failure!.foreground, failure!.background, failure!.minimum)).toBe(false)
  })

  it('checks both modes when a dark half exists', () => {
    const theme = themeFromSeed(themeSchema.parse(STORED_THEME_TODAY), '#1d4ed8')
    const report = themeContrastReport(theme)
    expect(report.pairs.some((pair) => pair.mode === 'dark')).toBe(true)
    expect(report.pairs.some((pair) => pair.mode === 'light')).toBe(true)
  })
})
