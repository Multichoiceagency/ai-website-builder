import type { DomainEvent } from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

/**
 * Append-only. Written inside the same transaction as the change it records, so
 * a mutation and its audit trail commit or fail together — the app role has no
 * UPDATE or DELETE privilege on this table (migration 0001).
 */
export async function recordAuditEvent(tx: Tx, event: DomainEvent): Promise<void> {
  if (!event.tenantId) return

  await tx`
    INSERT INTO audit_events (tenant_id, name, actor, resource_type, resource_id, payload)
    VALUES (
      ${event.tenantId},
      ${event.name},
      ${jsonParam(tx, event.actor)},
      ${event.resource?.type ?? null},
      ${event.resource?.id ?? null},
      ${jsonParam(tx, event.payload)}
    )
  `
}

export interface AuditEntry {
  id: string
  name: string
  actor: { type: string; id: string | null; label?: string }
  resourceType: string | null
  resourceId: string | null
  createdAt: string
}

export async function listAuditEvents(tx: Tx, tenantId: string, limit = 25): Promise<AuditEntry[]> {
  const rows = await tx<
    {
      id: string
      name: string
      actor: unknown
      resource_type: string | null
      resource_id: string | null
      created_at: Date
    }[]
  >`
    SELECT id, name, actor, resource_type, resource_id, created_at
    FROM audit_events
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    actor: readJson<AuditEntry['actor']>(row.actor, { type: 'system', id: null }),
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    createdAt: row.created_at.toISOString(),
  }))
}
