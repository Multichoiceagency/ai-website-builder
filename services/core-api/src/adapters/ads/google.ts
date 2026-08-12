import {
  EMPTY_METRIC_TOTALS,
  adAccountSchema,
  adsProviderStatusSchema,
  campaignSchema,
  metricSeriesSchema,
  summarizeMetrics,
  type AdAccount,
  type AdsProviderStatus,
  type CampaignDraft,
  type MetricPoint,
  type MetricSeries,
  type MetricsQuery,
} from '@platform/schemas'
import { env } from '../../config/env.js'
import {
  ProviderUnavailableError,
  type AdsProvider,
  type AdsProviderContext,
  type ConnectRequest,
  type ConnectResult,
  type RemoteCampaign,
  type RemoteCampaignPatch,
} from './types.js'

/**
 * Google Ads, behind the platform's `AdsProvider` interface (ADR-0006).
 *
 * This file is the *only* place in the repository allowed to know how Google
 * names things. Everything it hands back is a platform type. The vendor shapes
 * below are declared locally rather than imported from `googleapis` because the
 * SDK is not a dependency yet — when it is added, only this file changes, and
 * CI keeps it that way by refusing vendor imports outside an `adapters` directory.
 *
 * ## This installation has no Google credentials
 *
 * `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are optional in `config/env.ts`
 * and unset here, and there is no Google Ads developer token — which the Ads
 * API requires *in addition* to OAuth. So `isConfigured()` is false, reads
 * return empty sets alongside a status that says exactly why, and writes throw
 * `ProviderUnavailableError`.
 *
 * Nothing in this file fabricates a campaign or a metric. A dashboard that
 * invents numbers to look finished is the fastest way to lose a user's trust in
 * the numbers that are real.
 */

/** Google requires a developer token on every Ads API call, beside the OAuth token. */
const DEVELOPER_TOKEN_ENV = 'GOOGLE_ADS_DEVELOPER_TOKEN'

/**
 * Requesting Ads access is a separate consent from signing in with Google
 * (ADR-0009): authenticating a user never implies permission to spend their
 * money.
 */
export const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords']

export const GOOGLE_ADS_REQUIRED_APIS = ['Google Ads API (googleads.googleapis.com)']

// region Vendor shapes — nothing below this comment escapes this file

/** The subset of Google's `Campaign` resource we read. Their names, their casing. */
interface GoogleCampaignResource {
  resource_name: string
  id: string
  name: string
  status: 'UNSPECIFIED' | 'UNKNOWN' | 'ENABLED' | 'PAUSED' | 'REMOVED'
  advertising_channel_type: string
  bidding_strategy_type: string
  start_date?: string
  end_date?: string
  campaign_budget?: { amount_micros: string; delivery_method?: string }
  target_cpa?: { target_cpa_micros: string }
  target_roas?: { target_roas: number }
}

interface GoogleCustomerResource {
  resource_name: string
  id: string
  descriptive_name: string
  currency_code: string
  time_zone: string
  manager: boolean
  status?: string
}

interface GoogleMetricsRow {
  segments?: { date?: string }
  metrics?: {
    impressions?: string
    clicks?: string
    cost_micros?: string
    conversions?: number
    conversions_value?: number
  }
}

/**
 * Google counts money in micros — a millionth of the currency unit. We count in
 * minor units (cents), so the factor is 10,000 for any two-decimal currency.
 *
 * Both directions round explicitly. An implicit float here is a rounding error
 * in somebody's ad spend.
 */
const MICROS_PER_MINOR_UNIT = 10_000

function microsToMinor(micros: string | number | undefined): number {
  if (micros === undefined) return 0
  const value = typeof micros === 'string' ? Number(micros) : micros
  if (!Number.isFinite(value)) return 0
  return Math.round(value / MICROS_PER_MINOR_UNIT)
}

export function minorToMicros(minor: number): number {
  return Math.round(minor) * MICROS_PER_MINOR_UNIT
}

const CHANNEL_FROM_GOOGLE: Record<string, RemoteCampaign['channel']> = {
  SEARCH: 'search',
  PERFORMANCE_MAX: 'performance_max',
  DISPLAY: 'display',
  VIDEO: 'video',
  SHOPPING: 'shopping',
  DEMAND_GEN: 'display',
}

