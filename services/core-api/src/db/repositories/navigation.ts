import { navigationSchema, type Navigation, type NavigationItem } from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

export async function listNavigation(tx: Tx, tenantId: string, siteId: string): Promise<Navigation[]> {
  const rows = await tx<{ key: 'primary' | 'footer'; items: unknown }[]>`
    SELECT key, items FROM navigations
    WHERE tenant_id = ${tenantId} AND site_id = ${siteId}
    ORDER BY key ASC
  `
  return rows.map((row) => navigationSchema.parse({ key: row.key, items: readJson<unknown[]>(row.items, []) }))
}

export async function upsertNavigation(
  tx: Tx,
  input: { tenantId: string; siteId: string; key: 'primary' | 'footer'; items: NavigationItem[] },
): Promise<Navigation> {
  const [row] = await tx<{ key: 'primary' | 'footer'; items: unknown }[]>`
    INSERT INTO navigations (tenant_id, site_id, key, items)
    VALUES (${input.tenantId}, ${input.siteId}, ${input.key}, ${jsonParam(tx, input.items)})
    ON CONFLICT (site_id, key) DO UPDATE SET items = EXCLUDED.items
    RETURNING key, items
  `
  return navigationSchema.parse({ key: row!.key, items: readJson<unknown[]>(row!.items, []) })
}
