/**
 * The send path.
 *
 * Three steps, in this order, and the order is the point:
 *
 *   1. claim a message row keyed by an idempotency key (one short transaction)
 *   2. hand the message to the provider (no transaction held open over a socket)
 *   3. record the outcome (one short transaction)
 *
 * If step 2 or 3 dies, the claim survives — so a retry finds the row, skips,
 * and nobody gets the same e-mail twice. The cost is that a message can be
 * left `queued`, which is honest: "we do not know whether this was delivered"
 * is a true statement, and `sent` would not be.
 */
import { createHash } from 'node:crypto'
import {
  emailCampaignStatsSchema,
  emailSegmentDefinitionSchema,
  type CrmContact,
  type EmailCampaign,
  type EmailCampaignStats,
  type EmailMessageKind,
} from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import {
  claimEmailMessage,
  completeEmailMessage,
  findEmailCampaignById,
  findEmailSegmentById,
  markCampaignSent,
} from '../../db/repositories/email.js'
import { listContactsForSend } from '../../db/repositories/crm.js'
import { getEmailConfig, getEmailProvider } from './index.js'
import { contactVariables, renderEmail } from './render.js'
import { matchesSegment } from './segments.js'

export interface SendEmailRequest {
  kind: EmailMessageKind
  to: string
  toName?: string
  subject: string
  html: string
  text: string
  /** Two calls with the same key send once. Required — there is no "just send". */
  idempotencyKey: string
  campaignId?: string | null
  flowId?: string | null
  contactId?: string | null
  fromEmail?: string
  fromName?: string
}

export interface SendEmailOutcome {
  status: 'sent' | 'failed' | 'skipped'
  messageId: string | null
  provider: string
  error?: string
}

/** A stable, opaque key. Long inputs (subject lines) must not blow the column. */
export function idempotencyKey(...parts: (string | null | undefined)[]): string {
  return createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 64)
}

export async function sendEmail(tenantId: string, request: SendEmailRequest): Promise<SendEmailOutcome> {
  const provider = getEmailProvider()
  const config = getEmailConfig()

  const claimed = await withTenant(tenantId, (tx) =>
    claimEmailMessage(tx, tenantId, {
      kind: request.kind,
      toEmail: request.to,
      subject: request.subject,
      idempotencyKey: request.idempotencyKey,
      campaignId: request.campaignId ?? null,
      flowId: request.flowId ?? null,
      contactId: request.contactId ?? null,
    }),
  )

  // Already claimed by an earlier attempt. Not an error — the desired state
  // ("this person has received this message once") already holds.
  if (!claimed) return { status: 'skipped', messageId: null, provider: provider.name }

  try {
    const result = await provider.send({
      to: request.to,
      toName: request.toName,
      from: request.fromEmail?.trim() || config.fromAddress || 'no-reply@localhost',
      fromName: request.fromName?.trim() || config.fromName,
      subject: request.subject,
      html: request.html,
      text: request.text,
      messageKey: claimed.id,
    })

    await withTenant(tenantId, (tx) =>
      completeEmailMessage(tx, tenantId, claimed.id, {
        status: 'sent',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
      }),
    )
    return { status: 'sent', messageId: claimed.id, provider: result.provider }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delivery failed.'
    await withTenant(tenantId, (tx) =>
      completeEmailMessage(tx, tenantId, claimed.id, {
        status: 'failed',
        provider: provider.name,
        error: message.slice(0, 500),
      }),
    )
    return { status: 'failed', messageId: claimed.id, provider: provider.name, error: message }
  }
}

export interface CampaignSendResult {
  campaign: EmailCampaign
  stats: EmailCampaignStats
  /** False when the console provider handled it — the UI must say so. */
  delivered: boolean
}

/**
 * Send a campaign to its segment.
 *
 * Recipients are resolved now, from the stored segment definition, so a
 * campaign written last week goes to the people who match today. Each send is
 * keyed by campaign *and* contact, which is what makes re-running a
 * half-finished campaign safe.
 */
export async function sendCampaign(tenantId: string, campaignId: string): Promise<CampaignSendResult | null> {
  const provider = getEmailProvider()

  const prepared = await withTenant(tenantId, async (tx) => {
    const campaign = await findEmailCampaignById(tx, tenantId, campaignId)
    if (!campaign) return null

    const segment = campaign.segmentId ? await findEmailSegmentById(tx, tenantId, campaign.segmentId) : null
    const definition = emailSegmentDefinitionSchema.parse(segment?.definition ?? {})
    const contacts = await listContactsForSend(tx, tenantId, { requireConsent: definition.requireConsent })

    return { campaign, definition, contacts }
  })
  if (!prepared) return null

  const recipients: CrmContact[] = prepared.contacts.filter((contact) =>
    matchesSegment(contact, prepared.definition),
  )

  const stats = { recipients: recipients.length, sent: 0, failed: 0, skipped: 0 }

  for (const contact of recipients) {
    const rendered = renderEmail(
      { subject: prepared.campaign.subject, bodyHtml: prepared.campaign.bodyHtml, bodyText: prepared.campaign.bodyText },
      contactVariables(contact),
    )

    const outcome = await sendEmail(tenantId, {
      kind: 'campaign',
      to: contact.email,
      toName: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: idempotencyKey('campaign', prepared.campaign.id, contact.id),
      campaignId: prepared.campaign.id,
      contactId: contact.id,
      fromEmail: prepared.campaign.fromEmail,
      fromName: prepared.campaign.fromName,
    })

    if (outcome.status === 'sent') stats.sent += 1
    else if (outcome.status === 'failed') stats.failed += 1
    else stats.skipped += 1
  }

  const status = stats.failed > 0 && stats.sent === 0 ? 'failed' : 'sent'
  const parsedStats = emailCampaignStatsSchema.parse(stats)

  const campaign = await withTenant(tenantId, (tx) =>
    markCampaignSent(tx, tenantId, campaignId, status, parsedStats),
  )

  return {
    campaign: campaign ?? prepared.campaign,
    stats: parsedStats,
    delivered: provider.configured,
  }
}
