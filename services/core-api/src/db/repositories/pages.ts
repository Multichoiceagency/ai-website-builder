import {
  pageRevisionSchema,
  pageSchema,
  pageSummarySchema,
  seoSchema,
  type Page,
  type PageRevision,
  type PageStatus,
  type PageSummary,
  type Section,
  type Seo,
} from '@platform/schemas'
import { normalizeDocument } from '@platform/blocks'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

interface PageRow {
  id: string
  tenant_id: string
  site_id: string
  path: string
  title: string
  status: PageStatus
  seo: unknown
  sections: unknown
  published_at: Date | null
  created_at: Date
  updated_at: Date
  section_count: number
  has_unpublished_changes: boolean
}

/**
 * `sections` is stored as JSONB, so it is the one column that can drift from
 * the contract. Parsing it on read means a bad document surfaces here, not in
 * a renderer.
 */
function readDocument(value: unknown): Section[] {
  try {
    return normalizeDocument(readJson<unknown[]>(value, []))
  } catch {
    return []
  }
}

function toSummary(row: PageRow): PageSummary {
  return pageSummarySchema.parse({
    id: row.id,
    siteId: row.site_id,
    path: row.path,
    title: row.title,
    status: row.status,
    sectionCount: Number(row.section_count),
    hasUnpublishedChanges: row.has_unpublished_changes,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  })
}

function toPage(row: PageRow): Page {
  return pageSchema.parse({
    ...toSummary(row),
    seo: seoSchema.parse(readJson<Record<string, unknown>>(row.seo, {})),
    sections: readDocument(row.sections),
    createdAt: row.created_at,
  })
}

/**
 * Computed once here rather than at every call site: a page has unpublished
 * changes when the draft differs from what is live, or when it was never
 * published at all.
 */
const SUMMARY_SELECT = (tx: Tx) => tx`
  id, tenant_id, site_id, path, title, status, seo, sections, published_at, created_at, updated_at,
  coalesce(jsonb_array_length(sections), 0) AS section_count,
  (
    published_at IS NULL
    OR published_sections IS DISTINCT FROM sections
    OR published_title IS DISTINCT FROM title
    OR published_seo IS DISTINCT FROM seo
  ) AS has_unpublished_changes
`

export async function listPages(tx: Tx, tenantId: string, siteId: string): Promise<PageSummary[]> {
  const rows = await tx<PageRow[]>`
    SELECT ${SUMMARY_SELECT(tx)} FROM pages
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    ORDER BY path ASC
  `
  return rows.map(toSummary)
}

export async function findPageById(tx: Tx, tenantId: string, pageId: string): Promise<Page | null> {
  const [row] = await tx<PageRow[]>`
    SELECT ${SUMMARY_SELECT(tx)} FROM pages
    WHERE tenant_id = ${tenantId} AND id = ${pageId} LIMIT 1
  `
  return row ? toPage(row) : null
}

export async function findPageByPath(
  tx: Tx,
  tenantId: string,
  siteId: string,
  path: string,
): Promise<Page | null> {
  const [row] = await tx<PageRow[]>`
    SELECT ${SUMMARY_SELECT(tx)} FROM pages
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId} AND path = ${path}
    LIMIT 1
  `
  return row ? toPage(row) : null
}

export async function insertPage(
  tx: Tx,
  input: {
    tenantId: string
    siteId: string
    path: string
    title: string
    seo: Seo
    sections: Section[]
  },
): Promise<Page> {
  const [row] = await tx<PageRow[]>`
    INSERT INTO pages (tenant_id, site_id, path, title, seo, sections)
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.path}, ${input.title},
      ${jsonParam(tx, input.seo)}, ${jsonParam(tx, input.sections)}
    )
    RETURNING ${SUMMARY_SELECT(tx)}
  `
  return toPage(row!)
}

export async function updatePage(
  tx: Tx,
  tenantId: string,
  pageId: string,
  patch: { path?: string; title?: string; seo?: Seo; sections?: Section[] },
): Promise<Page | null> {
  const [row] = await tx<PageRow[]>`
    UPDATE pages SET
      path     = COALESCE(${patch.path ?? null}::text, path),
      title    = COALESCE(${patch.title ?? null}::text, title),
      seo      = COALESCE(${patch.seo ? jsonParam(tx, patch.seo) : null}::jsonb, seo),
      sections = COALESCE(${patch.sections ? jsonParam(tx, patch.sections) : null}::jsonb, sections)
    WHERE tenant_id = ${tenantId} AND id = ${pageId}
    RETURNING ${SUMMARY_SELECT(tx)}
  `
  return row ? toPage(row) : null
}

