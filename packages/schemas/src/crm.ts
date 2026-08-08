/**
 * crm contracts. Owned by the crm phase.
 *
 * Every cross-boundary shape for this domain lives here (ADR-0002). That
 * includes the three modules Phase 6a delivers as one vertical slice, because
 * they only make sense together:
 *
 *   * CRM      — contacts, companies, leads, pipelines, deals, activity
 *   * Email    — templates, segments, campaigns, transactional sends, flows
 *   * Automations — a stored node graph with resumable, idempotent runs
 *
 * Names are prefixed (`crm*`, `email*`, `automation*`) because every domain in
 * `packages/schemas` shares one flat export surface.
 */
import { z } from 'zod'
import { emailSchema, isoTimestampSchema, uuidSchema } from './common.js'

// region Shared primitives

/** A short machine key: stage keys, template keys, node ids, flow keys. */
export const crmKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, 'must be a lowercase key such as `lead_nurture`')

export const currencySchema = z.string().length(3).toUpperCase().default('EUR')

/**
 * Money is stored in minor units. A float euro amount that has been through
 * JSON and a weighted-forecast multiplication is no longer the amount the
 * salesperson typed.
 */
export const moneyCentsSchema = z.number().int().min(0).max(1_000_000_000_00)

/** Marketing consent, kept per contact. GDPR §97 — see `crmContactSchema`. */
export const crmConsentSchema = z.object({
  email: z.boolean().default(false),
  /** ISO timestamp of the moment consent was given, for the audit trail. */
  grantedAt: isoTimestampSchema.nullable().default(null),
  /** How it was obtained: `form`, `import`, `checkout`, `manual`. */
  source: z.string().max(64).default(''),
})
export type CrmConsent = z.infer<typeof crmConsentSchema>

/** UTM + click-id attribution captured at the moment a lead is created. */
export const crmAttributionSchema = z.object({
  source: z.string().max(200).default(''),
  medium: z.string().max(200).default(''),
  campaign: z.string().max(200).default(''),
  term: z.string().max(200).default(''),
  content: z.string().max(200).default(''),
  gclid: z.string().max(200).default(''),
  fbclid: z.string().max(200).default(''),
  landingPath: z.string().max(512).default(''),
  referrer: z.string().max(2048).default(''),
})
export type CrmAttribution = z.infer<typeof crmAttributionSchema>

// endregion

// region Companies

export const crmCompanySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  domain: z.string().max(253).default(''),
  industry: z.string().max(120).default(''),
  size: z.string().max(40).default(''),
  phone: z.string().max(60).default(''),
  website: z.string().max(2048).default(''),
  city: z.string().max(120).default(''),
  country: z.string().max(120).default(''),
  contactCount: z.number().int().min(0).default(0),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CrmCompany = z.infer<typeof crmCompanySchema>

export const createCrmCompanyInputSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(253).optional(),
  industry: z.string().max(120).optional(),
  size: z.string().max(40).optional(),
  phone: z.string().max(60).optional(),
  website: z.string().max(2048).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
})
export type CreateCrmCompanyInput = z.infer<typeof createCrmCompanyInputSchema>

// endregion

// region Contacts

export const CRM_CONTACT_SOURCES = [
  'form',
  'manual',
  'import',
  'checkout',
  'chat',
  'phone',
  'campaign',
  'api',
] as const
export const crmContactSourceSchema = z.enum(CRM_CONTACT_SOURCES)
export type CrmContactSource = z.infer<typeof crmContactSourceSchema>

/**
 * A person. Deliberately narrow: name, one address, one phone, consent and
 * tags. Anything richer belongs in a custom field the tenant asked for, not in
 * a column we collect by default (§97 — data minimisation).
 */
