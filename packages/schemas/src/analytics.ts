import { z } from 'zod'
import { isoTimestampSchema, uuidSchema } from './common.js'
import { trackingEventNameSchema } from './events.js'
import {
  trackingAttributionModelSchema,
  trackingAttributionRowSchema,
  trackingConsentCategorySchema,
  trackingDeliveryStatusSchema,
  trackingDestinationIdSchema,
} from './tracking.js'

/**
 * Analytics, attribution and tracking-operations contracts (§21, §26, §28).
 *
 * Everything here is *derived* from the tracking tables — there is no separate
 * analytics store and no modelled number. That constraint is the point: a
 * figure on these screens can always be traced back to rows in
 * `tracking_events`, `tracking_sessions` and `tracking_deliveries`, and a
 * figure that cannot be traced back is not shipped at all.
 *
 * Cross-boundary shapes live here and nowhere else (ADR-0002).
 */

// region Windows and comparison

/**
 * A resolved reporting window plus the equal-length window before it.
 *
 * Resolved on the server so the comparison is computed against exactly the
 * range that produced the current numbers — a client that derives "last
 * period" itself will eventually derive a different one.
 */
export const analyticsRangeSchema = z.object({
  from: isoTimestampSchema,
  to: isoTimestampSchema,
  days: z.number().int().min(1),
  previousFrom: isoTimestampSchema,
  previousTo: isoTimestampSchema,
})
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>

/**
 * One number with its previous-period counterpart.
 *
 * `changePct` is null — never zero, never 100 — when the previous period was
 * empty. "Up 100%" from nothing is a sentence a dashboard should refuse to
 * say.
 */
export const analyticsMetricSchema = z.object({
  current: z.number(),
  previous: z.number(),
  changePct: z.number().nullable().default(null),
})
export type AnalyticsMetric = z.infer<typeof analyticsMetricSchema>

// endregion

// region Overview (§21)

/**
 * Revenue in one currency. Kept separate rather than summed: adding EUR to USD
 * produces a number that is wrong in both.
 *
 * `currency` is null for events that carried a value but no currency code.
 */
export const analyticsRevenueSliceSchema = z.object({
  currency: z.string().length(3).nullable(),
  amount: z.number(),
  orders: z.number().int().min(0),
})
export type AnalyticsRevenueSlice = z.infer<typeof analyticsRevenueSliceSchema>

/** One row of any breakdown — channel, source/medium, campaign or landing page. */
export const analyticsBreakdownRowSchema = z.object({
  key: z.string().max(600),
  label: z.string().max(600),
  sessions: z.number().int().min(0),
  visitors: z.number().int().min(0),
  conversions: z.number().int().min(0),
  revenue: z.number(),
  /** Conversions per session, 0–1. Null when the row has no sessions to divide by. */
  conversionRate: z.number().nullable().default(null),
})
export type AnalyticsBreakdownRow = z.infer<typeof analyticsBreakdownRowSchema>

export const analyticsBreakdownDimensionSchema = z.enum([
  'channel',
  'source',
  'medium',
  'campaign',
  'landing_page',
])
export type AnalyticsBreakdownDimension = z.infer<typeof analyticsBreakdownDimensionSchema>

