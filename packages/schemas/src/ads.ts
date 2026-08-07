import { z } from 'zod'
import { isoTimestampSchema, uuidSchema } from './common.js'
import { trackingEventNameSchema } from './events.js'

/**
 * ads contracts. Owned by the ads phase.
 *
 * Every cross-boundary shape for this domain lives here (ADR-0002).
 *
 * These are **our** types, not any ad network's. `GoogleAdsProvider` and
 * `MetaAdsProvider` map their vendor shapes into these; nothing outside
 * `services/core-api/src/adapters/ads/` knows a vendor field name (ADR-0006).
 * That is why the dashboard renders one `CampaignTable` rather than a table per
 * network.
 *
 * Money is always an integer in the currency's minor unit (cents), never a
 * float and never a vendor's "micros". Rounding money is a bug that costs
 * someone real budget.
 */

// region Providers and connection state

export const ADS_PROVIDER_IDS = ['google_ads', 'meta_ads'] as const
export const adsProviderIdSchema = z.enum(ADS_PROVIDER_IDS)
export type AdsProviderId = z.infer<typeof adsProviderIdSchema>

export const ADS_PROVIDER_LABELS: Readonly<Record<AdsProviderId, string>> = Object.freeze({
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
})

/**
 * The honest answer to "can I use this right now?", in three independent parts.
 *
 * `configured` is about the *installation* — does the platform hold an OAuth
 * client and (for Google) a developer token at all. `connected` is about *this
 * tenant* — has this workspace linked an ad account. `available` is both. They
 * are reported separately because "the platform operator has not set this up"
 * and "you have not connected your account" need completely different actions
 * from the person reading the screen.
 */
export const adsProviderStatusSchema = z.object({
  provider: adsProviderIdSchema,
  label: z.string().max(60),
  /** The installation has the credentials this provider needs. */
  configured: z.boolean(),
  /** This tenant has an active account link. */
  connected: z.boolean(),
  /** `configured && connected`. The only flag a caller should gate writes on. */
  available: z.boolean(),
  /** Why not, in words a user can act on. Null when available. */
  reason: z.string().max(300).nullable().default(null),
  /**
   * Names of the environment variables the installation is missing. Names
   * only — a value never leaves the server, configured or not.
   */
  missingConfiguration: z.array(z.string().max(80)).max(20).default([]),
  /** OAuth scopes this provider needs, so an operator can request the right ones. */
  requiredScopes: z.array(z.string().max(200)).max(20).default([]),
  /** Vendor APIs that must be enabled before the scopes are usable. */
  requiredApis: z.array(z.string().max(120)).max(20).default([]),
  connectedAccountId: z.string().max(200).nullable().default(null),
  connectedAccountName: z.string().max(200).nullable().default(null),
  connectedAt: isoTimestampSchema.nullable().default(null),
})
export type AdsProviderStatus = z.infer<typeof adsProviderStatusSchema>

/**
 * What starting a connection produced.
 *
 * `unconfigured` is a normal outcome, not an error: an installation without an
 * OAuth client has to be able to say so to the browser, so the dashboard can
 * render what an administrator must do instead of a button that fails on click.
 */
export const adsConnectResultSchema = z.object({
  status: z.enum(['unconfigured', 'authorization_required', 'connected']),
  /** The vendor's consent URL. Null whenever one cannot be produced. */
  authorizationUrl: z.string().max(4096).nullable().default(null),
  reason: z.string().max(400).nullable().default(null),
  missingConfiguration: z.array(z.string().max(80)).max(20).default([]),
  requiredScopes: z.array(z.string().max(200)).max(20).default([]),
  requiredApis: z.array(z.string().max(120)).max(20).default([]),
})
export type AdsConnectResult = z.infer<typeof adsConnectResultSchema>

export const adAccountSchema = z.object({
  provider: adsProviderIdSchema,
  /** The account id as the network knows it. Opaque to us on purpose. */
  externalId: z.string().max(200),
  name: z.string().max(200),
  currency: z.string().length(3).default('EUR'),
  timeZone: z.string().max(64).default('Europe/Amsterdam'),
  status: z.enum(['enabled', 'suspended', 'closed', 'unknown']).default('unknown'),
  /** True for a manager/business account that holds others rather than spending. */
  isManager: z.boolean().default(false),
})
export type AdAccount = z.infer<typeof adAccountSchema>

// endregion

