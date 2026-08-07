import {
  appExtensionSchema,
  appInstallationSchema,
  appApiKeySchema,
  appManifestSchema,
  appRequestLogEntrySchema,
  appReviewFlagSchema,
  appSchema,
  appVersionSchema,
  marketplaceAppSchema,
  permissionSchema,
  type App,
  type AppApiKey,
  type AppExtension,
  type AppGatewayDecision,
  type AppInstallation,
  type AppManifest,
  type AppRequestLogEntry,
  type AppReviewFlag,
  type AppStatus,
  type AppVersion,
  type MarketplaceApp,
  type Permission,
} from '@platform/schemas'
import { z } from 'zod'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

/**
 * App platform persistence. SQL lives here and nowhere else (ADR-0005).
 *
 * Note what these functions never accept: an app. Every function takes a `Tx`
 * that the *platform* opened and bound to a tenant. An installed app reaches
 * this file only through the gateway, which resolves its scopes first.
 */

// region Apps

interface AppRow {
  id: string
  tenant_id: string
  slug: string
  name: string
  tagline: string
  description: string
  category: string
  app_type: string
  status: string
  listed: boolean
  version: string
  icon_url: string | null
  homepage_url: string | null
  support_email: string | null
  requested_permissions: unknown
  events: unknown
  extensions: unknown
  review_flags: unknown
  review_notes: string
  submitted_at: Date | null
  reviewed_at: Date | null
  created_at: Date
  updated_at: Date
}

const APP_COLUMNS = [
  'id',
  'tenant_id',
  'slug',
  'name',
  'tagline',
  'description',
  'category',
  'app_type',
  'status',
  'listed',
  'version',
  'icon_url',
  'homepage_url',
  'support_email',
  'requested_permissions',
  'events',
  'extensions',
  'review_flags',
  'review_notes',
  'submitted_at',
  'reviewed_at',
  'created_at',
  'updated_at',
]

const stringArray = z.array(z.string()).catch([])
const flagArray = z.array(appReviewFlagSchema).catch([])
const extensionArray = z.array(appExtensionSchema).catch([])

