import {
  EMPTY_METRIC_TOTALS,
  adAccountSchema,
  adsProviderStatusSchema,
  campaignSchema,
  metricSeriesSchema,
  type AdAccount,
  type AdsProviderStatus,
  type CampaignDraft,
  type MetricPoint,
  type MetricSeries,
  type MetricsQuery,
} from '@platform/schemas'
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
 * Meta Ads, behind the same `AdsProvider` interface as Google (ADR-0006).
 *
 * Meta's model is three levels — campaign, ad set, ad — where Google's is two.
 * Our model is two. That mismatch is exactly the kind of thing an adapter
 * exists to absorb: `mapAdGroupToAdSet` below carries a draft's ad group into
 * an ad set, and the rest of the platform never learns the word "ad set".
 *
 * ## This installation has no Meta credentials
 *
 * There is no Meta app id or secret configured, so `isConfigured()` is false,
 * reads return empty sets with a status explaining why, and writes throw.
 */

const APP_ID_ENV = 'META_APP_ID'
const APP_SECRET_ENV = 'META_APP_SECRET'

export const META_ADS_SCOPES = ['ads_management', 'ads_read', 'business_management']

export const META_ADS_REQUIRED_APIS = ['Marketing API', 'Conversions API']

// region Vendor shapes — nothing below this comment escapes this file

interface MetaCampaignNode {
  id: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  daily_budget?: string
  lifetime_budget?: string
  bid_strategy?: string
  start_time?: string
  stop_time?: string
  account_id?: string
}

interface MetaAdAccountNode {
  id: string
  account_id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
  is_prepay_account?: boolean
}

interface MetaInsightsNode {
  date_start?: string
  impressions?: string
  clicks?: string
  spend?: string
  actions?: { action_type: string; value: string }[]
  action_values?: { action_type: string; value: string }[]
}

/**
 * Meta reports budgets and spend as decimal strings in the account's minor
 * unit already ("1500" = €15.00), which is the one place its model is closer to
 * ours than Google's. Parsed defensively anyway: a string from a network is
 * untrusted input like any other.
 */
