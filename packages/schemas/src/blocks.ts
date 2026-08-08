import { z } from 'zod'
import { sectionSeoSchema } from './seo.js'

// region Motion

/**
 * Motion is stored as *intent*, never as framework-specific animation code.
 * A Nuxt renderer maps `fade-up` to its own implementation; a future React
 * renderer maps the same token to Framer Motion. See ADR-0003.
 */
export const MOTION_PRESETS = [
  'none',
  'fade-in',
  'fade-up',
  'fade-down',
  'slide-left',
  'slide-right',
  'scale-in',
  'blur-in',
  'stagger-children',
  'hero-reveal',
  'product-reveal',
] as const

export const motionPresetSchema = z.enum(MOTION_PRESETS)
export type MotionPreset = z.infer<typeof motionPresetSchema>

export const sectionMotionSchema = z.object({
  preset: motionPresetSchema.default('fade-up'),
  trigger: z.enum(['viewport', 'load', 'none']).default('viewport'),
  /** Seconds before the animation starts. */
  delay: z.number().min(0).max(2).default(0),
  /** Seconds between children for stagger presets. */
  stagger: z.number().min(0).max(0.5).default(0.08),
  /** Animate only the first time the section enters the viewport. */
  once: z.boolean().default(true),
})
export type SectionMotion = z.infer<typeof sectionMotionSchema>

// endregion

// region Block metadata

export const BLOCK_CATEGORIES = [
  'header',
  'hero',
  'features',
  'services',
  'about',
  'testimonials',
  'logos',
  'stats',
  'gallery',
  'pricing',
  'product',
  'faq',
  'cta',
  'contact',
  'content',
  'blog',
  'team',
  'footer',
] as const

export const blockCategorySchema = z.enum(BLOCK_CATEGORIES)
export type BlockCategory = z.infer<typeof blockCategorySchema>

/**
 * Rendering cost class. Generated sites default to A/B; C and D require an
 * explicit choice and a performance budget that can absorb them.
 *
 *  A — static markup, no JS beyond entrance motion
 *  B — light motion, small JS
 *  C — advanced animation, scroll orchestration
 *  D — WebGL / cinematic
 */
export const performanceClassSchema = z.enum(['A', 'B', 'C', 'D'])
export type PerformanceClass = z.infer<typeof performanceClassSchema>

export const blockScoresSchema = z.object({
  performance: z.number().int().min(0).max(100),
  accessibility: z.number().int().min(0).max(100),
  mobile: z.number().int().min(0).max(100),
})
export type BlockScores = z.infer<typeof blockScoresSchema>

const leafFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'url', 'image', 'media', 'boolean', 'number', 'select', 'icon']),
  help: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
})

/**
 * Editor field descriptors. The dashboard renders a form from these rather than
 * shipping a bespoke settings panel per block — that is what keeps the editor
 * simple as the registry grows.
 */
export const blockFieldSchema = leafFieldSchema.extend({
  type: z.enum(['text', 'textarea', 'url', 'image', 'media', 'boolean', 'number', 'select', 'items', 'icon']),
  /** For `items`: the shape of one repeatable entry. */
  itemFields: z.array(leafFieldSchema).optional(),
  itemLabel: z.string().optional(),
  maxItems: z.number().int().min(1).optional(),
})
export type BlockField = z.infer<typeof blockFieldSchema>

/**
 * The serialisable half of a block definition — everything the dashboard, the
 * AI block selector and the public registry API need. The Zod props schema
 * itself stays in `@platform/blocks` because it is runtime code.
 */
export const blockMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-\d{2}$/, 'block ids look like `hero-split-01`'),
  version: z.number().int().min(1),
  name: z.string(),
  description: z.string(),
  category: blockCategorySchema,
  capabilities: z.array(z.string()),
  industries: z.array(z.string()),
  style: z.array(z.string()),
  performanceClass: performanceClassSchema,
  scores: blockScoresSchema,
  frameworks: z.array(z.enum(['nuxt', 'react'])),
  fields: z.array(blockFieldSchema),
  defaults: z.record(z.unknown()),
  defaultMotion: sectionMotionSchema,
})
export type BlockMetadata = z.infer<typeof blockMetadataSchema>

/** Filters shared by the dashboard block picker and the AI block selector. */
export const blockQuerySchema = z.object({
  category: blockCategorySchema.optional(),
  industry: z.string().optional(),
  style: z.string().optional(),
  maxPerformanceClass: performanceClassSchema.optional(),
  minPerformanceScore: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().max(120).optional(),
})
export type BlockQuery = z.infer<typeof blockQuerySchema>

// endregion

// region Sections

export const sectionVisibilitySchema = z.object({
  mobile: z.boolean().default(true),
  tablet: z.boolean().default(true),
  desktop: z.boolean().default(true),
})
export type SectionVisibility = z.infer<typeof sectionVisibilitySchema>

const sectionHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb colour')

