/**
 * Turning a submission into CRM records.
 *
 * One use case, shared by the storefront form endpoint and the authenticated
 * "add a lead" call, because both have to do exactly the same four things and
 * doing them differently is how a CRM ends up with two contacts for one
 * person.
 */
import {
  crmAttributionSchema,
  crmConsentSchema,
  type CrmAttribution,
  type CrmContact,
  type CrmContactSource,
  type CrmLead,
} from '@platform/schemas'
import type { Tx } from '../../db/client.js'
import {
  findContactByEmail,
  findOrCreateCompanyByName,
  insertContact,
  insertLead,
  updateContact,
} from '../../db/repositories/crm.js'
import { insertActivity } from '../../db/repositories/crm-activity.js'
import { scoreLead } from './scoring.js'

export interface LeadSubmission {
  name?: string
  email?: string
  phone?: string
  message?: string
  companyName?: string
  source?: CrmContactSource
  sourceDetail?: string
  siteId?: string | null
  consent?: boolean
  consentSource?: string
  attribution?: Partial<CrmAttribution>
  fields?: Record<string, unknown>
}

export interface LeadCreationResult {
  lead: CrmLead
  contact: CrmContact | null
  score: number
  reasons: string[]
  /** True when the submission matched an existing contact rather than creating one. */
  matchedExistingContact: boolean
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') }
}

/**
 * Create the lead, and the contact and company it implies.
 *
 * Runs entirely inside the caller's transaction: a lead without its contact,
 * or a contact without its activity entry, is a record nobody can act on.
 */
export async function createLeadFromSubmission(
  tx: Tx,
  tenantId: string,
  submission: LeadSubmission,
): Promise<LeadCreationResult> {
  const attribution = crmAttributionSchema.parse(submission.attribution ?? {})
  const { score, reasons } = scoreLead({
    email: submission.email,
    phone: submission.phone,
    message: submission.message,
    companyName: submission.companyName,
    attribution,
  })

  const company = submission.companyName?.trim()
    ? await findOrCreateCompanyByName(tx, tenantId, submission.companyName.trim())
    : null

  const consent = crmConsentSchema.parse({
    email: submission.consent ?? false,
    grantedAt: submission.consent ? new Date().toISOString() : null,
    source: submission.consentSource ?? submission.sourceDetail ?? 'form',
  })

  // Identity is the e-mail address. Without one there is nothing to match on,
  // so the lead is recorded without a contact rather than guessed into one.
  let contact: CrmContact | null = null
  let matchedExistingContact = false

  if (submission.email?.trim()) {
    const existing = await findContactByEmail(tx, tenantId, submission.email.trim())
    const { firstName, lastName } = splitName(submission.name ?? '')

    if (existing) {
      matchedExistingContact = true
      contact =
        (await updateContact(tx, tenantId, existing.id, {
          // Only fill gaps. A later form must not overwrite a name someone
          // corrected by hand in the CRM.
          firstName: existing.firstName || firstName || undefined,
          lastName: existing.lastName || lastName || undefined,
          phone: existing.phone || submission.phone || undefined,
          companyId: existing.companyId ?? company?.id ?? undefined,
          // Consent only ever moves forward on a submission that granted it.
          consent: submission.consent ? consent : undefined,
        })) ?? existing
    } else {
      contact = await insertContact(tx, tenantId, {
        firstName,
        lastName,
        email: submission.email.trim(),
        phone: submission.phone ?? '',
        companyId: company?.id ?? null,
        source: submission.source ?? 'form',
        consent,
        attribution,
      })
    }
  }

  const lead = await insertLead(tx, tenantId, {
    contactId: contact?.id ?? null,
    companyId: company?.id ?? null,
    siteId: submission.siteId ?? null,
    name: submission.name ?? '',
    email: submission.email ?? '',
    phone: submission.phone ?? '',
    message: submission.message ?? '',
    source: submission.source ?? 'form',
    sourceDetail: submission.sourceDetail ?? '',
    score,
    attribution,
    fields: submission.fields ?? {},
  })

  await insertActivity(tx, tenantId, {
    type: 'form',
    contactId: contact?.id ?? null,
    leadId: lead.id,
    subject: submission.sourceDetail ? `Form: ${submission.sourceDetail}` : 'Form submission',
    body: submission.message ?? '',
    metadata: { score, reasons, attribution },
    createdBy: 'system',
  })

  return { lead, contact, score, reasons, matchedExistingContact }
}