function toApp(row: AppRow): App {
  return appSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    type: row.app_type,
    status: row.status,
    listed: row.listed,
    version: row.version,
    iconUrl: row.icon_url,
    homepageUrl: row.homepage_url,
    supportEmail: row.support_email,
    requestedPermissions: stringArray.parse(readJson<unknown>(row.requested_permissions, [])),
    events: stringArray.parse(readJson<unknown>(row.events, [])),
    extensions: extensionArray.parse(readJson<unknown>(row.extensions, [])),
    reviewFlags: flagArray.parse(readJson<unknown>(row.review_flags, [])),
    reviewNotes: row.review_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function listApps(tx: Tx, tenantId: string): Promise<App[]> {
  const rows = await tx<AppRow[]>`
    SELECT ${tx(APP_COLUMNS)} FROM apps WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
  `
  return rows.map(toApp)
}

export async function findAppById(tx: Tx, tenantId: string, appId: string): Promise<App | null> {
  const [row] = await tx<AppRow[]>`
    SELECT ${tx(APP_COLUMNS)} FROM apps WHERE tenant_id = ${tenantId} AND id = ${appId} LIMIT 1
  `
  return row ? toApp(row) : null
}

export async function findAppBySlug(tx: Tx, tenantId: string, slug: string): Promise<App | null> {
  const [row] = await tx<AppRow[]>`
    SELECT ${tx(APP_COLUMNS)} FROM apps WHERE tenant_id = ${tenantId} AND slug = ${slug} LIMIT 1
  `
  return row ? toApp(row) : null
}

export async function insertApp(
  tx: Tx,
  input: {
    tenantId: string
    slug: string
    name: string
    tagline: string
    description: string
    category: string
    type: string
    iconUrl?: string
    homepageUrl?: string
    supportEmail?: string
  },
): Promise<App> {
  const [row] = await tx<AppRow[]>`
    INSERT INTO apps (tenant_id, slug, name, tagline, description, category, app_type,
                      icon_url, homepage_url, support_email)
    VALUES (
      ${input.tenantId}, ${input.slug}, ${input.name}, ${input.tagline}, ${input.description},
      ${input.category}, ${input.type},
      ${input.iconUrl ?? null}, ${input.homepageUrl ?? null}, ${input.supportEmail ?? null}
    )
    RETURNING ${tx(APP_COLUMNS)}
  `
  return toApp(row!)
}

export async function updateApp(
  tx: Tx,
  tenantId: string,
  appId: string,
  patch: {
    name?: string
    tagline?: string
    description?: string
    category?: string
    iconUrl?: string
    homepageUrl?: string
    supportEmail?: string
    listed?: boolean
  },
): Promise<App | null> {
  const [row] = await tx<AppRow[]>`
    UPDATE apps SET
      name          = COALESCE(${patch.name ?? null}::text, name),
      tagline       = COALESCE(${patch.tagline ?? null}::text, tagline),
      description   = COALESCE(${patch.description ?? null}::text, description),
      category      = COALESCE(${patch.category ?? null}::text, category),
      icon_url      = COALESCE(${patch.iconUrl ?? null}::text, icon_url),
      homepage_url  = COALESCE(${patch.homepageUrl ?? null}::text, homepage_url),
      support_email = COALESCE(${patch.supportEmail ?? null}::text, support_email),
      listed        = COALESCE(${patch.listed ?? null}::boolean, listed)
    WHERE tenant_id = ${tenantId} AND id = ${appId}
    RETURNING ${tx(APP_COLUMNS)}
  `
  return row ? toApp(row) : null
}

/** Copies the reviewed manifest onto the app record and moves its status. */
export async function applyManifestToApp(
  tx: Tx,
  tenantId: string,
  appId: string,
  input: { manifest: AppManifest; status: AppStatus; flags: AppReviewFlag[]; notes: string; submitted: boolean },
): Promise<App | null> {
  const [row] = await tx<AppRow[]>`
    UPDATE apps SET
      name                  = ${input.manifest.name},
      tagline               = ${input.manifest.tagline},
      description           = ${input.manifest.description},
      category              = ${input.manifest.category},
      app_type              = ${input.manifest.type},
      version               = ${input.manifest.version},
      requested_permissions = ${jsonParam(tx, input.manifest.permissions)},
      events                = ${jsonParam(tx, input.manifest.events)},
      extensions            = ${jsonParam(tx, input.manifest.extensions)},
      manifest              = ${jsonParam(tx, input.manifest)},
      review_flags          = ${jsonParam(tx, input.flags)},
      review_notes          = ${input.notes},
      status                = ${input.status},
      submitted_at          = CASE WHEN ${input.submitted} THEN now() ELSE submitted_at END
    WHERE tenant_id = ${tenantId} AND id = ${appId}
    RETURNING ${tx(APP_COLUMNS)}
  `
  return row ? toApp(row) : null
}

export async function setAppStatus(
  tx: Tx,
  tenantId: string,
  appId: string,
  status: AppStatus,
  notes: string,
): Promise<App | null> {
  const [row] = await tx<AppRow[]>`
    UPDATE apps SET
      status       = ${status},
      review_notes = ${notes},
      reviewed_at  = now()
    WHERE tenant_id = ${tenantId} AND id = ${appId}
    RETURNING ${tx(APP_COLUMNS)}
  `
  return row ? toApp(row) : null
}

// endregion

// region Versions

interface VersionRow {
  id: string
  app_id: string
  version: string
  status: string
  manifest: unknown
  review_flags: unknown
  review_notes: string
  submitted_at: Date | null
  reviewed_at: Date | null
  created_at: Date
}

function toVersion(row: VersionRow): AppVersion {
  return appVersionSchema.parse({
    id: row.id,
    appId: row.app_id,
    version: row.version,
    status: row.status,
    manifest: appManifestSchema.parse(readJson<Record<string, unknown>>(row.manifest, {})),
    reviewFlags: flagArray.parse(readJson<unknown>(row.review_flags, [])),
    reviewNotes: row.review_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  })
}

const VERSION_COLUMNS = [
  'id',
  'app_id',
  'version',
  'status',
  'manifest',
  'review_flags',
  'review_notes',
  'submitted_at',
  'reviewed_at',
  'created_at',
]

export async function insertAppVersion(
  tx: Tx,
  input: {
    tenantId: string
    appId: string
    manifest: AppManifest
    status: AppStatus
    flags: AppReviewFlag[]
    notes: string
  },
): Promise<AppVersion> {
  const [row] = await tx<VersionRow[]>`
    INSERT INTO app_versions (tenant_id, app_id, version, status, manifest, review_flags, review_notes, submitted_at)
    VALUES (
      ${input.tenantId}, ${input.appId}, ${input.manifest.version}, ${input.status},
      ${jsonParam(tx, input.manifest)}, ${jsonParam(tx, input.flags)}, ${input.notes},
      ${input.status === 'draft' ? null : new Date()}
    )
    ON CONFLICT (app_id, version) DO UPDATE SET
      status       = EXCLUDED.status,
      manifest     = EXCLUDED.manifest,
      review_flags = EXCLUDED.review_flags,
      review_notes = EXCLUDED.review_notes,
      submitted_at = COALESCE(app_versions.submitted_at, EXCLUDED.submitted_at)
    RETURNING ${tx(VERSION_COLUMNS)}
  `
  return toVersion(row!)
}

export async function listAppVersions(tx: Tx, tenantId: string, appId: string): Promise<AppVersion[]> {
  const rows = await tx<VersionRow[]>`
    SELECT ${tx(VERSION_COLUMNS)} FROM app_versions
    WHERE tenant_id = ${tenantId} AND app_id = ${appId}
    ORDER BY created_at DESC
  `
  return rows.map(toVersion)
}

export async function reviewLatestVersion(
  tx: Tx,
  tenantId: string,
  appId: string,
  status: AppStatus,
  notes: string,
): Promise<void> {
  await tx`
    UPDATE app_versions SET status = ${status}, review_notes = ${notes}, reviewed_at = now()
    WHERE tenant_id = ${tenantId}
      AND id = (
        SELECT id FROM app_versions
        WHERE tenant_id = ${tenantId} AND app_id = ${appId}
        ORDER BY created_at DESC LIMIT 1
      )
  `
}

// endregion

// region Marketplace (cross-tenant, through the SECURITY DEFINER function)

interface MarketplaceRow {
  app_id: string
  slug: string
  name: string
  tagline: string
  description: string
  category: string
  app_type: string
  version: string
  icon_url: string | null
  homepage_url: string | null
  support_email: string | null
  publisher: string
  requested_permissions: unknown
  events: unknown
  extensions: unknown
  install_count: string
  approved_at: Date | null
}

function toMarketplaceApp(row: MarketplaceRow): MarketplaceApp {
  return marketplaceAppSchema.parse({
    appId: row.app_id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    type: row.app_type,
    version: row.version,
    iconUrl: row.icon_url,
    homepageUrl: row.homepage_url,
    supportEmail: row.support_email,
    publisher: row.publisher,
    requestedPermissions: stringArray.parse(readJson<unknown>(row.requested_permissions, [])),
    events: stringArray.parse(readJson<unknown>(row.events, [])),
    extensions: extensionArray.parse(readJson<unknown>(row.extensions, [])),
    installCount: Number(row.install_count),
    approvedAt: row.approved_at,
  })
}

export async function listMarketplaceApps(tx: Tx): Promise<MarketplaceApp[]> {
  const rows = await tx<MarketplaceRow[]>`SELECT * FROM marketplace_apps()`
  return rows.map(toMarketplaceApp)
}

export async function findMarketplaceApp(tx: Tx, slug: string): Promise<MarketplaceApp | null> {
  const [row] = await tx<MarketplaceRow[]>`SELECT * FROM marketplace_apps() WHERE slug = ${slug}`
  return row ? toMarketplaceApp(row) : null
}

// endregion

// region Installations

interface InstallationRow {
  id: string
  tenant_id: string
  app_id: string
  app_slug: string
  app_name: string
  app_category: string
  granted_permissions: unknown
  settings: unknown
  status: string
  request_quota_per_hour: number
  installed_by: string
  installed_at: Date
  uninstalled_at: Date | null
}

const INSTALLATION_COLUMNS = [
  'id',
  'tenant_id',
  'app_id',
  'app_slug',
  'app_name',
  'app_category',
  'granted_permissions',
  'settings',
  'status',
  'request_quota_per_hour',
  'installed_by',
  'installed_at',
  'uninstalled_at',
]

function toInstallation(row: InstallationRow): AppInstallation {
  return appInstallationSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    appId: row.app_id,
    appSlug: row.app_slug,
    appName: row.app_name,
    category: row.app_category,
    // Anything no longer in the permission vocabulary is dropped rather than
    // carried: a scope that stopped existing must not stay grantable.
    grantedPermissions: readJson<string[]>(row.granted_permissions, []).filter(isKnownPermission),
    settings: readJson<Record<string, unknown>>(row.settings, {}),
    status: row.status,
    requestQuotaPerHour: row.request_quota_per_hour,
    installedBy: row.installed_by,
    installedAt: row.installed_at,
    uninstalledAt: row.uninstalled_at,
  })
}

