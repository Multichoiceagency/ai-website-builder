import {
  componentTargetsMapSchema,
  siteKindSchema,
  siteSchema,
  themeSchema,
  type ComponentTargetsMap,
  type Site,
  type SiteKind,
  type Theme,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

interface SiteRow {
  id: string
  tenant_id: string
  name: string
  slug: string
  locale: string
  kind: string
  theme: unknown
  component_targets: unknown
  primary_hostname: string | null
  created_at: Date
  updated_at: Date
}

function toSite(row: SiteRow): Site {
  return siteSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    locale: row.locale,
    kind: siteKindSchema.parse(row.kind || 'website'),
    theme: themeSchema.parse(readJson<Record<string, unknown>>(row.theme, {})),
    componentTargets: componentTargetsMapSchema.parse(
      readJson<Record<string, unknown>>(row.component_targets, {}),
    ),
    primaryHostname: row.primary_hostname,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

const SITE_COLUMNS = [
  'id',
  'tenant_id',
  'name',
  'slug',
  'locale',
  'kind',
  'theme',
  'component_targets',
  'primary_hostname',
  'created_at',
  'updated_at',
]

export async function listSites(tx: Tx, tenantId: string): Promise<Site[]> {
  const rows = await tx<SiteRow[]>`
    SELECT ${tx(SITE_COLUMNS)} FROM sites WHERE tenant_id = ${tenantId} ORDER BY created_at ASC
  `
  return rows.map(toSite)
}

export async function countSites(tx: Tx, tenantId: string, kind?: SiteKind): Promise<number> {
  if (kind) {
    const [row] = await tx<{ count: string }[]>`
      SELECT count(*)::text AS count FROM sites WHERE tenant_id = ${tenantId} AND kind = ${kind}
    `
    return Number(row!.count)
  }
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*)::text AS count FROM sites WHERE tenant_id = ${tenantId}
  `
  return Number(row!.count)
}

export async function findSiteById(tx: Tx, tenantId: string, siteId: string): Promise<Site | null> {
  const [row] = await tx<SiteRow[]>`
    SELECT ${tx(SITE_COLUMNS)} FROM sites WHERE tenant_id = ${tenantId} AND id = ${siteId} LIMIT 1
  `
  return row ? toSite(row) : null
}

export async function insertSite(
  tx: Tx,
  input: {
    tenantId: string
    name: string
    slug: string
    locale: string
    kind?: SiteKind
    theme: Theme
    componentTargets?: ComponentTargetsMap
  },
): Promise<Site> {
  const targets = componentTargetsMapSchema.parse(input.componentTargets ?? {})
  const kind = siteKindSchema.parse(input.kind ?? 'website')
  const [row] = await tx<SiteRow[]>`
    INSERT INTO sites (tenant_id, name, slug, locale, kind, theme, component_targets)
    VALUES (
      ${input.tenantId},
      ${input.name},
      ${input.slug},
      ${input.locale},
      ${kind},
      ${jsonParam(tx, input.theme)},
      ${jsonParam(tx, targets)}
    )
    RETURNING ${tx(SITE_COLUMNS)}
  `
  return toSite(row!)
}

export async function updateSite(
  tx: Tx,
  tenantId: string,
  siteId: string,
  patch: {
    name?: string
    locale?: string
    kind?: SiteKind
    theme?: Theme
    componentTargets?: ComponentTargetsMap
  },
): Promise<Site | null> {
  const [row] = await tx<SiteRow[]>`
    UPDATE sites SET
      name   = COALESCE(${patch.name ?? null}::text, name),
      locale = COALESCE(${patch.locale ?? null}::text, locale),
      kind   = COALESCE(${patch.kind ?? null}::text, kind),
      theme  = COALESCE(${patch.theme ? jsonParam(tx, patch.theme) : null}::jsonb, theme),
      component_targets = COALESCE(
        ${patch.componentTargets ? jsonParam(tx, patch.componentTargets) : null}::jsonb,
        component_targets
      )
    WHERE tenant_id = ${tenantId} AND id = ${siteId}
    RETURNING ${tx(SITE_COLUMNS)}
  `
  return row ? toSite(row) : null
}

export async function insertDomain(
  tx: Tx,
  input: { tenantId: string; siteId: string; hostname: string; isPrimary: boolean; verified: boolean },
): Promise<void> {
  await tx`
    INSERT INTO domains (tenant_id, site_id, hostname, is_primary, verified_at)
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.hostname.toLowerCase()}, ${input.isPrimary},
      ${input.verified ? new Date() : null}
    )
    ON CONFLICT (hostname) DO NOTHING
  `
  if (input.isPrimary) {
    await tx`UPDATE sites SET primary_hostname = ${input.hostname.toLowerCase()} WHERE id = ${input.siteId}`
  }
}

export async function resolveSiteByHost(
  tx: Tx,
  hostname: string,
): Promise<{ tenantId: string; siteId: string } | null> {
  const [row] = await tx<{ tenant_id: string; site_id: string }[]>`
    SELECT tenant_id, site_id FROM resolve_site_by_host(${hostname.toLowerCase()})
  `
  return row ? { tenantId: row.tenant_id, siteId: row.site_id } : null
}
