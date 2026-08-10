import { z } from 'zod'
import {
  hostnameSchema,
  isoTimestampSchema,
  localeSchema,
  pathSchema,
  slugSchema,
  uuidSchema,
} from './common.js'
import { pageDocumentSchema } from './blocks.js'
import { componentTargetsMapSchema } from './component-generator.js'
import { paletteSchema, themeModeSchema, themeTokensSchema } from './theming.js'

// region Theme

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb colour')

/**
 * A site's design tokens. Renderers turn these into CSS custom properties, so a
 * theme change never requires a code change or a rebuild of the block library.
 *
 * The six flat colours below are the *light* mode base and remain
 * authoritative — every site stored before the palette system existed has only
 * those, and must keep rendering byte-identically. Everything added since is
 * nullable with a `null` default, meaning "not set, fall back to what the
 * renderer did before", so `themeSchema.parse(oldRow)` still succeeds and still
 * produces the same page.
 *
 * Site-wide content measure presets emit `--site-content-width` (and
 * `--site-content-max` as an alias). Full-bleed Motionsites / heroes stay
 * edge-to-edge; sections that opt into `maxWidth: wide` consume the token.
 */
export const CONTENT_WIDTH_PRESETS = ['full', '1280', '1440', '1600', 'custom'] as const
export const contentWidthPresetSchema = z.enum(CONTENT_WIDTH_PRESETS)
export type ContentWidthPreset = z.infer<typeof contentWidthPresetSchema>

export const CONTENT_WIDTH_PRESET_PX: Record<Exclude<ContentWidthPreset, 'full' | 'custom'>, number> = {
  '1280': 1280,
  '1440': 1440,
  '1600': 1600,
}

/** Resolve theme content width to a CSS length for `--site-content-width`. */
export function resolveContentWidthCss(theme: {
  contentWidth?: ContentWidthPreset | null
  contentWidthPx?: number | null
}): string {
  const preset = theme.contentWidth ?? 'full'
  if (preset === 'full') return '100%'
  if (preset === 'custom') {
    const px = theme.contentWidthPx
    return typeof px === 'number' && px >= 320 ? `${px}px` : '1440px'
  }
  return `${CONTENT_WIDTH_PRESET_PX[preset]}px`
}

/** Numeric px for editor canvas sizing; `null` when edge-to-edge (full). */
export function resolveContentWidthPx(theme: {
  contentWidth?: ContentWidthPreset | null
  contentWidthPx?: number | null
}): number | null {
  const preset = theme.contentWidth ?? 'full'
  if (preset === 'full') return null
  if (preset === 'custom') {
    const px = theme.contentWidthPx
    return typeof px === 'number' && px >= 320 ? px : 1440
  }
  return CONTENT_WIDTH_PRESET_PX[preset]
}

export const themeSchema = z.object({
  colorPrimary: hexColorSchema.default('#1d4ed8'),
  colorAccent: hexColorSchema.default('#0f766e'),
  colorSurface: hexColorSchema.default('#ffffff'),
  colorSurfaceAlt: hexColorSchema.default('#f5f5f4'),
  colorText: hexColorSchema.default('#18181b'),
  colorTextMuted: hexColorSchema.default('#52525b'),
  fontHeading: z.string().min(1).max(120).default('Figtree'),
  fontBody: z.string().min(1).max(120).default('Rubik'),
  radius: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
  /**
   * Default content column for the site. `full` = unconstrained (legacy).
   * Pixel presets and `custom` set `--site-content-width`; sections with
   * `style.maxWidth: wide` follow it. Full-bleed blocks ignore the measure.
   */
  contentWidth: contentWidthPresetSchema.default('full'),
  /** Used when `contentWidth` is `custom`. Null otherwise. */
  contentWidthPx: z.number().int().min(320).max(2400).nullable().default(null),
  /**
   * Optional CSS gradients for primary fill / page surface / alt surface.
   * Null → solid `color*` tokens only. Hex fields stay authoritative for
   * contrast maths; gradients are paint only.
   */
  gradientPrimary: z.string().max(240).nullable().default(null),
  gradientSurface: z.string().max(240).nullable().default(null),
  gradientSurfaceAlt: z.string().max(240).nullable().default(null),
  /**
   * Ceiling for block selection on this site. AI and the block picker will not
   * offer heavier blocks than this. See ADR-0003.
   */
  maxPerformanceClass: z.enum(['A', 'B', 'C', 'D']).default('B'),

  // --- Extended light tokens (additive; null means "derive as before") -------

  /** Darker/lighter primary for hover. Null → renderer shades `colorPrimary`. */
  colorPrimaryHover: hexColorSchema.nullable().default(null),
  /** Text placed *on* the primary fill. Null → `#ffffff`, which is what blocks hard-coded. */
  colorPrimaryInk: hexColorSchema.nullable().default(null),
  colorAccentInk: hexColorSchema.nullable().default(null),
  /** Hairline divider. Null → the `color-mix` of text into surface the renderer already used. */
  colorLine: hexColorSchema.nullable().default(null),
  /** Control boundaries, which unlike hairlines must clear 3:1 (SC 1.4.11). */
  colorLineStrong: hexColorSchema.nullable().default(null),
  colorSurfaceSunken: hexColorSchema.nullable().default(null),
  colorPositive: hexColorSchema.nullable().default(null),
  colorWarning: hexColorSchema.nullable().default(null),
  colorDanger: hexColorSchema.nullable().default(null),
  colorFocus: hexColorSchema.nullable().default(null),

  // --- Palette, mode and the dark half --------------------------------------

  /** Which mode the published site renders in. `system` follows the visitor's OS. */
  mode: themeModeSchema.default('light'),
  /** The generated ramps this theme came from, kept so the editor can show provenance. */
  palette: paletteSchema.nullable().default(null),
  /** The complete dark token set. Null → the site has no dark mode and `mode` is ignored. */
  dark: themeTokensSchema.nullable().default(null),
  /** Which preset seeded this theme, if any. Cleared as soon as a token is overridden. */
  presetId: z.string().min(1).max(60).nullable().default(null),
})
export type Theme = z.infer<typeof themeSchema>