export const SECTION_STYLE_SCALES = ['sm', 'md', 'lg', 'xl'] as const
export const sectionStyleScaleSchema = z.enum(SECTION_STYLE_SCALES)
export type SectionStyleScale = z.infer<typeof sectionStyleScaleSchema>

export const SECTION_STYLE_BACKGROUNDS = ['transparent', 'surface', 'primary', 'accent'] as const
export const sectionStyleBackgroundSchema = z.union([
  sectionHexSchema,
  z.enum(SECTION_STYLE_BACKGROUNDS),
])
export type SectionStyleBackground = z.infer<typeof sectionStyleBackgroundSchema>

export const SECTION_STYLE_TEXTS = ['ink', 'muted', 'on-primary'] as const
export const sectionStyleTextSchema = z.union([sectionHexSchema, z.enum(SECTION_STYLE_TEXTS)])
export type SectionStyleText = z.infer<typeof sectionStyleTextSchema>

export const SECTION_STYLE_PADDINGS = ['sm', 'md', 'lg', 'xl'] as const
export const sectionStylePaddingSchema = z.enum(SECTION_STYLE_PADDINGS)
export type SectionStylePadding = z.infer<typeof sectionStylePaddingSchema>

/** Content measure presets — px tokens match assistant `setContentWidth` actions. */
export const SECTION_STYLE_MAX_WIDTHS = ['content', 'wide', 'full', '1280', '1440', '1600'] as const
export const sectionStyleMaxWidthSchema = z.enum(SECTION_STYLE_MAX_WIDTHS)
export type SectionStyleMaxWidth = z.infer<typeof sectionStyleMaxWidthSchema>

export const SECTION_STYLE_ALIGNS = ['start', 'center', 'end'] as const
export const sectionStyleAlignSchema = z.enum(SECTION_STYLE_ALIGNS)
export type SectionStyleAlign = z.infer<typeof sectionStyleAlignSchema>

export const SECTION_STYLE_GAPS = ['sm', 'md', 'lg'] as const
export const sectionStyleGapSchema = z.enum(SECTION_STYLE_GAPS)
export type SectionStyleGap = z.infer<typeof sectionStyleGapSchema>

export const SECTION_STYLE_TYPE_SCALES = ['sm', 'md', 'lg'] as const
export const sectionStyleTypeScaleSchema = z.enum(SECTION_STYLE_TYPE_SCALES)
export type SectionStyleTypeScale = z.infer<typeof sectionStyleTypeScaleSchema>

/**
 * Per-section visual overrides. Applied as CSS variables on the section wrapper
 * so every block inherits colour, layout, and type without per-block rewrites.
 *
 * `scale` defaults to `md` at render time when omitted. Colour fields accept a
 * theme token or a raw `#rrggbb` hex; `accent: null` clears an override.
 */
export const sectionStyleSchema = z.object({
  scale: sectionStyleScaleSchema.optional(),
  background: sectionStyleBackgroundSchema.optional(),
  text: sectionStyleTextSchema.optional(),
  accent: sectionHexSchema.nullable().optional(),
  /** Vertical padding band for the section shell. */
  paddingY: sectionStylePaddingSchema.optional(),
  /** Horizontal padding band for the section shell. */
  paddingX: sectionStylePaddingSchema.optional(),
  /** Content measure: reading column, site wide token, px presets, or full-bleed. */
  maxWidth: sectionStyleMaxWidthSchema.optional(),
  /** Horizontal alignment of the content cluster. */
  align: sectionStyleAlignSchema.optional(),
  /** Internal stack gap hint for multi-block bands. */
  gap: sectionStyleGapSchema.optional(),
  /** Optional Google Font family for headings in this section. */
  fontHeading: z.string().min(1).max(80).optional(),
  /** Optional Google Font family for body copy in this section. */
  fontBody: z.string().min(1).max(80).optional(),
  /** Local type density (independent of layout `scale` zoom). */
  typeScale: sectionStyleTypeScaleSchema.optional(),
})
export type SectionStyle = z.infer<typeof sectionStyleSchema>

/** Spacing density multipliers — `md` is identity (no zoom). */
export const SECTION_STYLE_SCALE_FACTORS: Record<SectionStyleScale, number> = {
  sm: 0.85,
  md: 1,
  lg: 1.15,
  xl: 1.3,
}

const SECTION_PAD_Y: Record<SectionStylePadding, string> = {
  sm: '2.5rem',
  md: '4rem',
  lg: '6rem',
  xl: '8rem',
}

const SECTION_PAD_X: Record<SectionStylePadding, string> = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
}

const SECTION_MAX_WIDTH: Record<SectionStyleMaxWidth, string> = {
  content: '42rem',
  /** Follows site theme `contentWidth` via `--site-content-width`. */
  wide: 'min(100%, var(--site-content-width, 72rem))',
  full: '100%',
  '1280': '1280px',
  '1440': '1440px',
  '1600': '1600px',
}

/** Resolve a section max-width token to a CSS length. */
export function resolveSectionMaxWidthCss(maxWidth: SectionStyleMaxWidth): string {
  return SECTION_MAX_WIDTH[maxWidth]
}