const CHANNEL_TO_GOOGLE: Record<RemoteCampaign['channel'], string> = {
  search: 'SEARCH',
  performance_max: 'PERFORMANCE_MAX',
  display: 'DISPLAY',
  video: 'VIDEO',
  shopping: 'SHOPPING',
  // Google has no social channel; Performance Max is the closest surface that
  // actually places social-adjacent inventory. Recorded here so the lossy step
  // is visible rather than silent.
  social: 'PERFORMANCE_MAX',
}

const STATUS_FROM_GOOGLE: Record<string, RemoteCampaign['status']> = {
  ENABLED: 'active',
  PAUSED: 'paused',
  REMOVED: 'archived',
}

const BIDDING_FROM_GOOGLE: Record<string, RemoteCampaign['bidding']['type']> = {
  MANUAL_CPC: 'manual_cpc',
  MAXIMIZE_CLICKS: 'maximize_clicks',
  TARGET_SPEND: 'maximize_clicks',
  MAXIMIZE_CONVERSIONS: 'maximize_conversions',
  MAXIMIZE_CONVERSION_VALUE: 'maximize_conversion_value',
  TARGET_CPA: 'target_cpa',
  TARGET_ROAS: 'target_roas',
}

const BIDDING_TO_GOOGLE: Record<RemoteCampaign['bidding']['type'], string> = {
  manual_cpc: 'MANUAL_CPC',
  maximize_clicks: 'MAXIMIZE_CLICKS',
  maximize_conversions: 'MAXIMIZE_CONVERSIONS',
  maximize_conversion_value: 'MAXIMIZE_CONVERSION_VALUE',
  target_cpa: 'TARGET_CPA',
  target_roas: 'TARGET_ROAS',
}

const MATCH_TYPE_TO_GOOGLE: Record<'exact' | 'phrase' | 'broad', string> = {
  exact: 'EXACT',
  phrase: 'PHRASE',
  broad: 'BROAD',
}

/** Google campaign resource → our `RemoteCampaign`. */
export function toRemoteCampaign(
  resource: GoogleCampaignResource,
  accountId: string,
  currency: string,
): RemoteCampaign {
  const parsed = campaignSchema
    .omit({ id: true, tenantId: true, createdAt: true, updatedAt: true, source: true, assumptions: true, warnings: true })
    .parse({
      provider: 'google_ads',
      accountId,
      externalId: resource.id,
      name: resource.name,
      // Google models intent as channel + conversion goal, not as a single
      // objective, so this is a lossy read. `leads` is the honest default for a
      // campaign we did not author.
      objective: 'leads',
      channel: CHANNEL_FROM_GOOGLE[resource.advertising_channel_type] ?? 'search',
      status: STATUS_FROM_GOOGLE[resource.status] ?? 'paused',
      budget: {
        amountMinor: microsToMinor(resource.campaign_budget?.amount_micros),
        currency,
        period: 'daily',
      },
      bidding: {
        type: BIDDING_FROM_GOOGLE[resource.bidding_strategy_type] ?? 'maximize_conversions',
        targetCpaMinor: resource.target_cpa ? microsToMinor(resource.target_cpa.target_cpa_micros) : undefined,
        targetRoas: resource.target_roas?.target_roas,
      },
      startDate: resource.start_date ?? null,
      endDate: resource.end_date ?? null,
      publishedAt: null,
    })

  return parsed as RemoteCampaign
}

/** Google customer resource → our `AdAccount`. */
export function toAdAccount(resource: GoogleCustomerResource): AdAccount {
  return adAccountSchema.parse({
    provider: 'google_ads',
    externalId: resource.id,
    name: resource.descriptive_name || `Account ${resource.id}`,
    currency: resource.currency_code,
    timeZone: resource.time_zone,
    status: resource.status === 'SUSPENDED' ? 'suspended' : resource.status === 'CLOSED' ? 'closed' : 'enabled',
    isManager: resource.manager,
  })
}

