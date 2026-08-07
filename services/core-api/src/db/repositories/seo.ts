import { normalizeDocument } from '@platform/blocks'
import {
  keywordPositionSchema,
  seoAuditSchema,
  seoBusinessSchema,
  seoKeywordSchema,
  seoSettingsSchema,
  seoSchema,
  type CreateKeywordInput,
  type KeywordPosition,
  type Section,
  type SeoAudit,
  type SeoKeyword,
  type SeoSettings,
  type UpdateSeoSettingsInput,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import type { SeoPageInput } from '../../lib/seo/document.js'

/** SQL for the SEO domain. Nothing outside this file writes these tables (ADR-0005). */

// region Pages

interface SeoPageRow {
  id: string
  path: string
  title: string
  status: 'draft' | 'published'
  seo: unknown
  sections: unknown
  published_at: Date | null
  updated_at: Date
}

/**
 * A bad JSONB document must surface as "no sections", never as a thrown audit —
 * the same rule the pages repository applies on read.
 */
function readDocument(value: unknown): Section[] {
  try {
    return normalizeDocument(readJson<unknown[]>(value, []))
  } catch {
    return []
  }
}

function toSeoPage(row: SeoPageRow): SeoPageInput {
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    status: row.status,
    seo: seoSchema.parse(readJson<Record<string, unknown>>(row.seo, {})),
    sections: readDocument(row.sections),
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * Every page of a site with its draft document. The audit reads the draft on
 * purpose: telling someone about a problem *after* they published it is late.
 */
export async function listPagesForSeo(tx: Tx, tenantId: string, siteId: string): Promise<SeoPageInput[]> {
  const rows = await tx<SeoPageRow[]>`
    SELECT id, path, title, status, seo, sections, published_at, updated_at
    FROM pages
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    ORDER BY path ASC
  `
  return rows.map(toSeoPage)
}

/**
 * The published document of every page of a site — what a crawler would
 * actually see. Sitemap and robots read this, never the draft.
 */
export async function listPublishedPagesForSeo(
  tx: Tx,
  tenantId: string,
  siteId: string,
): Promise<SeoPageInput[]> {
  const rows = await tx<SeoPageRow[]>`
    SELECT
      id, path, published_title AS title, status,
      published_seo AS seo, published_sections AS sections,
      published_at, updated_at
    FROM pages
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
      AND status = 'published' AND published_at IS NOT NULL
    ORDER BY path ASC
  `
  return rows.map(toSeoPage)
}

// endregion

// region Settings

interface SeoSettingsRow {
  site_id: string
  business: unknown
  indexing_enabled: boolean
  excluded_paths: unknown
  robots_extra: string
  updated_at: Date
}

function toSettings(row: SeoSettingsRow): SeoSettings {
  return seoSettingsSchema.parse({
    siteId: row.site_id,
    business: seoBusinessSchema.parse(readJson<Record<string, unknown>>(row.business, {})),
    indexingEnabled: row.indexing_enabled,
    excludedPaths: readJson<string[]>(row.excluded_paths, []),
    robotsExtra: row.robots_extra,
    updatedAt: row.updated_at,
  })
}

/**
 * Settings always resolve to a usable object. A site that has never opened the
 * SEO module still needs a sitemap, so absence means defaults rather than an
 * error and nothing is written until the user changes something.
 */
export async function getSeoSettings(tx: Tx, tenantId: string, siteId: string): Promise<SeoSettings> {
  const [row] = await tx<SeoSettingsRow[]>`
    SELECT site_id, business, indexing_enabled, excluded_paths, robots_extra, updated_at
    FROM seo_settings
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    LIMIT 1
  `

  if (row) return toSettings(row)

  return seoSettingsSchema.parse({
    siteId,
    business: seoBusinessSchema.parse({}),
    indexingEnabled: true,
    excludedPaths: [],
    robotsExtra: '',
    updatedAt: new Date(),
  })
}

export async function upsertSeoSettings(
  tx: Tx,
  input: { tenantId: string; siteId: string; patch: UpdateSeoSettingsInput },
): Promise<SeoSettings> {
  const current = await getSeoSettings(tx, input.tenantId, input.siteId)
  const business = seoBusinessSchema.parse({ ...current.business, ...(input.patch.business ?? {}) })
  const indexingEnabled = input.patch.indexingEnabled ?? current.indexingEnabled
  const excludedPaths = input.patch.excludedPaths ?? current.excludedPaths
  const robotsExtra = input.patch.robotsExtra ?? current.robotsExtra

  const [row] = await tx<SeoSettingsRow[]>`
    INSERT INTO seo_settings (tenant_id, site_id, business, indexing_enabled, excluded_paths, robots_extra)
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${jsonParam(tx, business)},
      ${indexingEnabled}, ${jsonParam(tx, excludedPaths)}, ${robotsExtra}
    )
    ON CONFLICT (site_id) DO UPDATE SET
      business         = EXCLUDED.business,
      indexing_enabled = EXCLUDED.indexing_enabled,
      excluded_paths   = EXCLUDED.excluded_paths,
      robots_extra     = EXCLUDED.robots_extra
    RETURNING site_id, business, indexing_enabled, excluded_paths, robots_extra, updated_at
  `
  return toSettings(row!)
}

// endregion

// region Audits

export async function insertAudit(
  tx: Tx,
  input: { tenantId: string; siteId: string; audit: SeoAudit },
): Promise<void> {
  await tx`
    INSERT INTO seo_audits (tenant_id, site_id, score, issue_counts, report)
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.audit.score},
      ${jsonParam(tx, input.audit.issueCounts)}, ${jsonParam(tx, input.audit)}
    )
  `
}

/** The last stored run, for first paint. The live audit stays authoritative. */
export async function findLatestAudit(tx: Tx, tenantId: string, siteId: string): Promise<SeoAudit | null> {
  const [row] = await tx<{ report: unknown }[]>`
    SELECT report FROM seo_audits
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (!row) return null

  const parsed = seoAuditSchema.safeParse(readJson<Record<string, unknown>>(row.report, {}))
  return parsed.success ? parsed.data : null
}

/** Score history for the trend line. */
export async function listAuditHistory(
  tx: Tx,
  tenantId: string,
  siteId: string,
  limit = 30,
): Promise<{ score: number; createdAt: string }[]> {
  const rows = await tx<{ score: number; created_at: Date }[]>`
    SELECT score, created_at FROM seo_audits
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({ score: Number(row.score), createdAt: row.created_at.toISOString() }))
}

// endregion

// region Keywords

interface KeywordRow {
  id: string
  site_id: string
  keyword: string
  locale: string
  country: string
  target_path: string | null
  created_at: Date
}

interface PositionRow {
  keyword_id: string
  position: number
  url: string | null
  source: string
  checked_at: Date
}

export async function listKeywords(tx: Tx, tenantId: string, siteId: string): Promise<SeoKeyword[]> {
  const rows = await tx<KeywordRow[]>`
    SELECT id, site_id, keyword, locale, country, target_path, created_at
    FROM seo_keywords
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    ORDER BY keyword ASC
  `
  if (rows.length === 0) return []

  // One query for the whole page of keywords rather than one per row.
  const positions = await tx<PositionRow[]>`
    SELECT p.keyword_id, p.position, p.url, p.source, p.checked_at
    FROM seo_keyword_positions p
    JOIN seo_keywords k ON k.id = p.keyword_id
    WHERE p.tenant_id = ${tenantId} AND k.site_id = ${siteId}
    ORDER BY p.checked_at DESC
  `

  const history = new Map<string, KeywordPosition[]>()
  for (const row of positions) {
    const entry = keywordPositionSchema.parse({
      position: row.position,
      url: row.url,
      source: row.source,
      checkedAt: row.checked_at,
    })
    history.set(row.keyword_id, [...(history.get(row.keyword_id) ?? []), entry])
  }

  return rows.map((row) => {
    const entries = history.get(row.id) ?? []
    return seoKeywordSchema.parse({
      id: row.id,
      siteId: row.site_id,
      keyword: row.keyword,
      locale: row.locale,
      country: row.country,
      targetPath: row.target_path,
      // Null until a SERP provider is configured — never a placeholder number.
      latestPosition: entries[0] ?? null,
      history: entries,
      createdAt: row.created_at,
    })
  })
}

export async function insertKeyword(
  tx: Tx,
  input: { tenantId: string; siteId: string; keyword: CreateKeywordInput },
): Promise<SeoKeyword> {
  const [row] = await tx<KeywordRow[]>`
    INSERT INTO seo_keywords (tenant_id, site_id, keyword, locale, country, target_path)
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.keyword.keyword.trim()},
      ${input.keyword.locale}, ${input.keyword.country.toUpperCase()},
      ${input.keyword.targetPath ?? null}
    )
    RETURNING id, site_id, keyword, locale, country, target_path, created_at
  `
  return seoKeywordSchema.parse({
    id: row!.id,
    siteId: row!.site_id,
    keyword: row!.keyword,
    locale: row!.locale,
    country: row!.country,
    targetPath: row!.target_path,
    latestPosition: null,
    history: [],
    createdAt: row!.created_at,
  })
}

export async function deleteKeyword(tx: Tx, tenantId: string, keywordId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM seo_keywords WHERE tenant_id = ${tenantId} AND id = ${keywordId} RETURNING id
  `
  return rows.length > 0
}

/**
 * Record an observed position. `source` is required by the column, so a rank
 * can only enter the system attributed to whatever measured it.
 */
export async function insertKeywordPosition(
  tx: Tx,
  input: { tenantId: string; keywordId: string; position: number; url: string | null; source: string },
): Promise<void> {
  await tx`
    INSERT INTO seo_keyword_positions (tenant_id, keyword_id, position, url, source)
    VALUES (${input.tenantId}, ${input.keywordId}, ${input.position}, ${input.url}, ${input.source})
  `
}

// endregion