// region Campaign building blocks

export const CAMPAIGN_OBJECTIVES = [
  'leads',
  'calls',
  'sales',
  'traffic',
  'awareness',
  'app_installs',
] as const
export const campaignObjectiveSchema = z.enum(CAMPAIGN_OBJECTIVES)
export type CampaignObjective = z.infer<typeof campaignObjectiveSchema>

/**
 * Campaign lifecycle. `draft` is a first-class state and the only one a
 * campaign can be created in: nothing reaches an ad network without an explicit,
 * separately permission-checked publish (ADR-0007).
 */
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'ended', 'archived'] as const
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES)
export type CampaignStatus = z.infer<typeof campaignStatusSchema>

export const CAMPAIGN_CHANNELS = ['search', 'performance_max', 'display', 'video', 'social', 'shopping'] as const
export const campaignChannelSchema = z.enum(CAMPAIGN_CHANNELS)
export type CampaignChannel = z.infer<typeof campaignChannelSchema>

/** Always an integer in the currency's minor unit, plus the period it applies to. */
export const budgetSchema = z.object({
  amountMinor: z.number().int().min(0),
  currency: z.string().length(3).default('EUR'),
  period: z.enum(['daily', 'monthly', 'lifetime']).default('daily'),
})
export type Budget = z.infer<typeof budgetSchema>

export const BIDDING_STRATEGIES = [
  'manual_cpc',
  'maximize_clicks',
  'maximize_conversions',
  'maximize_conversion_value',
  'target_cpa',
  'target_roas',
] as const
export const biddingStrategySchema = z.object({
  type: z.enum(BIDDING_STRATEGIES).default('maximize_conversions'),
  /** Required by `target_cpa`. */
  targetCpaMinor: z.number().int().min(0).optional(),
  /** Required by `target_roas`. 4 means "4× revenue per unit spent". */
  targetRoas: z.number().min(0).max(100).optional(),
  /** Ceiling for `manual_cpc` and `maximize_clicks`. */
  maxCpcMinor: z.number().int().min(0).optional(),
})
export type BiddingStrategy = z.infer<typeof biddingStrategySchema>

export const geoTargetSchema = z.object({
  type: z.enum(['country', 'region', 'city', 'postal_code', 'radius']),
  /** A human-readable place: `Rotterdam`, `NL`, `3011`. Resolved by the adapter. */
  value: z.string().min(1).max(200),
  /** Only meaningful for `radius`. */
  radiusKm: z.number().min(1).max(500).optional(),
  /** Exclusions are targets too — an excluded area is still a targeting decision. */
  exclude: z.boolean().default(false),
})
export type GeoTarget = z.infer<typeof geoTargetSchema>

export const KEYWORD_MATCH_TYPES = ['exact', 'phrase', 'broad'] as const
export const keywordMatchTypeSchema = z.enum(KEYWORD_MATCH_TYPES)
export type KeywordMatchType = z.infer<typeof keywordMatchTypeSchema>

export const keywordSchema = z.object({
  text: z.string().min(1).max(80),
  matchType: keywordMatchTypeSchema.default('phrase'),
  cpcBidMinor: z.number().int().min(0).optional(),
})
export type Keyword = z.infer<typeof keywordSchema>

export const negativeKeywordSchema = z.object({
  text: z.string().min(1).max(80),
  matchType: keywordMatchTypeSchema.default('phrase'),
  /** Negatives applied at campaign level protect every ad group under it. */
  scope: z.enum(['campaign', 'ad_group']).default('campaign'),
})
export type NegativeKeyword = z.infer<typeof negativeKeywordSchema>

export const AD_CREATIVE_FORMATS = [
  'responsive_search',
  'responsive_display',
  'image',
  'video',
  'carousel',
] as const
export const adCreativeFormatSchema = z.enum(AD_CREATIVE_FORMATS)
export type AdCreativeFormat = z.infer<typeof adCreativeFormatSchema>

/**
 * One ad. A `responsive_search` creative is what Google calls an RSA and Meta
 * approximates with multi-variant text; both are "several headlines, several
 * descriptions, one destination", so they are one type here.
 *
 * The length caps are the strictest the supported networks enforce. Validating
 * them at our boundary means a draft is rejected in our UI with a useful
 * message rather than at publish time with a vendor error code.
 */