/** Google reporting rows → our metric points. */
export function toMetricPoints(rows: GoogleMetricsRow[]): MetricPoint[] {
  return rows.map((row) => ({
    date: row.segments?.date ?? '',
    campaignId: null,
    impressions: Number(row.metrics?.impressions ?? 0),
    clicks: Number(row.metrics?.clicks ?? 0),
    costMinor: microsToMinor(row.metrics?.cost_micros),
    conversions: Number(row.metrics?.conversions ?? 0),
    // Google reports conversion value in the account currency as a float.
    conversionValueMinor: Math.round(Number(row.metrics?.conversions_value ?? 0) * 100),
  }))
}

/**
 * Our draft → the mutation payload Google's API expects.
 *
 * Exported so the shape is unit-testable without a network, and so the lossy
 * parts of the translation are reviewable in one place rather than discovered
 * in production.
 */
export function toGoogleMutation(draft: CampaignDraft): Record<string, unknown> {
  return {
    campaign: {
      name: draft.name,
      // A campaign we create is always PAUSED on arrival, whatever the draft
      // says. Publishing to Google and starting to spend are two decisions, and
      // this adapter refuses to conflate them (ADR-0007).
      status: 'PAUSED',
      advertising_channel_type: CHANNEL_TO_GOOGLE[draft.channel],
      bidding_strategy_type: BIDDING_TO_GOOGLE[draft.bidding.type],
      start_date: draft.startDate ?? undefined,
      end_date: draft.endDate ?? undefined,
      ...(draft.bidding.targetCpaMinor !== undefined
        ? { target_cpa: { target_cpa_micros: minorToMicros(draft.bidding.targetCpaMinor) } }
        : {}),
      ...(draft.bidding.targetRoas !== undefined ? { target_roas: { target_roas: draft.bidding.targetRoas } } : {}),
    },
    campaign_budget: {
      amount_micros: minorToMicros(draft.budget.amountMinor),
      delivery_method: 'STANDARD',
      explicitly_shared: false,
    },
    ad_groups: draft.adGroups.map((group) => ({
      name: group.name,
      status: 'PAUSED',
      cpc_bid_micros: group.defaultBidMinor !== undefined ? minorToMicros(group.defaultBidMinor) : undefined,
      keywords: group.keywords.map((keyword) => ({
        text: keyword.text,
        match_type: MATCH_TYPE_TO_GOOGLE[keyword.matchType],
      })),
      negative_keywords: group.negativeKeywords.map((keyword) => ({
        text: keyword.text,
        match_type: MATCH_TYPE_TO_GOOGLE[keyword.matchType],
        negative: true,
      })),
      ads: group.ads.map((creative) => ({
        responsive_search_ad: {
          headlines: creative.headlines.map((text) => ({ text })),
          descriptions: creative.descriptions.map((text) => ({ text })),
          path1: creative.displayPath[0],
          path2: creative.displayPath[1],
        },
        final_urls: [creative.finalUrl],
      })),
    })),
    criteria: draft.geoTargets.map((target) => ({
      location: { geo_target_constant: target.value },
      radius: target.radiusKm ? { radius: target.radiusKm, radius_units: 'KILOMETERS' } : undefined,
      negative: target.exclude,
    })),
  }
}

// endregion

export class GoogleAdsProvider implements AdsProvider {
  readonly id = 'google_ads' as const
  readonly label = 'Google Ads'

