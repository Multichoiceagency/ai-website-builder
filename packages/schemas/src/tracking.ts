import { z } from 'zod'
import { isoTimestampSchema, uuidSchema } from './common.js'
import { consentSchema, trackingContextSchema, trackingEventNameSchema, trackingEventSchema } from './events.js'

/**
 * Tracking contracts (§22–§28).
 *
 * The universal event itself lives in `events.ts` and is shared by the client
 * SDK and the server gateway. This file adds everything *around* that event:
 * where it is allowed to go (consent), where it was sent (destinations), what
 * happened when it got there (delivery), and what it says about where the
 * visitor came from (attribution).
 *
 * Every cross-boundary shape for this domain lives here (ADR-0002).
 */

// region Destinations

export const TRACKING_DESTINATIONS = ['internal', 'ga4', 'google_ads', 'meta_capi'] as const

export const trackingDestinationIdSchema = z.enum(TRACKING_DESTINATIONS)
export type TrackingDestinationId = z.infer<typeof trackingDestinationIdSchema>

/**
 * The consent category a destination is gated on (§27).
 *
 * `none` is not "no consent needed for anything" — it is reserved for the
 * platform's own first-party store, which is the record the customer already
 * has a lawful basis for and the ledger every other decision is written into.
 */
export const trackingConsentCategorySchema = z.enum(['none', 'analytics', 'marketing'])
export type TrackingConsentCategory = z.infer<typeof trackingConsentCategorySchema>

/**
 * Which consent each destination needs. Declared here rather than inside each
 * adapter so the dashboard can explain the gate without asking the server, and
 * so adding a destination forces the question to be answered.
 */
export const TRACKING_DESTINATION_CONSENT: Record<TrackingDestinationId, TrackingConsentCategory> = {
  internal: 'none',
  ga4: 'analytics',
  google_ads: 'marketing',
  meta_capi: 'marketing',
}

/**
 * Events an ad platform will accept as a conversion. Ad destinations skip
 * anything else: uploading a `page_view` to Google Ads is not a conversion, it
 * is a rejected API call and a confusing delivery report.
 */
export const TRACKING_CONVERSION_EVENTS = [
  'lead',
  'qualified_lead',
  'quote_requested',
  'appointment_booked',
  'phone_click',
  'whatsapp_click',
  'form_submit',
  'purchase',
  'deal_won',
] as const

export const trackingConversionEventSchema = z.enum(TRACKING_CONVERSION_EVENTS)
export type TrackingConversionEvent = z.infer<typeof trackingConversionEventSchema>

// endregion

// region Collection

/**
 * A batch of hits from one page. Capped because this endpoint is reachable by
 * anything holding a session, and an unbounded batch is an unbounded write.
 */
export const trackingCollectRequestSchema = z.object({
  events: z.array(trackingEventSchema).min(1).max(50),
})
export type TrackingCollectRequest = z.infer<typeof trackingCollectRequestSchema>

/**
 * `duplicate` is a success, not an error: it means the client-side hit and its
 * server-side twin shared an `eventId` and we counted it once (§25).
 * `rejected` means the event named a site this tenant does not own.
 */
export const trackingIngestStatusSchema = z.enum(['accepted', 'duplicate', 'rejected'])
export type TrackingIngestStatus = z.infer<typeof trackingIngestStatusSchema>

export const trackingDeliveryStatusSchema = z.enum(['delivered', 'failed', 'skipped', 'not_configured'])
export type TrackingDeliveryStatus = z.infer<typeof trackingDeliveryStatusSchema>

export const trackingDeliveryResultSchema = z.object({
  destination: trackingDestinationIdSchema,
  status: trackingDeliveryStatusSchema,
  /** Why it was skipped, failed or unconfigured. Always populated except on success. */
  reason: z.string().max(300).nullable().default(null),
})
export type TrackingDeliveryResult = z.infer<typeof trackingDeliveryResultSchema>

export const trackingCollectResultSchema = z.object({
  eventId: z.string().max(64),
  status: trackingIngestStatusSchema,
  reason: z.string().max(300).nullable().default(null),
  deliveries: z.array(trackingDeliveryResultSchema).default([]),
})
export type TrackingCollectResult = z.infer<typeof trackingCollectResultSchema>