function isKnownPermission(value: string): value is Permission {
  return permissionSchema.safeParse(value).success
}

export async function listInstallations(tx: Tx, tenantId: string): Promise<AppInstallation[]> {
  const rows = await tx<InstallationRow[]>`
    SELECT ${tx(INSTALLATION_COLUMNS)} FROM app_installations
    WHERE tenant_id = ${tenantId} AND uninstalled_at IS NULL
    ORDER BY installed_at DESC
  `
  return rows.map(toInstallation)
}

export async function findInstallationById(
  tx: Tx,
  tenantId: string,
  installationId: string,
): Promise<AppInstallation | null> {
  const [row] = await tx<InstallationRow[]>`
    SELECT ${tx(INSTALLATION_COLUMNS)} FROM app_installations
    WHERE tenant_id = ${tenantId} AND id = ${installationId}
    LIMIT 1
  `
  return row ? toInstallation(row) : null
}

/**
 * The gateway's authority lookup: is this app installed, right now, in this
 * workspace? A missing row is the deny-by-default case.
 */
export async function findActiveInstallation(
  tx: Tx,
  tenantId: string,
  appId: string,
): Promise<AppInstallation | null> {
  const [row] = await tx<InstallationRow[]>`
    SELECT ${tx(INSTALLATION_COLUMNS)} FROM app_installations
    WHERE tenant_id = ${tenantId} AND app_id = ${appId} AND uninstalled_at IS NULL AND status = 'active'
    LIMIT 1
  `
  return row ? toInstallation(row) : null
}