export const adCreativeSchema = z.object({
  format: adCreativeFormatSchema.default('responsive_search'),
  headlines: z.array(z.string().min(1).max(30)).min(1).max(15),
  descriptions: z.array(z.string().min(1).max(90)).min(1).max(4),
  /** Where the click lands. Must be a page the tenant actually owns. */
  finalUrl: z.string().min(1).max(2048),
  /** The two vanity path segments shown after the domain. */
  displayPath: z.array(z.string().max(15)).max(2).default([]),
  mediaUrls: z.array(z.string().max(2048)).max(20).default([]),
  callToAction: z.string().max(40).default(''),
})
export type AdCreative = z.infer<typeof adCreativeSchema>

export const AD_EXTENSION_TYPES = [
  'sitelink',
  'callout',
  'structured_snippet',
  'call',
  'location',
  'price',
  'promotion',
  'lead_form',
] as const
export const adExtensionSchema = z.object({
  type: z.enum(AD_EXTENSION_TYPES),
  label: z.string().min(1).max(80),
  description: z.string().max(160).default(''),
  url: z.string().max(2048).default(''),
  /** Values for the multi-value types (structured snippets, price tiers). */
  items: z.array(z.string().max(120)).max(12).default([]),
})
export type AdExtension = z.infer<typeof adExtensionSchema>

export const adGroupSchema = z.object({
  name: z.string().min(1).max(120),
  /** The theme this group is about, in one line. Drives copy and keywords. */
  theme: z.string().max(200).default(''),
  keywords: z.array(keywordSchema).max(200).default([]),
  negativeKeywords: z.array(negativeKeywordSchema).max(200).default([]),
  ads: z.array(adCreativeSchema).max(6).default([]),
  defaultBidMinor: z.number().int().min(0).optional(),
})
export type AdGroup = z.infer<typeof adGroupSchema>

// endregion

// region Campaign

/**
 * A campaign as the platform models it. Everything below is ours: the adapter
 * is responsible for turning it into whatever the network wants and back.
 */
export const campaignSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  provider: adsProviderIdSchema,
  /** The ad account it belongs to. Null while it is still a local draft. */
  accountId: z.string().max(200).nullable().default(null),
  /** The network's id. Null until published — a draft exists only here. */
  externalId: z.string().max(200).nullable().default(null),
  name: z.string().min(1).max(200),
  objective: campaignObjectiveSchema,
  channel: campaignChannelSchema.default('search'),
  status: campaignStatusSchema,
  budget: budgetSchema,
  bidding: biddingStrategySchema,
  geoTargets: z.array(geoTargetSchema).max(50).default([]),
  languages: z.array(z.string().max(16)).max(10).default([]),
  startDate: z.string().max(10).nullable().default(null),
  endDate: z.string().max(10).nullable().default(null),
  landingPageUrl: z.string().max(2048).default(''),
  adGroups: z.array(adGroupSchema).max(50).default([]),
  extensions: z.array(adExtensionSchema).max(40).default([]),
  /** Which of our tracking events this campaign optimizes towards. */
  conversionEvents: z.array(trackingEventNameSchema).max(10).default([]),
  /** Where it came from, so an AI-authored campaign stays identifiable forever. */
  source: z.enum(['manual', 'ai', 'imported']).default('manual'),
  /** Assumptions the drafter made that a human should check before spending. */
  assumptions: z.array(z.string().max(300)).max(20).default([]),
  warnings: z.array(z.string().max(300)).max(20).default([]),
  publishedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type Campaign = z.infer<typeof campaignSchema>

/**
 * What a caller supplies to create a campaign. There is no `status` field: a
 * created campaign is always a draft (ADR-0007, medium risk). Publishing is a
 * separate, confirmed, audited call.
 */
export const campaignDraftSchema = z.object({
  provider: adsProviderIdSchema,
  accountId: z.string().max(200).nullable().default(null),
  name: z.string().min(1).max(200),
  objective: campaignObjectiveSchema.default('leads'),
  channel: campaignChannelSchema.default('search'),
  budget: budgetSchema,
  bidding: biddingStrategySchema.default({ type: 'maximize_conversions' }),
  geoTargets: z.array(geoTargetSchema).max(50).default([]),
  languages: z.array(z.string().max(16)).max(10).default([]),
  startDate: z.string().max(10).nullable().default(null),
  endDate: z.string().max(10).nullable().default(null),
  landingPageUrl: z.string().max(2048).default(''),
  adGroups: z.array(adGroupSchema).max(50).default([]),
  extensions: z.array(adExtensionSchema).max(40).default([]),
  conversionEvents: z.array(trackingEventNameSchema).max(10).default([]),
  source: z.enum(['manual', 'ai', 'imported']).default('manual'),
  assumptions: z.array(z.string().max(300)).max(20).default([]),
  warnings: z.array(z.string().max(300)).max(20).default([]),
})
export type CampaignDraft = z.infer<typeof campaignDraftSchema>