/**
 * Copy the draft onto the live document. This is the only write that can make
 * content public — nothing else touches `published_*`.
 */
export async function publishPage(tx: Tx, tenantId: string, pageId: string): Promise<Page | null> {
  const [row] = await tx<PageRow[]>`
    UPDATE pages SET
      status             = 'published',
      published_sections = sections,
      published_title    = title,
      published_seo      = seo,
      published_at       = now()
    WHERE tenant_id = ${tenantId} AND id = ${pageId}
    RETURNING ${SUMMARY_SELECT(tx)}
  `
  return row ? toPage(row) : null
}

export async function unpublishPage(tx: Tx, tenantId: string, pageId: string): Promise<Page | null> {
  const [row] = await tx<PageRow[]>`
    UPDATE pages SET
      status             = 'draft',
      published_sections = NULL,
      published_title    = NULL,
      published_seo      = NULL,
      published_at       = NULL
    WHERE tenant_id = ${tenantId} AND id = ${pageId}
    RETURNING ${SUMMARY_SELECT(tx)}
  `
  return row ? toPage(row) : null
}

export async function deletePage(tx: Tx, tenantId: string, pageId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM pages WHERE tenant_id = ${tenantId} AND id = ${pageId} RETURNING id
  `
  return rows.length > 0
}

/** The public read model: live document only, never the draft. */
export async function findPublishedPage(
  tx: Tx,
  tenantId: string,
  siteId: string,
  path: string,
): Promise<{ path: string; title: string; seo: Seo; sections: Section[]; publishedAt: Date } | null> {
  const [row] = await tx<
    { path: string; published_title: string; published_seo: unknown; published_sections: unknown; published_at: Date }[]
  >`
    SELECT path, published_title, published_seo, published_sections, published_at
    FROM pages
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId} AND path = ${path}
      AND status = 'published' AND published_at IS NOT NULL
    LIMIT 1
  `
  if (!row) return null
  return {
    path: row.path,
    title: row.published_title,
    seo: seoSchema.parse(readJson<Record<string, unknown>>(row.published_seo, {})),
    sections: readDocument(row.published_sections),
    publishedAt: row.published_at,
  }
}

export async function insertRevision(
  tx: Tx,
  input: {
    tenantId: string
    pageId: string
    title: string
    seo: Seo
    sections: Section[]
    reason: string
    createdBy: string
  },
): Promise<void> {
  await tx`
    INSERT INTO page_revisions (tenant_id, page_id, title, seo, sections, reason, created_by)
    VALUES (
      ${input.tenantId}, ${input.pageId}, ${input.title},
      ${jsonParam(tx, input.seo)}, ${jsonParam(tx, input.sections)},
      ${input.reason}, ${input.createdBy}
    )
  `
}

export async function listRevisions(tx: Tx, tenantId: string, pageId: string): Promise<PageRevision[]> {
  const rows = await tx<
    { id: string; page_id: string; title: string; sections: unknown; reason: string; created_by: string; created_at: Date }[]
  >`
    SELECT id, page_id, title, sections, reason, created_by, created_at
    FROM page_revisions
    WHERE tenant_id = ${tenantId} AND page_id = ${pageId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map((row) =>
    pageRevisionSchema.parse({
      id: row.id,
      pageId: row.page_id,
      title: row.title,
      sectionCount: readJson<unknown[]>(row.sections, []).length,
      reason: row.reason,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }),
  )
}

export async function findRevision(
  tx: Tx,
  tenantId: string,
  pageId: string,
  revisionId: string,
): Promise<{ title: string; seo: Seo; sections: Section[] } | null> {
  const [row] = await tx<{ title: string; seo: unknown; sections: unknown }[]>`
    SELECT title, seo, sections FROM page_revisions
    WHERE tenant_id = ${tenantId} AND page_id = ${pageId} AND id = ${revisionId}
    LIMIT 1
  `
  if (!row) return null
  return { title: row.title, seo: seoSchema.parse(readJson<Record<string, unknown>>(row.seo, {})), sections: readDocument(row.sections) }
}