export async function insertInstallation(
  tx: Tx,
  input: {
    tenantId: string
    appId: string
    appSlug: string
    appName: string
    category: string
    grantedPermissions: Permission[]
    settings: Record<string, unknown>
    quotaPerHour: number
    installedBy: string
  },
): Promise<AppInstallation> {
  const [row] = await tx<InstallationRow[]>`
    INSERT INTO app_installations
      (tenant_id, app_id, app_slug, app_name, app_category, granted_permissions, settings,
       request_quota_per_hour, installed_by)
    VALUES (
      ${input.tenantId}, ${input.appId}, ${input.appSlug}, ${input.appName}, ${input.category},
      ${jsonParam(tx, input.grantedPermissions)}, ${jsonParam(tx, input.settings)},
      ${input.quotaPerHour}, ${input.installedBy}
    )
    RETURNING ${tx(INSTALLATION_COLUMNS)}
  `
  return toInstallation(row!)
}

/**
 * The only column an installed app may change about itself. Scopes and quota
 * are deliberately absent from this statement.
 */
export async function updateInstallationSettings(
  tx: Tx,
  tenantId: string,
  installationId: string,
  settings: Record<string, unknown>,
): Promise<AppInstallation | null> {
  const [row] = await tx<InstallationRow[]>`
    UPDATE app_installations SET settings = ${jsonParam(tx, settings)}
    WHERE tenant_id = ${tenantId} AND id = ${installationId} AND uninstalled_at IS NULL
    RETURNING ${tx(INSTALLATION_COLUMNS)}
  `
  return row ? toInstallation(row) : null
}

/** Soft delete: the grant history is evidence and is never thrown away. */
export async function uninstallApp(
  tx: Tx,
  tenantId: string,
  installationId: string,
): Promise<AppInstallation | null> {
  const [row] = await tx<InstallationRow[]>`
    UPDATE app_installations SET uninstalled_at = now(), status = 'suspended'
    WHERE tenant_id = ${tenantId} AND id = ${installationId} AND uninstalled_at IS NULL
    RETURNING ${tx(INSTALLATION_COLUMNS)}
  `
  return row ? toInstallation(row) : null
}

// endregion

// region API keys

interface KeyRow {
  id: string
  app_id: string
  name: string
  key_prefix: string
  last_four: string
  scopes: unknown
  created_at: Date
  last_used_at: Date | null
  expires_at: Date | null
  revoked_at: Date | null
}

