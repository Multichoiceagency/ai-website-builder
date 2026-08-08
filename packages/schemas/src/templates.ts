import { z } from 'zod'
import { performanceClassSchema } from './blocks.js'

/**
 * Site template contracts (ADR-0002, ADR-0003).
 *
 * A template is **not** a design. It is *metadata about* a design: a style
 * direction, a motion character, a page archetype and an ordered recipe of
 * registry block ids that approximates it. Choosing a template steers two
 * things and nothing else:
 *
 *   1. which blocks `planSite` prefers — bounded by the performance ceiling,
 *      which a template can never raise;
 *   2. how the copy provider is briefed.
 *
 * What a template deliberately cannot carry: component source, markup, CSS, or
 * a URL to somebody else's bucket. The imported library the catalogue is
 * derived from is a set of *prompts describing hand-written HTML* full of
 * third-party CDN links; none of that may reach a customer page (ADR-0003), so
 * `noExternalUrl` is enforced at the schema boundary rather than trusted to the
 * importer.
 */

// region Guards

/**
 * Rejects anything that could pull a byte from a third party at render time.
 * Same-origin paths (`/templates/x.jpg`) pass; `https://…`, `//cdn…` and
 * `data:`-smuggled fetches do not.
 */
const noExternalUrl = (field: string, max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !/:\/\//.test(value) && !value.trimStart().startsWith('//'), {
      message: `${field} must be a same-origin path — external asset URLs are never stored on a template.`,
    })

// endregion

// region Vocabulary

/**
 * Browsable groups. Derived from the source library's own category and type
 * fields, then collapsed to the smallest set that still answers "what am I
 * looking for?" — a rail of sixty-three one-entry categories is not navigation.
 */
export const TEMPLATE_COLLECTIONS = [
  'hero',
  'landing',
  'saas',
  'agency',
  'ecommerce',
  'features',
  'conversion',
  'proof',
  'story',
  'interactive',
  'footer',
  'utility',
] as const

export const templateCollectionIdSchema = z.enum(TEMPLATE_COLLECTIONS)
export type TemplateCollectionId = z.infer<typeof templateCollectionIdSchema>

/**
 * The five directions the generator understands. Kept identical to
 * `GenerationRequest['style']` minus `auto` on purpose: a template's primary
 * style must be directly assignable to a generation request, or "this template
 * sets the style direction" is a lie the UI tells.
 */
export const TEMPLATE_STYLES = ['minimal', 'modern', 'premium', 'bold', 'editorial'] as const
export const templateStyleSchema = z.enum(TEMPLATE_STYLES)
export type TemplateStyle = z.infer<typeof templateStyleSchema>

/** What the design *does* over time. Feeds the browser's filters and the brief. */
export const TEMPLATE_MOTION_TYPES = [
  'static',
  'entrance',
  'scroll-reveal',
  'parallax',
  'sticky-scroll',
  'horizontal-scroll',
  'marquee',
  'carousel',
  'cursor',
  'hover',
  'text-effect',
  'morph',
  'particles',
  'three-d',
  'video',
] as const
export const templateMotionTypeSchema = z.enum(TEMPLATE_MOTION_TYPES)
export type TemplateMotionType = z.infer<typeof templateMotionTypeSchema>

/**
 * `section` templates describe one band of a page; `landing` templates describe
 * a whole page. The distinction is what makes a block recipe meaningful — a
 * hero recipe is one block, a landing recipe is a page.
 */
export const templatePageTypeSchema = z.enum(['section', 'landing'])
export type TemplatePageType = z.infer<typeof templatePageTypeSchema>

export const templateComplexitySchema = z.enum(['simple', 'moderate', 'advanced'])
export type TemplateComplexity = z.infer<typeof templateComplexitySchema>

/** Industry hints for selection. `*` means "suits anything". */
export const TEMPLATE_INDUSTRIES = [
  '*',
  'saas',
  'agency',
  'ecommerce',
  'fintech',
  'web3',
  'portfolio',
  'creative',
  'healthcare',
  'restaurant',
  'automotive',
  'real_estate',
  'travel',
  'education',
  'local',
] as const
export const templateIndustrySchema = z.enum(TEMPLATE_INDUSTRIES)
export type TemplateIndustry = z.infer<typeof templateIndustrySchema>

// endregion

// region Template

