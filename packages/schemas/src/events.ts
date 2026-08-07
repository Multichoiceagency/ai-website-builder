import { z } from 'zod'
import { isoTimestampSchema, uuidSchema } from './common.js'

// region Domain events

/**
 * The integration seam between modules. Analytics, tracking, CRM, SEO, email,
 * automations and third-party apps all consume this stream rather than calling
 * each other. Names are stable API: renaming one breaks every subscriber and
 * every installed app, so add rather than rename.
 */
export const DOMAIN_EVENT_NAMES = [
  // identity & tenancy
  'user.registered',
  'tenant.created',
  'member.invited',
  'member.role_changed',

  // websites & content
  'site.created',
  'site.updated',
  'site.deleted',
  'page.created',
  'page.updated',
  'page.published',
  'page.unpublished',
  'page.deleted',
  'domain.connected',
  'domain.verified',

  // growth (Phase 3–6)
  'lead.created',
  'lead.qualified',
  'deal.won',
  'campaign.created',
  'campaign.published',
  'email.campaign_sent',

  // commerce (Phase 5)
  'product.created',
  'cart.created',
  'checkout.started',
  'order.placed',
  'payment.captured',
  'refund.created',

  // platform (Phase 7–8)
  'app.installed',
  'app.uninstalled',
  'experiment.started',
  'experiment.completed',

  // ai
  'ai.proposal_created',
  'ai.proposal_applied',
] as const

export const domainEventNameSchema = z.enum(DOMAIN_EVENT_NAMES)
export type DomainEventName = z.infer<typeof domainEventNameSchema>

/**
 * Who caused this. An agent acting for a user records both, which is what makes
 * the audit log answer "did a human ask for this?".
 */
export const actorSchema = z.object({
  type: z.enum(['user', 'agent', 'system', 'app']),
  id: z.string().max(200).nullable(),
  label: z.string().max(200).optional(),
  /** Set when `type` is `agent` or `app` and a user initiated the action. */
  onBehalfOfUserId: uuidSchema.optional(),
})
export type Actor = z.infer<typeof actorSchema>

export const domainEventSchema = z.object({
  id: uuidSchema,
  name: domainEventNameSchema,
  version: z.number().int().min(1).default(1),
  tenantId: uuidSchema.nullable(),
  occurredAt: isoTimestampSchema,
  actor: actorSchema,
  resource: z
    .object({
      type: z.string().max(64),
      id: z.string().max(200),
    })
    .nullable()
    .default(null),
  payload: z.record(z.unknown()).default({}),
})
export type DomainEvent = z.infer<typeof domainEventSchema>

// endregion

// region Universal tracking events

/** Website / lead-generation events. */
export const WEBSITE_EVENT_NAMES = [
  'page_view',
  'service_view',
  'form_start',
  'form_submit',
  'lead',
  'quote_requested',
  'appointment_booked',
  'phone_click',
  'whatsapp_click',
  'qualified_lead',
  'deal_won',
] as const

/** Commerce events, aligned with the GA4 / Meta vocabulary. */
export const COMMERCE_EVENT_NAMES = [
  'view_item',
  'view_item_list',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'purchase',
  'refund',
] as const

export const trackingEventNameSchema = z.enum([...WEBSITE_EVENT_NAMES, ...COMMERCE_EVENT_NAMES])
export type TrackingEventName = z.infer<typeof trackingEventNameSchema>

export const consentSchema = z.object({
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  personalization: z.boolean().default(false),
})
export type Consent = z.infer<typeof consentSchema>

export const trackingContextSchema = z.object({
  url: z.string().max(2048),
  referrer: z.string().max(2048).optional(),
  userAgent: z.string().max(1024).optional(),
  locale: z.string().max(16).optional(),
  utm: z
    .object({
      source: z.string().max(200).optional(),
      medium: z.string().max(200).optional(),
      campaign: z.string().max(200).optional(),
      term: z.string().max(200).optional(),
      content: z.string().max(200).optional(),
    })
    .optional(),
  clickIds: z
    .object({
      gclid: z.string().max(200).optional(),
      gbraid: z.string().max(200).optional(),
      wbraid: z.string().max(200).optional(),
      fbclid: z.string().max(200).optional(),
      ttclid: z.string().max(200).optional(),
      msclkid: z.string().max(200).optional(),
    })
    .optional(),
})
export type TrackingContext = z.infer<typeof trackingContextSchema>

/**
 * One event shape for client and server. `eventId` is generated once and reused
 * across every destination, which is what lets GA4, Google Ads and Meta
 * deduplicate a browser hit against its server-side twin.
 */
export const trackingEventSchema = z.object({
  eventId: z.string().min(8).max(64),
  name: trackingEventNameSchema,
  occurredAt: isoTimestampSchema,
  siteId: uuidSchema,
  sessionId: z.string().min(8).max(64),
  anonymousId: z.string().min(8).max(64),
  userId: z.string().max(200).nullable().default(null),
  consent: consentSchema,
  context: trackingContextSchema,
  value: z.number().optional(),
  currency: z.string().length(3).optional(),
  properties: z.record(z.unknown()).default({}),
})
export type TrackingEvent = z.infer<typeof trackingEventSchema>

// endregion