export const crmContactSchema = z.object({
  id: uuidSchema,
  companyId: uuidSchema.nullable().default(null),
  companyName: z.string().max(200).default(''),
  firstName: z.string().max(120).default(''),
  lastName: z.string().max(120).default(''),
  email: z.string().max(320).default(''),
  phone: z.string().max(60).default(''),
  jobTitle: z.string().max(160).default(''),
  source: crmContactSourceSchema.default('manual'),
  tags: z.array(z.string().max(40)).max(30).default([]),
  consent: crmConsentSchema.default({}),
  attribution: crmAttributionSchema.default({}),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CrmContact = z.infer<typeof crmContactSchema>

export const createCrmContactInputSchema = z.object({
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(60).optional(),
  jobTitle: z.string().max(160).optional(),
  companyId: uuidSchema.nullable().optional(),
  source: crmContactSourceSchema.optional(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  consent: crmConsentSchema.partial().optional(),
})
export type CreateCrmContactInput = z.infer<typeof createCrmContactInputSchema>

export const updateCrmContactInputSchema = createCrmContactInputSchema.partial()
export type UpdateCrmContactInput = z.infer<typeof updateCrmContactInputSchema>

/**
 * The GDPR subject-access payload (§97): everything the platform holds about
 * one person, in one document, in the platform's own vocabulary.
 */
export const crmContactExportSchema = z.object({
  exportedAt: isoTimestampSchema,
  contact: crmContactSchema,
  leads: z.array(z.record(z.unknown())).default([]),
  deals: z.array(z.record(z.unknown())).default([]),
  activities: z.array(z.record(z.unknown())).default([]),
  notes: z.array(z.record(z.unknown())).default([]),
  tasks: z.array(z.record(z.unknown())).default([]),
  emails: z.array(z.record(z.unknown())).default([]),
})
export type CrmContactExport = z.infer<typeof crmContactExportSchema>

// endregion

// region Pipelines and stages

export const crmStageSchema = z.object({
  id: uuidSchema,
  pipelineId: uuidSchema,
  key: crmKeySchema,
  name: z.string().min(1).max(80),
  position: z.number().int().min(0),
  /** Weight used by the forecast. 0…1. */
  probability: z.number().min(0).max(1).default(0.1),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
})
export type CrmStage = z.infer<typeof crmStageSchema>

export const crmPipelineSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  isDefault: z.boolean().default(false),
  stages: z.array(crmStageSchema).default([]),
  createdAt: isoTimestampSchema,
})
export type CrmPipeline = z.infer<typeof crmPipelineSchema>

/**
 * The default pipeline from §29. Created for a tenant on first use, then owned
 * by the tenant — this array is a starting point, never a runtime constant to
 * branch on.
 */
export const DEFAULT_PIPELINE_STAGES = [
  { key: 'new', name: 'New', probability: 0.1, isWon: false, isLost: false },
  { key: 'contacted', name: 'Contacted', probability: 0.2, isWon: false, isLost: false },
  { key: 'qualified', name: 'Qualified', probability: 0.4, isWon: false, isLost: false },
  { key: 'proposal', name: 'Proposal', probability: 0.7, isWon: false, isLost: false },
  { key: 'won', name: 'Won', probability: 1, isWon: true, isLost: false },
  { key: 'lost', name: 'Lost', probability: 0, isWon: false, isLost: true },
] as const

// endregion

// region Leads

export const CRM_LEAD_STATUSES = ['new', 'working', 'qualified', 'disqualified', 'converted'] as const
export const crmLeadStatusSchema = z.enum(CRM_LEAD_STATUSES)
export type CrmLeadStatus = z.infer<typeof crmLeadStatusSchema>

export const crmLeadSchema = z.object({
  id: uuidSchema,
  contactId: uuidSchema.nullable().default(null),
  companyId: uuidSchema.nullable().default(null),
  siteId: uuidSchema.nullable().default(null),
  dealId: uuidSchema.nullable().default(null),
  name: z.string().max(240).default(''),
  email: z.string().max(320).default(''),
  phone: z.string().max(60).default(''),
  message: z.string().max(5000).default(''),
  source: crmContactSourceSchema.default('form'),
  /** Form key, campaign name, or whatever identifies the specific origin. */
  sourceDetail: z.string().max(200).default(''),
  status: crmLeadStatusSchema.default('new'),
  /** 0…100. Deterministic, explainable — see `lib/crm/scoring.ts`. */
  score: z.number().int().min(0).max(100).default(0),
  attribution: crmAttributionSchema.default({}),
  /** The raw submitted fields, minus anything the contact record already holds. */
  fields: z.record(z.unknown()).default({}),
  qualifiedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CrmLead = z.infer<typeof crmLeadSchema>

export const createCrmLeadInputSchema = z.object({
  name: z.string().max(240).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(60).optional(),
  message: z.string().max(5000).optional(),
  companyName: z.string().max(200).optional(),
  source: crmContactSourceSchema.optional(),
  sourceDetail: z.string().max(200).optional(),
  contactId: uuidSchema.optional(),
  siteId: uuidSchema.optional(),
  attribution: crmAttributionSchema.partial().optional(),
  fields: z.record(z.unknown()).optional(),
})
export type CreateCrmLeadInput = z.infer<typeof createCrmLeadInputSchema>

export const updateCrmLeadInputSchema = z.object({
  status: crmLeadStatusSchema.optional(),
  score: z.number().int().min(0).max(100).optional(),
  message: z.string().max(5000).optional(),
  sourceDetail: z.string().max(200).optional(),
})
export type UpdateCrmLeadInput = z.infer<typeof updateCrmLeadInputSchema>

/**
 * What a storefront form posts. The tenant is *never* taken from this body: it
 * is resolved from the verified hostname the submission arrived for, exactly
 * like the public page read (`resolve_site_by_host`). A body-supplied tenant id
 * would be an unauthenticated write into any workspace.
 */
export const leadFromFormInputSchema = z.object({
  /** The hostname the form was served on. Required for unauthenticated posts. */
  host: z.string().min(1).max(253).optional(),
  formKey: z.string().max(120).default('contact'),
  name: z.string().max(240).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(60).optional(),
  message: z.string().max(5000).optional(),
  companyName: z.string().max(200).optional(),
  consent: z.boolean().default(false),
  /** Anything else the form collected. Kept as submitted, never interpreted. */
  fields: z.record(z.union([z.string().max(5000), z.number(), z.boolean()])).default({}),
  attribution: crmAttributionSchema.partial().optional(),
  /**
   * Anti-spam honeypot. A bot fills every input it can see; a human never sees
   * this one. Non-empty means the submission is accepted and dropped.
   */
  botField: z.string().max(200).optional(),
})
export type LeadFromFormInput = z.infer<typeof leadFromFormInputSchema>

// endregion

// region Deals

export const CRM_DEAL_STATUSES = ['open', 'won', 'lost'] as const
export const crmDealStatusSchema = z.enum(CRM_DEAL_STATUSES)
export type CrmDealStatus = z.infer<typeof crmDealStatusSchema>

export const crmDealSchema = z.object({
  id: uuidSchema,
  pipelineId: uuidSchema,
  stageId: uuidSchema,
  stageKey: crmKeySchema,
  stageName: z.string().max(80).default(''),
  contactId: uuidSchema.nullable().default(null),
  contactName: z.string().max(240).default(''),
  companyId: uuidSchema.nullable().default(null),
  leadId: uuidSchema.nullable().default(null),
  title: z.string().min(1).max(200),
  valueCents: moneyCentsSchema.default(0),
  currency: currencySchema,
  status: crmDealStatusSchema.default('open'),
  probability: z.number().min(0).max(1).default(0),
  /** `valueCents * probability`, computed server-side so every surface agrees. */
  weightedValueCents: z.number().int().min(0).default(0),
  expectedCloseOn: z.string().max(10).nullable().default(null),
  /** Whole seconds since the deal entered its current stage. */
  timeInStageSeconds: z.number().int().min(0).default(0),
  stageEnteredAt: isoTimestampSchema,
  closedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CrmDeal = z.infer<typeof crmDealSchema>

export const createCrmDealInputSchema = z.object({
  title: z.string().min(1).max(200),
  valueCents: moneyCentsSchema.optional(),
  currency: z.string().length(3).optional(),
  pipelineId: uuidSchema.optional(),
  stageKey: crmKeySchema.optional(),
  contactId: uuidSchema.nullable().optional(),
  companyId: uuidSchema.nullable().optional(),
  leadId: uuidSchema.nullable().optional(),
  expectedCloseOn: z.string().max(10).optional(),
})
export type CreateCrmDealInput = z.infer<typeof createCrmDealInputSchema>

export const updateCrmDealInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  valueCents: moneyCentsSchema.optional(),
  expectedCloseOn: z.string().max(10).nullable().optional(),
  contactId: uuidSchema.nullable().optional(),
})
export type UpdateCrmDealInput = z.infer<typeof updateCrmDealInputSchema>

export const moveCrmDealInputSchema = z.object({
  stageKey: crmKeySchema,
  /** Recorded on a move into a lost stage; ignored otherwise. */
  reason: z.string().max(300).optional(),
})
export type MoveCrmDealInput = z.infer<typeof moveCrmDealInputSchema>

/** One stage column of the board, with the numbers the header shows. */
export const crmPipelineColumnSchema = z.object({
  stage: crmStageSchema,
  deals: z.array(crmDealSchema).default([]),
  totalValueCents: z.number().int().min(0).default(0),
  weightedValueCents: z.number().int().min(0).default(0),
  averageTimeInStageSeconds: z.number().int().min(0).default(0),
})
export type CrmPipelineColumn = z.infer<typeof crmPipelineColumnSchema>

export const crmPipelineBoardSchema = z.object({
  pipeline: crmPipelineSchema,
  columns: z.array(crmPipelineColumnSchema).default([]),
  currency: z.string().length(3).default('EUR'),
  openValueCents: z.number().int().min(0).default(0),
  /** Σ (open deal value × stage probability). The only forecast we quote. */
  forecastCents: z.number().int().min(0).default(0),
  wonValueCents: z.number().int().min(0).default(0),
})
export type CrmPipelineBoard = z.infer<typeof crmPipelineBoardSchema>

// endregion

// region Activities, notes, tasks

export const CRM_ACTIVITY_TYPES = [
  'note',
  'call',
  'email',
  'meeting',
  'form',
  'stage_change',
  'system',
] as const
export const crmActivityTypeSchema = z.enum(CRM_ACTIVITY_TYPES)
export type CrmActivityType = z.infer<typeof crmActivityTypeSchema>

export const crmActivitySchema = z.object({
  id: uuidSchema,
  type: crmActivityTypeSchema,
  contactId: uuidSchema.nullable().default(null),
  dealId: uuidSchema.nullable().default(null),
  leadId: uuidSchema.nullable().default(null),
  subject: z.string().max(200).default(''),
  body: z.string().max(5000).default(''),
  metadata: z.record(z.unknown()).default({}),
  createdBy: z.string().max(200).default('system'),
  occurredAt: isoTimestampSchema,
})
export type CrmActivity = z.infer<typeof crmActivitySchema>

export const createCrmActivityInputSchema = z.object({
  type: crmActivityTypeSchema.default('note'),
  contactId: uuidSchema.nullable().optional(),
  dealId: uuidSchema.nullable().optional(),
  leadId: uuidSchema.nullable().optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  occurredAt: z.string().optional(),
})
export type CreateCrmActivityInput = z.infer<typeof createCrmActivityInputSchema>

export const crmNoteSchema = z.object({
  id: uuidSchema,
  contactId: uuidSchema.nullable().default(null),
  dealId: uuidSchema.nullable().default(null),
  body: z.string().max(10_000),
  createdBy: z.string().max(200).default('system'),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CrmNote = z.infer<typeof crmNoteSchema>

export const createCrmNoteInputSchema = z.object({
  body: z.string().min(1).max(10_000),
  contactId: uuidSchema.nullable().optional(),
  dealId: uuidSchema.nullable().optional(),
})
export type CreateCrmNoteInput = z.infer<typeof createCrmNoteInputSchema>

export const CRM_TASK_STATUSES = ['open', 'done', 'cancelled'] as const
export const crmTaskStatusSchema = z.enum(CRM_TASK_STATUSES)
export type CrmTaskStatus = z.infer<typeof crmTaskStatusSchema>

export const crmTaskSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  status: crmTaskStatusSchema.default('open'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  contactId: uuidSchema.nullable().default(null),
  dealId: uuidSchema.nullable().default(null),
  assigneeUserId: uuidSchema.nullable().default(null),
  dueAt: isoTimestampSchema.nullable().default(null),
  completedAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CrmTask = z.infer<typeof crmTaskSchema>

export const createCrmTaskInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  contactId: uuidSchema.nullable().optional(),
  dealId: uuidSchema.nullable().optional(),
  assigneeUserId: uuidSchema.nullable().optional(),
  dueAt: z.string().optional(),
})
export type CreateCrmTaskInput = z.infer<typeof createCrmTaskInputSchema>

export const updateCrmTaskInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: crmTaskStatusSchema.optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  dueAt: z.string().nullable().optional(),
})
export type UpdateCrmTaskInput = z.infer<typeof updateCrmTaskInputSchema>

// endregion

// region CRM overview

export const crmOverviewSchema = z.object({
  contactCount: z.number().int().min(0).default(0),
  companyCount: z.number().int().min(0).default(0),
  openLeadCount: z.number().int().min(0).default(0),
  leadsLast30Days: z.number().int().min(0).default(0),
  openDealCount: z.number().int().min(0).default(0),
  openValueCents: z.number().int().min(0).default(0),
  forecastCents: z.number().int().min(0).default(0),
  wonValueCents: z.number().int().min(0).default(0),
  wonLast30DaysCents: z.number().int().min(0).default(0),
  openTaskCount: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('EUR'),
})
export type CrmOverview = z.infer<typeof crmOverviewSchema>

// endregion

// region Email — templates

export const emailTemplateSchema = z.object({
  id: uuidSchema,
  key: crmKeySchema,
  name: z.string().min(1).max(160),
  subject: z.string().min(1).max(300),
  preheader: z.string().max(300).default(''),
  bodyHtml: z.string().max(200_000).default(''),
  bodyText: z.string().max(200_000).default(''),
  /** Variable names the body uses, so the UI can show what a preview needs. */
  variables: z.array(z.string().max(64)).max(60).default([]),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type EmailTemplate = z.infer<typeof emailTemplateSchema>

export const createEmailTemplateInputSchema = z.object({
  key: crmKeySchema,
  name: z.string().min(1).max(160),
  subject: z.string().min(1).max(300),
  preheader: z.string().max(300).optional(),
  bodyHtml: z.string().max(200_000).optional(),
  bodyText: z.string().max(200_000).optional(),
})
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateInputSchema>

export const updateEmailTemplateInputSchema = createEmailTemplateInputSchema.partial().omit({ key: true })
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateInputSchema>

// endregion

// region Email — segments

/**
 * The fields a segment rule may address.
 *
 * Deliberately only what the evaluator actually reads off a contact. Offering
 * a field the matcher silently ignores would let someone build a segment that
 * looks precise and is not.
 */
export const EMAIL_SEGMENT_FIELDS = ['tag', 'source', 'consent.email', 'createdAt'] as const
export const emailSegmentFieldSchema = z.enum(EMAIL_SEGMENT_FIELDS)

export const emailSegmentRuleSchema = z.object({
  field: emailSegmentFieldSchema,
  operator: z.enum(['eq', 'neq', 'contains', 'before', 'after', 'exists']),
  value: z.union([z.string().max(200), z.number(), z.boolean()]).optional(),
})
export type EmailSegmentRule = z.infer<typeof emailSegmentRuleSchema>

/**
 * A stored definition, evaluated at send time. Storing the *members* instead
 * would freeze a segment the moment it is created, which is the opposite of
 * what a segment is for.
 */
export const emailSegmentDefinitionSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  rules: z.array(emailSegmentRuleSchema).max(20).default([]),
  /** Never send to a contact without e-mail consent unless explicitly waived. */
  requireConsent: z.boolean().default(true),
})
export type EmailSegmentDefinition = z.infer<typeof emailSegmentDefinitionSchema>

export const emailSegmentSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(500).default(''),
  definition: emailSegmentDefinitionSchema.default({}),
  /** Recomputed on read; a stored count is a stale count. */
  memberCount: z.number().int().min(0).default(0),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type EmailSegment = z.infer<typeof emailSegmentSchema>

export const createEmailSegmentInputSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  definition: emailSegmentDefinitionSchema.optional(),
})
export type CreateEmailSegmentInput = z.infer<typeof createEmailSegmentInputSchema>

