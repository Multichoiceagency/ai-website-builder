import { z } from 'zod'
import { isoTimestampSchema, localeSchema, pathSchema, slugSchema, uuidSchema } from './common.js'
import { openingHoursSchema } from './business.js'

/**
 * SEO contracts (§15).
 *
 * Every cross-boundary shape for this domain lives here (ADR-0002): the audit
 * report the dashboard renders, the structured-data graph a renderer emits, the
 * content-quality verdict the generator must pass before it may publish, and
 * the keyword records we store whether or not a rank provider is connected.
 */

// region Per-section SEO

/**
 * A section can only affect a handful of things a search engine cares about,
 * and this is deliberately that list — not a copy of the page-level fields.
 * Whether a section is indexed, canonical or titled is a property of the page
 * it sits on; where it sits in the document outline is a property of the
 * section.
 *
 * The whole object is optional on `sectionSchema`, and every field inside it
 * is optional or defaulted, so a document written before this existed parses
 * unchanged and gains no keys.
 */
export const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4'] as const
export const headingLevelSchema = z.enum(HEADING_LEVELS)
export type HeadingLevel = z.infer<typeof headingLevelSchema>

/**
 * Types a section may claim responsibility for. Constrained to what the
 * platform actually emits — a hint for a type nothing can render is a promise
 * the graph cannot keep.
 */
export const SECTION_SCHEMA_TYPES = ['FAQPage', 'Product', 'LocalBusiness', 'BreadcrumbList'] as const
export const sectionSchemaTypeSchema = z.enum(SECTION_SCHEMA_TYPES)
export type SectionSchemaType = z.infer<typeof sectionSchemaTypeSchema>

export const sectionSeoSchema = z.object({
  /** Fragment target, so the section is linkable and can carry a ToC entry. */
  anchorId: slugSchema.optional(),
  /**
   * Override the heading rank this section renders.
   *
   * This is the field with real weight: two hero blocks on one page render two
   * `<h1>`s, which breaks the document outline for assistive technology and
   * confuses every crawler. Demoting the second one to `h2` fixes it without
   * changing the design.
   */
  headingLevel: headingLevelSchema.optional(),
  includeInToc: z.boolean().default(true),
  /** Which node in the page's structured-data graph this section stands for. */
  schemaType: sectionSchemaTypeSchema.optional(),
  /** Ask search engines not to quote this section in a snippet. */
  noSnippet: z.boolean().default(false),
})
export type SectionSeo = z.infer<typeof sectionSeoSchema>

/**
 * Blocks whose renderers accept a heading-level override.
 *
 * One list, two consumers: the Nuxt renderer passes the level down only for
 * these, and the audit only believes a declared level for these. Anything else
 * renders its natural rank — `h1` for a hero, `h2` for a section — and the
 * audit says so rather than reporting an outline the page does not have.
 *
 * Extending it means converting that block's heading tag first.
 */
export const HEADING_LEVEL_AWARE_BLOCKS = [
  'hero-split-01',
  'hero-centered-01',
  'hero-kinetic-01',
  'hero-aurora-01',
  'hero-mask-reveal-01',
  'hero-oversized-type-01',
  'hero-split-screen-01',
  'hero-agency-proof-01',
  'hero-property-01',
  'hero-portrait-01',
  'hero-saas-preview-01',
  'hero-cover-statement-01',
  'hero-asymmetric-01',
  'content-richtext-01',
  'features-grid-01',
  'services-list-01',
  'faq-accordion-01',
  'cta-banner-01',
  'testimonials-grid-01',
  'contact-details-01',
  'contact-form-01',
  'feature-spotlight-01',
  'showcase-parallax-01',
] as const

export function rendersConfigurableHeading(blockId: string): boolean {
  return (HEADING_LEVEL_AWARE_BLOCKS as readonly string[]).includes(blockId)
}

// endregion

// region Issues

/**
 * Severity is a promise about consequence, not about effort:
 *
 *  critical — the page is broken for search: no title, no H1, a link to a page
 *             that does not exist. Fix before publishing.
 *  warning  — the page will be indexed but competes badly.
 *  info     — a refinement; ignoring it costs little.
 */