// endregion

// region SEO

export const seoSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(180).optional(),
  ogImage: z.string().url().max(2048).optional(),
  canonical: z.string().url().max(2048).optional(),
  noIndex: z.boolean().default(false),
})
export type Seo = z.infer<typeof seoSchema>

// endregion

// region Site

export const SITE_KINDS = ['website', 'ecommerce'] as const
export const siteKindSchema = z.enum(SITE_KINDS)
export type SiteKind = z.infer<typeof siteKindSchema>

export const siteSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  name: z.string().min(1).max(200),
  slug: slugSchema,
  locale: localeSchema,
  /** Brochure / marketing site vs full commerce storefront. */
  kind: siteKindSchema.default('website'),
  theme: themeSchema,
  /**
   * System UX slots → registry block + props (ADR-0003). Populated by the
   * components generator (header, product card, section, …).
   */
  componentTargets: componentTargetsMapSchema,
  /** Hostname the site is served from; null until a domain is connected. */
  primaryHostname: hostnameSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type Site = z.infer<typeof siteSchema>

export const createSiteInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema,
  locale: localeSchema.default('nl'),
  kind: siteKindSchema.default('website'),
  theme: themeSchema.partial().optional(),
})
export type CreateSiteInput = z.infer<typeof createSiteInputSchema>

export const updateSiteInputSchema = z
  .object({
    name: z.string().min(1).max(200),
    locale: localeSchema,
    kind: siteKindSchema,
    theme: themeSchema.partial(),
    componentTargets: componentTargetsMapSchema,
  })
  .partial()
export type UpdateSiteInput = z.infer<typeof updateSiteInputSchema>

// endregion

// region Page

export const pageStatusSchema = z.enum(['draft', 'published'])
export type PageStatus = z.infer<typeof pageStatusSchema>

export const PAGE_ROLES = ['page', 'header', 'footer'] as const
export const pageRoleSchema = z.enum(PAGE_ROLES)
export type PageRole = z.infer<typeof pageRoleSchema>

export const pageSummarySchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  path: pathSchema,
  title: z.string().min(1).max(200),
  status: pageStatusSchema,
  role: pageRoleSchema.default('page'),
  sectionCount: z.number().int().min(0),
  hasUnpublishedChanges: z.boolean(),
  publishedAt: isoTimestampSchema.nullable(),
  updatedAt: isoTimestampSchema,
})
export type PageSummary = z.infer<typeof pageSummarySchema>

export const pageSchema = pageSummarySchema.extend({
  seo: seoSchema,
  /** The working document. This is what the editor and AI mutate. */
  sections: pageDocumentSchema,
  createdAt: isoTimestampSchema,
})
export type Page = z.infer<typeof pageSchema>

export const createPageInputSchema = z.object({
  path: pathSchema,
  title: z.string().min(1).max(200),
  role: pageRoleSchema.default('page'),
  seo: seoSchema.partial().optional(),
  sections: pageDocumentSchema.optional(),
})
export type CreatePageInput = z.infer<typeof createPageInputSchema>

export const updatePageInputSchema = z
  .object({
    path: pathSchema,
    title: z.string().min(1).max(200),
    seo: seoSchema.partial(),
    sections: pageDocumentSchema,
  })
  .partial()
export type UpdatePageInput = z.infer<typeof updatePageInputSchema>

export const pageRevisionSchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  title: z.string(),
  sectionCount: z.number().int().min(0),
  reason: z.string(),
  createdBy: z.string(),
  createdAt: isoTimestampSchema,
})
export type PageRevision = z.infer<typeof pageRevisionSchema>

// endregion

// region Navigation

export const navigationItemSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(2048),
})
export type NavigationItem = z.infer<typeof navigationItemSchema>

export const navigationSchema = z.object({
  key: z.enum(['primary', 'footer']),
  items: z.array(navigationItemSchema).max(24),
})
export type Navigation = z.infer<typeof navigationSchema>

// endregion

// region Public (storefront) read model

/**
 * Exactly what a renderer needs to paint a page, and nothing more. Note it
 * carries `publishedSections`, never the draft — the public API has no path to
 * unpublished content.
 */
export const publicPageSchema = z.object({
  site: z.object({
    name: z.string(),
    locale: localeSchema,
    theme: themeSchema,
    /**
     * Site brand / SEO business logo. Headers fall back to this when their own
     * logo prop is empty (`header-simple-01`).
     */
    logo: z.string().max(2048).default(''),
  }),
  page: z.object({
    path: pathSchema,
    title: z.string(),
    seo: seoSchema,
    sections: pageDocumentSchema,
    publishedAt: isoTimestampSchema.nullable(),
  }),
  navigation: z.array(navigationSchema),
})
export type PublicPage = z.infer<typeof publicPageSchema>

// endregion