// endregion

// region Email — campaigns

export const EMAIL_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'failed'] as const
export const emailCampaignStatusSchema = z.enum(EMAIL_CAMPAIGN_STATUSES)
export type EmailCampaignStatus = z.infer<typeof emailCampaignStatusSchema>

export const emailCampaignStatsSchema = z.object({
  recipients: z.number().int().min(0).default(0),
  sent: z.number().int().min(0).default(0),
  failed: z.number().int().min(0).default(0),
  skipped: z.number().int().min(0).default(0),
})
export type EmailCampaignStats = z.infer<typeof emailCampaignStatsSchema>

export const emailCampaignSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(160),
  subject: z.string().min(1).max(300),
  fromName: z.string().max(160).default(''),
  fromEmail: z.string().max(320).default(''),
  templateId: uuidSchema.nullable().default(null),
  segmentId: uuidSchema.nullable().default(null),
  segmentName: z.string().max(160).default(''),
  bodyHtml: z.string().max(200_000).default(''),
  bodyText: z.string().max(200_000).default(''),
  status: emailCampaignStatusSchema.default('draft'),
  stats: emailCampaignStatsSchema.default({}),
  scheduledAt: isoTimestampSchema.nullable().default(null),
  sentAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type EmailCampaign = z.infer<typeof emailCampaignSchema>

