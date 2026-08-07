import type { SeoProviderStatus } from '@platform/schemas'

/**
 * Rank tracking behind a platform-owned interface (ADR-0006).
 *
 * There is no SERP data provider on this installation, and that has one
 * consequence the rest of the module obeys: **positions are never invented.**
 * Keywords are stored, the history table exists, and the API reports
 * `provider: null` so the dashboard says "connect a data source" instead of
 * drawing a chart of numbers nobody measured (§15).
 *
 * Adding a provider later means implementing this interface and registering it
 * in `serpGateway` — no caller changes.
 */

export interface SerpQuery {
  keyword: string
  locale: string
  country: string
  /** The domain whose position we want. */
  domain: string
}

export interface SerpResult {
  keyword: string
  position: number | null
  url: string | null
  checkedAt: string
}

export interface SerpProvider {
  readonly id: string
  isConfigured(): boolean
  fetchPositions(queries: SerpQuery[]): Promise<SerpResult[]>
}

export class SerpGateway {
  readonly #providers: SerpProvider[]

  constructor(providers: SerpProvider[]) {
    this.#providers = providers
  }

  active(): SerpProvider | null {
    return this.#providers.find((provider) => provider.isConfigured()) ?? null
  }

  status(): SeoProviderStatus {
    const provider = this.active()
    if (!provider) {
      return {
        provider: null,
        configured: false,
        connected: false,
        reason: 'No SERP data source is configured, so positions are not tracked. Keywords are still stored.',
      }
    }
    return {
      provider: provider.id,
      configured: true,
      connected: true,
      reason: 'Positions are refreshed from the connected data source.',
    }
  }

  /** Empty until a provider exists. Callers must treat that as "unknown". */
  async fetchPositions(queries: SerpQuery[]): Promise<SerpResult[]> {
    const provider = this.active()
    if (!provider) return []
    return provider.fetchPositions(queries)
  }
}

export const serpGateway = new SerpGateway([])
