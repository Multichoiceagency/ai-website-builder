import type { ContrastReport, Theme, ThemeMode, ThemeTokens } from '@platform/schemas'
import { resolveContentWidthCss } from '@platform/schemas'
import { mix, oklchToHex, hexToOklch } from './color.js'
import { AA_BODY, AA_UI, ensureContrast, readableInk } from './contrast.js'
import { darkTokens, generatePalette, lightTokens } from './palette.js'
import { getPreset, toSiteTokens } from './presets.js'
import { contrastReport } from './report.js'

/**
 * The bridge between the stored `Theme` and the resolved token sets.
 *
 * A theme stored before any of this existed carries `null` for every extended
 * field. `resolveLightTokens` fills those in with exactly what the renderer
 * already did — the same OKLab mix for the divider, the same `#ffffff` on a
 * primary button — so an old site renders identically and its extra tokens
 * simply become explicit. The constants below are duplicated as CSS fallbacks
 * in the storefront page; keep the two in step.
 */

// region Legacy fallbacks

/**
 * Tokens that already existed reproduce the old renderer exactly. Tokens that
 * did not — `lineStrong`, the status trio — get a value chosen to *pass*,
 * because a default nobody set should not be a default that fails.
 */

/** `color-mix(in oklab, text 13%, surface)`, the divider the renderer already emitted. */
const LINE_MIX = 0.13
/** New token. 48% is the lightest mix that clears 3:1 across realistic text/surface pairs. */
const LINE_STRONG_MIX = 0.48
const SURFACE_SUNKEN_MIX = 0.05
/** Blocks hard-coded `text-white` on primary fills. Null must not change that. */
const LEGACY_PRIMARY_INK = '#ffffff'
const PRIMARY_HOVER_MIX = 0.86
/** Tailwind green-700 / amber-700 / red-700 — all clear 4.5:1 on white. */
const LEGACY_POSITIVE = '#15803d'
const LEGACY_WARNING = '#b45309'
const LEGACY_DANGER = '#b91c1c'

// endregion

// region Resolve

/**
 * The light token set a renderer should emit for this theme.
 *
 * Explicit values win; nulls fall back to the legacy derivation. Nothing here
 * repairs contrast — a human override that fails is the human's call, and the
 * report is what surfaces it. Repair happens at *generation* time, in
 * `themeFromSeed` and `themeFromPreset`.
 */
export function resolveLightTokens(theme: Theme): ThemeTokens {
  const surface = theme.colorSurface
  const text = theme.colorText
  const primary = theme.colorPrimary
  const accent = theme.colorAccent

  return {
    surface,
    surfaceAlt: theme.colorSurfaceAlt,
    surfaceSunken: theme.colorSurfaceSunken ?? mix(text, surface, SURFACE_SUNKEN_MIX),
    text,
    textMuted: theme.colorTextMuted,
    line: theme.colorLine ?? mix(text, surface, LINE_MIX),
    lineStrong: theme.colorLineStrong ?? mix(text, surface, LINE_STRONG_MIX),
    primary,
    primaryHover: theme.colorPrimaryHover ?? mix(primary, '#000000', PRIMARY_HOVER_MIX),
    primaryInk: theme.colorPrimaryInk ?? LEGACY_PRIMARY_INK,
    accent,
    accentInk: theme.colorAccentInk ?? LEGACY_PRIMARY_INK,
    positive: theme.colorPositive ?? LEGACY_POSITIVE,
    warning: theme.colorWarning ?? LEGACY_WARNING,
    danger: theme.colorDanger ?? LEGACY_DANGER,
    focus: theme.colorFocus ?? primary,
  }
}

/** Null when the site has no dark half — which is a choice, not an omission. */
export function resolveDarkTokens(theme: Theme): ThemeTokens | null {
  return theme.dark
}

/** Which token set a renderer paints with, given the visitor's preference. */
export function tokensForMode(theme: Theme, prefersDark: boolean): ThemeTokens {
  const dark = resolveDarkTokens(theme)
  if (!dark) return resolveLightTokens(theme)
  if (theme.mode === 'dark') return dark
  if (theme.mode === 'system' && prefersDark) return dark
  return resolveLightTokens(theme)
}

// endregion

// region Write

/** Fold a resolved token set back onto the theme's stored fields. */
export function writeLightTokens(theme: Theme, tokens: ThemeTokens): Theme {
  return {
    ...theme,
    colorSurface: tokens.surface,
    colorSurfaceAlt: tokens.surfaceAlt,
    colorSurfaceSunken: tokens.surfaceSunken,
    colorText: tokens.text,
    colorTextMuted: tokens.textMuted,
    colorLine: tokens.line,
    colorLineStrong: tokens.lineStrong,
    colorPrimary: tokens.primary,
    colorPrimaryHover: tokens.primaryHover,
    colorPrimaryInk: tokens.primaryInk,
    colorAccent: tokens.accent,
    colorAccentInk: tokens.accentInk,
    colorPositive: tokens.positive,
    colorWarning: tokens.warning,
    colorDanger: tokens.danger,
    colorFocus: tokens.focus,
  }
}

// endregion

// region Generate

