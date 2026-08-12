/**
 * Platform partner-link network — automatic contextual backlinks between
 * online sites (inspired by claude-seo backlink quality: branded / partial
 * anchors, limited degree, reciprocal where possible).
 */

export interface NetworkCandidate {
  siteId: string
  tenantId: string
  hostname: string
  title: string
  locale: string
  kind: string
  niche: string
  origin: string
  publishedPageCount: number
}

export interface NetworkEdgePlan {
  fromSiteId: string
  toSiteId: string
  anchor: string
}

/** Soft cap — claude-seo warns against over-concentrated link graphs. */
export const NETWORK_OUTBOUND_LIMIT = 6

function hashPair(a: string, b: string): number {
  const raw = `${a}:${b}`
  let h = 0
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  return h
}

function brandedAnchor(member: NetworkCandidate): string {
  const title = member.title.trim() || member.hostname
  // Prefer brand title; fall back to hostname (naked-ish) when title is generic.
  if (title.length >= 2 && title.length <= 60) return title
  return member.hostname.replace(/^www\./, '')
}

function scorePartner(self: NetworkCandidate, other: NetworkCandidate): number {
  let score = 0
  if (self.locale && other.locale && self.locale === other.locale) score += 100
  if (self.kind && other.kind && self.kind === other.kind) score += 40
  if (self.niche && other.niche && self.niche.toLowerCase() === other.niche.toLowerCase()) {
    score += 80
  }
  // Stable tie-break so partner sets do not thrash between syncs.
  score += (hashPair(self.siteId, other.siteId) % 37)
  return score
}

/**
 * Pick outbound partners for `self` from the active pool.
 * Deterministic: same inputs → same edges.
 */
export function pickOutboundPartners(
  self: NetworkCandidate,
  pool: NetworkCandidate[],
  limit = NETWORK_OUTBOUND_LIMIT,
): NetworkCandidate[] {
  return pool
    .filter((member) => member.siteId !== self.siteId && member.publishedPageCount > 0)
    .map((member) => ({ member, score: scorePartner(self, member) }))
    .sort(
      (a, b) =>
        b.score - a.score || a.member.siteId.localeCompare(b.member.siteId),
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.member)
}

/**
 * Build a near-reciprocal edge set for the whole pool.
 * First pass: each site picks top partners. Second pass: fill reverse edges
 * when the reverse site still has capacity.
 */
export function planNetworkEdges(
  pool: NetworkCandidate[],
  limit = NETWORK_OUTBOUND_LIMIT,
): NetworkEdgePlan[] {
  const byId = new Map(pool.map((member) => [member.siteId, member]))
  const outbound = new Map<string, Set<string>>()

  for (const self of pool) {
    const chosen = pickOutboundPartners(self, pool, limit)
    outbound.set(self.siteId, new Set(chosen.map((member) => member.siteId)))
  }

  for (const self of pool) {
    const mine = outbound.get(self.siteId)!
    for (const toId of [...mine]) {
      const theirs = outbound.get(toId)
      if (!theirs) continue
      if (theirs.has(self.siteId)) continue
      if (theirs.size >= limit) continue
      theirs.add(self.siteId)
    }
  }

  const edges: NetworkEdgePlan[] = []
  for (const [fromId, targets] of outbound) {
    for (const toId of targets) {
      const target = byId.get(toId)
      if (!target) continue
      edges.push({
        fromSiteId: fromId,
        toSiteId: toId,
        anchor: brandedAnchor(target),
      })
    }
  }

  edges.sort(
    (a, b) =>
      a.fromSiteId.localeCompare(b.fromSiteId) || a.toSiteId.localeCompare(b.toSiteId),
  )
  return edges
}

export function isNetworkEligible(input: {
  hostname: string | null | undefined
  indexingEnabled: boolean
  networkEnabled: boolean
  publishedPageCount: number
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!input.networkEnabled) reasons.push('Network linking is turned off in SEO settings.')
  if (!input.indexingEnabled) reasons.push('Indexing is disabled — robots stay away.')
  if (!input.hostname?.trim()) reasons.push('No public hostname yet.')
  if (input.publishedPageCount < 1) reasons.push('Publish at least one page.')
  return { eligible: reasons.length === 0, reasons }
}

export function publicOriginForHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return `http://${host}`
  return `https://${host}`
}
