/**
 * CRM persistence: companies, contacts, leads, and the workspace aggregates.
 *
 * SQL lives here and nowhere else (ADR-0005). Every function takes a
 * transaction handle that `withTenant` has already bound to a tenant, and
 * still filters on `tenant_id` — the application filter and the RLS policy are
 * two independent layers, not one written twice (ADR-0004).
 *
 * The rest of the domain: pipelines and deals in `crm-deals.ts`, the timeline
 * in `crm-activity.ts`, e-mail in `email.ts`, automations in `automation.ts`.
 */
import {
  crmCompanySchema,
  crmContactSchema,
  crmLeadSchema,
  type CrmCompany,
  type CrmContact,
  type CrmContactSource,
  type CrmLead,
  type CrmLeadStatus,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

// region Row shapes and mappers

interface CompanyRow {
  id: string
  name: string
  domain: string
  industry: string
  size: string
  phone: string
  website: string
  city: string
  country: string
  contact_count?: string | number
  created_at: Date
  updated_at: Date
}

function toCompany(row: CompanyRow): CrmCompany {
  return crmCompanySchema.parse({
    id: row.id,
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    size: row.size,
    phone: row.phone,
    website: row.website,
    city: row.city,
    country: row.country,
    contactCount: Number(row.contact_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

interface ContactRow {
  id: string
  company_id: string | null
  company_name: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  source: CrmContactSource
  tags: string[] | null
  consent: unknown
  attribution: unknown
  created_at: Date
  updated_at: Date
}

function toContact(row: ContactRow): CrmContact {
  return crmContactSchema.parse({
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name ?? '',
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    source: row.source,
    tags: row.tags ?? [],
    consent: readJson<Record<string, unknown>>(row.consent, {}),
    attribution: readJson<Record<string, unknown>>(row.attribution, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

interface LeadRow {
  id: string
  contact_id: string | null
  company_id: string | null
  site_id: string | null
  deal_id?: string | null
  name: string
  email: string
  phone: string
  message: string
  source: CrmContactSource
  source_detail: string
  status: CrmLeadStatus
  score: number
  attribution: unknown
  fields: unknown
  qualified_at: Date | null
  created_at: Date
  updated_at: Date
}

function toLead(row: LeadRow): CrmLead {
  return crmLeadSchema.parse({
    id: row.id,
    contactId: row.contact_id,
    companyId: row.company_id,
    siteId: row.site_id,
    dealId: row.deal_id ?? null,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    source: row.source,
    sourceDetail: row.source_detail,
    status: row.status,
    score: Number(row.score),
    attribution: readJson<Record<string, unknown>>(row.attribution, {}),
    fields: readJson<Record<string, unknown>>(row.fields, {}),
    qualifiedAt: row.qualified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

// endregion

// region Companies

export async function listCompanies(tx: Tx, tenantId: string, limit = 100): Promise<CrmCompany[]> {
  const rows = await tx<CompanyRow[]>`
    SELECT co.*, (SELECT count(*) FROM crm_contacts ct WHERE ct.company_id = co.id) AS contact_count
    FROM crm_companies co
    WHERE co.tenant_id = ${tenantId}
    ORDER BY co.name ASC
    LIMIT ${limit}
  `
  return rows.map(toCompany)
}

export async function findCompanyById(tx: Tx, tenantId: string, id: string): Promise<CrmCompany | null> {
  const [row] = await tx<CompanyRow[]>`
    SELECT * FROM crm_companies WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1
  `
  return row ? toCompany(row) : null
}

export async function insertCompany(
  tx: Tx,
  tenantId: string,
  input: {
    name: string
    domain?: string
    industry?: string
    size?: string
    phone?: string
    website?: string
    city?: string
    country?: string
  },
): Promise<CrmCompany> {
  const [row] = await tx<CompanyRow[]>`
    INSERT INTO crm_companies (tenant_id, name, domain, industry, size, phone, website, city, country)
    VALUES (
      ${tenantId}, ${input.name}, ${input.domain ?? ''}, ${input.industry ?? ''}, ${input.size ?? ''},
      ${input.phone ?? ''}, ${input.website ?? ''}, ${input.city ?? ''}, ${input.country ?? ''}
    )
    RETURNING *
  `
  return toCompany(row!)
}

/** Used by form ingestion, which has a company *name* and nothing else. */
export async function findOrCreateCompanyByName(tx: Tx, tenantId: string, name: string): Promise<CrmCompany> {
  const [existing] = await tx<CompanyRow[]>`
    SELECT * FROM crm_companies
    WHERE tenant_id = ${tenantId} AND lower(name) = lower(${name})
    LIMIT 1
  `
  return existing ? toCompany(existing) : insertCompany(tx, tenantId, { name })
}

// endregion

// region Contacts

const CONTACT_SELECT = (tx: Tx) => tx`
  ct.id, ct.company_id, co.name AS company_name, ct.first_name, ct.last_name, ct.email, ct.phone,
  ct.job_title, ct.source, ct.tags, ct.consent, ct.attribution, ct.created_at, ct.updated_at
`

export async function listContacts(
  tx: Tx,
  tenantId: string,
  options: { search?: string; limit?: number; offset?: number } = {},
): Promise<CrmContact[]> {
  const search = options.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null
  const rows = await tx<ContactRow[]>`
    SELECT ${CONTACT_SELECT(tx)}
    FROM crm_contacts ct
    LEFT JOIN crm_companies co ON co.id = ct.company_id
    WHERE ct.tenant_id = ${tenantId}
      AND (
        ${search}::text IS NULL
        OR lower(ct.email) LIKE ${search}
        OR lower(concat_ws(' ', ct.first_name, ct.last_name)) LIKE ${search}
      )
    ORDER BY ct.created_at DESC
    LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}
  `
  return rows.map(toContact)
}

export async function countContacts(tx: Tx, tenantId: string): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*) AS count FROM crm_contacts WHERE tenant_id = ${tenantId}
  `
  return Number(row?.count ?? 0)
}

export async function findContactById(tx: Tx, tenantId: string, id: string): Promise<CrmContact | null> {
  const [row] = await tx<ContactRow[]>`
    SELECT ${CONTACT_SELECT(tx)}
    FROM crm_contacts ct
    LEFT JOIN crm_companies co ON co.id = ct.company_id
    WHERE ct.tenant_id = ${tenantId} AND ct.id = ${id}
    LIMIT 1
  `
  return row ? toContact(row) : null
}

export async function findContactByEmail(tx: Tx, tenantId: string, email: string): Promise<CrmContact | null> {
  const [row] = await tx<ContactRow[]>`
    SELECT ${CONTACT_SELECT(tx)}
    FROM crm_contacts ct
    LEFT JOIN crm_companies co ON co.id = ct.company_id
    WHERE ct.tenant_id = ${tenantId} AND lower(ct.email) = lower(${email})
    LIMIT 1
  `
  return row ? toContact(row) : null
}

export interface ContactWrite {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  jobTitle?: string
  companyId?: string | null
  source?: CrmContactSource
  tags?: string[]
  consent?: Record<string, unknown>
  attribution?: Record<string, unknown>
}

export async function insertContact(tx: Tx, tenantId: string, input: ContactWrite): Promise<CrmContact> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO crm_contacts (
      tenant_id, company_id, first_name, last_name, email, phone, job_title, source, tags, consent, attribution
    )
    VALUES (
      ${tenantId}, ${input.companyId ?? null}, ${input.firstName ?? ''}, ${input.lastName ?? ''},
      ${input.email ?? ''}, ${input.phone ?? ''}, ${input.jobTitle ?? ''}, ${input.source ?? 'manual'},
      ${input.tags ?? []}, ${jsonParam(tx, input.consent ?? {})}, ${jsonParam(tx, input.attribution ?? {})}
    )
    RETURNING id
  `
  const contact = await findContactById(tx, tenantId, row!.id)
  return contact!
}

export async function updateContact(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: ContactWrite,
): Promise<CrmContact | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE crm_contacts SET
      first_name  = COALESCE(${patch.firstName ?? null}::text, first_name),
      last_name   = COALESCE(${patch.lastName ?? null}::text, last_name),
      email       = COALESCE(${patch.email ?? null}::text, email),
      phone       = COALESCE(${patch.phone ?? null}::text, phone),
      job_title   = COALESCE(${patch.jobTitle ?? null}::text, job_title),
      company_id  = COALESCE(${patch.companyId ?? null}::uuid, company_id),
      source      = COALESCE(${patch.source ?? null}::text, source),
      tags        = COALESCE(${patch.tags ?? null}::text[], tags),
      consent     = COALESCE(${patch.consent ? jsonParam(tx, patch.consent) : null}::jsonb, consent),
      attribution = COALESCE(${patch.attribution ? jsonParam(tx, patch.attribution) : null}::jsonb, attribution)
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING id
  `
  return rows.length ? findContactById(tx, tenantId, id) : null
}

/**
 * Erasure (§97). A hard delete, not a flag.
 *
 * Deleting the row is not enough: leads and message records carry copies of
 * the same personal data, and a foreign key set to NULL would leave the name
 * and the address sitting in `crm_leads`. So the copies are scrubbed first,
 * then the contact goes and its own timeline cascades with it.
 *
 * What survives is deliberately impersonal — the lead still counts towards
 * conversion, the deal still counts towards revenue, and neither says who.
 */
export async function eraseContact(tx: Tx, tenantId: string, id: string): Promise<boolean> {
  const [contact] = await tx<{ id: string }[]>`
    SELECT id FROM crm_contacts WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1
  `
  if (!contact) return false

  await tx`
    UPDATE crm_leads SET name = '', email = '', phone = '', message = '', fields = '{}'::jsonb
    WHERE tenant_id = ${tenantId} AND contact_id = ${id}
  `
  await tx`
    UPDATE email_messages SET to_email = '', subject = ''
    WHERE tenant_id = ${tenantId} AND contact_id = ${id}
  `
  await tx`DELETE FROM crm_contacts WHERE tenant_id = ${tenantId} AND id = ${id}`

  return true
}

/** Contacts a segment can send to, resolved at send time. */
export async function listContactsForSend(
  tx: Tx,
  tenantId: string,
  options: { requireConsent: boolean; limit?: number },
): Promise<CrmContact[]> {
  const rows = await tx<ContactRow[]>`
    SELECT ${CONTACT_SELECT(tx)}
    FROM crm_contacts ct
    LEFT JOIN crm_companies co ON co.id = ct.company_id
    WHERE ct.tenant_id = ${tenantId}
      AND ct.email <> ''
      AND (${options.requireConsent} = false OR ct.consent ->> 'email' = 'true')
    ORDER BY ct.created_at DESC
    LIMIT ${options.limit ?? 5000}
  `
  return rows.map(toContact)
}

// endregion
// region Leads

export async function listLeads(
  tx: Tx,
  tenantId: string,
  options: { status?: CrmLeadStatus; limit?: number; offset?: number } = {},
): Promise<CrmLead[]> {
  const rows = await tx<LeadRow[]>`
    SELECT l.*, (SELECT d.id FROM crm_deals d WHERE d.lead_id = l.id LIMIT 1) AS deal_id
    FROM crm_leads l
    WHERE l.tenant_id = ${tenantId}
      AND (${options.status ?? null}::text IS NULL OR l.status = ${options.status ?? null})
    ORDER BY l.created_at DESC
    LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}
  `
  return rows.map(toLead)
}

export async function findLeadById(tx: Tx, tenantId: string, id: string): Promise<CrmLead | null> {
  const [row] = await tx<LeadRow[]>`
    SELECT l.*, (SELECT d.id FROM crm_deals d WHERE d.lead_id = l.id LIMIT 1) AS deal_id
    FROM crm_leads l
    WHERE l.tenant_id = ${tenantId} AND l.id = ${id}
    LIMIT 1
  `
  return row ? toLead(row) : null
}

export async function insertLead(
  tx: Tx,
  tenantId: string,
  input: {
    contactId?: string | null
    companyId?: string | null
    siteId?: string | null
    name?: string
    email?: string
    phone?: string
    message?: string
    source?: CrmContactSource
    sourceDetail?: string
    score?: number
    attribution?: Record<string, unknown>
    fields?: Record<string, unknown>
  },
): Promise<CrmLead> {
  const [row] = await tx<LeadRow[]>`
    INSERT INTO crm_leads (
      tenant_id, contact_id, company_id, site_id, name, email, phone, message,
      source, source_detail, score, attribution, fields
    )
    VALUES (
      ${tenantId}, ${input.contactId ?? null}, ${input.companyId ?? null}, ${input.siteId ?? null},
      ${input.name ?? ''}, ${input.email ?? ''}, ${input.phone ?? ''}, ${input.message ?? ''},
      ${input.source ?? 'form'}, ${input.sourceDetail ?? ''}, ${input.score ?? 0},
      ${jsonParam(tx, input.attribution ?? {})}, ${jsonParam(tx, input.fields ?? {})}
    )
    RETURNING *
  `
  return toLead(row!)
}

export async function updateLead(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: { status?: CrmLeadStatus; score?: number; message?: string; sourceDetail?: string },
): Promise<CrmLead | null> {
  const [row] = await tx<LeadRow[]>`
    UPDATE crm_leads SET
      status        = COALESCE(${patch.status ?? null}::text, status),
      score         = COALESCE(${patch.score ?? null}::integer, score),
      message       = COALESCE(${patch.message ?? null}::text, message),
      source_detail = COALESCE(${patch.sourceDetail ?? null}::text, source_detail),
      qualified_at  = CASE WHEN ${patch.status ?? null}::text = 'qualified' AND qualified_at IS NULL
                           THEN now() ELSE qualified_at END
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING *
  `
  return row ? toLead(row) : null
}

// endregion
// region Aggregates

export interface CrmAggregates {
  contactCount: number
  companyCount: number
  openLeadCount: number
  leadsLast30Days: number
  openDealCount: number
  openValueCents: number
  forecastCents: number
  wonValueCents: number
  wonLast30DaysCents: number
  openTaskCount: number
}

/** One round trip for the overview screen, rather than eight. */
export async function crmAggregates(tx: Tx, tenantId: string): Promise<CrmAggregates> {
  const [row] = await tx<Record<string, string | null>[]>`
    SELECT
      (SELECT count(*) FROM crm_contacts WHERE tenant_id = ${tenantId}) AS contact_count,
      (SELECT count(*) FROM crm_companies WHERE tenant_id = ${tenantId}) AS company_count,
      (SELECT count(*) FROM crm_leads WHERE tenant_id = ${tenantId}
        AND status IN ('new', 'working')) AS open_lead_count,
      (SELECT count(*) FROM crm_leads WHERE tenant_id = ${tenantId}
        AND created_at > now() - interval '30 days') AS leads_last_30,
      (SELECT count(*) FROM crm_deals WHERE tenant_id = ${tenantId} AND status = 'open') AS open_deal_count,
      (SELECT coalesce(sum(value_cents), 0) FROM crm_deals
        WHERE tenant_id = ${tenantId} AND status = 'open') AS open_value,
      (SELECT coalesce(sum(d.value_cents * s.probability), 0) FROM crm_deals d
        JOIN crm_pipeline_stages s ON s.id = d.stage_id
        WHERE d.tenant_id = ${tenantId} AND d.status = 'open') AS forecast,
      (SELECT coalesce(sum(value_cents), 0) FROM crm_deals
        WHERE tenant_id = ${tenantId} AND status = 'won') AS won_value,
      (SELECT coalesce(sum(value_cents), 0) FROM crm_deals
        WHERE tenant_id = ${tenantId} AND status = 'won'
        AND closed_at > now() - interval '30 days') AS won_last_30,
      (SELECT count(*) FROM crm_tasks WHERE tenant_id = ${tenantId} AND status = 'open') AS open_task_count
  `

  const value = (key: string) => Math.round(Number(row?.[key] ?? 0))
  return {
    contactCount: value('contact_count'),
    companyCount: value('company_count'),
    openLeadCount: value('open_lead_count'),
    leadsLast30Days: value('leads_last_30'),
    openDealCount: value('open_deal_count'),
    openValueCents: value('open_value'),
    forecastCents: value('forecast'),
    wonValueCents: value('won_value'),
    wonLast30DaysCents: value('won_last_30'),
    openTaskCount: value('open_task_count'),
  }
}

// endregion