/**
 * Regenerate a whole theme from one seed colour.
 *
 * Fonts, radius and the performance ceiling are the caller's and are carried
 * through untouched — changing the palette should not silently change which
 * blocks the site is allowed to use.
 */
export function themeFromSeed(theme: Theme, seed: string, mode: ThemeMode = theme.mode): Theme {
  const palette = generatePalette(seed)
  const light = lightTokens(palette)
  const dark = darkTokens(palette)

  return {
    ...writeLightTokens(theme, light),
    mode,
    palette,
    dark,
    // The theme no longer *is* a preset once it has been regenerated from a seed.
    presetId: null,
  }
}

/** Apply one of the shadcn presets, keeping typography and the block ceiling. */
export function themeFromPreset(theme: Theme, presetId: string, mode: ThemeMode = theme.mode): Theme {
  const preset = getPreset(presetId)
  if (!preset) throw new Error(`Unknown theme preset: ${presetId}`)

  return {
    ...writeLightTokens(theme, toSiteTokens(preset, 'light')),
    mode,
    palette: generatePalette(preset.seed),
    dark: toSiteTokens(preset, 'dark'),
    presetId: preset.id,
  }
}

/**
 * Repair one token set in place: every pair the report flags gets its
 * foreground moved until it passes. Used by the editor's "fix contrast" action,
 * which is a deliberate button and not something that happens behind a user's
 * typing.
 */
export function repairTokens(tokens: ThemeTokens): ThemeTokens {
  const worstSurface = darkestSurface(tokens)
  const primary = ensureContrast(tokens.primary, tokens.surface, AA_UI)
  const accent = ensureContrast(tokens.accent, tokens.surface, AA_UI)

  return {
    ...tokens,
    text: ensureContrast(tokens.text, worstSurface, AA_BODY),
    textMuted: ensureContrast(tokens.textMuted, worstSurface, AA_BODY),
    lineStrong: ensureContrast(tokens.lineStrong, tokens.surfaceAlt, AA_UI),
    primary,
    primaryHover: ensureContrast(tokens.primaryHover, tokens.surface, AA_UI),
    primaryInk: readableInk(primary, AA_BODY),
    accent,
    accentInk: readableInk(accent, AA_BODY),
    positive: ensureContrast(tokens.positive, worstSurface, AA_BODY),
    warning: ensureContrast(tokens.warning, worstSurface, AA_BODY),
    danger: ensureContrast(tokens.danger, worstSurface, AA_BODY),
    focus: ensureContrast(tokens.focus, tokens.surface, AA_UI),
  }
}

/** The surface that is hardest to read against — the one every check must use. */
function darkestSurface(tokens: ThemeTokens): string {
  const surfaces = [tokens.surface, tokens.surfaceAlt, tokens.surfaceSunken]
  const backgroundIsLight = hexToOklch(tokens.surface).l > 0.5
  return surfaces.sort((a, b) =>
    backgroundIsLight ? hexToOklch(a).l - hexToOklch(b).l : hexToOklch(b).l - hexToOklch(a).l,
  )[0]!
}

// endregion

// region Report

export function themeContrastReport(theme: Theme): ContrastReport {
  return contrastReport(resolveLightTokens(theme), resolveDarkTokens(theme))
}

// endregion

// region CSS

const RADIUS: Record<Theme['radius'], string> = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
}

/**
 * One token set as `--site-*` custom properties.
 *
 * This is the single definition of the variable names blocks read. The
 * storefront duplicates the *fallback* rules rather than importing this, so a
 * published site never pulls a package in to paint itself; the names, though,
 * come from here.
 */
export function siteColorVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    '--site-surface': tokens.surface,
    '--site-surface-alt': tokens.surfaceAlt,
    '--site-surface-sunken': tokens.surfaceSunken,
    '--site-text': tokens.text,
    '--site-text-muted': tokens.textMuted,
    '--site-line': tokens.line,
    '--site-line-strong': tokens.lineStrong,
    '--site-primary': tokens.primary,
    '--site-primary-hover': tokens.primaryHover,
    '--site-primary-ink': tokens.primaryInk,
    '--site-accent': tokens.accent,
    '--site-accent-ink': tokens.accentInk,
    '--site-positive': tokens.positive,
    '--site-warning': tokens.warning,
    '--site-danger': tokens.danger,
    '--site-focus': tokens.focus,
  }
}

/** Typography and shape, which are mode-independent. */
export function siteShapeVariables(theme: Theme): Record<string, string> {
  return {
    '--site-radius': RADIUS[theme.radius],
    '--site-font-heading': `${theme.fontHeading}, ui-sans-serif, system-ui, sans-serif`,
    '--site-font-body': `${theme.fontBody}, ui-sans-serif, system-ui, sans-serif`,
    '--site-primary-fill': theme.gradientPrimary || theme.colorPrimary,
    '--site-surface-fill': theme.gradientSurface || theme.colorSurface,
    '--site-surface-alt-fill': theme.gradientSurfaceAlt || theme.colorSurfaceAlt,
    '--site-content-width': resolveContentWidthCss(theme),
    '--site-content-max': resolveContentWidthCss(theme),
  }
}

export { RADIUS as SITE_RADIUS }

// endregion
