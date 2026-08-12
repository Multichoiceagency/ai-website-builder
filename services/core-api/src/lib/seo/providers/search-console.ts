import type { SeoProviderStatus } from '@platform/schemas'
import { env } from '../../../config/env.js'
import { googleAccessTokenFor, hasGoogleConnection } from '../../integrations/google-token.js'
import { isGoogleConfigured } from '../../integrations/google.js'
import { AppError } from '../../errors.js'

/**
 * Google Search Console behind a platform-owned interface (ADR-0006).
 * Uses the tenant's Google OAuth tokens (webmasters.readonly scope).
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
  isConfigured(): boolean
  status(tenantId?: string): Promise<SeoProviderStatus> | SeoProviderStatus
  listSites(tenantId: string): Promise<SearchConsoleSite[]>
  queryPerformance(tenantId: string, query: SearchConsoleQuery): Promise<SearchConsoleRow[]>
}

export class SearchConsoleNotConnectedError extends AppError {
  constructor(reason: string) {
    super(409, 'search_console_not_connected', reason)
  }
}

export class GoogleSearchConsoleProvider implements SearchConsoleProvider {
  readonly id = 'google_search_console'

  isConfigured(): boolean {
    return isGoogleConfigured()
  }

  status(tenantId?: string): SeoProviderStatus | Promise<SeoProviderStatus> {
    if (!this.isConfigured()) {
      return {
        provider: this.id,
        configured: false,
        connected: false,
        reason: 'Google OAuth is not configured — add the client under Settings → Integrations.',
      }
    }
    if (!tenantId) {
      return {
        provider: this.id,
        configured: true,
        connected: false,
        reason: 'Google is configured. Connect a workspace under Settings → Integrations.',
      }
    }
    return hasGoogleConnection(tenantId).then((connected) => ({
      provider: this.id,
      configured: true,
      connected,
      reason: connected
        ? 'Google is connected. Pick a Search Console property to load performance.'
        : 'This workspace has not connected Google yet.',
    }))
  }

  async listSites(tenantId: string): Promise<SearchConsoleSite[]> {
    if (!this.isConfigured()) {
      throw new SearchConsoleNotConnectedError((await this.status()).reason)
    }
    const token = await googleAccessTokenFor(tenantId)
    const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      throw new SearchConsoleNotConnectedError(`Search Console sites failed (${response.status}).`)
    }
    const payload = (await response.json()) as {
      siteEntry?: { siteUrl?: string; permissionLevel?: string }[]
    }
    return (payload.siteEntry ?? [])
      .map((entry) => ({
        siteUrl: entry.siteUrl ?? '',
        permissionLevel: entry.permissionLevel ?? 'unknown',
      }))
      .filter((entry) => entry.siteUrl)
  }

  async queryPerformance(tenantId: string, query: SearchConsoleQuery): Promise<SearchConsoleRow[]> {
    if (!this.isConfigured()) {
      throw new SearchConsoleNotConnectedError((await this.status()).reason)
    }
    const token = await googleAccessTokenFor(tenantId)
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(query.siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          startDate: query.startDate,
          endDate: query.endDate,
          dimensions: [query.dimension],
          rowLimit: query.limit,
        }),
      },
    )
    if (!response.ok) {
      throw new SearchConsoleNotConnectedError(`Search Console query failed (${response.status}).`)
    }
    const payload = (await response.json()) as {
      rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[]
    }
    return (payload.rows ?? []).map((row) => ({
      key: row.keys?.[0] ?? '',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }))
  }
}

export const searchConsole: SearchConsoleProvider = new GoogleSearchConsoleProvider()

/** Kept so callers that only need env presence do not import env directly. */
export function searchConsolePlatformConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}