const SECTION_GAP: Record<SectionStyleGap, string> = {
  sm: '0.75rem',
  md: '1.25rem',
  lg: '2rem',
}

const SECTION_TYPE_SCALE: Record<SectionStyleTypeScale, string> = {
  sm: '0.92',
  md: '1',
  lg: '1.08',
}

/**
 * Resolve `section.style` into inline CSS custom properties for the section
 * wrapper. Blocks already read `--site-*`; remapping those here is enough for
 * colour inheritance. Scale is exposed as `--section-scale` and `zoom`.
 */
export function sectionStyleToCssVars(style?: SectionStyle | null): Record<string, string> {
  if (!style) return {}

  const vars: Record<string, string> = {}
  const scale = style.scale ?? 'md'
  const factor = SECTION_STYLE_SCALE_FACTORS[scale]
  vars['--section-scale'] = String(factor)
  if (scale !== 'md') vars.zoom = String(factor)

  if (style.paddingY) {
    vars['--section-pad-y'] = SECTION_PAD_Y[style.paddingY]
    vars['padding-block'] = SECTION_PAD_Y[style.paddingY]
  }
  if (style.paddingX) {
    vars['--section-pad-x'] = SECTION_PAD_X[style.paddingX]
    vars['padding-inline'] = SECTION_PAD_X[style.paddingX]
  }
  if (style.maxWidth) {
    const cssMax = resolveSectionMaxWidthCss(style.maxWidth)
    vars['--section-max'] = cssMax
    if (style.maxWidth !== 'full') {
      vars['max-width'] = cssMax
      vars['margin-inline'] = 'auto'
      vars.width = '100%'
    }
  }
  if (style.align) {
    vars['--section-align'] = style.align
    vars['text-align'] =
      style.align === 'start' ? 'start' : style.align === 'end' ? 'end' : 'center'
  }
  if (style.gap) {
    vars['--section-gap'] = SECTION_GAP[style.gap]
  }
  if (style.fontHeading) {
    vars['--site-font-heading'] = `'${style.fontHeading.replace(/'/g, '')}', ui-sans-serif, system-ui, sans-serif`
  }
  if (style.fontBody) {
    vars['--site-font-body'] = `'${style.fontBody.replace(/'/g, '')}', ui-sans-serif, system-ui, sans-serif`
  }
  if (style.typeScale) {
    vars['--section-type-scale'] = SECTION_TYPE_SCALE[style.typeScale]
  }

  const background = style.background
  if (background === 'transparent') {
    vars['background-color'] = 'transparent'
  } else if (background === 'surface') {
    vars['background-color'] = 'var(--site-surface-alt)'
    vars['--site-surface'] = 'var(--site-surface-alt)'
  } else if (background === 'primary') {
    vars['background-color'] = 'var(--site-primary)'
    vars['--site-surface'] = 'var(--site-primary)'
  } else if (background === 'accent') {
    vars['background-color'] = 'var(--site-accent)'
    vars['--site-surface'] = 'var(--site-accent)'
  } else if (background) {
    vars['background-color'] = background
    vars['--site-surface'] = background
  }

  const text = style.text
  if (text === 'ink') {
    // Inherit theme ink — no remap.
  } else if (text === 'muted') {
    vars['--site-text'] = 'var(--site-text-muted)'
  } else if (text === 'on-primary') {
    vars['--site-text'] = 'var(--site-primary-ink)'
    vars['--site-text-muted'] = 'color-mix(in oklab, var(--site-primary-ink) 72%, transparent)'
  } else if (text) {
    vars['--site-text'] = text
    vars['--site-text-muted'] = `color-mix(in oklab, ${text} 68%, transparent)`
  }

  if (style.accent === null) {
    // Explicit clear — leave theme accent as-is.
  } else if (style.accent) {
    vars['--site-accent'] = style.accent
    // Tint primary-driven block accents (eyebrows, icon chips) for this section.
    // If `background` is also the `primary` token, fill resolves to this accent too —
    // intentional: a section accent override restyles the whole band.
    vars['--site-primary'] = style.accent
  }

  return vars
}

/**
 * One placed block on a page. `props` is validated against the referenced
 * block's own schema at write time and again at render time — a block can be
 * revised, and stored props must never crash a renderer.
 */
export const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  block: z.string().min(1).max(64),
  props: z.record(z.unknown()).default({}),
  motion: sectionMotionSchema.optional(),
  visibility: sectionVisibilitySchema.optional(),
  /** Optional visual overrides — see `sectionStyleSchema`. */
  style: sectionStyleSchema.optional(),
  /**
   * Per-section SEO: anchor, heading rank, ToC and structured-data role.
   * Optional and undefaulted on purpose — a document written before this
   * existed parses unchanged and gains no keys. See `sectionSeoSchema`.
   */
  seo: sectionSeoSchema.optional(),
})
export type Section = z.infer<typeof sectionSchema>

export const pageDocumentSchema = z.array(sectionSchema).max(80)
export type PageDocument = z.infer<typeof pageDocumentSchema>

// endregion
