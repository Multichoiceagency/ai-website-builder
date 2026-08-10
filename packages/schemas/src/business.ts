import { z } from 'zod'
import { isoTimestampSchema, localeSchema, uuidSchema } from './common.js'

/**
 * The normalized Business Profile from §8 of the product spec.
 *
 * Every discovery source — Google Business Profile, a crawl of the company's
 * own website, social profiles, or manual entry — is mapped into this one
 * shape. Everything downstream (site planning, brand extraction, SEO, ads copy)
 * reads this and never a provider's native format (ADR-0006).
 */

// region Sources

export const discoverySourceSchema = z.enum([
  'google_business_profile',
  'website',
  'social',
  'manual',
  'inference',
])
export type DiscoverySource = z.infer<typeof discoverySourceSchema>

/** Where one field came from, so the UI can show provenance and confidence. */
export const provenanceSchema = z.object({
  source: discoverySourceSchema,
  reference: z.string().max(2048).optional(),
  confidence: z.number().min(0).max(1).default(0.5),
})
export type Provenance = z.infer<typeof provenanceSchema>

// endregion

// region Social

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'pinterest',
  'whatsapp',
  'other',
] as const

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS)
export type SocialPlatform = z.infer<typeof socialPlatformSchema>

export const socialProfileSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string().max(2048),
  handle: z.string().max(200).optional(),
  /** Public profile metadata, only when the platform allows it. */
  title: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  image: z.string().max(2048).optional(),
  /**
   * False when the platform blocked automated access. Recorded rather than
   * hidden: "we could not read this" is information the user should see.
   */
  fetched: z.boolean().default(false),
  blockedReason: z.string().max(200).optional(),
})
export type SocialProfile = z.infer<typeof socialProfileSchema>

// endregion

// region Business profile

export const openingHoursSchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  opens: z.string().max(5).optional(),
  closes: z.string().max(5).optional(),
  closed: z.boolean().default(false),
})
export type OpeningHours = z.infer<typeof openingHoursSchema>

export const businessLocationSchema = z.object({
  label: z.string().max(200).default(''),
  street: z.string().max(200).default(''),
  postalCode: z.string().max(20).default(''),
  city: z.string().max(120).default(''),
  region: z.string().max(120).default(''),
  country: z.string().max(120).default(''),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  hours: z.array(openingHoursSchema).default([]),
})
export type BusinessLocation = z.infer<typeof businessLocationSchema>

export const businessServiceSchema = z.object({
  name: z.string().max(200),
  description: z.string().max(1000).default(''),
  /** Higher scores lead the services section and get their own SEO page. */
  prominence: z.number().min(0).max(1).default(0.5),
})
export type BusinessService = z.infer<typeof businessServiceSchema>

export const businessReviewSchema = z.object({
  author: z.string().max(200).default(''),
  rating: z.number().min(0).max(5).default(5),
  text: z.string().max(2000).default(''),
  source: z.string().max(120).default(''),
})
export type BusinessReview = z.infer<typeof businessReviewSchema>

/**
 * Brand DNA (§70). Stored separately from any generated page so that websites,
 * ads, emails and images can all stay consistent without one being the source
 * of truth for the others.
 */
export const brandDnaSchema = z.object({
  logo: z.string().max(2048).default(''),
  colors: z.array(z.string().max(32)).max(12).default([]),
  primaryColor: z.string().max(32).default(''),
  fonts: z.array(z.string().max(120)).max(6).default([]),
  tone: z.enum(['professional', 'friendly', 'premium', 'technical', 'playful', 'reassuring']).default('professional'),
  adjectives: z.array(z.string().max(40)).max(8).default([]),
  audience: z.string().max(400).default(''),
  positioning: z.string().max(600).default(''),
  /** Words the customer must never see in generated copy. */
  prohibitedWords: z.array(z.string().max(60)).max(50).default([]),
})
export type BrandDna = z.infer<typeof brandDnaSchema>

export const businessProfileSchema = z.object({
  company: z.object({
    name: z.string().max(200).default(''),
    legalName: z.string().max(200).default(''),
    description: z.string().max(2000).default(''),
    shortDescription: z.string().max(300).default(''),
    industry: z.string().max(120).default(''),
    categories: z.array(z.string().max(120)).max(12).default([]),
    foundedYear: z.number().int().optional(),
  }),
  locations: z.array(businessLocationSchema).max(50).default([]),
  contact: z.object({
    phone: z.string().max(60).default(''),
    email: z.string().max(320).default(''),
    website: z.string().max(2048).default(''),
    whatsapp: z.string().max(60).default(''),
  }),
  services: z.array(businessServiceSchema).max(40).default([]),
  brand: brandDnaSchema.default({}),
  reviews: z.array(businessReviewSchema).max(50).default([]),
  socials: z.array(socialProfileSchema).max(20).default([]),
  media: z.array(z.string().max(2048)).max(60).default([]),
  locale: localeSchema.default('nl'),
  sources: z.array(provenanceSchema).default([]),
  /** Pages the crawler actually read, so the user can see what informed this. */
  crawledUrls: z.array(z.string().max(2048)).max(60).default([]),
  warnings: z.array(z.string().max(400)).max(40).default([]),
})
export type BusinessProfile = z.infer<typeof businessProfileSchema>

// endregion

// region Discovery