export const analyticsSeriesPointSchema = z.object({
  /** `YYYY-MM-DD`, UTC. Zero-filled: a day with no traffic is a zero, not a gap. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visitors: z.number().int().min(0),
  sessions: z.number().int().min(0),
  pageViews: z.number().int().min(0),
  leads: z.number().int().min(0),
  conversions: z.number().int().min(0),
  revenue: z.number(),
})
export type AnalyticsSeriesPoint = z.infer<typeof analyticsSeriesPointSchema>

/**
 * One stage of the funnel.
 *
 * Membership, not path order: a visitor counts towards a stage if they fired
 * any of its events in the window, whether or not they passed through the
 * stage above. Ordering the stages by *typical* journey and then reporting a
 * strict drop-off would be inventing a sequence the data does not record, so
 * `rateFromStart` is the honest ratio and the UI says which it is.
 */
export const analyticsFunnelStepSchema = z.object({
  key: z.string().max(60),
  label: z.string().max(120),
  /** The event names this stage counts, so the UI can show its definition. */
  events: z.array(trackingEventNameSchema),
  visitors: z.number().int().min(0),
  rateFromStart: z.number().nullable().default(null),
  rateFromPrevious: z.number().nullable().default(null),
})
export type AnalyticsFunnelStep = z.infer<typeof analyticsFunnelStepSchema>

export const analyticsTopPageSchema = z.object({
  path: z.string().max(2048),
  views: z.number().int().min(0),
  visitors: z.number().int().min(0),
})
export type AnalyticsTopPage = z.infer<typeof analyticsTopPageSchema>

export const analyticsEventCountSchema = z.object({
  name: trackingEventNameSchema,
  count: z.number().int().min(0),
})
export type AnalyticsEventCount = z.infer<typeof analyticsEventCountSchema>

export const analyticsBreakdownSchema = z.object({
  dimension: analyticsBreakdownDimensionSchema,
  rows: z.array(analyticsBreakdownRowSchema),
  /** Rows beyond the returned top-N, folded into a count rather than dropped silently. */
  remainingRows: z.number().int().min(0).default(0),
})
export type AnalyticsBreakdown = z.infer<typeof analyticsBreakdownSchema>

export const analyticsOverviewSchema = z.object({
  range: analyticsRangeSchema,
  siteId: uuidSchema.nullable().default(null),
  metrics: z.object({
    visitors: analyticsMetricSchema,
    sessions: analyticsMetricSchema,
    pageViews: analyticsMetricSchema,
    leads: analyticsMetricSchema,
    conversions: analyticsMetricSchema,
    /** Conversions per session, 0–1. */
    conversionRate: analyticsMetricSchema,
    revenue: analyticsMetricSchema,
    orders: analyticsMetricSchema,
    averageOrderValue: analyticsMetricSchema,
  }),
  /**
   * The currency `revenue` and `averageOrderValue` are expressed in — the one
   * with the largest recorded amount. Null when no revenue was recorded at all.
   */
  currency: z.string().length(3).nullable().default(null),
  /** Revenue recorded in other currencies, reported rather than folded in. */
  otherCurrencies: z.array(analyticsRevenueSliceSchema).default([]),
  series: z.array(analyticsSeriesPointSchema),
  /**
   * Same length as `series`, aligned by index — previous-period daily points for
   * Shopify-style compare charts. Empty when the previous window had no days.
   */
  previousSeries: z.array(analyticsSeriesPointSchema).default([]),
  breakdowns: z.array(analyticsBreakdownSchema),
  topPages: z.array(analyticsTopPageSchema),
  funnel: z.array(analyticsFunnelStepSchema),
  eventCounts: z.array(analyticsEventCountSchema),
})
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>

// endregion

// region Attribution (§28)

export const analyticsAttributionCreditSchema = z.object({
  conversions: z.number().min(0),
  value: z.number().min(0),
})
export type AnalyticsAttributionCredit = z.infer<typeof analyticsAttributionCreditSchema>

/**
 * One dimension value with all three models side by side.
 *
 * Side by side on purpose: the disagreement between first-click and last-click
 * is the most useful thing attribution has to say, and a UI that shows one
 * model at a time hides exactly that.
 */
export const analyticsAttributionCompareRowSchema = z.object({
  key: z.string().max(600),
  label: z.string().max(600),
  firstClick: analyticsAttributionCreditSchema,
  lastClick: analyticsAttributionCreditSchema,
  linear: analyticsAttributionCreditSchema,
})
export type AnalyticsAttributionCompareRow = z.infer<typeof analyticsAttributionCompareRowSchema>

export const analyticsAttributionDimensionSchema = z.object({
  dimension: analyticsBreakdownDimensionSchema,
  rows: z.array(analyticsAttributionCompareRowSchema),
})
export type AnalyticsAttributionDimension = z.infer<typeof analyticsAttributionDimensionSchema>

/** One model's totals, computed by the shared attribution helpers. */
export const analyticsAttributionModelReportSchema = z.object({
  model: trackingAttributionModelSchema,
  totalConversions: z.number().min(0),
  totalValue: z.number().min(0),
  attributedConversions: z.number().min(0),
  /** Conversions whose visitor has no session on record and cannot be credited. */
  unattributed: z.number().min(0),
  rows: z.array(trackingAttributionRowSchema),
})
export type AnalyticsAttributionModelReport = z.infer<typeof analyticsAttributionModelReportSchema>

export const analyticsAttributionReportSchema = z.object({
  range: analyticsRangeSchema,
  siteId: uuidSchema.nullable().default(null),
  lookbackDays: z.number().int().min(1),
  events: z.array(trackingEventNameSchema),
  currency: z.string().length(3).nullable().default(null),
  totalConversions: z.number().min(0),
  totalValue: z.number().min(0),
  unattributed: z.number().min(0),
  models: z.array(analyticsAttributionModelReportSchema),
  dimensions: z.array(analyticsAttributionDimensionSchema),
})
export type AnalyticsAttributionReport = z.infer<typeof analyticsAttributionReportSchema>

/** One session in a journey, with the credit each model would give it. */
export const analyticsJourneyTouchSchema = z.object({
  sessionId: z.string().max(64),
  channel: z.string().max(420),
  source: z.string().max(200),
  medium: z.string().max(200),
  campaign: z.string().max(200),
  landingPath: z.string().max(2048),
  startedAt: isoTimestampSchema,
  firstClick: z.number().min(0).max(1),
  lastClick: z.number().min(0).max(1),
  linear: z.number().min(0).max(1),
})
export type AnalyticsJourneyTouch = z.infer<typeof analyticsJourneyTouchSchema>

export const analyticsJourneySchema = z.object({
  conversionId: uuidSchema,
  event: trackingEventNameSchema,
  occurredAt: isoTimestampSchema,
  anonymousId: z.string().max(64),
  userId: z.string().max(200).nullable().default(null),
  value: z.number().nullable().default(null),
  currency: z.string().length(3).nullable().default(null),
  /** Hours between the first touch and the conversion. Null for a single-touch journey. */
  hoursToConvert: z.number().nullable().default(null),
  touches: z.array(analyticsJourneyTouchSchema),
})
export type AnalyticsJourney = z.infer<typeof analyticsJourneySchema>

export const analyticsJourneyReportSchema = z.object({
  range: analyticsRangeSchema,
  lookbackDays: z.number().int().min(1),
  events: z.array(trackingEventNameSchema),
  totalConversions: z.number().int().min(0),
  journeys: z.array(analyticsJourneySchema),
})
export type AnalyticsJourneyReport = z.infer<typeof analyticsJourneyReportSchema>

// endregion

// region Tracking operations (§26)

/**
 * One reason a destination did not receive an event, with how often it applied.
 *
 * The consent ledger, aggregated. `reason` is the sentence the consent engine
 * or the adapter wrote at the time, not a category invented here.
 */
export const analyticsDeliveryReasonSchema = z.object({
  destination: trackingDestinationIdSchema,
  status: trackingDeliveryStatusSchema,
  reason: z.string().max(300).nullable().default(null),
  count: z.number().int().min(0),
  lastAt: isoTimestampSchema.nullable().default(null),
})
export type AnalyticsDeliveryReason = z.infer<typeof analyticsDeliveryReasonSchema>

/**
 * Our recorded count against what one destination accepted (§26).
 *
 * `discrepancy` is `recorded - delivered`, and the three status counts under it
 * add up to exactly that. A number that disagrees with GA4 is only alarming
 * when nothing explains it.
 */
export const analyticsDestinationDiscrepancySchema = z.object({
  id: trackingDestinationIdSchema,
  label: z.string().max(60),
  consent: trackingConsentCategorySchema,
  configured: z.boolean(),
  recorded: z.number().int().min(0),
  delivered: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  notConfigured: z.number().int().min(0),
  /** Events we recorded that this destination never accepted. */
  discrepancy: z.number().int(),
  lastDeliveredAt: isoTimestampSchema.nullable().default(null),
  lastError: z.string().max(300).nullable().default(null),
})
export type AnalyticsDestinationDiscrepancy = z.infer<typeof analyticsDestinationDiscrepancySchema>

export const analyticsVolumePointSchema = z.object({
  /** ISO timestamp of the start of the hour, UTC. */
  hour: isoTimestampSchema,
  events: z.number().int().min(0),
})
export type AnalyticsVolumePoint = z.infer<typeof analyticsVolumePointSchema>

export const analyticsTrackingHealthSchema = z.object({
  windowHours: z.number().int().min(1),
  from: isoTimestampSchema,
  to: isoTimestampSchema,
  siteId: uuidSchema.nullable().default(null),
  recordedEvents: z.number().int().min(0),
  destinations: z.array(analyticsDestinationDiscrepancySchema),
  /** Events withheld by the consent engine, grouped by destination and reason. */
  consentSkips: z.array(analyticsDeliveryReasonSchema),
  failures: z.array(analyticsDeliveryReasonSchema),
  eventCounts: z.array(analyticsEventCountSchema),
  volume: z.array(analyticsVolumePointSchema),
})
export type AnalyticsTrackingHealth = z.infer<typeof analyticsTrackingHealthSchema>

// endregion

// region Live presence (globe)

export const analyticsLiveChannelSchema = z.enum(['website', 'ecommerce', 'unknown'])
export type AnalyticsLiveChannel = z.infer<typeof analyticsLiveChannelSchema>

/**
 * One active visitor on the Live View globe.
 *
 * `lat`/`lng` are only set when a coarse country can be derived from real
 * session signals (browser locale region or stored country). Avatars are
 * deterministic from `anonymousId` — never stock demo people.
 */
export const analyticsLiveVisitorSchema = z.object({
  id: z.string().min(1).max(120),
  anonymousId: z.string().min(8).max(64),
  sessionId: z.string().min(8).max(64),
  siteId: uuidSchema,
  label: z.string().max(200),
  countryCode: z.string().length(2).nullable().default(null),
  countryName: z.string().max(80).nullable().default(null),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  avatarUrl: z.string().min(1).max(500),
  channel: analyticsLiveChannelSchema,
  path: z.string().max(512).nullable().default(null),
  lastSeenAt: isoTimestampSchema,
  eventCount: z.number().int().min(0),
})
export type AnalyticsLiveVisitor = z.infer<typeof analyticsLiveVisitorSchema>

export const analyticsLiveRecommendationSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  tone: z.enum(['info', 'action', 'warning']).default('info'),
  href: z.string().max(300).optional(),
})
export type AnalyticsLiveRecommendation = z.infer<typeof analyticsLiveRecommendationSchema>

export const analyticsLivePresenceSchema = z.object({
  activeCount: z.number().int().min(0),
  windowMinutes: z.number().int().min(1),
  asOf: isoTimestampSchema,
  siteId: uuidSchema.nullable().default(null),
  visitors: z.array(analyticsLiveVisitorSchema),
  /** Country rollup for the locations list — only rows with a known country. */
  locations: z.array(
    z.object({
      countryCode: z.string().length(2),
      countryName: z.string().max(80),
      visitors: z.number().int().min(1),
    }),
  ),
  channels: z.object({
    website: z.number().int().min(0),
    ecommerce: z.number().int().min(0),
    unknown: z.number().int().min(0),
  }),
  recommendations: z.array(analyticsLiveRecommendationSchema).default([]),
})
export type AnalyticsLivePresence = z.infer<typeof analyticsLivePresenceSchema>

// endregion