const KEY_COLUMNS = [
  'id',
  'app_id',
  'name',
  'key_prefix',
  'last_four',
  'scopes',
  'created_at',
  'last_used_at',
  'expires_at',
  'revoked_at',
]

/** Note the column list: `key_hash` and `signing_secret` are never selected. */
function toKey(row: KeyRow): AppApiKey {
  return appApiKeySchema.parse({
    id: row.id,
    appId: row.app_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastFour: row.last_four,
    scopes: readJson<string[]>(row.scopes, []).filter(isKnownPermission),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  })
}

export async function listApiKeys(tx: Tx, tenantId: string, appId: string): Promise<AppApiKey[]> {
  const rows = await tx<KeyRow[]>`
    SELECT ${tx(KEY_COLUMNS)} FROM app_api_keys
    WHERE tenant_id = ${tenantId} AND app_id = ${appId}
    ORDER BY created_at DESC
  `
  return rows.map(toKey)
}

export async function insertApiKey(
  tx: Tx,
  input: {
    tenantId: string
    appId: string
    name: string
    keyHash: string
    keyPrefix: string
    lastFour: string
    signingSecret: string
    scopes: Permission[]
    expiresAt: Date | null
  },
): Promise<AppApiKey> {
  const [row] = await tx<KeyRow[]>`
    INSERT INTO app_api_keys
      (tenant_id, app_id, name, key_hash, key_prefix, last_four, signing_secret, scopes, expires_at)
    VALUES (
      ${input.tenantId}, ${input.appId}, ${input.name}, ${input.keyHash}, ${input.keyPrefix},
      ${input.lastFour}, ${input.signingSecret}, ${jsonParam(tx, input.scopes)}, ${input.expiresAt}
    )
    RETURNING ${tx(KEY_COLUMNS)}
  `
  return toKey(row!)
}

export async function revokeApiKey(tx: Tx, tenantId: string, appId: string, keyId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE app_api_keys SET revoked_at = now()
    WHERE tenant_id = ${tenantId} AND app_id = ${appId} AND id = ${keyId} AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}

export interface ResolvedAppKey {
  keyId: string
  appId: string
  appSlug: string
  appStatus: string
  appType: string
  ownerTenantId: string
  scopes: Permission[]
  signingSecret: string
  expiresAt: Date | null
  revokedAt: Date | null
}

/**
 * Key → app, before any tenant is known.
 *
 * Runs outside tenant context by necessity — the caller has a credential and
 * nothing else — which is why it goes through the narrow SECURITY DEFINER
 * function rather than through a policy exception. Lookup is by hash, so
 * possession of the key is required to get a row at all.
 */
export async function resolveApiKey(tx: Tx, keyHash: string): Promise<ResolvedAppKey | null> {
  const [row] = await tx<
    {
      key_id: string
      app_id: string
      app_slug: string
      app_status: string
      app_type: string
      owner_tenant_id: string
      scopes: unknown
      signing_secret: string
      expires_at: Date | null
      revoked_at: Date | null
    }[]
  >`SELECT * FROM resolve_app_api_key(${keyHash})`

  if (!row) return null

  return {
    keyId: row.key_id,
    appId: row.app_id,
    appSlug: row.app_slug,
    appStatus: row.app_status,
    appType: row.app_type,
    ownerTenantId: row.owner_tenant_id,
    scopes: readJson<string[]>(row.scopes, []).filter(isKnownPermission),
    signingSecret: row.signing_secret,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }
}

export async function touchApiKey(tx: Tx, keyId: string): Promise<void> {
  await tx`SELECT touch_app_api_key(${keyId})`
}

// endregion

// region Gateway log, quota and usage

export async function recordGatewayCall(
  tx: Tx,
  input: {
    tenantId: string
    appId: string | null
    installationId: string | null
    apiKeyId: string | null
    method: string
    path: string
    requiredScope: string | null
    decision: AppGatewayDecision
    statusCode: number
    durationMs: number
    reason: string
  },
): Promise<void> {
  await tx`
    INSERT INTO app_request_log
      (tenant_id, app_id, installation_id, api_key_id, method, path, required_scope,
       decision, status_code, duration_ms, reason)
    VALUES (
      ${input.tenantId}, ${input.appId}, ${input.installationId}, ${input.apiKeyId},
      ${input.method}, ${input.path}, ${input.requiredScope},
      ${input.decision}, ${input.statusCode}, ${input.durationMs}, ${input.reason}
    )
  `
}