export const discoveryInputSchema = z
  .object({
    /** A business website to crawl. The richest no-credentials source. */
    website: z.string().max(2048).optional(),
    /** Used when there is no website yet. */
    businessName: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    industry: z.string().max(120).optional(),
    /** Extra social profiles the user knows about. */
    socialUrls: z.array(z.string().max(2048)).max(10).default([]),
    locale: localeSchema.default('nl'),
    /** Google Business Profile location id, once that integration is connected. */
    googleLocationId: z.string().max(200).optional(),
    maxPages: z.number().int().min(1).max(25).default(8),
  })
  .refine((value) => Boolean(value.website || value.businessName || value.googleLocationId), {
    message: 'Provide a website, a business name, or a Google Business Profile location.',
  })
export type DiscoveryInput = z.infer<typeof discoveryInputSchema>

export const discoveryResultSchema = z.object({
  profile: businessProfileSchema,
  durationMs: z.number().int().min(0),
  pagesCrawled: z.number().int().min(0),
})
export type DiscoveryResult = z.infer<typeof discoveryResultSchema>

// endregion

// region Site planning

export const PAGE_GOALS = ['home', 'services', 'service_detail', 'about', 'contact', 'reviews', 'faq', 'product'] as const
export const pageGoalSchema = z.enum(PAGE_GOALS)
export type PageGoal = z.infer<typeof pageGoalSchema>

export const plannedPageSchema = z.object({
  goal: pageGoalSchema,
  path: z.string().max(512),
  title: z.string().max(200),
  description: z.string().max(300).default(''),
  /** Ordered block ids chosen from the registry. */
  blocks: z.array(z.string().max(64)),
})
export type PlannedPage = z.infer<typeof plannedPageSchema>

export const sitePlanSchema = z.object({
  siteName: z.string().max(200),
  locale: localeSchema,
  /** Ceiling for block selection, derived from brand and performance budget. */
  maxPerformanceClass: z.enum(['A', 'B', 'C', 'D']),
  pages: z.array(plannedPageSchema).max(30),
  navigation: z.array(z.object({ label: z.string().max(80), href: z.string().max(512) })).max(12),
})
export type SitePlan = z.infer<typeof sitePlanSchema>

// endregion

// region Generation

export const GENERATION_PHASES = [
  'understanding_business',
  'analyzing_brand',
  'finding_services',
  'planning_website',
  'building_pages',
  'optimizing_seo',
  'optimizing_mobile',
  'running_checks',
  'preparing_preview',
] as const

export const generationPhaseSchema = z.enum(GENERATION_PHASES)
export type GenerationPhase = z.infer<typeof generationPhaseSchema>

/** User-facing phase labels (§81) — meaningful progress, no implementation noise. */
export const GENERATION_PHASE_LABELS: Record<GenerationPhase, string> = {
  understanding_business: 'Understanding your business',
  analyzing_brand: 'Analyzing your brand',
  finding_services: 'Finding your services',
  planning_website: 'Planning your website',
  building_pages: 'Building your pages',
  optimizing_seo: 'Optimizing for search',
  optimizing_mobile: 'Optimizing mobile design',
  running_checks: 'Running quality checks',
  preparing_preview: 'Preparing your preview',
}

export const generationRequestSchema = z.object({
  profile: businessProfileSchema,
  siteName: z.string().max(200).optional(),
  /** Style direction, or let the platform choose from the brand. */
  style: z.enum(['auto', 'minimal', 'modern', 'premium', 'bold', 'editorial']).default('auto'),
  maxPerformanceClass: z.enum(['A', 'B', 'C', 'D']).default('B'),
  publish: z.boolean().default(false),
  /**
   * Optional catalogue template id. Preferences only — the performance ceiling
   * still decides what may actually be placed (ADR-0003). When omitted, the
   * generator defaults to the first MotionSites catalogue entry with a
   * non-empty `sourcePrompt` (`defaultMotionSitesTemplate`).
   */
  templateId: z.string().max(120).optional(),
})
export type GenerationRequest = z.infer<typeof generationRequestSchema>

/** Ambora-style one-prompt website build — synthesizes or discovers a profile first. */
export const generateFromPromptInputSchema = z.object({
  prompt: z.string().min(8).max(4000),
  locale: localeSchema.default('nl'),
  style: z.enum(['auto', 'minimal', 'modern', 'premium', 'bold', 'editorial']).default('auto'),
  templateId: z.string().max(120).optional(),
  publish: z.boolean().default(false),
  siteName: z.string().max(200).optional(),
  maxPerformanceClass: z.enum(['A', 'B', 'C', 'D']).default('B'),
})
export type GenerateFromPromptInput = z.infer<typeof generateFromPromptInputSchema>

export const qualityReportSchema = z.object({
  seo: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string().max(300)) }),
  accessibility: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string().max(300)) }),
  performance: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string().max(300)),
    heaviestClass: z.enum(['A', 'B', 'C', 'D']),
  }),
  content: z.object({ score: z.number().min(0).max(100), issues: z.array(z.string().max(300)) }),
})
export type QualityReport = z.infer<typeof qualityReportSchema>

export const generationResultSchema = z.object({
  siteId: uuidSchema,
  siteName: z.string(),
  /** Stable site slug — also the local preview hostname stem (`{slug}.localhost`). */
  siteSlug: z.string(),
  /** Hostname the storefront resolves for this site (e.g. `acme.localhost`). */
  previewHostname: z.string(),
  /** Home page id — the editor the dashboard should open after generation. */
  homePageId: uuidSchema,
  plan: sitePlanSchema,
  pageIds: z.array(uuidSchema),
  quality: qualityReportSchema,
  model: z.string(),
  published: z.boolean(),
  generatedAt: isoTimestampSchema,
})
export type GenerationResult = z.infer<typeof generationResultSchema>

// endregion