export const createEmailCampaignInputSchema = z.object({
  name: z.string().min(1).max(160),
  subject: z.string().min(1).max(300),
  fromName: z.string().max(160).optional(),
  fromEmail: emailSchema.optional(),
  templateId: uuidSchema.nullable().optional(),
  segmentId: uuidSchema.nullable().optional(),
  bodyHtml: z.string().max(200_000).optional(),
  bodyText: z.string().max(200_000).optional(),
  scheduledAt: z.string().optional(),
})
export type CreateEmailCampaignInput = z.infer<typeof createEmailCampaignInputSchema>

export const updateEmailCampaignInputSchema = createEmailCampaignInputSchema.partial()
export type UpdateEmailCampaignInput = z.infer<typeof updateEmailCampaignInputSchema>

/** A transactional send: one message, one recipient, no segment. */
export const sendTransactionalEmailInputSchema = z.object({
  to: emailSchema,
  toName: z.string().max(160).optional(),
  subject: z.string().min(1).max(300).optional(),
  templateKey: crmKeySchema.optional(),
  bodyHtml: z.string().max(200_000).optional(),
  bodyText: z.string().max(200_000).optional(),
  variables: z.record(z.union([z.string().max(2000), z.number(), z.boolean()])).default({}),
  contactId: uuidSchema.optional(),
  /**
   * Caller-supplied de-duplication key. Two calls with the same key send once —
   * the property that makes a retry safe.
   */
  idempotencyKey: z.string().max(200).optional(),
})
export type SendTransactionalEmailInput = z.infer<typeof sendTransactionalEmailInputSchema>