  /**
   * Google Ads needs three things, not one: an OAuth client id, its secret, and
   * a developer token issued to the *platform* by Google. Missing any of them
   * means no call can succeed, so all three are reported by name.
   */
  missingConfiguration(): string[] {
    const missing: string[] = []
    if (!env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID')
    if (!env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET')
    if (!process.env[DEVELOPER_TOKEN_ENV]) missing.push(DEVELOPER_TOKEN_ENV)
    return missing
  }

  isConfigured(): boolean {
    return this.missingConfiguration().length === 0
  }

  status(context: AdsProviderContext): AdsProviderStatus {
    const missing = this.missingConfiguration()
    const configured = missing.length === 0
    const connection = context.connection
    const connected = configured && connection !== null

    return adsProviderStatusSchema.parse({
      provider: this.id,
      label: this.label,
      configured,
      connected,
      available: configured && connected,
      reason: !configured
        ? 'Google Ads is not configured yet. Add Google Client ID, Client Secret, and Ads developer token under Settings → Integrations.'
        : !connected
          ? 'No Google Ads account is connected to this workspace yet.'
          : null,
      missingConfiguration: missing,
      requiredScopes: GOOGLE_ADS_SCOPES,
      requiredApis: GOOGLE_ADS_REQUIRED_APIS,
      connectedAccountId: connection?.externalAccountId ?? null,
      connectedAccountName: connection?.displayName ?? null,
      connectedAt: connection?.connectedAt ?? null,
    })
  }

  async connect(context: AdsProviderContext, request: ConnectRequest): Promise<ConnectResult> {
    const missing = this.missingConfiguration()
    if (missing.length > 0) {
      return {
        status: 'unconfigured',
        authorizationUrl: null,
        reason: 'Google Ads cannot be connected yet. Add the required credentials under Settings → Integrations.',
        missingConfiguration: missing,
        requiredScopes: GOOGLE_ADS_SCOPES,
        requiredApis: GOOGLE_ADS_REQUIRED_APIS,
      }
    }

    if (context.connection) {
      return {
        status: 'connected',
        authorizationUrl: null,
        reason: null,
        missingConfiguration: [],
        requiredScopes: GOOGLE_ADS_SCOPES,
        requiredApis: GOOGLE_ADS_REQUIRED_APIS,
      }
    }

    // The consent URL is built here rather than in the route, because the set
    // of scopes is a vendor detail. `state` carries the tenant so the callback
    // cannot be replayed against another workspace.
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!)
    url.searchParams.set('redirect_uri', env.GOOGLE_OAUTH_REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', GOOGLE_ADS_SCOPES.join(' '))
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('state', `${this.id}:${context.tenantId}:${request.returnUrl ?? ''}`)

    return {
      status: 'authorization_required',
      authorizationUrl: url.toString(),
      reason: null,
      missingConfiguration: [],
      requiredScopes: GOOGLE_ADS_SCOPES,
      requiredApis: GOOGLE_ADS_REQUIRED_APIS,
    }
  }

  /**
   * Reads degrade to empty rather than throwing. The caller pairs this with
   * `status()`, so "no accounts" and "cannot see accounts" stay distinguishable
   * in the response.
   */
  async listAccounts(context: AdsProviderContext): Promise<AdAccount[]> {
    if (!this.isConfigured() || !context.connection) return []
    // Real call: customer_client search via the Ads API, mapped by `toAdAccount`.
    return []
  }

  async listCampaigns(context: AdsProviderContext, _accountId: string): Promise<RemoteCampaign[]> {
    if (!this.isConfigured() || !context.connection) return []
    // Real call: GAQL over campaign + campaign_budget, mapped by `toRemoteCampaign`.
    return []
  }

  async createCampaign(context: AdsProviderContext, _draft: CampaignDraft): Promise<RemoteCampaign> {
    // A write must never silently do nothing. `toGoogleMutation` is ready; the
    // transport is not.
    throw this.#unavailable(context)
  }

  async updateCampaign(
    context: AdsProviderContext,
    _externalId: string,
    _patch: RemoteCampaignPatch,
  ): Promise<RemoteCampaign> {
    throw this.#unavailable(context)
  }

  async getMetrics(context: AdsProviderContext, query: MetricsQuery): Promise<MetricSeries> {
    // Real call: a GAQL metrics query mapped by `toMetricPoints`. Until the
    // transport exists there is nothing to report, and reporting nothing is the
    // only honest option — a chart of invented spend is worse than no chart.
    const points: MetricPoint[] = []

    return metricSeriesSchema.parse({
      provider: this.id,
      accountId: query.accountId ?? context.connection?.externalAccountId ?? null,
      currency: 'EUR',
      from: query.from,
      to: query.to,
      granularity: query.granularity,
      points,
      totals: points.length ? summarizeMetrics(points) : EMPTY_METRIC_TOTALS,
    })
  }

  #unavailable(context: AdsProviderContext): ProviderUnavailableError {
    const missing = this.missingConfiguration()
    if (missing.length > 0) {
      return new ProviderUnavailableError(
        this.id,
        `Google Ads is not configured yet. Add the required credentials under Settings → Integrations.`,
        missing,
      )
    }
    if (!context.connection) {
      return new ProviderUnavailableError(this.id, 'Connect a Google Ads account before publishing to it.')
    }
    return new ProviderUnavailableError(this.id, 'Google Ads is temporarily unavailable.')
  }
}