/** A call we cannot attribute to a tenant. Holds no customer data by design. */
export async function recordUnattributedDenial(
  tx: Tx,
  input: { keyPrefix: string; method: string; path: string; reason: string; remoteIp: string | null },
): Promise<void> {
  await tx`
    INSERT INTO app_gateway_denials (key_prefix, method, path, reason, remote_ip)
    VALUES (${input.keyPrefix}, ${input.method}, ${input.path}, ${input.reason}, ${input.remoteIp})
  `
}

interface LogRow {
  id: string
  app_id: string | null
  installation_id: string | null
  method: string
  path: string
  required_scope: string | null
  decision: string
  status_code: number
  duration_ms: number
  reason: string
  created_at: Date
}

export async function listGatewayLog(
  tx: Tx,
  tenantId: string,
  filter: { appId?: string; limit: number },
): Promise<AppRequestLogEntry[]> {
  const rows = await tx<LogRow[]>`
    SELECT id, app_id, installation_id, method, path, required_scope, decision,
           status_code, duration_ms, reason, created_at
    FROM app_request_log
    WHERE tenant_id = ${tenantId}
      ${filter.appId ? tx`AND app_id = ${filter.appId}` : tx``}
    ORDER BY created_at DESC
    LIMIT ${filter.limit}
  `
  return rows.map((row) =>
    appRequestLogEntrySchema.parse({
      id: row.id,
      appId: row.app_id,
      installationId: row.installation_id,
      method: row.method,
      path: row.path,
      requiredScope: row.required_scope,
      decision: row.decision,
      statusCode: row.status_code,
      durationMs: row.duration_ms,
      reason: row.reason,
      createdAt: row.created_at,
    }),
  )
}

/**
 * Increment and read the current window in one statement (§72).
 *
 * Returning the post-increment count means the quota check cannot race: two
 * concurrent calls get two different numbers, and the one that crosses the
 * limit is the one that is refused.
 */
export async function bumpUsage(
  tx: Tx,
  input: { tenantId: string; appId: string; windowSeconds: number; denied: boolean },
): Promise<number> {
  const [row] = await tx<{ request_count: number }[]>`
    INSERT INTO app_usage_counters (tenant_id, app_id, window_start, request_count, denied_count)
    VALUES (
      ${input.tenantId},
      ${input.appId},
      to_timestamp(floor(extract(epoch FROM now()) / ${input.windowSeconds}) * ${input.windowSeconds}),
      1,
      ${input.denied ? 1 : 0}
    )
    ON CONFLICT (tenant_id, app_id, window_start) DO UPDATE SET
      request_count = app_usage_counters.request_count + 1,
      denied_count  = app_usage_counters.denied_count + ${input.denied ? 1 : 0}
    RETURNING request_count
  `
  return row!.request_count
}

export async function listUsageWindows(
  tx: Tx,
  tenantId: string,
  appId: string,
  limit: number,
): Promise<{ windowStart: Date; requests: number; denied: number }[]> {
  const rows = await tx<{ window_start: Date; request_count: number; denied_count: number }[]>`
    SELECT window_start, request_count, denied_count
    FROM app_usage_counters
    WHERE tenant_id = ${tenantId} AND app_id = ${appId}
    ORDER BY window_start DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    windowStart: row.window_start,
    requests: row.request_count,
    denied: row.denied_count,
  }))
}

/** Aggregate across every workspace the app runs in — counts only. */
export async function appUsageTotals(
  tx: Tx,
  appId: string,
  ownerTenantId: string,
): Promise<{ decision: string; requests: number; lastAt: Date | null }[]> {
  const rows = await tx<{ decision: string; requests: string; last_at: Date | null }[]>`
    SELECT * FROM app_usage_totals(${appId}, ${ownerTenantId})
  `
  return rows.map((row) => ({ decision: row.decision, requests: Number(row.requests), lastAt: row.last_at }))
}

export async function appInstallCount(tx: Tx, appId: string, ownerTenantId: string): Promise<number> {
  const [row] = await tx<{ app_install_count: string }[]>`
    SELECT app_install_count(${appId}, ${ownerTenantId})
  `
  return Number(row?.app_install_count ?? 0)
}

export type { AppExtension }

// endregion