// endregion

// region Email — messages and provider status

export const EMAIL_MESSAGE_KINDS = ['campaign', 'transactional', 'flow', 'automation'] as const
export const emailMessageKindSchema = z.enum(EMAIL_MESSAGE_KINDS)
export type EmailMessageKind = z.infer<typeof emailMessageKindSchema>

export const EMAIL_MESSAGE_STATUSES = ['queued', 'sent', 'failed', 'skipped'] as const
export const emailMessageStatusSchema = z.enum(EMAIL_MESSAGE_STATUSES)
export type EmailMessageStatus = z.infer<typeof emailMessageStatusSchema>

export const emailMessageSchema = z.object({
  id: uuidSchema,
  kind: emailMessageKindSchema,
  campaignId: uuidSchema.nullable().default(null),
  flowId: uuidSchema.nullable().default(null),
  contactId: uuidSchema.nullable().default(null),
  toEmail: z.string().max(320),
  subject: z.string().max(300).default(''),
  status: emailMessageStatusSchema.default('queued'),
  provider: z.string().max(40).default(''),
  providerMessageId: z.string().max(200).default(''),
  error: z.string().max(500).default(''),
  sentAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
})
export type EmailMessage = z.infer<typeof emailMessageSchema>

/**
 * What the dashboard shows about sending capability. `configured: false` is a
 * first-class answer — an environment with no SMTP credentials must say so,
 * not pretend a send succeeded (ADR-0006).
 */