export const siteTemplateSchema = z.object({
  /** Stable id carried over from the source library. Never reused. */
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  collection: templateCollectionIdSchema,
  /** The source library's own category, kept for display and for provenance. */
  category: z.string().min(1).max(80),
  pageType: templatePageTypeSchema,
  /** Ordered; `style[0]` is the primary direction a generation request adopts. */
  style: z.array(templateStyleSchema).min(1).max(3),
  industry: z.array(templateIndustrySchema).min(1).max(6),
  motionType: z.array(templateMotionTypeSchema).min(1).max(6),
  complexity: templateComplexitySchema,
  /** False when the design leans on cursor tracking or wide horizontal motion. */
  mobileSafe: z.boolean(),
  performanceClass: performanceClassSchema,
  /**
   * Optional LOCAL dashboard preview assets under `/motionsites/...` for
   * browsing only. Same-origin paths — never gated CDN URLs. Published pages
   * must not depend on these; they are catalogue chrome, not page content.
   */
  previewImage: noExternalUrl('previewImage', 300).default(''),
  previewVideo: noExternalUrl('previewVideo', 300).default(''),
  /**
   * True when `@platform/motionsites-islands` has a built React island for this
   * template id. Insert then uses `motion-section-01` instead of the Vue recipe.
   */
  islandReady: z.boolean().default(false),
  isFree: z.boolean().default(true),
  /**
   * A sanitised excerpt of the original design brief: URLs, vendor table names
   * and stack instructions stripped. Human design reference and AI steering
   * context only — it is never rendered into a page and never fed to a model
   * that emits component source (ADR-0003).
   */
  sourcePrompt: noExternalUrl('sourcePrompt', 16000).default(''),
  /**
   * Ordered registry block ids that best approximate the template. Every id
   * must exist in `@platform/blocks`; where the registry has no equivalent the
   * slot is omitted rather than invented.
   */
  blockRecipe: z.array(z.string().min(1).max(64)).max(12).default([]),
})
export type SiteTemplate = z.infer<typeof siteTemplateSchema>

export const templateCollectionSchema = z.object({
  id: templateCollectionIdSchema,
  label: z.string(),
  description: z.string(),
  count: z.number().int().min(0).default(0),
})
export type TemplateCollection = z.infer<typeof templateCollectionSchema>

export const templateCatalogSchema = z.object({
  /** Bumped when the catalogue *shape* changes, not when templates change. */
  version: z.number().int().min(1).default(1),
  generatedAt: z.string(),
  /** Where the catalogue was normalised from, for provenance. */
  source: z.string().default(''),
  collections: z.array(templateCollectionSchema),
  templates: z.array(siteTemplateSchema),
})
export type TemplateCatalog = z.infer<typeof templateCatalogSchema>

// endregion

// region Query surface

const csvList = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : value,
    inner,
  )

/** The one query the browser, the picker and the generator all share. */
export const templateQuerySchema = z.object({
  search: z.string().max(120).optional(),
  collection: templateCollectionIdSchema.optional(),
  pageType: templatePageTypeSchema.optional(),
  style: templateStyleSchema.optional(),
  industry: templateIndustrySchema.optional(),
  motionType: csvList(z.array(templateMotionTypeSchema).max(6)).optional(),
  complexity: templateComplexitySchema.optional(),
  maxPerformanceClass: performanceClassSchema.optional(),
  mobileSafe: z.coerce.boolean().optional(),
  freeOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
})
export type TemplateQuery = z.infer<typeof templateQuerySchema>

// endregion

// region MotionSites backgrounds

/**
 * Atmospheric background recipes from the MotionSites backgrounds library.
 *
 * Metadata + a rebuild prompt + optional LOCAL dashboard preview paths under
 * `/motionsites/...` for browsing only. No gated CDN URLs, no third-party
 * markup (ADR-0003). Published pages must not depend on preview assets.
 * Choosing one steers the section AI / insert brief so the model can
 * approximate the *mood* with our own blocks and theme.
 */
export const motionBackgroundSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  /** Free tier in the source library. Premium entries stay listed but flagged. */
  isFree: z.boolean(),
  /**
   * Plain-language brief for the section AI. Same-origin / no URL rule as
   * `sourcePrompt` on templates — never rendered into the page.
   */
  rebuildPrompt: noExternalUrl('rebuildPrompt', 16000),
  /**
   * Optional LOCAL dashboard preview assets under `/motionsites/...` for
   * browsing only. Same-origin paths — never gated CDN URLs. Published pages
   * must not depend on these.
   */
  previewImage: noExternalUrl('previewImage', 300).default(''),
  previewVideo: noExternalUrl('previewVideo', 300).default(''),
  /** Registry block the insert places before AI rebuilds copy/atmosphere. */
  seedBlockId: z.string().min(1).max(64).default('hero-cover-statement-01'),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
})
export type MotionBackground = z.infer<typeof motionBackgroundSchema>

export const motionBackgroundCatalogSchema = z.object({
  version: z.number().int().min(1).default(1),
  generatedAt: z.string(),
  source: z.string().default(''),
  backgrounds: z.array(motionBackgroundSchema),
})
export type MotionBackgroundCatalog = z.infer<typeof motionBackgroundCatalogSchema>

export const motionBackgroundQuerySchema = z.object({
  search: z.string().max(120).optional(),
  freeOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(300).default(200),
})
export type MotionBackgroundQuery = z.infer<typeof motionBackgroundQuerySchema>

// endregion