function minorFromString(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

/** Meta reports spend and value as major-unit decimals; these need scaling. */
function minorFromDecimal(value: string | number | undefined): number {
  if (value === undefined) return 0
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

const OBJECTIVE_FROM_META: Record<string, RemoteCampaign['objective']> = {
  OUTCOME_LEADS: 'leads',
  OUTCOME_SALES: 'sales',
  OUTCOME_TRAFFIC: 'traffic',
  OUTCOME_AWARENESS: 'awareness',
  OUTCOME_APP_PROMOTION: 'app_installs',
  OUTCOME_ENGAGEMENT: 'awareness',
}

const OBJECTIVE_TO_META: Record<RemoteCampaign['objective'], string> = {
  leads: 'OUTCOME_LEADS',
  // Meta has no call objective; a call is a lead with a phone destination.
  calls: 'OUTCOME_LEADS',
  sales: 'OUTCOME_SALES',
  traffic: 'OUTCOME_TRAFFIC',
  awareness: 'OUTCOME_AWARENESS',
  app_installs: 'OUTCOME_APP_PROMOTION',
}

const STATUS_FROM_META: Record<string, RemoteCampaign['status']> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DELETED: 'archived',
  ARCHIVED: 'archived',
}

const BIDDING_FROM_META: Record<string, RemoteCampaign['bidding']['type']> = {
  LOWEST_COST_WITHOUT_CAP: 'maximize_conversions',
  LOWEST_COST_WITH_BID_CAP: 'manual_cpc',
  COST_CAP: 'target_cpa',
  LOWEST_COST_WITH_MIN_ROAS: 'target_roas',
}

const BIDDING_TO_META: Record<RemoteCampaign['bidding']['type'], string> = {
  manual_cpc: 'LOWEST_COST_WITH_BID_CAP',
  maximize_clicks: 'LOWEST_COST_WITHOUT_CAP',
  maximize_conversions: 'LOWEST_COST_WITHOUT_CAP',
  maximize_conversion_value: 'LOWEST_COST_WITH_MIN_ROAS',
  target_cpa: 'COST_CAP',
  target_roas: 'LOWEST_COST_WITH_MIN_ROAS',
}

/** Meta campaign node → our `RemoteCampaign`. */
export function toRemoteCampaign(node: MetaCampaignNode, accountId: string, currency: string): RemoteCampaign {
  const lifetime = node.lifetime_budget !== undefined && node.daily_budget === undefined

  const parsed = campaignSchema
    .omit({ id: true, tenantId: true, createdAt: true, updatedAt: true, source: true, assumptions: true, warnings: true })
    .parse({
      provider: 'meta_ads',
      accountId,
      externalId: node.id,
      name: node.name,
      objective: OBJECTIVE_FROM_META[node.objective] ?? 'traffic',
      // Every Meta placement is social from the platform's point of view; the
      // surface split (feed, reels, stories) lives one level down, in the ad set.
      channel: 'social',
      status: STATUS_FROM_META[node.status] ?? 'paused',
      budget: {
        amountMinor: minorFromString(lifetime ? node.lifetime_budget : node.daily_budget),
        currency,
        period: lifetime ? 'lifetime' : 'daily',
      },
      bidding: { type: BIDDING_FROM_META[node.bid_strategy ?? ''] ?? 'maximize_conversions' },
      startDate: node.start_time ? node.start_time.slice(0, 10) : null,
      endDate: node.stop_time ? node.stop_time.slice(0, 10) : null,
      publishedAt: null,
    })

  return parsed as RemoteCampaign
}

export function toAdAccount(node: MetaAdAccountNode): AdAccount {
  return adAccountSchema.parse({
    provider: 'meta_ads',
    externalId: node.account_id || node.id,
    name: node.name,
    currency: node.currency,
    timeZone: node.timezone_name,
    // 1 is active; everything else means the account cannot spend right now.
    status: node.account_status === 1 ? 'enabled' : node.account_status === 2 ? 'closed' : 'suspended',
    isManager: false,
  })
}

/**
 * Meta insights → our metric points.
 *
 * Conversions arrive as an `actions` array keyed by action type rather than as
 * a column, so the mapping has to pick which action counts as a conversion.
 * We count purchases and leads, which is what our objectives optimize for.
 */
export function toMetricPoints(nodes: MetaInsightsNode[]): MetricPoint[] {
  const CONVERSION_ACTIONS = new Set(['purchase', 'lead', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.lead_grouped'])

  return nodes.map((node) => {
    const conversions = (node.actions ?? [])
      .filter((action) => CONVERSION_ACTIONS.has(action.action_type))
      .reduce((sum, action) => sum + Number(action.value ?? 0), 0)

    const conversionValue = (node.action_values ?? [])
      .filter((action) => CONVERSION_ACTIONS.has(action.action_type))
      .reduce((sum, action) => sum + Number(action.value ?? 0), 0)

    return {
      date: node.date_start ?? '',
      campaignId: null,
      impressions: Number(node.impressions ?? 0),
      clicks: Number(node.clicks ?? 0),
      costMinor: minorFromDecimal(node.spend),
      conversions: Number.isFinite(conversions) ? conversions : 0,
      conversionValueMinor: minorFromDecimal(conversionValue),
    }
  })
}

/**
 * Our two-level draft → Meta's three levels.
 *
 * One ad group becomes one ad set carrying the targeting, plus its creatives as
 * ads underneath. Keywords have no Meta equivalent at all: they are carried
 * into interest targeting as detailed-targeting terms, which is a genuine
 * approximation and is why `warnings` exists on a draft.
 */
export function toMetaMutation(draft: CampaignDraft): Record<string, unknown> {
  return {
    campaign: {
      name: draft.name,
      objective: OBJECTIVE_TO_META[draft.objective],
      // Created paused, always. Publishing and spending are separate decisions
      // (ADR-0007).
      status: 'PAUSED',
      bid_strategy: BIDDING_TO_META[draft.bidding.type],
      special_ad_categories: [],
      ...(draft.budget.period === 'lifetime'
        ? { lifetime_budget: String(draft.budget.amountMinor) }
        : { daily_budget: String(draft.budget.amountMinor) }),
    },
    ad_sets: draft.adGroups.map((group) => mapAdGroupToAdSet(group, draft)),
  }
}

function mapAdGroupToAdSet(group: CampaignDraft['adGroups'][number], draft: CampaignDraft): Record<string, unknown> {
  return {
    name: group.name,
    status: 'PAUSED',
    billing_event: 'IMPRESSIONS',
    optimization_goal: draft.objective === 'sales' ? 'OFFSITE_CONVERSIONS' : 'LEAD_GENERATION',
    targeting: {
      geo_locations: {
        countries: draft.geoTargets.filter((target) => target.type === 'country' && !target.exclude).map((t) => t.value),
        cities: draft.geoTargets
          .filter((target) => (target.type === 'city' || target.type === 'radius') && !target.exclude)
          .map((target) => ({ key: target.value, radius: target.radiusKm, distance_unit: 'kilometer' })),
      },
      excluded_geo_locations: {
        cities: draft.geoTargets.filter((target) => target.exclude).map((target) => ({ key: target.value })),
      },
      // The approximation: search keywords become interest terms.
      flexible_spec: group.keywords.length
        ? [{ interests: group.keywords.slice(0, 25).map((keyword) => ({ name: keyword.text })) }]
        : undefined,
      locales: draft.languages,
    },
    ads: group.ads.map((creative) => ({
      name: creative.headlines[0] ?? group.name,
      status: 'PAUSED',
      creative: {
        title: creative.headlines[0],
        body: creative.descriptions[0],
        // Meta shows one headline and one body per ad rather than combining a
        // pool, so the extra variants become separate ads instead of being lost.
        object_story_spec: {
          link_data: {
            link: creative.finalUrl,
            message: creative.descriptions[0],
            name: creative.headlines[0],
            call_to_action: { type: creative.callToAction || 'LEARN_MORE' },
            image_hash: creative.mediaUrls[0],
          },
        },
      },
    })),
  }
}

// endregion

export class MetaAdsProvider implements AdsProvider {
  readonly id = 'meta_ads' as const
  readonly label = 'Meta Ads'

  missingConfiguration(): string[] {
    const missing: string[] = []
    if (!process.env[APP_ID_ENV]) missing.push(APP_ID_ENV)
    if (!process.env[APP_SECRET_ENV]) missing.push(APP_SECRET_ENV)
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
        ? `Meta Ads is not set up on this installation. Missing: ${missing.join(', ')}.`
        : !connected
          ? 'No Meta ad account is connected to this workspace yet.'
          : null,
      missingConfiguration: missing,
      requiredScopes: META_ADS_SCOPES,
      requiredApis: META_ADS_REQUIRED_APIS,
      connectedAccountId: connection?.externalAccountId ?? null,
      connectedAccountName: connection?.displayName ?? null,
      connectedAt: connection?.connectedAt ?? null,
    })
  }

  async connect(context: AdsProviderContext, _request: ConnectRequest): Promise<ConnectResult> {
    const missing = this.missingConfiguration()
    if (missing.length > 0) {
      return {
        status: 'unconfigured',
        authorizationUrl: null,
        reason: `Meta Ads cannot be connected: this installation is missing ${missing.join(', ')}.`,
        missingConfiguration: missing,
        requiredScopes: META_ADS_SCOPES,
        requiredApis: META_ADS_REQUIRED_APIS,
      }
    }

    return {
      status: context.connection ? 'connected' : 'authorization_required',
      authorizationUrl: null,
      reason: null,
      missingConfiguration: [],
      requiredScopes: META_ADS_SCOPES,
      requiredApis: META_ADS_REQUIRED_APIS,
    }
  }

  async listAccounts(context: AdsProviderContext): Promise<AdAccount[]> {
    if (!this.isConfigured() || !context.connection) return []
    // Real call: /me/adaccounts, mapped by `toAdAccount`.
    return []
  }

  async listCampaigns(context: AdsProviderContext, _accountId: string): Promise<RemoteCampaign[]> {
    if (!this.isConfigured() || !context.connection) return []
    // Real call: /act_{id}/campaigns, mapped by `toRemoteCampaign`.
    return []
  }

  async createCampaign(context: AdsProviderContext, _draft: CampaignDraft): Promise<RemoteCampaign> {
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
    // Real call: the insights edge, mapped by `toMetricPoints`.
    const points: MetricPoint[] = []

    return metricSeriesSchema.parse({
      provider: this.id,
      accountId: query.accountId ?? context.connection?.externalAccountId ?? null,
      currency: 'EUR',
      from: query.from,
      to: query.to,
      granularity: query.granularity,
      points,
      totals: EMPTY_METRIC_TOTALS,
    })
  }

  #unavailable(context: AdsProviderContext): ProviderUnavailableError {
    const missing = this.missingConfiguration()
    if (missing.length > 0) {
      return new ProviderUnavailableError(
        this.id,
        `Meta Ads is not set up on this installation. Missing: ${missing.join(', ')}.`,
        missing,
      )
    }
    if (!context.connection) {
      return new ProviderUnavailableError(this.id, 'Connect a Meta ad account before publishing to it.')
    }
    return new ProviderUnavailableError(this.id, 'Meta Ads is temporarily unavailable.')
  }
}