export const emailProviderStatusSchema = z.object({
  provider: z.enum(['smtp', 'console', 'gmail']),
  configured: z.boolean(),
  /** Present when `configured` is false: what is missing, by name only. */
  missing: z.array(z.string().max(64)).default([]),
  defaultFromEmail: z.string().max(320).default(''),
  defaultFromName: z.string().max(160).default(''),
})
export type EmailProviderStatus = z.infer<typeof emailProviderStatusSchema>

// endregion

// region Email — flows

export const EMAIL_FLOW_KINDS = [
  'abandoned_cart',
  'post_purchase',
  'win_back',
  'review_request',
  'lead_nurture',
] as const
export const emailFlowKindSchema = z.enum(EMAIL_FLOW_KINDS)
export type EmailFlowKind = z.infer<typeof emailFlowKindSchema>

export const emailFlowStepSchema = z.object({
  id: crmKeySchema,
  /** Delay measured from the previous step, which is how the runner walks it. */
  delaySeconds: z.number().int().min(0).max(90 * 24 * 3600).default(0),
  subject: z.string().min(1).max(300),
  templateKey: crmKeySchema.optional(),
  bodyHtml: z.string().max(200_000).default(''),
  bodyText: z.string().max(200_000).default(''),
})
export type EmailFlowStep = z.infer<typeof emailFlowStepSchema>

/**
 * A flow is a stored definition, not code (§30). The runner reads this; adding
 * a new flow is a row, not a deploy.
 */
