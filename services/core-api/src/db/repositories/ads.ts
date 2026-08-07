import {
  adsGuardrailsSchema,
  campaignSchema,
  conversionMappingSchema,
  type AdsGuardrails,
  type AdsProviderId,
  type Campaign,
  type CampaignDraft,
  type ConversionMapping,
  type UpdateCampaignInput,
  type UpsertConversionMappingInput,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { decryptSecret, encryptSecret, type AdsConnection } from '../../adapters/ads/index.js'

/**
 * Ads persistence. All SQL for the ads domain lives here (ADR-0005), and every
 * row leaves through a Zod schema so the database is validated like any other
 * boundary.
 *
 * Every function takes a transaction that `withTenant` has already bound to a
 * tenant, so a forgotten `WHERE tenant_id` degrades to zero rows rather than a
 * leak (ADR-0004). The explicit clauses are still here — belt and braces is the
 * whole point of two layers.
 */

// region Connections

interface ConnectionRow {
  tenant_id: string
  provider: string
  external_account_id: string | null
  display_name: string | null
  access_token_enc: string | null
  refresh_token_enc: string | null
  token_expires_at: Date | null
  scopes: unknown
  connected_at: Date
}

/**
 * Connection metadata **without** credentials.
 *
 * This is what every read path uses. The secrets columns are not even selected,
 * so there is no code path where a token can accidentally end up in a response
 * (ADR-0009).
 */
export async function findConnection(
  tx: Tx,
  tenantId: string,
  provider: AdsProviderId | 'google_business',
): Promise<AdsConnection | null> {
  const [row] = await tx<Omit<ConnectionRow, 'access_token_enc' | 'refresh_token_enc' | 'token_expires_at'>[]>`
    SELECT tenant_id, provider, external_account_id, display_name, scopes, connected_at
    FROM ads_connections
    WHERE tenant_id = ${tenantId} AND provider = ${provider}
    LIMIT 1
  `
  if (!row) return null

  return {
    tenantId: row.tenant_id,
    provider: row.provider as AdsProviderId | 'google_business',
    externalAccountId: row.external_account_id,
    displayName: row.display_name,
    scopes: readJson<string[]>(row.scopes, []),
    connectedAt: row.connected_at,
  }
}

export async function listConnections(tx: Tx, tenantId: string): Promise<AdsConnection[]> {
  const rows = await tx<Omit<ConnectionRow, 'access_token_enc' | 'refresh_token_enc' | 'token_expires_at'>[]>`
    SELECT tenant_id, provider, external_account_id, display_name, scopes, connected_at
    FROM ads_connections
    WHERE tenant_id = ${tenantId}
    ORDER BY provider ASC
  `
  return rows.map((row) => ({
    tenantId: row.tenant_id,
    provider: row.provider as AdsProviderId | 'google_business',
    externalAccountId: row.external_account_id,
    displayName: row.display_name,
    scopes: readJson<string[]>(row.scopes, []),
    connectedAt: row.connected_at,
  }))
}

/**
 * The only path that decrypts. Adapter code calls this; route code does not.
 *
 * A credential that fails to decrypt comes back as `null` rather than throwing,
 * so the connection presents as unusable — which it is — instead of taking down
 * the endpoint that touched it.
 */
export async function findConnectionWithSecrets(
  tx: Tx,
  tenantId: string,
  provider: AdsProviderId | 'google_business',
): Promise<AdsConnection | null> {
  const [row] = await tx<ConnectionRow[]>`
    SELECT tenant_id, provider, external_account_id, display_name,
           access_token_enc, refresh_token_enc, token_expires_at, scopes, connected_at
    FROM ads_connections
    WHERE tenant_id = ${tenantId} AND provider = ${provider}
    LIMIT 1
  `
  if (!row) return null

  const accessToken = decryptSecret(row.access_token_enc)

  return {
    tenantId: row.tenant_id,
    provider: row.provider as AdsProviderId | 'google_business',
    externalAccountId: row.external_account_id,
    displayName: row.display_name,
    scopes: readJson<string[]>(row.scopes, []),
    connectedAt: row.connected_at,
    secrets: accessToken
      ? {
          accessToken,
          refreshToken: decryptSecret(row.refresh_token_enc),
          expiresAt: row.token_expires_at,
        }
      : undefined,
  }
}

export async function upsertConnection(
  tx: Tx,
  input: {
    tenantId: string
    provider: AdsProviderId | 'google_business'
    externalAccountId: string | null
    displayName: string | null
    accessToken: string
    refreshToken: string | null
    expiresAt: Date | null
    scopes: string[]
    connectedBy: string
  },
): Promise<void> {
  await tx`
    INSERT INTO ads_connections (
      tenant_id, provider, external_account_id, display_name,
      access_token_enc, refresh_token_enc, token_expires_at, scopes, connected_by
    ) VALUES (
      ${input.tenantId}, ${input.provider}, ${input.externalAccountId}, ${input.displayName},
      ${encryptSecret(input.accessToken)},
      ${input.refreshToken ? encryptSecret(input.refreshToken) : null},
      ${input.expiresAt}, ${jsonParam(tx, input.scopes)}, ${input.connectedBy}
    )
    ON CONFLICT (tenant_id, provider) DO UPDATE SET
      external_account_id = EXCLUDED.external_account_id,
      display_name        = EXCLUDED.display_name,
      access_token_enc    = EXCLUDED.access_token_enc,
      refresh_token_enc   = EXCLUDED.refresh_token_enc,
      token_expires_at    = EXCLUDED.token_expires_at,
      scopes              = EXCLUDED.scopes,
      connected_by        = EXCLUDED.connected_by
  `
}

export async function deleteConnection(
  tx: Tx,
  tenantId: string,
  provider: AdsProviderId | 'google_business',
): Promise<boolean> {
  const rows = await tx`
    DELETE FROM ads_connections WHERE tenant_id = ${tenantId} AND provider = ${provider} RETURNING provider
  `
  return rows.length > 0
}

// endregion

// region Campaigns

interface CampaignRow {
  id: string
  tenant_id: string
  provider: string
  account_id: string | null
  external_id: string | null
  name: string
  objective: string
  channel: string
  status: string
  budget: unknown
  bidding: unknown
  geo_targets: unknown
  languages: unknown
  ad_groups: unknown
  extensions: unknown
  conversion_events: unknown
  assumptions: unknown
  warnings: unknown
  start_date: Date | string | null
  end_date: Date | string | null
  landing_page_url: string
  source: string
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

const CAMPAIGN_COLUMNS = [
  'id',
  'tenant_id',
  'provider',
  'account_id',
  'external_id',
  'name',
  'objective',
  'channel',
  'status',
  'budget',
  'bidding',
  'geo_targets',
  'languages',
  'ad_groups',
  'extensions',
  'conversion_events',
  'assumptions',
  'warnings',
  'start_date',
  'end_date',
  'landing_page_url',
  'source',
  'published_at',
  'created_at',
  'updated_at',
]

/** `date` columns come back as a `Date` or a string depending on the driver path. */
function toDateString(value: Date | string | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10)
}

function toCampaign(row: CampaignRow): Campaign {
  return campaignSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    provider: row.provider,
    accountId: row.account_id,
    externalId: row.external_id,
    name: row.name,
    objective: row.objective,
    channel: row.channel,
    status: row.status,
    budget: readJson<Record<string, unknown>>(row.budget, {}),
    bidding: readJson<Record<string, unknown>>(row.bidding, {}),
    geoTargets: readJson<unknown[]>(row.geo_targets, []),
    languages: readJson<string[]>(row.languages, []),
    adGroups: readJson<unknown[]>(row.ad_groups, []),
    extensions: readJson<unknown[]>(row.extensions, []),
    conversionEvents: readJson<string[]>(row.conversion_events, []),
    assumptions: readJson<string[]>(row.assumptions, []),
    warnings: readJson<string[]>(row.warnings, []),
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    landingPageUrl: row.landing_page_url,
    source: row.source,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listCampaigns(
  tx: Tx,
  tenantId: string,
  filter: { provider?: AdsProviderId; status?: Campaign['status'] } = {},
): Promise<Campaign[]> {
  const rows = await tx<CampaignRow[]>`
    SELECT ${tx(CAMPAIGN_COLUMNS)} FROM ad_campaigns
    WHERE tenant_id = ${tenantId}
      AND (${filter.provider ?? null}::text IS NULL OR provider = ${filter.provider ?? null})
      AND (${filter.status ?? null}::text IS NULL OR status = ${filter.status ?? null})
    ORDER BY created_at DESC
  `
  return rows.map(toCampaign)
}

/**
 * Scoped by tenant *and* id. A campaign belonging to another workspace is
 * reported as "not found" by the caller — the API does not confirm that another
 * tenant's campaign exists.
 */
export async function findCampaignById(tx: Tx, tenantId: string, campaignId: string): Promise<Campaign | null> {
  const [row] = await tx<CampaignRow[]>`
    SELECT ${tx(CAMPAIGN_COLUMNS)} FROM ad_campaigns
    WHERE tenant_id = ${tenantId} AND id = ${campaignId}
    LIMIT 1
  `
  return row ? toCampaign(row) : null
}

/** The sum of daily budgets that are actually able to spend right now. */
export async function sumActiveDailyBudgetMinor(
  tx: Tx,
  tenantId: string,
  excludeCampaignId?: string,
): Promise<number> {
  const [row] = await tx<{ total: string }[]>`
    SELECT COALESCE(SUM((budget->>'amountMinor')::bigint), 0)::text AS total
    FROM ad_campaigns
    WHERE tenant_id = ${tenantId}
      AND status = 'active'
      AND budget->>'period' = 'daily'
      AND (${excludeCampaignId ?? null}::uuid IS NULL OR id <> ${excludeCampaignId ?? null}::uuid)
  `
  return Number(row?.total ?? 0)
}

/**
 * Insert a campaign. Always as a draft, with no external id — the column
 * defaults and the table's CHECK constraints make any other outcome
 * unrepresentable, whoever is calling.
 */
export async function insertCampaignDraft(
  tx: Tx,
  input: { tenantId: string; draft: CampaignDraft; createdBy: string },
): Promise<Campaign> {
  const { draft } = input

  const [row] = await tx<CampaignRow[]>`
    INSERT INTO ad_campaigns (
      tenant_id, provider, account_id, name, objective, channel, status,
      budget, bidding, geo_targets, languages, ad_groups, extensions, conversion_events,
      assumptions, warnings, start_date, end_date, landing_page_url, source, created_by
    ) VALUES (
      ${input.tenantId}, ${draft.provider}, ${draft.accountId}, ${draft.name},
      ${draft.objective}, ${draft.channel}, 'draft',
      ${jsonParam(tx, draft.budget)}, ${jsonParam(tx, draft.bidding)},
      ${jsonParam(tx, draft.geoTargets)}, ${jsonParam(tx, draft.languages)},
      ${jsonParam(tx, draft.adGroups)}, ${jsonParam(tx, draft.extensions)},
      ${jsonParam(tx, draft.conversionEvents)}, ${jsonParam(tx, draft.assumptions)},
      ${jsonParam(tx, draft.warnings)},
      ${draft.startDate}, ${draft.endDate}, ${draft.landingPageUrl}, ${draft.source}, ${input.createdBy}
    )
    RETURNING ${tx(CAMPAIGN_COLUMNS)}
  `
  return toCampaign(row!)
}

export async function updateCampaign(
  tx: Tx,
  tenantId: string,
  campaignId: string,
  patch: Omit<UpdateCampaignInput, 'confirm'>,
): Promise<Campaign | null> {
  const [row] = await tx<CampaignRow[]>`
    UPDATE ad_campaigns SET
      name              = COALESCE(${patch.name ?? null}::text, name),
      objective         = COALESCE(${patch.objective ?? null}::text, objective),
      status            = COALESCE(${patch.status ?? null}::text, status),
      bidding           = COALESCE(${patch.bidding ? jsonParam(tx, patch.bidding) : null}::jsonb, bidding),
      geo_targets       = COALESCE(${patch.geoTargets ? jsonParam(tx, patch.geoTargets) : null}::jsonb, geo_targets),
      languages         = COALESCE(${patch.languages ? jsonParam(tx, patch.languages) : null}::jsonb, languages),
      ad_groups         = COALESCE(${patch.adGroups ? jsonParam(tx, patch.adGroups) : null}::jsonb, ad_groups),
      extensions        = COALESCE(${patch.extensions ? jsonParam(tx, patch.extensions) : null}::jsonb, extensions),
      conversion_events = COALESCE(
        ${patch.conversionEvents ? jsonParam(tx, patch.conversionEvents) : null}::jsonb, conversion_events),
      landing_page_url  = COALESCE(${patch.landingPageUrl ?? null}::text, landing_page_url),
      start_date        = CASE WHEN ${patch.startDate !== undefined}::boolean
                            THEN ${patch.startDate ?? null}::date ELSE start_date END,
      end_date          = CASE WHEN ${patch.endDate !== undefined}::boolean
                            THEN ${patch.endDate ?? null}::date ELSE end_date END
    WHERE tenant_id = ${tenantId} AND id = ${campaignId}
    RETURNING ${tx(CAMPAIGN_COLUMNS)}
  `
  return row ? toCampaign(row) : null
}

/** Budget is its own write because it is the one field classed high risk. */
export async function updateCampaignBudget(
  tx: Tx,
  tenantId: string,
  campaignId: string,
  budget: Campaign['budget'],
): Promise<Campaign | null> {
  const [row] = await tx<CampaignRow[]>`
    UPDATE ad_campaigns SET budget = ${jsonParam(tx, budget)}
    WHERE tenant_id = ${tenantId} AND id = ${campaignId}
    RETURNING ${tx(CAMPAIGN_COLUMNS)}
  `
  return row ? toCampaign(row) : null
}

/**
 * Draft → published. Sets the external id, the timestamp and who did it in one
 * statement, and only from `draft`: a second concurrent publish matches zero
 * rows instead of publishing twice.
 */
export async function markCampaignPublished(
  tx: Tx,
  tenantId: string,
  campaignId: string,
  input: { externalId: string; accountId: string | null; status: Campaign['status']; publishedBy: string },
): Promise<Campaign | null> {
  const [row] = await tx<CampaignRow[]>`
    UPDATE ad_campaigns SET
      external_id  = ${input.externalId},
      account_id   = COALESCE(${input.accountId}::text, account_id),
      status       = ${input.status},
      published_at = now(),
      published_by = ${input.publishedBy}
    WHERE tenant_id = ${tenantId} AND id = ${campaignId} AND status = 'draft'
    RETURNING ${tx(CAMPAIGN_COLUMNS)}
  `
  return row ? toCampaign(row) : null
}

export async function deleteCampaign(tx: Tx, tenantId: string, campaignId: string): Promise<boolean> {
  const rows = await tx`
    DELETE FROM ad_campaigns WHERE tenant_id = ${tenantId} AND id = ${campaignId} RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Conversion mappings

interface ConversionMappingRow {
  id: string
  tenant_id: string
  provider: string
  tracking_event: string
  conversion_action_name: string
  external_id: string | null
  counting_mode: string
  value_mode: string
  fixed_value_minor: number | null
  currency: string
  attribution_window_days: number
  is_primary: boolean
  enabled: boolean
  created_at: Date
  updated_at: Date
}

const MAPPING_COLUMNS = [
  'id',
  'tenant_id',
  'provider',
  'tracking_event',
  'conversion_action_name',
  'external_id',
  'counting_mode',
  'value_mode',
  'fixed_value_minor',
  'currency',
  'attribution_window_days',
  'is_primary',
  'enabled',
  'created_at',
  'updated_at',
]

function toConversionMapping(row: ConversionMappingRow): ConversionMapping {
  return conversionMappingSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    provider: row.provider,
    trackingEvent: row.tracking_event,
    conversionActionName: row.conversion_action_name,
    externalId: row.external_id,
    countingMode: row.counting_mode,
    valueMode: row.value_mode,
    fixedValueMinor: row.fixed_value_minor,
    currency: row.currency,
    attributionWindowDays: row.attribution_window_days,
    primary: row.is_primary,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listConversionMappings(
  tx: Tx,
  tenantId: string,
  provider?: AdsProviderId,
): Promise<ConversionMapping[]> {
  const rows = await tx<ConversionMappingRow[]>`
    SELECT ${tx(MAPPING_COLUMNS)} FROM ads_conversion_mappings
    WHERE tenant_id = ${tenantId}
      AND (${provider ?? null}::text IS NULL OR provider = ${provider ?? null})
    ORDER BY provider ASC, tracking_event ASC
  `
  return rows.map(toConversionMapping)
}

export async function upsertConversionMapping(
  tx: Tx,
  tenantId: string,
  input: UpsertConversionMappingInput,
): Promise<ConversionMapping> {
  const [row] = await tx<ConversionMappingRow[]>`
    INSERT INTO ads_conversion_mappings (
      tenant_id, provider, tracking_event, conversion_action_name,
      counting_mode, value_mode, fixed_value_minor, currency,
      attribution_window_days, is_primary, enabled
    ) VALUES (
      ${tenantId}, ${input.provider}, ${input.trackingEvent}, ${input.conversionActionName},
      ${input.countingMode}, ${input.valueMode}, ${input.fixedValueMinor}, ${input.currency},
      ${input.attributionWindowDays}, ${input.primary}, ${input.enabled}
    )
    ON CONFLICT (tenant_id, provider, tracking_event) DO UPDATE SET
      conversion_action_name  = EXCLUDED.conversion_action_name,
      counting_mode           = EXCLUDED.counting_mode,
      value_mode              = EXCLUDED.value_mode,
      fixed_value_minor       = EXCLUDED.fixed_value_minor,
      currency                = EXCLUDED.currency,
      attribution_window_days = EXCLUDED.attribution_window_days,
      is_primary              = EXCLUDED.is_primary,
      enabled                 = EXCLUDED.enabled
    RETURNING ${tx(MAPPING_COLUMNS)}
  `
  return toConversionMapping(row!)
}

export async function deleteConversionMapping(tx: Tx, tenantId: string, mappingId: string): Promise<boolean> {
  const rows = await tx`
    DELETE FROM ads_conversion_mappings WHERE tenant_id = ${tenantId} AND id = ${mappingId} RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Guardrails

interface GuardrailRow {
  currency: string
  max_daily_budget_minor: number
  max_total_daily_budget_minor: number
  max_increase_percent: number
  autonomous_budget_changes: boolean
  updated_at: Date
}

function toGuardrails(row: GuardrailRow): AdsGuardrails {
  return adsGuardrailsSchema.parse({
    currency: row.currency,
    maxDailyBudgetMinor: row.max_daily_budget_minor,
    maxTotalDailyBudgetMinor: row.max_total_daily_budget_minor,
    maxIncreasePercent: row.max_increase_percent,
    autonomousBudgetChanges: row.autonomous_budget_changes,
    updatedAt: row.updated_at,
  })
}

const GUARDRAIL_COLUMNS = [
  'currency',
  'max_daily_budget_minor',
  'max_total_daily_budget_minor',
  'max_increase_percent',
  'autonomous_budget_changes',
  'updated_at',
]

/**
 * Guardrails always exist. A tenant that has never opened the settings screen
 * gets the conservative table defaults rather than "no limit" — the absence of
 * a configured ceiling must never read as permission to spend anything.
 */
export async function getGuardrails(tx: Tx, tenantId: string): Promise<AdsGuardrails> {
  const [row] = await tx<GuardrailRow[]>`
    INSERT INTO ads_guardrails (tenant_id) VALUES (${tenantId})
    ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
    RETURNING ${tx(GUARDRAIL_COLUMNS)}
  `
  return toGuardrails(row!)
}

export async function updateGuardrails(
  tx: Tx,
  tenantId: string,
  patch: Partial<Omit<AdsGuardrails, 'updatedAt'>>,
): Promise<AdsGuardrails> {
  await getGuardrails(tx, tenantId)

  const [row] = await tx<GuardrailRow[]>`
    UPDATE ads_guardrails SET
      currency                     = COALESCE(${patch.currency ?? null}::text, currency),
      max_daily_budget_minor       = COALESCE(${patch.maxDailyBudgetMinor ?? null}::integer, max_daily_budget_minor),
      max_total_daily_budget_minor = COALESCE(
        ${patch.maxTotalDailyBudgetMinor ?? null}::integer, max_total_daily_budget_minor),
      max_increase_percent         = COALESCE(${patch.maxIncreasePercent ?? null}::integer, max_increase_percent),
      autonomous_budget_changes    = COALESCE(
        ${patch.autonomousBudgetChanges ?? null}::boolean, autonomous_budget_changes)
    WHERE tenant_id = ${tenantId}
    RETURNING ${tx(GUARDRAIL_COLUMNS)}
  `
  return toGuardrails(row!)
}

// endregion

// region Audit

/**
 * Ads-specific audit entries.
 *
 * `audit_events.name` is a free-text column, so ads records its own verbs
 * (`ads.budget_changed`, `ads.account_connected`) into the one shared,
 * append-only log rather than either widening the cross-module
 * `DomainEventName` enum — which every subscriber and installed app depends on
 * — or, worse, keeping a second log nobody reads.
 *
 * Domain events that *are* part of the shared vocabulary (`campaign.created`,
 * `campaign.published`) still go through `recordAuditEvent` and the event bus.
 */
export type AdsAuditName =
  | 'ads.account_connected'
  | 'ads.account_disconnected'
  | 'ads.campaign_updated'
  | 'ads.budget_changed'
  | 'ads.budget_change_refused'
  | 'ads.conversion_mapping_changed'
  | 'ads.guardrails_changed'

export async function recordAdsAudit(
  tx: Tx,
  input: {
    tenantId: string
    name: AdsAuditName
    actor: unknown
    resourceId?: string | null
    payload?: Record<string, unknown>
  },
): Promise<void> {
  await tx`
    INSERT INTO audit_events (tenant_id, name, actor, resource_type, resource_id, payload)
    VALUES (
      ${input.tenantId}, ${input.name}, ${jsonParam(tx, input.actor)},
      'ad_campaign', ${input.resourceId ?? null}, ${jsonParam(tx, input.payload ?? {})}
    )
  `
}

// endregion