/**
 * A patch against an existing campaign.
 *
 * `confirm` is required by the API whenever the target has already been
 * published: §84 — never modify a live campaign without explicit permission.
 */
export const updateCampaignInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  objective: campaignObjectiveSchema.optional(),
  status: z.enum(['active', 'paused', 'ended', 'archived']).optional(),
  bidding: biddingStrategySchema.optional(),
  geoTargets: z.array(geoTargetSchema).max(50).optional(),
  languages: z.array(z.string().max(16)).max(10).optional(),
  startDate: z.string().max(10).nullable().optional(),
  endDate: z.string().max(10).nullable().optional(),
  landingPageUrl: z.string().max(2048).optional(),
  adGroups: z.array(adGroupSchema).max(50).optional(),
  extensions: z.array(adExtensionSchema).max(40).optional(),
  conversionEvents: z.array(trackingEventNameSchema).max(10).optional(),
  /** Required when the campaign is already live. Budget is not editable here. */
  confirm: z.boolean().default(false),
})
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>

/**
 * Publishing a draft.
 *
 * The caller must echo back the budget it is approving. If the draft changed
 * between preview and confirm — another user edited it, an agent revised it —
 * the echo no longer matches and the publish is refused rather than spending an
 * amount nobody agreed to.
 */
export const publishCampaignInputSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'A campaign is only published on explicit confirmation.' }),
  }),
  acknowledgedBudgetMinor: z.number().int().min(0),
})
export type PublishCampaignInput = z.infer<typeof publishCampaignInputSchema>

/**
 * A budget change. High risk (ADR-0007): explicit confirmation, an audit event,
 * and a guardrail ceiling that refuses the change outright.
 */
export const changeBudgetInputSchema = z.object({
  amountMinor: z.number().int().min(0),
  period: z.enum(['daily', 'monthly', 'lifetime']).default('daily'),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'A budget change requires explicit confirmation.' }),
  }),
  reason: z.string().min(1).max(300),
})
export type ChangeBudgetInput = z.infer<typeof changeBudgetInputSchema>

// endregion

// region Guardrails

/**
 * The spend ceiling for a tenant. Enforced server-side on every budget change,
 * whoever asks — user, agent or app. Autonomous mode narrows gates; it never
 * removes this one (ADR-0007).
 */
export const adsGuardrailsSchema = z.object({
  currency: z.string().length(3).default('EUR'),
  /** Hard ceiling for any single campaign's daily budget. */
  maxDailyBudgetMinor: z.number().int().min(0).default(5_000_00),
  /** Hard ceiling for the tenant's combined daily budget across campaigns. */
  maxTotalDailyBudgetMinor: z.number().int().min(0).default(20_000_00),
  /** A single increase may not exceed this percentage of the current budget. */
  maxIncreasePercent: z.number().int().min(0).max(1000).default(50),
  /** Off by default and per capability. Never a global default. */
  autonomousBudgetChanges: z.boolean().default(false),
  updatedAt: isoTimestampSchema,
})
export type AdsGuardrails = z.infer<typeof adsGuardrailsSchema>

export const updateGuardrailsInputSchema = adsGuardrailsSchema
  .omit({ updatedAt: true })
  .partial()
  .extend({ currency: z.string().length(3).optional() })
export type UpdateGuardrailsInput = z.infer<typeof updateGuardrailsInputSchema>

/** Why a budget change was refused, with the numbers the user needs to see. */
export const guardrailViolationSchema = z.object({
  rule: z.enum(['max_daily_budget', 'max_total_daily_budget', 'max_increase_percent']),
  message: z.string().max(300),
  limitMinor: z.number().int().min(0).nullable().default(null),
  requestedMinor: z.number().int().min(0),
  currency: z.string().length(3),
})
export type GuardrailViolation = z.infer<typeof guardrailViolationSchema>

// endregion

// region Conversion tracking

