import { z } from 'zod'

/**
 * Theming shapes: the generated palette ramp, the resolved semantic token set,
 * and the contrast report.
 *
 * These are the *shapes* only. The maths that produces them — OKLCH conversion,
 * ramp generation, WCAG contrast — lives in `@platform/theming`, so this
 * package stays what ADR-0002 says it is: schemas, and nothing that executes.
 *
 * Everything here is additive to `themeSchema` in `cms.ts`. Themes stored
 * before any of this existed carry none of these fields and must keep parsing,
 * so every field the site theme gained is nullable with a `null` default.
 */

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb colour')

// region Palette ramp

/**
 * The Tailwind/shadcn step names. 500 is not the seed by convention — the seed
 * lands wherever its own lightness puts it — but 500/600 is where a brand
 * colour usually sits, and the ramp is built so that stays true.
 */
export const PALETTE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type PaletteStep = (typeof PALETTE_STEPS)[number]

export const paletteRampSchema = z.object({
  '50': hexColorSchema,
  '100': hexColorSchema,
  '200': hexColorSchema,
  '300': hexColorSchema,
  '400': hexColorSchema,
  '500': hexColorSchema,
  '600': hexColorSchema,
  '700': hexColorSchema,
  '800': hexColorSchema,
  '900': hexColorSchema,
  '950': hexColorSchema,
})
export type PaletteRamp = z.infer<typeof paletteRampSchema>

/**
 * A generated palette: the brand ramp plus the neutral ramp derived from it.
 * Stored on the theme so the editor can show where each token came from
 * without re-deriving, and so a token override is visibly an override.
 */
export const paletteSchema = z.object({
  /** The colour the ramps were generated from. */
  seed: hexColorSchema,
  brand: paletteRampSchema,
  neutral: paletteRampSchema,
})
export type Palette = z.infer<typeof paletteSchema>

// endregion

// region Mode & tokens

export const themeModeSchema = z.enum(['light', 'dark', 'system'])
export type ThemeMode = z.infer<typeof themeModeSchema>

/**
 * One complete set of resolved colours for one mode.
 *
 * This is the superset of what blocks read. The six flat colours on
 * `themeSchema` remain the authoritative *light* values — this shape carries
 * the dark half, and the extra semantics both halves gained.
 */
export const themeTokensSchema = z.object({
  surface: hexColorSchema,
  surfaceAlt: hexColorSchema,
  surfaceSunken: hexColorSchema,
  text: hexColorSchema,
  textMuted: hexColorSchema,
  line: hexColorSchema,
  lineStrong: hexColorSchema,
  primary: hexColorSchema,
  primaryHover: hexColorSchema,
  /** Text and icons placed *on* `primary`. Contrast-checked against it. */
  primaryInk: hexColorSchema,
  accent: hexColorSchema,
  accentInk: hexColorSchema,
  positive: hexColorSchema,
  warning: hexColorSchema,
  danger: hexColorSchema,
  focus: hexColorSchema,
})
export type ThemeTokens = z.infer<typeof themeTokensSchema>

export const THEME_TOKEN_KEYS = [
  'surface',
  'surfaceAlt',
  'surfaceSunken',
  'text',
  'textMuted',
  'line',
  'lineStrong',
  'primary',
  'primaryHover',
  'primaryInk',
  'accent',
  'accentInk',
  'positive',
  'warning',
  'danger',
  'focus',
] as const satisfies readonly (keyof ThemeTokens)[]

// endregion

// region shadcn preset catalogue

/**
 * The shadcn/ui token names, reproduced verbatim so a preset ported from
 * shadcn is recognisably the same thing. `toSiteTokens` in `@platform/theming`
 * maps these onto the `--site-*` variables the blocks actually read.
 */
export const shadcnTokensSchema = z.object({
  background: hexColorSchema,
  foreground: hexColorSchema,
  card: hexColorSchema,
  cardForeground: hexColorSchema,
  popover: hexColorSchema,
  popoverForeground: hexColorSchema,
  primary: hexColorSchema,
  primaryForeground: hexColorSchema,
  secondary: hexColorSchema,
  secondaryForeground: hexColorSchema,
  muted: hexColorSchema,
  mutedForeground: hexColorSchema,
  accent: hexColorSchema,
  accentForeground: hexColorSchema,
  destructive: hexColorSchema,
  destructiveForeground: hexColorSchema,
  border: hexColorSchema,
  input: hexColorSchema,
  ring: hexColorSchema,
})
export type ShadcnTokens = z.infer<typeof shadcnTokensSchema>

export const themePresetSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().min(1).max(60),
  /** `neutral` families read as greyscale; the rest carry a hue. */
  family: z.enum(['neutral', 'colour']),
  seed: hexColorSchema,
  light: shadcnTokensSchema,
  dark: shadcnTokensSchema,
})
export type ThemePreset = z.infer<typeof themePresetSchema>

// endregion

// region Contrast report

export const contrastUsageSchema = z.enum(['body', 'large', 'ui'])
export type ContrastUsage = z.infer<typeof contrastUsageSchema>

export const contrastPairSchema = z.object({
  /** Stable key, e.g. `light.textMuted-on-surface`. */
  id: z.string(),
  label: z.string(),
  mode: z.enum(['light', 'dark']),
  foreground: hexColorSchema,
  background: hexColorSchema,
  usage: contrastUsageSchema,
  /** Rounded to two decimals, the way every published checker reports it. */
  ratio: z.number(),
  minimum: z.number(),
  passes: z.boolean(),
})
export type ContrastPair = z.infer<typeof contrastPairSchema>

export const contrastReportSchema = z.object({
  passes: z.boolean(),
  pairs: z.array(contrastPairSchema),
  /** The failing subset of `pairs`, so the editor never has to filter to find them. */
  failures: z.array(contrastPairSchema),
})
export type ContrastReport = z.infer<typeof contrastReportSchema>

// endregion
