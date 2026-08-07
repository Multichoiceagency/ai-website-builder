import { normalizeDocument } from '@platform/blocks'
import {
  assetSchema,
  assetSourceSchema,
  type Asset,
  type AssetCollectionId,
  type AssetLicence,
  type AssetQuery,
  type AssetSource,
  type PerformanceClass,
  type Section,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

interface AssetRow {
  id: string
  tenant_id: string
  name: string
  description: string
  collection: AssetCollectionId
  tags: string[]
  sections: unknown
  performance_class: PerformanceClass
  thumbnail: string
  licence: AssetLicence
  attribution: string
  source: unknown
  fingerprint: string
  created_by: string
  created_at: Date
  updated_at: Date
}

/**
 * `sections` is JSONB, so it is the one column that can drift from the block
 * contract. Parsing it on read means a bad composition surfaces here rather
 * than in a renderer — same posture as `pages.ts`.
 */
function readDocument(value: unknown): Section[] {
  try {
    return normalizeDocument(readJson<unknown[]>(value, []))
  } catch {
    return []
  }
}

function toAsset(row: AssetRow): Asset {
  return assetSchema.parse({
    id: row.id,
    tier: 'workspace',
    name: row.name,
    description: row.description,
    collection: row.collection,
    tags: row.tags,
    sections: readDocument(row.sections),
    performanceClass: row.performance_class,
    thumbnail: row.thumbnail,
    licence: row.licence,
    attribution: row.attribution,
    source: assetSourceSchema.parse(readJson<Record<string, unknown>>(row.source, {})),
    fingerprint: row.fingerprint,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

const ASSET_COLUMNS = (tx: Tx) => tx`
  id, tenant_id, name, description, collection, tags, sections, performance_class,
  thumbnail, licence, attribution, source, fingerprint, created_by, created_at, updated_at
`

/**
 * List a workspace's assets.
 *
 * Filtering happens in SQL where an index can help and in the route where it
 * cannot: `search` and `tags` are cheap over a workspace-sized list and would
 * otherwise need a second index apiece for no measurable gain.
 */
export async function listAssets(tx: Tx, tenantId: string, query: AssetQuery): Promise<Asset[]> {
  const rows = await tx<AssetRow[]>`
    SELECT ${ASSET_COLUMNS(tx)} FROM assets
    WHERE tenant_id = ${tenantId}
      AND (${query.collection ?? null}::text IS NULL OR collection = ${query.collection ?? null})
    ORDER BY created_at DESC
    LIMIT ${query.limit}
  `
  return rows.map(toAsset)
}

export async function findAssetById(tx: Tx, tenantId: string, assetId: string): Promise<Asset | null> {
  const [row] = await tx<AssetRow[]>`
    SELECT ${ASSET_COLUMNS(tx)} FROM assets
    WHERE tenant_id = ${tenantId} AND id = ${assetId} LIMIT 1
  `
  return row ? toAsset(row) : null
}

/** The duplicate check. Returns the first asset holding the same arrangement. */
export async function findAssetByFingerprint(
  tx: Tx,
  tenantId: string,
  fingerprint: string,
): Promise<{ id: string; name: string } | null> {
  const [row] = await tx<{ id: string; name: string }[]>`
    SELECT id, name FROM assets
    WHERE tenant_id = ${tenantId} AND fingerprint = ${fingerprint}
    ORDER BY created_at ASC
    LIMIT 1
  `
  return row ?? null
}

export async function insertAsset(
  tx: Tx,
  input: {
    tenantId: string
    name: string
    description: string
    collection: AssetCollectionId
    tags: string[]
    sections: Section[]
    performanceClass: PerformanceClass
    licence: AssetLicence
    attribution: string
    source: AssetSource
    fingerprint: string
    createdBy: string
  },
): Promise<Asset> {
  const [row] = await tx<AssetRow[]>`
    INSERT INTO assets (
      tenant_id, name, description, collection, tags, sections,
      performance_class, licence, attribution, source, fingerprint, created_by
    )
    VALUES (
      ${input.tenantId}, ${input.name}, ${input.description}, ${input.collection},
      ${input.tags}, ${jsonParam(tx, input.sections)},
      ${input.performanceClass}, ${input.licence}, ${input.attribution},
      ${jsonParam(tx, input.source)}, ${input.fingerprint}, ${input.createdBy}
    )
    RETURNING ${ASSET_COLUMNS(tx)}
  `
  return toAsset(row!)
}

export async function updateAsset(
  tx: Tx,
  tenantId: string,
  assetId: string,
  patch: {
    name?: string
    description?: string
    collection?: AssetCollectionId
    tags?: string[]
    sections?: Section[]
    performanceClass?: PerformanceClass
    fingerprint?: string
  },
): Promise<Asset | null> {
  const [row] = await tx<AssetRow[]>`
    UPDATE assets SET
      name              = COALESCE(${patch.name ?? null}::text, name),
      description       = COALESCE(${patch.description ?? null}::text, description),
      collection        = COALESCE(${patch.collection ?? null}::text, collection),
      tags              = COALESCE(${patch.tags ?? null}::text[], tags),
      sections          = COALESCE(${patch.sections ? jsonParam(tx, patch.sections) : null}::jsonb, sections),
      performance_class = COALESCE(${patch.performanceClass ?? null}::text, performance_class),
      fingerprint       = COALESCE(${patch.fingerprint ?? null}::text, fingerprint)
    WHERE tenant_id = ${tenantId} AND id = ${assetId}
    RETURNING ${ASSET_COLUMNS(tx)}
  `
  return row ? toAsset(row) : null
}

export async function deleteAsset(tx: Tx, tenantId: string, assetId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM assets WHERE tenant_id = ${tenantId} AND id = ${assetId} RETURNING id
  `
  return rows.length > 0
}