export const emailFlowSchema = z.object({
  id: uuidSchema,
  key: crmKeySchema,
  kind: emailFlowKindSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(500).default(''),
  enabled: z.boolean().default(false),
  triggerEvent: z.string().max(64).default(''),
  steps: z.array(emailFlowStepSchema).max(20).default([]),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type EmailFlow = z.infer<typeof emailFlowSchema>

export const createEmailFlowInputSchema = z.object({
  key: crmKeySchema,
  kind: emailFlowKindSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  triggerEvent: z.string().max(64).optional(),
  steps: z.array(emailFlowStepSchema).max(20).optional(),
})
export type CreateEmailFlowInput = z.infer<typeof createEmailFlowInputSchema>

export const updateEmailFlowInputSchema = createEmailFlowInputSchema.partial().omit({ key: true })
export type UpdateEmailFlowInput = z.infer<typeof updateEmailFlowInputSchema>

// endregion

// region Automations — graph

export const AUTOMATION_NODE_KINDS = ['trigger', 'condition', 'delay', 'branch', 'action'] as const
export const automationNodeKindSchema = z.enum(AUTOMATION_NODE_KINDS)
export type AutomationNodeKind = z.infer<typeof automationNodeKindSchema>

export const automationOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'exists',
  'not_exists',
])
export type AutomationOperator = z.infer<typeof automationOperatorSchema>

/** One predicate over the run context, addressed by dot-path. */
export const automationConditionSchema = z.object({
  field: z.string().min(1).max(160),
  operator: automationOperatorSchema,
  value: z.union([z.string().max(500), z.number(), z.boolean()]).optional(),
})
export type AutomationCondition = z.infer<typeof automationConditionSchema>

/**
 * The action registry (§31). Every action a graph can dispatch is one of these
 * — the union *is* the registry's type, so an unhandled action cannot compile.
 */
export const automationActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email.send'),
    to: z.enum(['contact', 'address']).default('contact'),
    address: z.string().max(320).optional(),
    templateKey: crmKeySchema.optional(),
    subject: z.string().max(300).optional(),
    bodyHtml: z.string().max(200_000).optional(),
    bodyText: z.string().max(200_000).optional(),
  }),
  z.object({
    type: z.literal('crm.update_contact'),
    addTags: z.array(z.string().max(40)).max(10).default([]),
    removeTags: z.array(z.string().max(40)).max(10).default([]),
    setSource: crmContactSourceSchema.optional(),
  }),
  z.object({
    type: z.literal('crm.create_task'),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    dueInSeconds: z.number().int().min(0).max(365 * 24 * 3600).default(86_400),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
  }),
  z.object({
    type: z.literal('crm.move_deal_stage'),
    stageKey: crmKeySchema,
  }),
  z.object({
    type: z.literal('webhook.post'),
    url: z.string().url().max(2048),
    /** Header *names* only carry secrets; values come from the tenant, not us. */
    headers: z.record(z.string().max(500)).default({}),
  }),
])
export type AutomationAction = z.infer<typeof automationActionSchema>
export type AutomationActionType = AutomationAction['type']

export const automationBranchSchema = z.object({
  key: crmKeySchema,
  label: z.string().max(80).default(''),
  when: automationConditionSchema,
  next: z.string().max(64).nullable().default(null),
})
export type AutomationBranch = z.infer<typeof automationBranchSchema>

export const automationNodeSchema = z.object({
  id: z.string().min(1).max(64),
  kind: automationNodeKindSchema,
  label: z.string().max(120).default(''),
  /** Trigger nodes only: the domain event that starts a run. */
  event: z.string().max(64).optional(),
  /** Condition nodes only. A false condition ends the run, it does not fail it. */
  condition: automationConditionSchema.optional(),
  /** Delay nodes only. */
  delaySeconds: z.number().int().min(0).max(365 * 24 * 3600).optional(),
  /** Branch nodes only. First matching branch wins; `next` is the fallback. */
  branches: z.array(automationBranchSchema).max(10).default([]),
  /** Action nodes only. */
  action: automationActionSchema.optional(),
  /** The default outgoing edge. `null` ends the run. */
  next: z.string().max(64).nullable().default(null),
})
export type AutomationNode = z.infer<typeof automationNodeSchema>

export const automationGraphSchema = z
  .object({
    entryNodeId: z.string().min(1).max(64),
    nodes: z.array(automationNodeSchema).min(1).max(100),
  })
  .superRefine((graph, ctx) => {
    const ids = new Set<string>()
    for (const node of graph.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate node id \`${node.id}\`` })
      }
      ids.add(node.id)
    }

    if (!ids.has(graph.entryNodeId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'entryNodeId does not name a node' })
    }

    // A dangling edge is a run that stops halfway through with no explanation.
    for (const node of graph.nodes) {
      const targets = [node.next, ...node.branches.map((branch) => branch.next)]
      for (const target of targets) {
        if (target && !ids.has(target)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `node \`${node.id}\` points at unknown \`${target}\`` })
        }
      }
      if (node.kind === 'action' && !node.action) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `action node \`${node.id}\` has no action` })
      }
      if (node.kind === 'condition' && !node.condition) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `condition node \`${node.id}\` has no condition` })
      }
    }
  })