export const seoSeveritySchema = z.enum(['critical', 'warning', 'info'])
export type SeoSeverity = z.infer<typeof seoSeveritySchema>

/**
 * Issue codes are a stable API — the dashboard groups on them and automations
 * will act on them. Add rather than rename.
 */
export const SEO_ISSUE_CODES = [
  'missing_title',
  'duplicate_title',
  'title_too_long',
  'title_too_short',
  'missing_description',
  'description_too_long',
  'description_too_short',
  'duplicate_path',
  'thin_content',
  'missing_h1',
  'multiple_h1',
  'orphan_page',
  'broken_internal_link',
  'missing_og_image',
  'noindex_published',
  'no_published_pages',
  'missing_home_page',
  // per-section findings
  'heading_level_skip',
  'duplicate_anchor_id',
  'heading_level_not_rendered',
  'schema_type_without_data',
] as const

export const seoIssueCodeSchema = z.enum(SEO_ISSUE_CODES)
export type SeoIssueCode = z.infer<typeof seoIssueCodeSchema>

/**
 * One finding. It always carries a concrete fix, because an audit that reports
 * "title too long" without saying what to do with it is a to-do list, not a
 * tool.
 */
export const seoIssueSchema = z.object({
  code: seoIssueCodeSchema,
  severity: seoSeveritySchema,
  message: z.string().max(400),
  fix: z.string().max(400),
  /** Null for site-wide findings. */
  pageId: uuidSchema.nullable().default(null),
  path: z.string().max(512).nullable().default(null),
  /** Extra detail the UI can show inline — the offending link, the duplicate. */
  context: z.record(z.unknown()).default({}),
})
export type SeoIssue = z.infer<typeof seoIssueSchema>

export const seoIssueCountsSchema = z.object({
  critical: z.number().int().min(0),
  warning: z.number().int().min(0),
  info: z.number().int().min(0),
})
export type SeoIssueCounts = z.infer<typeof seoIssueCountsSchema>

// endregion

// region Audit

export const seoPageScoreSchema = z.object({
  pageId: uuidSchema,
  path: z.string().max(512),
  title: z.string().max(200),
  status: z.enum(['draft', 'published']),
  score: z.number().int().min(0).max(100),
  wordCount: z.number().int().min(0),
  sectionCount: z.number().int().min(0),
  issues: z.array(seoIssueSchema),
})
export type SeoPageScore = z.infer<typeof seoPageScoreSchema>

export const seoAuditSchema = z.object({
  siteId: uuidSchema,
  score: z.number().int().min(0).max(100),
  pageCount: z.number().int().min(0),
  publishedCount: z.number().int().min(0),
  issueCounts: seoIssueCountsSchema,
  /** Findings that belong to the site rather than to one page. */
  siteIssues: z.array(seoIssueSchema),
  pages: z.array(seoPageScoreSchema),
  generatedAt: isoTimestampSchema,
})
export type SeoAudit = z.infer<typeof seoAuditSchema>

// endregion

// region Content quality gate

/**
 * The gate from §15: programmatic and local-SEO pages only ship when they say
 * something. Every signal is derived from the page document — nothing here
 * needs a model, so the generator can call it inline before it publishes.
 */
export const contentQualitySignalSchema = z.object({
  id: z.enum([
    'word_count',
    'section_count',
    'section_variety',
    'has_heading',
    'has_meta_description',
    'internal_links',
    'original_copy',
  ]),
  label: z.string().max(120),
  /** 0–1, how well this signal is met. */
  value: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  detail: z.string().max(300),
})
export type ContentQualitySignal = z.infer<typeof contentQualitySignalSchema>

export const contentQualityReportSchema = z.object({
  score: z.number().int().min(0).max(100),
  threshold: z.number().int().min(0).max(100),
  passed: z.boolean(),
  wordCount: z.number().int().min(0),
  sectionCount: z.number().int().min(0),
  signals: z.array(contentQualitySignalSchema),
  /** Why it failed, in the words the UI shows. Empty when it passed. */
  blockers: z.array(z.string().max(300)),
})
export type ContentQualityReport = z.infer<typeof contentQualityReportSchema>