/**
 * Which of our tracking events (§18) becomes which conversion action on the ad
 * network. This mapping is the whole reason server-side tracking and ads are
 * one platform rather than two products: the `eventId` we already generate is
 * what lets a browser hit and its server-side twin deduplicate.
 */
export const conversionMappingSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  provider: adsProviderIdSchema,
  /** Our event name — the platform vocabulary, not the network's. */
  trackingEvent: trackingEventNameSchema,
  /** What the action is called on the network side. */
  conversionActionName: z.string().min(1).max(200),
  /** The network's id for it, once it exists there. */
  externalId: z.string().max(200).nullable().default(null),
  countingMode: z.enum(['every', 'one']).default('every'),
  valueMode: z.enum(['event_value', 'fixed', 'none']).default('event_value'),
  fixedValueMinor: z.number().int().min(0).nullable().default(null),
  currency: z.string().length(3).default('EUR'),
  attributionWindowDays: z.number().int().min(1).max(90).default(30),
  /** Include this action in the network's bidding optimization. */
  primary: z.boolean().default(true),
  enabled: z.boolean().default(true),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type ConversionMapping = z.infer<typeof conversionMappingSchema>

export const upsertConversionMappingInputSchema = z.object({
  provider: adsProviderIdSchema,
  trackingEvent: trackingEventNameSchema,
  conversionActionName: z.string().min(1).max(200),
  countingMode: z.enum(['every', 'one']).default('every'),
  valueMode: z.enum(['event_value', 'fixed', 'none']).default('event_value'),
  fixedValueMinor: z.number().int().min(0).nullable().default(null),
  currency: z.string().length(3).default('EUR'),
  attributionWindowDays: z.number().int().min(1).max(90).default(30),
  primary: z.boolean().default(true),
  enabled: z.boolean().default(true),
})
export type UpsertConversionMappingInput = z.infer<typeof upsertConversionMappingInputSchema>

// endregion

// region Metrics

