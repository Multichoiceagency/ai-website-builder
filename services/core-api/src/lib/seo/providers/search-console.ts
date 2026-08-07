import type { SeoProviderStatus } from '@platform/schemas'
import { env } from '../../../config/env.js'
import { AppError } from '../../errors.js'

/**
 * Google Search Console behind a platform-owned interface (ADR-0006).
 *
 * `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are optional and unset on this
 * installation, so the provider reports `configured: false` and every call
 * refuses loudly. Nothing in the SEO module requires it: the audit, the
 * sitemap, the structured data and the content gate all work from our own
 * data. Search Console adds *observed* performance on top — it is never the
 * thing that makes the module function.
 */

export interface SearchConsoleSite {
  siteUrl: string
  permissionLevel: string
}

export interface SearchConsoleQuery {
  siteUrl: string
  startDate: string
  endDate: string
  dimension: 'query' | 'page'
  limit: number
}

export interface SearchConsoleRow {
  key: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SearchConsoleProvider {
  readonly id: string
  /** False when this installation has no Google OAuth client configured. */
  isConfigured(): boolean
  status(): SeoProviderStatus
  listSites(tenantId: string): Promise<SearchConsoleSite[]>
  queryPerformance(tenantId: string, query: SearchConsoleQuery): Promise<SearchConsoleRow[]>
}

export class SearchConsoleNotConnectedError extends AppError {
  constructor(reason: string) {
    super(409, 'search_console_not_connected', reason)
  }
}

/**
 * The Google implementation. It deliberately stops at the credential check:
 * writing an OAuth dance against a client that does not exist would be code
 * nobody has ever run, which is worse than an honest refusal.
 */
export class GoogleSearchConsoleProvider implements SearchConsoleProvider {
  readonly id = 'google_search_console'

  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
  }

  status(): SeoProviderStatus {
    const configured = this.isConfigured()
    return {
      provider: this.id,
      configured,
      // Connection is per tenant and needs an OAuth grant, which cannot exist
      // before the platform client does.
      connected: false,
      reason: configured
        ? 'Google is configured on this installation, but this workspace has not connected a Search Console property yet.'
        : 'The platform Google OAuth client is not configured on this environment.',
    }
  }

  async listSites(): Promise<SearchConsoleSite[]> {
    throw new SearchConsoleNotConnectedError(this.status().reason)
  }

  async queryPerformance(): Promise<SearchConsoleRow[]> {
    throw new SearchConsoleNotConnectedError(this.status().reason)
  }
}

export const searchConsole: SearchConsoleProvider = new GoogleSearchConsoleProvider()