// endregion

// region Structured data

export const seoAddressSchema = z.object({
  street: z.string().max(200).default(''),
  postalCode: z.string().max(20).default(''),
  city: z.string().max(120).default(''),
  region: z.string().max(120).default(''),
  country: z.string().max(120).default(''),
})
export type SeoAddress = z.infer<typeof seoAddressSchema>

/**
 * The business facts structured data needs, stored per site.
 *
 * Deliberately a projection of `businessProfileSchema` rather than the whole
 * thing: discovery produces a profile, but what a `LocalBusiness` node needs is
 * a small, editable subset that a user can correct by hand.
 */
export const seoBusinessSchema = z.object({
  type: z
    .enum(['LocalBusiness', 'Organization', 'ProfessionalService', 'Store', 'Restaurant'])
    .default('LocalBusiness'),
  name: z.string().max(200).default(''),
  legalName: z.string().max(200).default(''),
  description: z.string().max(1000).default(''),
  phone: z.string().max(60).default(''),
  email: z.string().max(320).default(''),
  priceRange: z.string().max(20).default(''),
  logo: z.string().max(2048).default(''),
  address: seoAddressSchema.default({}),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingHours: z.array(openingHoursSchema).max(14).default([]),
  /** Social and directory profiles — `sameAs` in schema.org terms. */
  sameAs: z.array(z.string().max(2048)).max(20).default([]),
})
export type SeoBusiness = z.infer<typeof seoBusinessSchema>

/**
 * A product for a `Product` node. Commerce (Phase 5) owns the catalogue; this
 * is the shape it hands over, so the graph builder never learns a store's
 * internals (ADR-0006).
 */
export const seoProductSchema = z.object({
  name: z.string().max(200),
  description: z.string().max(2000).default(''),
  sku: z.string().max(120).default(''),
  brand: z.string().max(200).default(''),
  image: z.string().max(2048).default(''),
  price: z.number().min(0).optional(),
  priceCurrency: z.string().max(3).default('EUR'),
  availability: z.enum(['InStock', 'OutOfStock', 'PreOrder']).default('InStock'),
  url: z.string().max(2048).default(''),
})
export type SeoProduct = z.infer<typeof seoProductSchema>

/** A JSON-LD node. Loose on purpose: schema.org is open-ended. */
export const jsonLdNodeSchema = z.record(z.unknown())

export const jsonLdGraphSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@graph': z.array(jsonLdNodeSchema),
})
export type JsonLdGraph = z.infer<typeof jsonLdGraphSchema>

/**
 * A node the page-level graph deliberately left out because a block renderer
 * already emits it. Reported rather than hidden: duplicate structured data is a
 * real defect, and "why is my FAQ missing here?" deserves an answer.
 */
export const suppressedNodeSchema = z.object({
  type: z.string().max(60),
  emittedBy: z.string().max(64),
  reason: z.string().max(300),
})
export type SuppressedNode = z.infer<typeof suppressedNodeSchema>

export const structuredDataResultSchema = z.object({
  pageId: uuidSchema,
  path: z.string().max(512),
  graph: jsonLdGraphSchema,
  suppressed: z.array(suppressedNodeSchema),
})
export type StructuredDataResult = z.infer<typeof structuredDataResultSchema>

// endregion

// region Site settings

export const seoSettingsSchema = z.object({
  siteId: uuidSchema,
  business: seoBusinessSchema,
  /** Search engines are asked to stay away entirely while this is false. */
  indexingEnabled: z.boolean().default(true),
  /** Published paths kept out of the sitemap and disallowed in robots.txt. */
  excludedPaths: z.array(pathSchema).max(200).default([]),
  /** Extra robots.txt directives, appended verbatim. */
  robotsExtra: z.string().max(4000).default(''),
  /**
   * Join the platform partner-link network when the site is online
   * (hostname + published pages + indexing). Default on — opt out here.
   */
  networkEnabled: z.boolean().default(true),
  /** Niche tag for partner matching (claude-seo: prefer relevant referrers). */
  networkNiche: z.string().trim().max(80).default(''),
  updatedAt: isoTimestampSchema,
})
export type SeoSettings = z.infer<typeof seoSettingsSchema>