export const trackingCollectResponseSchema = z.object({
  received: z.number().int().min(0),
  accepted: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  rejected: z.number().int().min(0),
  results: z.array(trackingCollectResultSchema),
})
export type TrackingCollectResponse = z.infer<typeof trackingCollectResponseSchema>

// endregion

// region Read models

/** One stored event plus what happened to it — the event debugger's row (§26). */
export const storedTrackingEventSchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  eventId: z.string().max(64),
  name: trackingEventNameSchema,
  occurredAt: isoTimestampSchema,
  receivedAt: isoTimestampSchema,
  sessionId: z.string().max(64),
  anonymousId: z.string().max(64),
  userId: z.string().max(200).nullable().default(null),
  consent: consentSchema,
  context: trackingContextSchema,
  value: z.number().nullable().default(null),
  currency: z.string().length(3).nullable().default(null),
  properties: z.record(z.unknown()).default({}),
  deliveries: z.array(trackingDeliveryResultSchema).default([]),
})
export type StoredTrackingEvent = z.infer<typeof storedTrackingEventSchema>

/**
 * Per-destination delivery counts. The UI shows these next to the platform's
 * own numbers, because the interesting question is never "how many events do
 * we have" — it is "why does GA4 show fewer" (§26).
 */
export const trackingDestinationReportSchema = z.object({
  id: trackingDestinationIdSchema,
  label: z.string().max(60),
  consent: trackingConsentCategorySchema,
  /** False when this installation has no credentials for it. Never faked. */
  configured: z.boolean(),
  delivered: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  notConfigured: z.number().int().min(0),
  lastDeliveredAt: isoTimestampSchema.nullable().default(null),
  lastError: z.string().max(300).nullable().default(null),
})
export type TrackingDestinationReport = z.infer<typeof trackingDestinationReportSchema>

// endregion

// region Attribution (§28)

/** Where one visit came from. `(direct)` and `(none)` follow the GA convention. */
export const trackingTouchSchema = z.object({
  source: z.string().max(200),
  medium: z.string().max(200),
  campaign: z.string().max(200),
  term: z.string().max(200).default(''),
  content: z.string().max(200).default(''),
  clickIds: z.record(z.string().max(200)).default({}),
  landingUrl: z.string().max(2048).default(''),
  referrer: z.string().max(2048).default(''),
  occurredAt: isoTimestampSchema.nullable().default(null),
})
export type TrackingTouch = z.infer<typeof trackingTouchSchema>

/** First and last touch for one anonymous visitor, kept for the whole lifetime. */
export const trackingIdentitySchema = z.object({
  anonymousId: z.string().max(64),
  userId: z.string().max(200).nullable().default(null),
  firstTouch: trackingTouchSchema,
  lastTouch: trackingTouchSchema,
  firstSeenAt: isoTimestampSchema,
  lastSeenAt: isoTimestampSchema,
  sessionCount: z.number().int().min(0),
})
export type TrackingIdentity = z.infer<typeof trackingIdentitySchema>

export const trackingAttributionModelSchema = z.enum(['first_click', 'last_click', 'linear'])
export type TrackingAttributionModel = z.infer<typeof trackingAttributionModelSchema>

/** Credit is fractional under `linear`, which is why it is not an integer. */
export const trackingAttributionRowSchema = z.object({
  channel: z.string().max(420),
  source: z.string().max(200),
  medium: z.string().max(200),
  campaign: z.string().max(200),
  conversions: z.number().min(0),
  value: z.number().min(0),
})
export type TrackingAttributionRow = z.infer<typeof trackingAttributionRowSchema>

export const trackingAttributionReportSchema = z.object({
  model: trackingAttributionModelSchema,
  from: isoTimestampSchema,
  to: isoTimestampSchema,
  lookbackDays: z.number().int().min(1),
  events: z.array(trackingEventNameSchema),
  totalConversions: z.number().min(0),
  totalValue: z.number().min(0),
  /** Conversions whose visitor has no session on record and cannot be credited. */
  unattributed: z.number().min(0),
  rows: z.array(trackingAttributionRowSchema),
})
export type TrackingAttributionReport = z.infer<typeof trackingAttributionReportSchema>

// endregion
