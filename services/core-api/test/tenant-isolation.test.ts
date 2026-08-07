import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeDatabase, sql, withTenant, withoutTenant } from '../src/db/client.js'
import { insertOrganization, insertTenant } from '../src/db/repositories/tenants.js'
import { insertSite } from '../src/db/repositories/sites.js'
import { themeSchema } from '@platform/schemas'

/**
 * Proof that ADR-0004's second layer is real.
 *
 * These tests deliberately issue SQL *without* a tenant filter. If row-level
 * security were missing or the service connected as the table owner, they
 * would return another tenant's rows and fail. That is exactly the regression
 * worth a permanent test.
 */

const suffix = Math.random().toString(36).slice(2, 8)

let tenantA = ''
let tenantB = ''
let siteA = ''
const organizationIds: string[] = []

beforeAll(async () => {
  const created = await withoutTenant(async (tx) => {
    const orgA = await insertOrganization(tx, { name: 'Tenant A', slug: `iso-a-${suffix}` })
    const orgB = await insertOrganization(tx, { name: 'Tenant B', slug: `iso-b-${suffix}` })

    const a = await insertTenant(tx, {
      organizationId: orgA.id,
      name: 'Tenant A',
      slug: `iso-a-${suffix}`,
      plan: 'launch',
    })
    const b = await insertTenant(tx, {
      organizationId: orgB.id,
      name: 'Tenant B',
      slug: `iso-b-${suffix}`,
      plan: 'launch',
    })

    return { a: a.id, b: b.id, orgs: [orgA.id, orgB.id] }
  })

  tenantA = created.a
  tenantB = created.b
  organizationIds.push(...created.orgs)

  const site = await withTenant(tenantA, (tx) =>
    insertSite(tx, {
      tenantId: tenantA,
      name: 'Site A',
      slug: `site-a-${suffix}`,
      locale: 'nl',
      theme: themeSchema.parse({}),
    }),
  )
  siteA = site.id
})

afterAll(async () => {
  // Cascades remove tenants, sites and pages.
  await withoutTenant(async (tx) => {
    for (const id of organizationIds) await tx`DELETE FROM organizations WHERE id = ${id}`
  })
  await closeDatabase()
})

describe('the runtime database role', () => {
  it('is not a superuser and does not bypass row-level security', async () => {
    const [role] = await sql<{ rolsuper: boolean; rolbypassrls: boolean }[]>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `
    expect(role?.rolsuper).toBe(false)
    expect(role?.rolbypassrls).toBe(false)
  })

  it('has row-level security enabled on every tenant-scoped table', async () => {
    // `relkind = 'r'` restricts this to ordinary tables; pg_class also holds
    // indexes and toast relations that can share a name.
    const rows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT relname, relrowsecurity FROM pg_class
      WHERE relkind = 'r'
        AND relname IN ('sites', 'domains', 'pages', 'page_revisions', 'navigations', 'audit_events')
    `
    expect(rows.map((row) => row.relname).sort()).toEqual([
      'audit_events',
      'domains',
      'navigations',
      'page_revisions',
      'pages',
      'sites',
    ])
    expect(rows.every((row) => row.relrowsecurity)).toBe(true)
  })
})

describe('cross-tenant reads', () => {
  it('returns nothing for an unfiltered SELECT in another tenant context', async () => {
    const rows = await withTenant(tenantB, (tx) => tx<{ id: string }[]>`SELECT id FROM sites`)
    expect(rows.map((row) => row.id)).not.toContain(siteA)
  })

  it('returns nothing when another tenant asks for the row by id', async () => {
    const rows = await withTenant(tenantB, (tx) => tx<{ id: string }[]>`SELECT id FROM sites WHERE id = ${siteA}`)
    expect(rows).toHaveLength(0)
  })

  it('returns nothing when no tenant context is set at all', async () => {
    // The safe default is zero rows, never every row.
    const rows = await withoutTenant((tx) => tx<{ id: string }[]>`SELECT id FROM sites`)
    expect(rows).toHaveLength(0)
  })

  it('still returns the row inside its own tenant context', async () => {
    const rows = await withTenant(tenantA, (tx) => tx<{ id: string }[]>`SELECT id FROM sites WHERE id = ${siteA}`)
    expect(rows).toHaveLength(1)
  })
})

describe('cross-tenant writes', () => {
  it('cannot update another tenant’s row', async () => {
    const updated = await withTenant(tenantB, (tx) =>
      tx<{ id: string }[]>`UPDATE sites SET name = 'hijacked' WHERE id = ${siteA} RETURNING id`,
    )
    expect(updated).toHaveLength(0)

    const [row] = await withTenant(tenantA, (tx) => tx<{ name: string }[]>`SELECT name FROM sites WHERE id = ${siteA}`)
    expect(row?.name).toBe('Site A')
  })

  it('cannot delete another tenant’s row', async () => {
    const deleted = await withTenant(tenantB, (tx) =>
      tx<{ id: string }[]>`DELETE FROM sites WHERE id = ${siteA} RETURNING id`,
    )
    expect(deleted).toHaveLength(0)
  })

  it('cannot insert a row belonging to another tenant', async () => {
    // The WITH CHECK clause rejects this outright rather than accepting a row
    // that the same session could then not read.
    await expect(
      withTenant(tenantB, (tx) =>
        tx`INSERT INTO sites (tenant_id, name, slug, locale, theme)
           VALUES (${tenantA}, 'smuggled', ${'smuggled-' + suffix}, 'nl', '{}'::jsonb)`,
      ),
    ).rejects.toThrow(/row-level security/i)
  })
})

describe('the audit log', () => {
  it('is append-only for the application role', async () => {
    await expect(
      withTenant(tenantA, (tx) => tx`UPDATE audit_events SET name = 'tampered' WHERE tenant_id = ${tenantA}`),
    ).rejects.toThrow(/permission denied/i)
  })
})