export const updateSeoSettingsInputSchema = z
  .object({
    business: seoBusinessSchema.partial(),
    indexingEnabled: z.boolean(),
    excludedPaths: z.array(pathSchema).max(200),
    robotsExtra: z.string().max(4000),
    networkEnabled: z.boolean(),
    networkNiche: z.string().trim().max(80),
  })
  .partial()
export type UpdateSeoSettingsInput = z.infer<typeof updateSeoSettingsInputSchema>

/** One online platform site participating in automatic partner backlinks. */
export const seoNetworkMemberSchema = z.object({
  siteId: uuidSchema,
  tenantId: uuidSchema,
  hostname: z.string().min(1).max(253),
  title: z.string().min(1).max(200),
  locale: localeSchema,
  kind: z.string().max(40).default('website'),
  niche: z.string().max(80).default(''),
  origin: z.string().url().max(2048),
  publishedPageCount: z.number().int().min(0),
})
export type SeoNetworkMember = z.infer<typeof seoNetworkMemberSchema>

export const seoNetworkLinkSchema = z.object({
  siteId: uuidSchema,
  hostname: z.string().min(1).max(253),
  title: z.string().min(1).max(200),
  origin: z.string().url().max(2048),
  niche: z.string().max(80).default(''),
  /** Anchor text — prefer branded / partial-match (claude-seo backlink quality). */
  anchor: z.string().min(1).max(120),
})
export type SeoNetworkLink = z.infer<typeof seoNetworkLinkSchema>

export const seoNetworkStatusSchema = z.object({
  eligible: z.boolean(),
  active: z.boolean(),
  networkEnabled: z.boolean(),
  niche: z.string().max(80).default(''),
  hostname: z.string().nullable(),
  publishedPageCount: z.number().int().min(0),
  outbound: z.array(seoNetworkLinkSchema),
  inbound: z.array(seoNetworkLinkSchema),
  memberCount: z.number().int().min(0),
  reasons: z.array(z.string().max(200)).default([]),
})
export type SeoNetworkStatus = z.infer<typeof seoNetworkStatusSchema>

// endregion

// region Keywords

export const keywordPositionSchema = z.object({
  position: z.number().int().min(1).max(200),
  url: z.string().max(2048).nullable().default(null),
  /** Which provider reported it. Never `null` — an unsourced rank is a guess. */
  source: z.string().max(60),
  checkedAt: isoTimestampSchema,
})
export type KeywordPosition = z.infer<typeof keywordPositionSchema>

export const seoKeywordSchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  keyword: z.string().min(1).max(200),
  locale: localeSchema,
  country: z.string().length(2).toUpperCase(),
  /** The page meant to rank for this term, so the audit can check it exists. */
  targetPath: z.string().max(512).nullable().default(null),
  latestPosition: keywordPositionSchema.nullable().default(null),
  history: z.array(keywordPositionSchema).default([]),
  createdAt: isoTimestampSchema,
})
export type SeoKeyword = z.infer<typeof seoKeywordSchema>

export const createKeywordInputSchema = z.object({
  keyword: z.string().min(1).max(200),
  locale: localeSchema.default('nl'),
  country: z.string().length(2).default('NL'),
  targetPath: pathSchema.nullish(),
})
export type CreateKeywordInput = z.infer<typeof createKeywordInputSchema>

/**
 * What the keyword table can honestly show right now.
 *
 * With no SERP provider configured `provider` is null and `positions` stay
 * empty. The UI says "connect a data source" instead of drawing a chart of
 * numbers nobody measured (§15).
 */
export const seoProviderStatusSchema = z.object({
  /** Provider id, or null when nothing is configured. */
  provider: z.string().max(60).nullable(),
  configured: z.boolean(),
  connected: z.boolean(),
  reason: z.string().max(300),
})
export type SeoProviderStatus = z.infer<typeof seoProviderStatusSchema>

export const seoProvidersSchema = z.object({
  searchConsole: seoProviderStatusSchema,
  serp: seoProviderStatusSchema,
})
export type SeoProviders = z.infer<typeof seoProvidersSchema>

// endregion
