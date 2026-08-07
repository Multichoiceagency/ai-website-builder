import type {
  AdAccount,
  AdsConnectResult,
  AdsProviderId,
  AdsProviderStatus,
  Campaign,
  CampaignDraft,
  MetricSeries,
  MetricsQuery,
} from '@platform/schemas'

/**
 * The ads capability, defined by us (ADR-0006).
 *
 * `GoogleAdsProvider` and `MetaAdsProvider` implement this. Every type in every
 * signature comes from `@platform/schemas` and is platform-owned, so a caller
 * — route, repository, dashboard component — can never learn a vendor field
 * name. That is what lets the dashboard build one `CampaignTable` instead of
 * one per network, and what makes adding TikTok a new file rather than a new
 * UI.
 *
 * Enforcement is mechanical: CI greps for vendor SDK imports outside
 * an `adapters` directory.
 */

/**
 * The credentials for one tenant's link to one network.
 *
 * Tokens are decrypted only inside the adapter layer and are never serialized
 * into a response — ADR-0009: third-party OAuth tokens do not reach the
 * browser under any circumstance.
 */
export interface AdsConnectionSecrets {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

export interface AdsConnection {
  tenantId: string
  /**
   * Google Business Profile is stored alongside the ad networks — same OAuth
   * client, same table, same encryption — but it is not an `AdsProvider`, so
   * the union is wider than `AdsProviderId` here and nowhere else.
   */
  provider: AdsProviderId | 'google_business'
  externalAccountId: string | null
  displayName: string | null
  scopes: string[]
  connectedAt: Date
  /** Absent when the caller only needed connection metadata. */
  secrets?: AdsConnectionSecrets
}

/**
 * Everything a provider call is allowed to know. Deliberately not the Fastify
 * request and not the full `TenantContext`: an adapter has no business reading
 * a session, and a narrow context is a narrow blast radius.
 */
export interface AdsProviderContext {
  tenantId: string
  connection: AdsConnection | null
}

/**
 * A campaign as it exists *on the network*.
 *
 * ADR-0006 sketches `createCampaign(): Promise<Campaign>`; in practice our
 * `Campaign` carries platform identity (`id`, `tenantId`, timestamps, the
 * `source` that records whether an agent wrote it) which the network neither
 * knows nor could invent. So a provider speaks in the network-facing subset and
 * the repository owns the rest. Still entirely our types.
 */
export type RemoteCampaign = Omit<
  Campaign,
  'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'source' | 'assumptions' | 'warnings'
>

/** What a provider will accept as a change to an already-published campaign. */
export interface RemoteCampaignPatch {
  name?: string
  status?: Campaign['status']
  budget?: Campaign['budget']
  bidding?: Campaign['bidding']
  geoTargets?: Campaign['geoTargets']
  landingPageUrl?: string
}

export interface ConnectRequest {
  /** Where the dashboard wants the user returned after consent. */
  returnUrl?: string
}

/**
 * The result of starting a connection.
 *
 * Defined in `@platform/schemas` rather than here because the dashboard renders
 * it: a shape that crosses the HTTP boundary belongs in the shared contracts,
 * not in an adapter (ADR-0002). `missingConfiguration` carries environment
 * variable *names* only — no value ever leaves the server.
 */
export type ConnectResult = AdsConnectResult

export interface AdsProvider {
  readonly id: AdsProviderId
  readonly label: string

  /** True when the installation holds the credentials this network needs. */
  isConfigured(): boolean

  /** Configuration + this tenant's link, resolved into one honest answer. */
  status(context: AdsProviderContext): AdsProviderStatus

  connect(context: AdsProviderContext, request: ConnectRequest): Promise<ConnectResult>

  listAccounts(context: AdsProviderContext): Promise<AdAccount[]>

  listCampaigns(context: AdsProviderContext, accountId: string): Promise<RemoteCampaign[]>

  createCampaign(context: AdsProviderContext, draft: CampaignDraft): Promise<RemoteCampaign>

  updateCampaign(
    context: AdsProviderContext,
    externalId: string,
    patch: RemoteCampaignPatch,
  ): Promise<RemoteCampaign>

  getMetrics(context: AdsProviderContext, query: MetricsQuery): Promise<MetricSeries>
}

/**
 * Thrown when a provider is asked to do something it cannot do right now.
 *
 * Reads never throw this — they return an empty result plus the status, because
 * "nothing is connected" is information, not a failure. Writes do throw it:
 * silently not creating a campaign would be far worse than an error.
 */
export class ProviderUnavailableError extends Error {
  constructor(
    readonly provider: AdsProviderId,
    readonly reason: string,
    readonly missingConfiguration: string[] = [],
  ) {
    super(reason)
    this.name = 'ProviderUnavailableError'
  }
}
