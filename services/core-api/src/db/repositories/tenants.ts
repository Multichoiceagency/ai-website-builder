import {
  membershipSchema,
  organizationSchema,
  tenantSchema,
  type Membership,
  type Organization,
  type Plan,
  type Role,
  type Tenant,
} from '@platform/schemas'
import type { Tx } from '../client.js'

interface TenantRow {
  id: string
  organization_id: string
  name: string
  slug: string
  plan: Plan
  created_at: Date
}

function toTenant(row: TenantRow): Tenant {
  return tenantSchema.parse({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    createdAt: row.created_at,
  })
}

export async function insertOrganization(tx: Tx, input: { name: string; slug: string }): Promise<Organization> {
  const [row] = await tx<{ id: string; name: string; slug: string; created_at: Date }[]>`
    INSERT INTO organizations (name, slug) VALUES (${input.name}, ${input.slug})
    RETURNING id, name, slug, created_at
  `
  return organizationSchema.parse({ ...row, createdAt: row!.created_at })
}

export async function insertTenant(
  tx: Tx,
  input: { organizationId: string; name: string; slug: string; plan: Plan },
): Promise<Tenant> {
  const [row] = await tx<TenantRow[]>`
    INSERT INTO tenants (organization_id, name, slug, plan)
    VALUES (${input.organizationId}, ${input.name}, ${input.slug}, ${input.plan})
    RETURNING id, organization_id, name, slug, plan, created_at
  `
  return toTenant(row!)
}

export async function insertMembership(
  tx: Tx,
  input: { tenantId: string; userId: string; role: Role },
): Promise<void> {
  await tx`
    INSERT INTO memberships (tenant_id, user_id, role)
    VALUES (${input.tenantId}, ${input.userId}, ${input.role})
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role
  `
}

/**
 * The authorization root. A user can only ever act inside a tenant that comes
 * back from here — a tenant id supplied by the browser is checked against this
 * list, never trusted on its own (ADR-0004).
 */
export async function listMembershipsForUser(tx: Tx, userId: string): Promise<Membership[]> {
  const rows = await tx<
    { tenant_id: string; name: string; slug: string; plan: Plan; role: Role }[]
  >`
    SELECT t.id AS tenant_id, t.name, t.slug, t.plan, m.role
    FROM memberships m
    JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id = ${userId}
    ORDER BY t.created_at ASC
  `

  return rows.map((row) =>
    membershipSchema.parse({
      tenantId: row.tenant_id,
      tenantName: row.name,
      tenantSlug: row.slug,
      plan: row.plan,
      role: row.role,
    }),
  )
}

export async function countTenantMembers(tx: Tx, tenantId: string): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*)::text AS count FROM memberships WHERE tenant_id = ${tenantId}
  `
  return Number(row!.count)
}

export async function findTenantById(tx: Tx, tenantId: string): Promise<Tenant | null> {
  const [row] = await tx<TenantRow[]>`
    SELECT id, organization_id, name, slug, plan, created_at FROM tenants WHERE id = ${tenantId} LIMIT 1
  `
  return row ? toTenant(row) : null
}