export type AutomationGraph = z.infer<typeof automationGraphSchema>

// endregion

// region Automations — definition and runs

export const AUTOMATION_STATUSES = ['draft', 'active', 'paused'] as const
export const automationStatusSchema = z.enum(AUTOMATION_STATUSES)
export type AutomationStatus = z.infer<typeof automationStatusSchema>

export const automationSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(500).default(''),
  status: automationStatusSchema.default('draft'),
  triggerEvent: z.string().max(64).default(''),
  graph: automationGraphSchema,
  /**
   * Set when this automation was compiled from an e-mail flow. The flow stays
   * the definition a user edits; this is the executable form of it, and it is
   * regenerated whenever the flow changes. Hand-built automations have `null`.
   */
  sourceFlowId: uuidSchema.nullable().default(null),
  version: z.number().int().min(1).default(1),
  runCount: z.number().int().min(0).default(0),
  lastRunAt: isoTimestampSchema.nullable().default(null),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type Automation = z.infer<typeof automationSchema>

export const createAutomationInputSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  status: automationStatusSchema.optional(),
  triggerEvent: z.string().max(64).optional(),
  graph: automationGraphSchema,
})
export type CreateAutomationInput = z.infer<typeof createAutomationInputSchema>

export const updateAutomationInputSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(500).optional(),
  status: automationStatusSchema.optional(),
  triggerEvent: z.string().max(64).optional(),
  graph: automationGraphSchema.optional(),
})
export type UpdateAutomationInput = z.infer<typeof updateAutomationInputSchema>

export const AUTOMATION_RUN_STATUSES = [
  'pending',
  'running',
  'waiting',
  'completed',
  'failed',
  'cancelled',
] as const
export const automationRunStatusSchema = z.enum(AUTOMATION_RUN_STATUSES)
export type AutomationRunStatus = z.infer<typeof automationRunStatusSchema>

export const AUTOMATION_NODE_RUN_STATUSES = ['completed', 'failed', 'skipped'] as const
export const automationNodeRunStatusSchema = z.enum(AUTOMATION_NODE_RUN_STATUSES)
export type AutomationNodeRunStatus = z.infer<typeof automationNodeRunStatusSchema>

export const automationNodeRunSchema = z.object({
  id: uuidSchema,
  runId: uuidSchema,
  nodeId: z.string().max(64),
  kind: automationNodeKindSchema,
  status: automationNodeRunStatusSchema,
  output: z.record(z.unknown()).default({}),
  error: z.string().max(500).default(''),
  finishedAt: isoTimestampSchema,
})
export type AutomationNodeRun = z.infer<typeof automationNodeRunSchema>

export const automationRunSchema = z.object({
  id: uuidSchema,
  automationId: uuidSchema,
  automationName: z.string().max(160).default(''),
  status: automationRunStatusSchema,
  /**
   * The de-duplication key. Unique per (tenant, automation), so replaying the
   * same trigger — a retried webhook, a restarted process, an event delivered
   * twice — resumes the existing run instead of starting a second one.
   */
  triggerKey: z.string().max(200),
  triggerEvent: z.string().max(64).default(''),
  context: z.record(z.unknown()).default({}),
  currentNodeId: z.string().max(64).nullable().default(null),
  /** Set by a delay node: the run is parked until this moment. */
  resumeAt: isoTimestampSchema.nullable().default(null),
  error: z.string().max(500).default(''),
  nodeRuns: z.array(automationNodeRunSchema).default([]),
  startedAt: isoTimestampSchema,
  finishedAt: isoTimestampSchema.nullable().default(null),
})
export type AutomationRun = z.infer<typeof automationRunSchema>

/** Manually fire an automation — the same path an event takes. */
export const triggerAutomationInputSchema = z.object({
  triggerKey: z.string().min(1).max(200),
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  leadId: uuidSchema.optional(),
  context: z.record(z.unknown()).default({}),
})
export type TriggerAutomationInput = z.infer<typeof triggerAutomationInputSchema>

// endregion
