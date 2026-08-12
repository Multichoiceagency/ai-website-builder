import {
  seoNetworkLinkSchema,
  seoNetworkMemberSchema,
  type SeoNetworkLink,
  type SeoNetworkMember,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import type { NetworkCandidate, NetworkEdgePlan } from '../../lib/seo/network.js'

interface MemberRow {
  site_id: string
  tenant_id: string
  hostname: string
  title: string
  locale: string
  kind: string
  niche: string
  origin: string
  published_page_count: number
}

interface LinkRow {
  to_site_id?: string
  from_site_id?: string
  hostname: string
  title: string
  origin: string
  niche: string
  anchor: string
}

function toMember(row: MemberRow): SeoNetworkMember {
  return seoNetworkMemberSchema.parse({
    siteId: row.site_id,
    tenantId: row.tenant_id,
    hostname: row.hostname,
    title: row.title,
    locale: row.locale,
    kind: row.kind,
    niche: row.niche,
    origin: row.origin,
    publishedPageCount: row.published_page_count,
  })
}

function toOutbound(row: LinkRow): SeoNetworkLink {
  return seoNetworkLinkSchema.parse({
    siteId: row.to_site_id!,
    hostname: row.hostname,
    title: row.title,
    origin: row.origin,
    niche: row.niche,
    anchor: row.anchor,
  })
}

function toInbound(row: LinkRow): SeoNetworkLink {
  return seoNetworkLinkSchema.parse({
    siteId: row.from_site_id!,
    hostname: row.hostname,
    title: row.title,
    origin: row.origin,
    niche: row.niche,
    anchor: row.anchor,
  })
}

export async function listActiveNetworkMembers(tx: Tx): Promise<SeoNetworkMember[]> {
  const rows = await tx<MemberRow[]>`SELECT * FROM seo_network_list_active()`
  return rows.map(toMember)
}

export async function listOutboundNetworkLinks(tx: Tx, siteId: string): Promise<SeoNetworkLink[]> {
  const rows = await tx<LinkRow[]>`SELECT * FROM seo_network_links_for(${siteId})`
  return rows.map(toOutbound)
}

export async function listInboundNetworkLinks(tx: Tx, siteId: string): Promise<SeoNetworkLink[]> {
  const rows = await tx<LinkRow[]>`SELECT * FROM seo_network_backlinks_for(${siteId})`
  return rows.map(toInbound)
}

export async function upsertNetworkMember(tx: Tx, member: NetworkCandidate & { active: boolean }): Promise<void> {
  await tx`
    INSERT INTO seo_network_members (
      site_id, tenant_id, hostname, title, locale, kind, niche, origin,
      published_page_count, active, updated_at
    )
    VALUES (
      ${member.siteId}, ${member.tenantId}, ${member.hostname}, ${member.title},
      ${member.locale}, ${member.kind}, ${member.niche}, ${member.origin},
      ${member.publishedPageCount}, ${member.active}, now()
    )
    ON CONFLICT (site_id) DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id,
      hostname = EXCLUDED.hostname,
      title = EXCLUDED.title,
      locale = EXCLUDED.locale,
      kind = EXCLUDED.kind,
      niche = EXCLUDED.niche,
      origin = EXCLUDED.origin,
      published_page_count = EXCLUDED.published_page_count,
      active = EXCLUDED.active,
      updated_at = now()
  `
}

export async function deactivateNetworkMember(tx: Tx, siteId: string): Promise<void> {
  await tx`
    UPDATE seo_network_members SET active = false, updated_at = now()
    WHERE site_id = ${siteId}
  `
  await tx`DELETE FROM seo_network_edges WHERE from_site_id = ${siteId} OR to_site_id = ${siteId}`
}

export async function replaceAllNetworkEdges(tx: Tx, edges: NetworkEdgePlan[]): Promise<void> {
  await tx`DELETE FROM seo_network_edges`
  for (const edge of edges) {
    await tx`
      INSERT INTO seo_network_edges (from_site_id, to_site_id, anchor)
      VALUES (${edge.fromSiteId}, ${edge.toSiteId}, ${edge.anchor})
      ON CONFLICT (from_site_id, to_site_id) DO UPDATE SET anchor = EXCLUDED.anchor
    `
  }
}

export async function countPublishedPages(tx: Tx, tenantId: string, siteId: string): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM pages
    WHERE tenant_id = ${tenantId}
      AND site_id = ${siteId}
      AND status = 'published'
      AND published_at IS NOT NULL
  `
  return Number(row?.count ?? 0)
}
