import { createSection } from '@platform/blocks'
import {
  seoNetworkStatusSchema,
  type SeoNetworkLink,
  type SeoNetworkStatus,
  type Section,
} from '@platform/schemas'
import type { Tx } from '../../db/client.js'
import { getSeoSettings } from '../../db/repositories/seo.js'
import {
  countPublishedPages,
  deactivateNetworkMember,
  listActiveNetworkMembers,
  listInboundNetworkLinks,
  listOutboundNetworkLinks,
  replaceAllNetworkEdges,
  upsertNetworkMember,
} from '../../db/repositories/seo-network.js'
import { findSiteById } from '../../db/repositories/sites.js'
import {
  isNetworkEligible,
  planNetworkEdges,
  publicOriginForHostname,
  type NetworkCandidate,
} from './network.js'

/**
 * Sync one site into the platform network, then rebuild edges for all active
 * members so reciprocity stays near-complete after every publish.
 */
export async function syncSiteNetworkMembership(
  tx: Tx,
  input: { tenantId: string; siteId: string },
): Promise<SeoNetworkStatus> {
  const site = await findSiteById(tx, input.tenantId, input.siteId)
  if (!site) {
    return seoNetworkStatusSchema.parse({
      eligible: false,
      active: false,
      networkEnabled: false,
      niche: '',
      hostname: null,
      publishedPageCount: 0,
      outbound: [],
      inbound: [],
      memberCount: 0,
      reasons: ['Site not found.'],
    })
  }

  const [settings, publishedPageCount] = await Promise.all([
    getSeoSettings(tx, input.tenantId, input.siteId),
    countPublishedPages(tx, input.tenantId, input.siteId),
  ])

  const hostname = site.primaryHostname
  const eligibility = isNetworkEligible({
    hostname,
    indexingEnabled: settings.indexingEnabled,
    networkEnabled: settings.networkEnabled,
    publishedPageCount,
  })

  if (!eligibility.eligible || !hostname) {
    await deactivateNetworkMember(tx, input.siteId)
  } else {
    const candidate: NetworkCandidate = {
      siteId: site.id,
      tenantId: site.tenantId,
      hostname,
      title: site.name,
      locale: site.locale,
      kind: site.kind,
      niche: settings.networkNiche.trim(),
      origin: publicOriginForHostname(hostname),
      publishedPageCount,
    }
    await upsertNetworkMember(tx, { ...candidate, active: true })
  }

  const active = await listActiveNetworkMembers(tx)
  const edges = planNetworkEdges(
    active.map((member) => ({
      siteId: member.siteId,
      tenantId: member.tenantId,
      hostname: member.hostname,
      title: member.title,
      locale: member.locale,
      kind: member.kind,
      niche: member.niche,
      origin: member.origin,
      publishedPageCount: member.publishedPageCount,
    })),
  )
  await replaceAllNetworkEdges(tx, edges)

  const [outbound, inbound] = await Promise.all([
    listOutboundNetworkLinks(tx, input.siteId),
    listInboundNetworkLinks(tx, input.siteId),
  ])

  const stillActive = active.some((member) => member.siteId === input.siteId)

  return seoNetworkStatusSchema.parse({
    eligible: eligibility.eligible,
    active: stillActive,
    networkEnabled: settings.networkEnabled,
    niche: settings.networkNiche,
    hostname,
    publishedPageCount,
    outbound,
    inbound,
    memberCount: active.length,
    reasons: eligibility.reasons,
  })
}

export async function getSiteNetworkStatus(
  tx: Tx,
  input: { tenantId: string; siteId: string },
): Promise<SeoNetworkStatus> {
  const site = await findSiteById(tx, input.tenantId, input.siteId)
  if (!site) {
    return seoNetworkStatusSchema.parse({
      eligible: false,
      active: false,
      networkEnabled: false,
      niche: '',
      hostname: null,
      publishedPageCount: 0,
      outbound: [],
      inbound: [],
      memberCount: 0,
      reasons: ['Site not found.'],
    })
  }

  const [settings, publishedPageCount, outbound, inbound, members] = await Promise.all([
    getSeoSettings(tx, input.tenantId, input.siteId),
    countPublishedPages(tx, input.tenantId, input.siteId),
    listOutboundNetworkLinks(tx, input.siteId),
    listInboundNetworkLinks(tx, input.siteId),
    listActiveNetworkMembers(tx),
  ])

  const eligibility = isNetworkEligible({
    hostname: site.primaryHostname,
    indexingEnabled: settings.indexingEnabled,
    networkEnabled: settings.networkEnabled,
    publishedPageCount,
  })

  return seoNetworkStatusSchema.parse({
    eligible: eligibility.eligible,
    active: members.some((member) => member.siteId === input.siteId),
    networkEnabled: settings.networkEnabled,
    niche: settings.networkNiche,
    hostname: site.primaryHostname,
    publishedPageCount,
    outbound,
    inbound,
    memberCount: members.length,
    reasons: eligibility.reasons,
  })
}

/** Build the injected footer strip for public pages (ADR-0003 section). */
export function networkSectionFromLinks(links: SeoNetworkLink[]): Section | null {
  if (!links.length) return null
  return createSection('seo-network-01', {
    heading: 'Partner sites',
    intro: 'Related businesses on our platform network.',
    links: links.map((link) => ({
      label: link.anchor,
      href: link.origin,
    })),
  })
}