export const metricsQuerySchema = z.object({
  provider: adsProviderIdSchema.optional(),
  accountId: z.string().max(200).optional(),
  campaignId: uuidSchema.optional(),
  /** Inclusive `YYYY-MM-DD`. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
  granularity: z.enum(['day', 'week', 'month', 'total']).default('day'),
})
export type MetricsQuery = z.infer<typeof metricsQuerySchema>

/**
 * One row of measured performance. Only counted things live here — every
 * derived ratio is computed by `summarizeMetrics` so the dashboard and the API
 * can never disagree about what a CPA is.
 */
export const metricPointSchema = z.object({
  date: z.string().max(10),
  campaignId: uuidSchema.nullable().default(null),
  impressions: z.number().int().min(0).default(0),
  clicks: z.number().int().min(0).default(0),
  costMinor: z.number().int().min(0).default(0),
  conversions: z.number().min(0).default(0),
  conversionValueMinor: z.number().int().min(0).default(0),
})
export type MetricPoint = z.infer<typeof metricPointSchema>

export const metricTotalsSchema = z.object({
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  costMinor: z.number().int().min(0),
  conversions: z.number().min(0),
  conversionValueMinor: z.number().int().min(0),
  /** Nullable rather than zero: "no clicks yet" is not "a 0% click rate". */
  ctr: z.number().min(0).nullable(),
  cpcMinor: z.number().int().min(0).nullable(),
  cpaMinor: z.number().int().min(0).nullable(),
  roas: z.number().min(0).nullable(),
})
export type MetricTotals = z.infer<typeof metricTotalsSchema>

export const metricSeriesSchema = z.object({
  provider: adsProviderIdSchema,
  accountId: z.string().max(200).nullable().default(null),
  currency: z.string().length(3).default('EUR'),
  from: z.string().max(10),
  to: z.string().max(10),
  granularity: z.enum(['day', 'week', 'month', 'total']),
  points: z.array(metricPointSchema).default([]),
  totals: metricTotalsSchema,
})
export type MetricSeries = z.infer<typeof metricSeriesSchema>

export const EMPTY_METRIC_TOTALS: MetricTotals = Object.freeze({
  impressions: 0,
  clicks: 0,
  costMinor: 0,
  conversions: 0,
  conversionValueMinor: 0,
  ctr: null,
  cpcMinor: null,
  cpaMinor: null,
  roas: null,
})

/**
 * Roll points up into totals. The one place ratios are derived, and the one
 * place that decides a ratio with no denominator is `null` rather than `0` — a
 * dashboard that shows "€0.00 CPA" for a campaign with no conversions is
 * lying about the best number on the page.
 */
export function summarizeMetrics(points: MetricPoint[]): MetricTotals {
  const totals = points.reduce(
    (accumulator, point) => ({
      impressions: accumulator.impressions + point.impressions,
      clicks: accumulator.clicks + point.clicks,
      costMinor: accumulator.costMinor + point.costMinor,
      conversions: accumulator.conversions + point.conversions,
      conversionValueMinor: accumulator.conversionValueMinor + point.conversionValueMinor,
    }),
    { impressions: 0, clicks: 0, costMinor: 0, conversions: 0, conversionValueMinor: 0 },
  )

  return {
    ...totals,
    ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : null,
    cpcMinor: totals.clicks > 0 ? Math.round(totals.costMinor / totals.clicks) : null,
    cpaMinor: totals.conversions > 0 ? Math.round(totals.costMinor / totals.conversions) : null,
    roas: totals.costMinor > 0 ? totals.conversionValueMinor / totals.costMinor : null,
  }
}

// endregion

// region AI campaign drafting (§20)

/**
 * "Create a Google Ads campaign for emergency plumbers in Rotterdam."
 *
 * The prompt is the whole input; everything else refines it. The result is a
 * draft, always — see `campaignDraftSchema`.
 */
export const campaignBriefSchema = z.object({
  provider: adsProviderIdSchema,
  prompt: z.string().min(10).max(2000),
  objective: campaignObjectiveSchema.optional(),
  channel: campaignChannelSchema.optional(),
  locale: z.string().max(16).default('nl'),
  landingPageUrl: z.string().max(2048).default(''),
  /** What the user is willing to spend per day. Never inferred upward. */
  dailyBudgetMinor: z.number().int().min(0).optional(),
  currency: z.string().length(3).default('EUR'),
  accountId: z.string().max(200).nullable().default(null),
  /** Persist the draft. False returns a preview the caller can discard. */
  save: z.boolean().default(true),
})
export type CampaignBrief = z.infer<typeof campaignBriefSchema>

/**
 * What the drafting endpoint returns: the proposal, what produced it, and what
 * still has to happen before a cent is spent.
 */
export const campaignDraftPreviewSchema = z.object({
  draft: campaignDraftSchema,
  /** Set when the draft was persisted; null for a throwaway preview. */
  campaignId: uuidSchema.nullable().default(null),
  model: z.string().max(120),
  /** Always `medium` for campaign creation (ADR-0007). Stated, not implied. */
  riskClass: z.enum(['low', 'medium', 'high']).default('medium'),
  requiresConfirmation: z.literal(true),
  providerStatus: adsProviderStatusSchema,
})
export type CampaignDraftPreview = z.infer<typeof campaignDraftPreviewSchema>

// endregion

// region Envelope helpers

/**
 * Every ads read carries the provider's status alongside the data.
 *
 * An empty list means "there is nothing" *or* "we cannot see anything", and
 * those are different facts. Shipping the status with the payload makes the UI
 * unable to render the second as the first.
 */
export const adsResultMetaSchema = z.object({
  providerStatus: adsProviderStatusSchema,
})

export function adsResult<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    providerStatus: adsProviderStatusSchema,
    items: z.array(item),
  })
}

export interface AdsResult<T> {
  providerStatus: AdsProviderStatus
  items: T[]
}

// endregion

// region Google Business Profile (§19)

/**
 * Google Business Profile is not an ad network, but it is connected through the
 * same OAuth client and is where local ads get their location data — so its
 * connection state is reported in the same honest shape.
 */
export const googleBusinessStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  available: z.boolean(),
  reason: z.string().max(300).nullable().default(null),
  missingConfiguration: z.array(z.string().max(80)).max(20).default([]),
  requiredApis: z.array(z.string().max(120)).max(20).default([]),
  requiredScopes: z.array(z.string().max(200)).max(20).default([]),
  /** Empty until connected. We never invent a location. */
  locations: z
    .array(
      z.object({
        externalId: z.string().max(200),
        name: z.string().max(200),
        address: z.string().max(400).default(''),
        verified: z.boolean().default(false),
      }),
    )
    .default([]),
})
export type GoogleBusinessStatus = z.infer<typeof googleBusinessStatusSchema>

// endregion
