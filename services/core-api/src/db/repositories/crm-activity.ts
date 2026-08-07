/**
 * Activities, notes and tasks — the CRM's timeline.
 *
 * All three hang off a contact or a deal and all three cascade when their
 * contact is erased (§97), which is why they live together rather than beside
 * the records they annotate.
 */
import {
  crmActivitySchema,
  crmNoteSchema,
  crmTaskSchema,
  type CrmActivity,
  type CrmNote,
  type CrmTask,
  type CrmTaskStatus,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

// region Activities, notes, tasks

export async function listActivities(
  tx: Tx,
  tenantId: string,
  filter: { contactId?: string; dealId?: string; limit?: number } = {},
): Promise<CrmActivity[]> {
  const rows = await tx<
    {
      id: string
      type: CrmActivity['type']
      contact_id: string | null
      deal_id: string | null
      lead_id: string | null
      subject: string
      body: string
      metadata: unknown
      created_by: string
      occurred_at: Date
    }[]
  >`
    SELECT id, type, contact_id, deal_id, lead_id, subject, body, metadata, created_by, occurred_at
    FROM crm_activities
    WHERE tenant_id = ${tenantId}
      AND (${filter.contactId ?? null}::uuid IS NULL OR contact_id = ${filter.contactId ?? null})
      AND (${filter.dealId ?? null}::uuid IS NULL OR deal_id = ${filter.dealId ?? null})
    ORDER BY occurred_at DESC
    LIMIT ${filter.limit ?? 100}
  `
  return rows.map((row) =>
    crmActivitySchema.parse({
      id: row.id,
      type: row.type,
      contactId: row.contact_id,
      dealId: row.deal_id,
      leadId: row.lead_id,
      subject: row.subject,
      body: row.body,
      metadata: readJson<Record<string, unknown>>(row.metadata, {}),
      createdBy: row.created_by,
      occurredAt: row.occurred_at,
    }),
  )
}

export async function insertActivity(
  tx: Tx,
  tenantId: string,
  input: {
    type: CrmActivity['type']
    contactId?: string | null
    dealId?: string | null
    leadId?: string | null
    subject?: string
    body?: string
    metadata?: Record<string, unknown>
    createdBy?: string
    occurredAt?: Date
  },
): Promise<void> {
  await tx`
    INSERT INTO crm_activities (
      tenant_id, type, contact_id, deal_id, lead_id, subject, body, metadata, created_by, occurred_at
    )
    VALUES (
      ${tenantId}, ${input.type}, ${input.contactId ?? null}, ${input.dealId ?? null},
      ${input.leadId ?? null}, ${input.subject ?? ''}, ${input.body ?? ''},
      ${jsonParam(tx, input.metadata ?? {})}, ${input.createdBy ?? 'system'},
      ${input.occurredAt ?? new Date()}
    )
  `
}

export async function listNotes(
  tx: Tx,
  tenantId: string,
  filter: { contactId?: string; dealId?: string } = {},
): Promise<CrmNote[]> {
  const rows = await tx<
    { id: string; contact_id: string | null; deal_id: string | null; body: string; created_by: string; created_at: Date; updated_at: Date }[]
  >`
    SELECT id, contact_id, deal_id, body, created_by, created_at, updated_at
    FROM crm_notes
    WHERE tenant_id = ${tenantId}
      AND (${filter.contactId ?? null}::uuid IS NULL OR contact_id = ${filter.contactId ?? null})
      AND (${filter.dealId ?? null}::uuid IS NULL OR deal_id = ${filter.dealId ?? null})
    ORDER BY created_at DESC
    LIMIT 200
  `
  return rows.map((row) =>
    crmNoteSchema.parse({
      id: row.id,
      contactId: row.contact_id,
      dealId: row.deal_id,
      body: row.body,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  )
}

export async function insertNote(
  tx: Tx,
  tenantId: string,
  input: { body: string; contactId?: string | null; dealId?: string | null; createdBy: string },
): Promise<CrmNote> {
  const [row] = await tx<
    { id: string; contact_id: string | null; deal_id: string | null; body: string; created_by: string; created_at: Date; updated_at: Date }[]
  >`
    INSERT INTO crm_notes (tenant_id, contact_id, deal_id, body, created_by)
    VALUES (${tenantId}, ${input.contactId ?? null}, ${input.dealId ?? null}, ${input.body}, ${input.createdBy})
    RETURNING id, contact_id, deal_id, body, created_by, created_at, updated_at
  `
  return crmNoteSchema.parse({
    id: row!.id,
    contactId: row!.contact_id,
    dealId: row!.deal_id,
    body: row!.body,
    createdBy: row!.created_by,
    createdAt: row!.created_at,
    updatedAt: row!.updated_at,
  })
}

interface TaskRow {
  id: string
  title: string
  description: string
  status: CrmTaskStatus
  priority: 'low' | 'normal' | 'high'
  contact_id: string | null
  deal_id: string | null
  assignee_user_id: string | null
  due_at: Date | null
  completed_at: Date | null
  created_at: Date
  updated_at: Date
}

function toTask(row: TaskRow): CrmTask {
  return crmTaskSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    contactId: row.contact_id,
    dealId: row.deal_id,
    assigneeUserId: row.assignee_user_id,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listTasks(
  tx: Tx,
  tenantId: string,
  filter: { status?: CrmTaskStatus; contactId?: string; dealId?: string; limit?: number } = {},
): Promise<CrmTask[]> {
  const rows = await tx<TaskRow[]>`
    SELECT * FROM crm_tasks
    WHERE tenant_id = ${tenantId}
      AND (${filter.status ?? null}::text IS NULL OR status = ${filter.status ?? null})
      AND (${filter.contactId ?? null}::uuid IS NULL OR contact_id = ${filter.contactId ?? null})
      AND (${filter.dealId ?? null}::uuid IS NULL OR deal_id = ${filter.dealId ?? null})
    ORDER BY (due_at IS NULL), due_at ASC, created_at DESC
    LIMIT ${filter.limit ?? 100}
  `
  return rows.map(toTask)
}

export async function insertTask(
  tx: Tx,
  tenantId: string,
  input: {
    title: string
    description?: string
    priority?: 'low' | 'normal' | 'high'
    contactId?: string | null
    dealId?: string | null
    assigneeUserId?: string | null
    dueAt?: Date | null
  },
): Promise<CrmTask> {
  const [row] = await tx<TaskRow[]>`
    INSERT INTO crm_tasks (
      tenant_id, title, description, priority, contact_id, deal_id, assignee_user_id, due_at
    )
    VALUES (
      ${tenantId}, ${input.title}, ${input.description ?? ''}, ${input.priority ?? 'normal'},
      ${input.contactId ?? null}, ${input.dealId ?? null}, ${input.assigneeUserId ?? null},
      ${input.dueAt ?? null}
    )
    RETURNING *
  `
  return toTask(row!)
}

export async function updateTask(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: { title?: string; description?: string; status?: CrmTaskStatus; priority?: 'low' | 'normal' | 'high'; dueAt?: Date | null },
): Promise<CrmTask | null> {
  const [row] = await tx<TaskRow[]>`
    UPDATE crm_tasks SET
      title        = COALESCE(${patch.title ?? null}::text, title),
      description  = COALESCE(${patch.description ?? null}::text, description),
      status       = COALESCE(${patch.status ?? null}::text, status),
      priority     = COALESCE(${patch.priority ?? null}::text, priority),
      due_at       = COALESCE(${patch.dueAt ?? null}::timestamptz, due_at),
      completed_at = CASE WHEN ${patch.status ?? null}::text = 'done' THEN now()
                          WHEN ${patch.status ?? null}::text IS NOT NULL THEN NULL
                          ELSE completed_at END
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING *
  `
  return row ? toTask(row) : null
}

// endregion
