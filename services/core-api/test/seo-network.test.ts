import { describe, expect, it } from 'vitest'
import {
  isNetworkEligible,
  NETWORK_OUTBOUND_LIMIT,
  pickOutboundPartners,
  planNetworkEdges,
  publicOriginForHostname,
  type NetworkCandidate,
} from '../src/lib/seo/network.js'

function member(partial: Partial<NetworkCandidate> & Pick<NetworkCandidate, 'siteId' | 'title'>): NetworkCandidate {
  return {
    tenantId: 't1',
    hostname: `${partial.siteId}.example.test`,
    locale: 'en',
    kind: 'website',
    niche: '',
    origin: `https://${partial.siteId}.example.test`,
    publishedPageCount: 2,
    ...partial,
  }
}

describe('seo network partner selection', () => {
  it('prefers same locale and niche', () => {
    const self = member({ siteId: 'a', title: 'Alpha', locale: 'nl', niche: 'dental' })
    const pool = [
      self,
      member({ siteId: 'b', title: 'Beta', locale: 'nl', niche: 'dental' }),
      member({ siteId: 'c', title: 'Gamma', locale: 'en', niche: 'saas' }),
      member({ siteId: 'd', title: 'Delta', locale: 'nl', niche: 'legal' }),
    ]
    const picked = pickOutboundPartners(self, pool, 2)
    expect(picked[0]?.siteId).toBe('b')
    expect(picked.map((entry) => entry.siteId)).not.toContain('a')
  })

  it('builds near-reciprocal edges under the outbound cap', () => {
    const pool = Array.from({ length: 8 }, (_, index) =>
      member({ siteId: `s${index}`, title: `Site ${index}`, locale: 'en' }),
    )
    const edges = planNetworkEdges(pool, NETWORK_OUTBOUND_LIMIT)
    expect(edges.length).toBeGreaterThan(0)

    const outbound = new Map<string, number>()
    for (const edge of edges) {
      outbound.set(edge.fromSiteId, (outbound.get(edge.fromSiteId) ?? 0) + 1)
      expect(edge.anchor.length).toBeGreaterThan(0)
    }
    for (const count of outbound.values()) {
      expect(count).toBeLessThanOrEqual(NETWORK_OUTBOUND_LIMIT)
    }
  })

  it('reports eligibility gates clearly', () => {
    expect(
      isNetworkEligible({
        hostname: 'acme.test',
        indexingEnabled: true,
        networkEnabled: true,
        publishedPageCount: 1,
      }).eligible,
    ).toBe(true)

    const blocked = isNetworkEligible({
      hostname: null,
      indexingEnabled: false,
      networkEnabled: false,
      publishedPageCount: 0,
    })
    expect(blocked.eligible).toBe(false)
    expect(blocked.reasons.length).toBeGreaterThanOrEqual(3)
  })

  it('uses https for public hosts and http for localhost', () => {
    expect(publicOriginForHostname('acme.nl')).toBe('https://acme.nl')
    expect(publicOriginForHostname('demo.localhost')).toBe('http://demo.localhost')
  })
})
