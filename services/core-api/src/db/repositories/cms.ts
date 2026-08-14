import { withTenant, withoutTenant } from '../client.js'
import { jsonParam } from '../json.js'
import type { CmsCollection, CmsEntry } from '@platform/schemas'

function mapCollection(row: Record<string, unknown>): CmsCollection {
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    slug: String(row.slug),
    name: String(row.name),
    fields: Array.isArray(row.fields) ? (row.fields as string[]) : ['title', 'body'],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}

function mapEntry(row: Record<string, unknown>): CmsEntry {
  return {
    id: String(row.id),
    collectionId: String(row.collection_id),
    slug: String(row.slug),
    title: String(row.title),
    data: (row.data as Record<string, unknown>) ?? {},
    published: Boolean(row.published),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}

export async function listCmsCollections(tenantId: string, siteId: string): Promise<CmsCollection[]> {
  return withTenant(tenantId, async (sql) => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM cms_collections WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
      ORDER BY name ASC
    `
    return rows.map(mapCollection)
  })
}

export async function insertCmsCollection(input: {
  tenantId: string
  siteId: string
  slug: string
  name: string
  fields: string[]
}): Promise<CmsCollection> {
  return withTenant(input.tenantId, async (sql) => {
    const [row] = await sql<Record<string, unknown>[]>`
      INSERT INTO cms_collections (tenant_id, site_id, slug, name, fields)
      VALUES (${input.tenantId}, ${input.siteId}, ${input.slug}, ${input.name}, ${jsonParam(sql, input.fields)})
      RETURNING *
    `
    if (!row) throw new Error('insert cms_collections failed')
    return mapCollection(row)
  })
}

export async function deleteCmsCollection(tenantId: string, collectionId: string): Promise<boolean> {
  return withTenant(tenantId, async (sql) => {
    const rows = await sql<{ id: string }[]>`
      DELETE FROM cms_collections WHERE tenant_id = ${tenantId} AND id = ${collectionId} RETURNING id
    `
    return rows.length > 0
  })
}

export async function listCmsEntries(tenantId: string, collectionId: string): Promise<CmsEntry[]> {
  return withTenant(tenantId, async (sql) => {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM cms_entries WHERE tenant_id = ${tenantId} AND collection_id = ${collectionId}
      ORDER BY updated_at DESC
    `
    return rows.map(mapEntry)
  })
}

export async function insertCmsEntry(input: {
  tenantId: string
  collectionId: string
  slug: string
  title: string
  data: Record<string, unknown>
  published: boolean
}): Promise<CmsEntry> {
  return withTenant(input.tenantId, async (sql) => {
    const [row] = await sql<Record<string, unknown>[]>`
      INSERT INTO cms_entries (tenant_id, collection_id, slug, title, data, published)
      VALUES (
        ${input.tenantId}, ${input.collectionId}, ${input.slug}, ${input.title},
        ${jsonParam(sql, input.data)}, ${input.published}
      )
      RETURNING *
    `
    if (!row) throw new Error('insert cms_entries failed')
    return mapEntry(row)
  })
}

export async function updateCmsEntry(
  tenantId: string,
  entryId: string,
  patch: { slug?: string; title?: string; data?: Record<string, unknown>; published?: boolean },
): Promise<CmsEntry | null> {
  return withTenant(tenantId, async (sql) => {
    const [row] = await sql<Record<string, unknown>[]>`
      UPDATE cms_entries SET
        slug = COALESCE(${patch.slug ?? null}, slug),
        title = COALESCE(${patch.title ?? null}, title),
        data = COALESCE(${patch.data ? jsonParam(sql, patch.data) : null}, data),
        published = COALESCE(${patch.published ?? null}, published)
      WHERE tenant_id = ${tenantId} AND id = ${entryId}
      RETURNING *
    `
    return row ? mapEntry(row) : null
  })
}

export async function deleteCmsEntry(tenantId: string, entryId: string): Promise<boolean> {
  return withTenant(tenantId, async (sql) => {
    const rows = await sql<{ id: string }[]>`
      DELETE FROM cms_entries WHERE tenant_id = ${tenantId} AND id = ${entryId} RETURNING id
    `
    return rows.length > 0
  })
}

export async function findPublishedCmsEntry(input: {
  siteId: string
  collectionSlug: string
  entrySlug: string
}): Promise<CmsEntry | null> {
  return withoutTenant(async (sql) => {
    const [row] = await sql<Record<string, unknown>[]>`
      SELECT * FROM find_published_cms_entry(${input.siteId}, ${input.collectionSlug}, ${input.entrySlug})
    `
    return row ? mapEntry(row) : null
  })
}
