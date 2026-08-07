/**
 * E-mail persistence: templates, segments, campaigns, flows and the message
 * log.
 *
 * The message log is the interesting table. It is written *before* the send is
 * attempted and keyed by an idempotency key, so "did we already send this?" is
 * a question the database answers rather than one the runtime has to remember.
 */
import {
  emailCampaignSchema,
  emailFlowSchema,
  emailMessageSchema,
  emailSegmentSchema,
  emailTemplateSchema,
  type EmailCampaign,
  type EmailCampaignStats,
  type EmailCampaignStatus,
  type EmailFlow,
  type EmailFlowKind,
  type EmailFlowStep,
  type EmailMessage,
  type EmailMessageKind,
  type EmailMessageStatus,
  type EmailSegment,
  type EmailSegmentDefinition,
  type EmailTemplate,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

// region Templates

interface TemplateRow {
  id: string
  key: string
  name: string
  subject: string
  preheader: string
  body_html: string
  body_text: string
  created_at: Date
  updated_at: Date
}

/** `{{ name }}` placeholders the body actually uses, so a preview can ask for them. */
function extractVariables(...bodies: string[]): string[] {
  const found = new Set<string>()
  for (const body of bodies) {
    for (const match of body.matchAll(/\{\{\s*([a-zA-Z0-9_.]{1,64})\s*\}\}/g)) {
      if (match[1]) found.add(match[1])
    }
  }
  return [...found].slice(0, 60)
}

function toTemplate(row: TemplateRow): EmailTemplate {
  return emailTemplateSchema.parse({
    id: row.id,
    key: row.key,
    name: row.name,
    subject: row.subject,
    preheader: row.preheader,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    variables: extractVariables(row.subject, row.body_html, row.body_text),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listEmailTemplates(tx: Tx, tenantId: string): Promise<EmailTemplate[]> {
  const rows = await tx<TemplateRow[]>`
    SELECT * FROM email_templates WHERE tenant_id = ${tenantId} ORDER BY name ASC LIMIT 200
  `
  return rows.map(toTemplate)
}

export async function findEmailTemplateByKey(tx: Tx, tenantId: string, key: string): Promise<EmailTemplate | null> {
  const [row] = await tx<TemplateRow[]>`
    SELECT * FROM email_templates WHERE tenant_id = ${tenantId} AND key = ${key} LIMIT 1
  `
  return row ? toTemplate(row) : null
}

export async function findEmailTemplateById(tx: Tx, tenantId: string, id: string): Promise<EmailTemplate | null> {
  const [row] = await tx<TemplateRow[]>`
    SELECT * FROM email_templates WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1
  `
  return row ? toTemplate(row) : null
}

export async function upsertEmailTemplate(
  tx: Tx,
  tenantId: string,
  input: { key: string; name: string; subject: string; preheader?: string; bodyHtml?: string; bodyText?: string },
): Promise<EmailTemplate> {
  const [row] = await tx<TemplateRow[]>`
    INSERT INTO email_templates (tenant_id, key, name, subject, preheader, body_html, body_text)
    VALUES (
      ${tenantId}, ${input.key}, ${input.name}, ${input.subject},
      ${input.preheader ?? ''}, ${input.bodyHtml ?? ''}, ${input.bodyText ?? ''}
    )
    ON CONFLICT (tenant_id, key) DO UPDATE SET
      name      = EXCLUDED.name,
      subject   = EXCLUDED.subject,
      preheader = EXCLUDED.preheader,
      body_html = EXCLUDED.body_html,
      body_text = EXCLUDED.body_text
    RETURNING *
  `
  return toTemplate(row!)
}

// endregion

// region Segments

interface SegmentRow {
  id: string
  name: string
  description: string
  definition: unknown
  created_at: Date
  updated_at: Date
}

function toSegment(row: SegmentRow, memberCount = 0): EmailSegment {
  return emailSegmentSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    definition: readJson<Record<string, unknown>>(row.definition, {}),
    memberCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listEmailSegments(tx: Tx, tenantId: string): Promise<EmailSegment[]> {
  const rows = await tx<SegmentRow[]>`
    SELECT * FROM email_segments WHERE tenant_id = ${tenantId} ORDER BY name ASC LIMIT 200
  `
  return rows.map((row) => toSegment(row))
}

export async function findEmailSegmentById(tx: Tx, tenantId: string, id: string): Promise<EmailSegment | null> {
  const [row] = await tx<SegmentRow[]>`
    SELECT * FROM email_segments WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1
  `
  return row ? toSegment(row) : null
}

export async function insertEmailSegment(
  tx: Tx,
  tenantId: string,
  input: { name: string; description?: string; definition: EmailSegmentDefinition },
): Promise<EmailSegment> {
  const [row] = await tx<SegmentRow[]>`
    INSERT INTO email_segments (tenant_id, name, description, definition)
    VALUES (${tenantId}, ${input.name}, ${input.description ?? ''}, ${jsonParam(tx, input.definition)})
    RETURNING *
  `
  return toSegment(row!)
}

// endregion

// region Campaigns

interface CampaignRow {
  id: string
  template_id: string | null
  segment_id: string | null
  segment_name: string | null
  name: string
  subject: string
  from_name: string
  from_email: string
  body_html: string
  body_text: string
  status: EmailCampaignStatus
  stats: unknown
  scheduled_at: Date | null
  sent_at: Date | null
  created_at: Date
  updated_at: Date
}

function toCampaign(row: CampaignRow): EmailCampaign {
  return emailCampaignSchema.parse({
    id: row.id,
    name: row.name,
    subject: row.subject,
    fromName: row.from_name,
    fromEmail: row.from_email,
    templateId: row.template_id,
    segmentId: row.segment_id,
    segmentName: row.segment_name ?? '',
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    status: row.status,
    stats: readJson<Record<string, unknown>>(row.stats, {}),
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

const CAMPAIGN_SELECT = (tx: Tx) => tx`
  c.id, c.template_id, c.segment_id, s.name AS segment_name, c.name, c.subject, c.from_name, c.from_email,
  c.body_html, c.body_text, c.status, c.stats, c.scheduled_at, c.sent_at, c.created_at, c.updated_at
`

export async function listEmailCampaigns(tx: Tx, tenantId: string, limit = 100): Promise<EmailCampaign[]> {
  const rows = await tx<CampaignRow[]>`
    SELECT ${CAMPAIGN_SELECT(tx)}
    FROM email_campaigns c
    LEFT JOIN email_segments s ON s.id = c.segment_id
    WHERE c.tenant_id = ${tenantId}
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(toCampaign)
}

export async function findEmailCampaignById(tx: Tx, tenantId: string, id: string): Promise<EmailCampaign | null> {
  const [row] = await tx<CampaignRow[]>`
    SELECT ${CAMPAIGN_SELECT(tx)}
    FROM email_campaigns c
    LEFT JOIN email_segments s ON s.id = c.segment_id
    WHERE c.tenant_id = ${tenantId} AND c.id = ${id}
    LIMIT 1
  `
  return row ? toCampaign(row) : null
}

export async function insertEmailCampaign(
  tx: Tx,
  tenantId: string,
  input: {
    name: string
    subject: string
    fromName?: string
    fromEmail?: string
    templateId?: string | null
    segmentId?: string | null
    bodyHtml?: string
    bodyText?: string
    scheduledAt?: Date | null
  },
): Promise<EmailCampaign> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO email_campaigns (
      tenant_id, name, subject, from_name, from_email, template_id, segment_id,
      body_html, body_text, status, scheduled_at
    )
    VALUES (
      ${tenantId}, ${input.name}, ${input.subject}, ${input.fromName ?? ''}, ${input.fromEmail ?? ''},
      ${input.templateId ?? null}, ${input.segmentId ?? null},
      ${input.bodyHtml ?? ''}, ${input.bodyText ?? ''},
      ${input.scheduledAt ? 'scheduled' : 'draft'}, ${input.scheduledAt ?? null}
    )
    RETURNING id
  `
  const campaign = await findEmailCampaignById(tx, tenantId, row!.id)
  return campaign!
}

export async function updateEmailCampaign(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: {
    name?: string
    subject?: string
    fromName?: string
    fromEmail?: string
    templateId?: string | null
    segmentId?: string | null
    bodyHtml?: string
    bodyText?: string
    scheduledAt?: Date | null
  },
): Promise<EmailCampaign | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE email_campaigns SET
      name         = COALESCE(${patch.name ?? null}::text, name),
      subject      = COALESCE(${patch.subject ?? null}::text, subject),
      from_name    = COALESCE(${patch.fromName ?? null}::text, from_name),
      from_email   = COALESCE(${patch.fromEmail ?? null}::text, from_email),
      template_id  = COALESCE(${patch.templateId ?? null}::uuid, template_id),
      segment_id   = COALESCE(${patch.segmentId ?? null}::uuid, segment_id),
      body_html    = COALESCE(${patch.bodyHtml ?? null}::text, body_html),
      body_text    = COALESCE(${patch.bodyText ?? null}::text, body_text),
      scheduled_at = COALESCE(${patch.scheduledAt ?? null}::timestamptz, scheduled_at)
    WHERE tenant_id = ${tenantId} AND id = ${id} AND status IN ('draft', 'scheduled')
    RETURNING id
  `
  return rows.length ? findEmailCampaignById(tx, tenantId, id) : null
}

export async function markCampaignSent(
  tx: Tx,
  tenantId: string,
  id: string,
  status: EmailCampaignStatus,
  stats: EmailCampaignStats,
): Promise<EmailCampaign | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE email_campaigns SET
      status  = ${status},
      stats   = ${jsonParam(tx, stats)},
      sent_at = ${status === 'sent' ? new Date() : null}
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING id
  `
  return rows.length ? findEmailCampaignById(tx, tenantId, id) : null
}

// endregion

// region Flows

interface FlowRow {
  id: string
  key: string
  kind: EmailFlowKind
  name: string
  description: string
  enabled: boolean
  trigger_event: string
  steps: unknown
  created_at: Date
  updated_at: Date
}

function toFlow(row: FlowRow): EmailFlow {
  return emailFlowSchema.parse({
    id: row.id,
    key: row.key,
    kind: row.kind,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    triggerEvent: row.trigger_event,
    steps: readJson<unknown[]>(row.steps, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listEmailFlows(tx: Tx, tenantId: string): Promise<EmailFlow[]> {
  const rows = await tx<FlowRow[]>`
    SELECT * FROM email_flows WHERE tenant_id = ${tenantId} ORDER BY name ASC LIMIT 100
  `
  return rows.map(toFlow)
}

export async function findEmailFlowByKey(tx: Tx, tenantId: string, key: string): Promise<EmailFlow | null> {
  const [row] = await tx<FlowRow[]>`
    SELECT * FROM email_flows WHERE tenant_id = ${tenantId} AND key = ${key} LIMIT 1
  `
  return row ? toFlow(row) : null
}

export async function upsertEmailFlow(
  tx: Tx,
  tenantId: string,
  input: {
    key: string
    kind: EmailFlowKind
    name: string
    description?: string
    enabled?: boolean
    triggerEvent?: string
    steps?: EmailFlowStep[]
  },
): Promise<EmailFlow> {
  const [row] = await tx<FlowRow[]>`
    INSERT INTO email_flows (tenant_id, key, kind, name, description, enabled, trigger_event, steps)
    VALUES (
      ${tenantId}, ${input.key}, ${input.kind}, ${input.name}, ${input.description ?? ''},
      ${input.enabled ?? false}, ${input.triggerEvent ?? ''}, ${jsonParam(tx, input.steps ?? [])}
    )
    ON CONFLICT (tenant_id, key) DO UPDATE SET
      kind          = EXCLUDED.kind,
      name          = EXCLUDED.name,
      description   = EXCLUDED.description,
      enabled       = EXCLUDED.enabled,
      trigger_event = EXCLUDED.trigger_event,
      steps         = EXCLUDED.steps
    RETURNING *
  `
  return toFlow(row!)
}

export async function setEmailFlowEnabled(
  tx: Tx,
  tenantId: string,
  key: string,
  enabled: boolean,
): Promise<EmailFlow | null> {
  const [row] = await tx<FlowRow[]>`
    UPDATE email_flows SET enabled = ${enabled}
    WHERE tenant_id = ${tenantId} AND key = ${key}
    RETURNING *
  `
  return row ? toFlow(row) : null
}

// endregion

// region Messages

interface MessageRow {
  id: string
  kind: EmailMessageKind
  campaign_id: string | null
  flow_id: string | null
  contact_id: string | null
  to_email: string
  subject: string
  status: EmailMessageStatus
  provider: string
  provider_message_id: string
  error: string
  sent_at: Date | null
  created_at: Date
}

function toMessage(row: MessageRow): EmailMessage {
  return emailMessageSchema.parse({
    id: row.id,
    kind: row.kind,
    campaignId: row.campaign_id,
    flowId: row.flow_id,
    contactId: row.contact_id,
    toEmail: row.to_email,
    subject: row.subject,
    status: row.status,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    error: row.error,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  })
}

/**
 * Claim the right to send one message.
 *
 * Returns `null` when a row with this idempotency key already exists — which
 * is the whole point: the caller then skips the send instead of producing a
 * second e-mail after a retry or a restart.
 */
export async function claimEmailMessage(
  tx: Tx,
  tenantId: string,
  input: {
    kind: EmailMessageKind
    toEmail: string
    subject: string
    idempotencyKey: string
    campaignId?: string | null
    flowId?: string | null
    contactId?: string | null
  },
): Promise<EmailMessage | null> {
  const rows = await tx<MessageRow[]>`
    INSERT INTO email_messages (
      tenant_id, kind, campaign_id, flow_id, contact_id, to_email, subject, status, idempotency_key
    )
    VALUES (
      ${tenantId}, ${input.kind}, ${input.campaignId ?? null}, ${input.flowId ?? null},
      ${input.contactId ?? null}, ${input.toEmail}, ${input.subject}, 'queued', ${input.idempotencyKey}
    )
    ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key <> '' DO NOTHING
    RETURNING *
  `
  return rows.length ? toMessage(rows[0]!) : null
}

export async function completeEmailMessage(
  tx: Tx,
  tenantId: string,
  id: string,
  result: { status: EmailMessageStatus; provider: string; providerMessageId?: string; error?: string },
): Promise<void> {
  await tx`
    UPDATE email_messages SET
      status              = ${result.status},
      provider            = ${result.provider},
      provider_message_id = ${result.providerMessageId ?? ''},
      error               = ${result.error ?? ''},
      sent_at             = ${result.status === 'sent' ? new Date() : null}
    WHERE tenant_id = ${tenantId} AND id = ${id}
  `
}

export async function listEmailMessages(
  tx: Tx,
  tenantId: string,
  filter: { campaignId?: string; contactId?: string; limit?: number } = {},
): Promise<EmailMessage[]> {
  const rows = await tx<MessageRow[]>`
    SELECT * FROM email_messages
    WHERE tenant_id = ${tenantId}
      AND (${filter.campaignId ?? null}::uuid IS NULL OR campaign_id = ${filter.campaignId ?? null})
      AND (${filter.contactId ?? null}::uuid IS NULL OR contact_id = ${filter.contactId ?? null})
    ORDER BY created_at DESC
    LIMIT ${filter.limit ?? 100}
  `
  return rows.map(toMessage)
}

// endregion
