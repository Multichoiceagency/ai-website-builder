import {
  agencyGrantSchema,
  auditExportRowSchema,
  oidcConfigSchema,
  samlConfigSchema,
  scimTokenSchema,
  scimUserSchema,
  ssoConfigurationSchema,
  whiteLabelSettingsSchema,
  type AgencyGrant,
  type AuditExportRow,
  type Plan,
  type Role,
  type ScimToken,
  type ScimUser,
  type SsoConfiguration,
  type SsoProtocol,
  type WhiteLabelSettings,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'

// region Hierarchy (global tables — no RLS, guarded in the application)

export interface TenantHierarchy {
  tenantId: string
  name: string
  isAgency: boolean
  parentTenantId: string | null
  organizationId: string
  plan: Plan
}

export async function findTenantHierarchy(tx: Tx, tenantId: string): Promise<TenantHierarchy | null> {
  const [row] = await tx<
    {
      id: string
      name: string
      is_agency: boolean
      parent_tenant_id: string | null
      organization_id: string
      plan: Plan
    }[]
  >`
    SELECT id, name, is_agency, parent_tenant_id, organization_id, plan
    FROM tenants WHERE id = ${tenantId} LIMIT 1
  `
  if (!row) return null

  return {
    tenantId: row.id,
    name: row.name,
    isAgency: row.is_agency,
    parentTenantId: row.parent_tenant_id,
    organizationId: row.organization_id,
    plan: row.plan,
  }
}

export async function markTenantAsAgency(tx: Tx, tenantId: string): Promise<void> {
  await tx`UPDATE tenants SET is_agency = true WHERE id = ${tenantId}`
}

/** Attach a client to its agency. One level deep — enforced by the migration. */
export async function attachClientTenant(
  tx: Tx,
  input: { agencyTenantId: string; clientTenantId: string },
): Promise<void> {
  await tx`
    UPDATE tenants SET parent_tenant_id = ${input.agencyTenantId}
    WHERE id = ${input.clientTenantId} AND parent_tenant_id IS NULL
  `
}

export interface ClientOverviewRow {
  tenantId: string
  name: string
  slug: string
  plan: Plan
  createdAt: Date
  siteCount: number
  memberCount: number
}

/**
 * Counts for every client this agency owns. Goes through the SECURITY DEFINER
 * function from migration 0009 because the counts live inside tenants the
 * caller is not bound to — the function is scoped to `parent_tenant_id`, so it
 * cannot describe anything the agency does not already own.
 */
export async function listClientOverview(tx: Tx, agencyTenantId: string): Promise<ClientOverviewRow[]> {
  const rows = await tx<
    {
      tenant_id: string
      name: string
      slug: string
      plan: Plan
      created_at: Date
      site_count: string
      member_count: string
    }[]
  >`
    SELECT tenant_id, name, slug, plan, created_at, site_count, member_count
    FROM agency_client_overview(${agencyTenantId})
  `

  return rows.map((row) => ({
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    createdAt: row.created_at,
    siteCount: Number(row.site_count),
    memberCount: Number(row.member_count),
  }))
}

/**
 * Append-only audit row with an agency-specific name.
 *
 * `recordAuditEvent` only accepts a `DomainEventName`, and the `agency.*`
 * names are not in `packages/schemas/src/events.ts` yet — that file belongs to
 * another slice. Writing the row directly keeps the trail complete now; adding
 * the names upstream later lets these flow onto the event bus too.
 */
export async function recordAgencyAuditEvent(
  tx: Tx,
  input: {
    tenantId: string
    name: string
    actor: Record<string, unknown>
    resourceType: string
    resourceId: string
    payload: Record<string, unknown>
  },
): Promise<void> {
  await tx`
    INSERT INTO audit_events (tenant_id, name, actor, resource_type, resource_id, payload)
    VALUES (
      ${input.tenantId}, ${input.name}, ${jsonParam(tx, input.actor)},
      ${input.resourceType}, ${input.resourceId}, ${jsonParam(tx, input.payload)}
    )
  `
}

// endregion

// region Grants

interface GrantRow {
  id: string
  agency_tenant_id: string
  client_tenant_id: string
  user_id: string
  user_email: string | null
  role: Role
  reason: string
  granted_by: string | null
  expires_at: Date
  revoked_at: Date | null
  created_at: Date
}

function toGrant(row: GrantRow): AgencyGrant {
  const status = row.revoked_at ? 'revoked' : row.expires_at.getTime() <= Date.now() ? 'expired' : 'active'

  return agencyGrantSchema.parse({
    id: row.id,
    agencyTenantId: row.agency_tenant_id,
    clientTenantId: row.client_tenant_id,
    userId: row.user_id,
    userEmail: row.user_email,
    role: row.role,
    status,
    reason: row.reason,
    grantedBy: row.granted_by,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  })
}

export async function insertGrant(
  tx: Tx,
  input: {
    agencyTenantId: string
    clientTenantId: string
    userId: string
    role: Role
    reason: string
    grantedBy: string
    expiresAt: Date
  },
): Promise<AgencyGrant> {
  // Re-granting refreshes the live row rather than stacking a second one, so
  // "who can reach this client?" always has exactly one answer per person.
  const [row] = await tx<GrantRow[]>`
    INSERT INTO agency_memberships (
      agency_tenant_id, client_tenant_id, user_id, role, reason, granted_by, expires_at
    )
    VALUES (
      ${input.agencyTenantId}, ${input.clientTenantId}, ${input.userId},
      ${input.role}, ${input.reason}, ${input.grantedBy}, ${input.expiresAt}
    )
    ON CONFLICT (client_tenant_id, user_id) WHERE revoked_at IS NULL
    DO UPDATE SET
      role       = EXCLUDED.role,
      reason     = EXCLUDED.reason,
      granted_by = EXCLUDED.granted_by,
      expires_at = EXCLUDED.expires_at
    RETURNING
      id, agency_tenant_id, client_tenant_id, user_id, NULL::text AS user_email,
      role, reason, granted_by, expires_at, revoked_at, created_at
  `
  return toGrant(row!)
}

/**
 * The authorization root for agency access. Returns a row only when the grant
 * is live *and* the client is genuinely owned by this agency — ownership and
 * grant are checked together, so neither alone opens a door.
 */
export async function findActiveGrant(
  tx: Tx,
  input: { agencyTenantId: string; clientTenantId: string; userId: string },
): Promise<AgencyGrant | null> {
  const [row] = await tx<GrantRow[]>`
    SELECT
      g.id, g.agency_tenant_id, g.client_tenant_id, g.user_id, u.email AS user_email,
      g.role, g.reason, g.granted_by, g.expires_at, g.revoked_at, g.created_at
    FROM agency_memberships g
    JOIN tenants client ON client.id = g.client_tenant_id
    LEFT JOIN users u ON u.id = g.user_id
    WHERE g.agency_tenant_id = ${input.agencyTenantId}
      AND g.client_tenant_id = ${input.clientTenantId}
      AND g.user_id = ${input.userId}
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
      AND client.parent_tenant_id = ${input.agencyTenantId}
    LIMIT 1
  `
  return row ? toGrant(row) : null
}

export async function listGrantsForAgency(tx: Tx, agencyTenantId: string): Promise<AgencyGrant[]> {
  const rows = await tx<GrantRow[]>`
    SELECT
      g.id, g.agency_tenant_id, g.client_tenant_id, g.user_id, u.email AS user_email,
      g.role, g.reason, g.granted_by, g.expires_at, g.revoked_at, g.created_at
    FROM agency_memberships g
    LEFT JOIN users u ON u.id = g.user_id
    WHERE g.agency_tenant_id = ${agencyTenantId}
    ORDER BY g.created_at DESC
    LIMIT 500
  `
  return rows.map(toGrant)
}

/** Client tenants this user currently holds a live grant into. */
export async function listGrantedClientIds(tx: Tx, agencyTenantId: string, userId: string): Promise<string[]> {
  const rows = await tx<{ client_tenant_id: string }[]>`
    SELECT client_tenant_id FROM agency_memberships
    WHERE agency_tenant_id = ${agencyTenantId}
      AND user_id = ${userId}
      AND revoked_at IS NULL
      AND expires_at > now()
  `
  return rows.map((row) => row.client_tenant_id)
}

export async function revokeGrant(tx: Tx, agencyTenantId: string, grantId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE agency_memberships SET revoked_at = now()
    WHERE id = ${grantId} AND agency_tenant_id = ${agencyTenantId} AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}

// endregion

// region White label (tenant-scoped)

interface WhiteLabelRow {
  brand_name: string | null
  logo_url: string | null
  favicon_url: string | null
  color_primary: string
  color_accent: string
  color_surface: string
  color_surface_alt: string
  color_text: string
  font_heading: string
  font_body: string
  custom_domain: string | null
  hide_platform_branding: boolean
  support_email: string | null
  updated_at: Date | null
}

function toWhiteLabel(row: WhiteLabelRow | null): WhiteLabelSettings {
  return whiteLabelSettingsSchema.parse({
    brandName: row?.brand_name ?? null,
    logoUrl: row?.logo_url ?? null,
    faviconUrl: row?.favicon_url ?? null,
    colorPrimary: row?.color_primary ?? '#1d4ed8',
    colorAccent: row?.color_accent ?? '#0f766e',
    colorSurface: row?.color_surface ?? '#fafaf9',
    colorSurfaceAlt: row?.color_surface_alt ?? '#ffffff',
    colorText: row?.color_text ?? '#18181b',
    fontHeading: row?.font_heading ?? 'Figtree',
    fontBody: row?.font_body ?? 'Rubik',
    customDomain: row?.custom_domain ?? null,
    hidePlatformBranding: row?.hide_platform_branding ?? false,
    supportEmail: row?.support_email ?? null,
    updatedAt: row?.updated_at ?? null,
  })
}

const WHITE_LABEL_COLUMNS = [
  'brand_name',
  'logo_url',
  'favicon_url',
  'color_primary',
  'color_accent',
  'color_surface',
  'color_surface_alt',
  'color_text',
  'font_heading',
  'font_body',
  'custom_domain',
  'hide_platform_branding',
  'support_email',
  'updated_at',
]

export async function findWhiteLabelSettings(tx: Tx, tenantId: string): Promise<WhiteLabelSettings> {
  const [row] = await tx<WhiteLabelRow[]>`
    SELECT ${tx(WHITE_LABEL_COLUMNS)} FROM white_label_settings
    WHERE tenant_id = ${tenantId} LIMIT 1
  `
  return toWhiteLabel(row ?? null)
}

/**
 * Write the complete settings.
 *
 * The merge happens above this, in `mergeWhiteLabelSettings`, so "unset" and
 * "set to null" stay distinguishable in TypeScript instead of being encoded in
 * SQL — where `undefined` and `null` collapse into the same parameter.
 */
export async function saveWhiteLabelSettings(
  tx: Tx,
  tenantId: string,
  settings: WhiteLabelSettings,
): Promise<WhiteLabelSettings> {
  const [row] = await tx<WhiteLabelRow[]>`
    INSERT INTO white_label_settings (
      tenant_id, brand_name, logo_url, favicon_url, color_primary, color_accent,
      color_surface, color_surface_alt, color_text, font_heading, font_body,
      custom_domain, hide_platform_branding, support_email
    )
    VALUES (
      ${tenantId}, ${settings.brandName}, ${settings.logoUrl}, ${settings.faviconUrl},
      ${settings.colorPrimary}, ${settings.colorAccent},
      ${settings.colorSurface}, ${settings.colorSurfaceAlt}, ${settings.colorText},
      ${settings.fontHeading}, ${settings.fontBody},
      ${settings.customDomain},
      ${settings.hidePlatformBranding}, ${settings.supportEmail}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      brand_name             = EXCLUDED.brand_name,
      logo_url               = EXCLUDED.logo_url,
      favicon_url            = EXCLUDED.favicon_url,
      color_primary          = EXCLUDED.color_primary,
      color_accent           = EXCLUDED.color_accent,
      color_surface          = EXCLUDED.color_surface,
      color_surface_alt      = EXCLUDED.color_surface_alt,
      color_text             = EXCLUDED.color_text,
      font_heading           = EXCLUDED.font_heading,
      font_body              = EXCLUDED.font_body,
      custom_domain          = EXCLUDED.custom_domain,
      hide_platform_branding = EXCLUDED.hide_platform_branding,
      support_email          = EXCLUDED.support_email
    RETURNING ${tx(WHITE_LABEL_COLUMNS)}
  `
  return toWhiteLabel(row ?? null)
}

// endregion

// region SSO (tenant-scoped)

interface SsoRow {
  id: string
  protocol: SsoProtocol
  enabled: boolean
  default_role: Role
  config: unknown
  has_client_secret: boolean
  created_at: Date
  updated_at: Date
}

function toSsoConfiguration(row: SsoRow): SsoConfiguration {
  const config = readJson<Record<string, unknown>>(row.config, {})

  const saml = row.protocol === 'saml' ? samlConfigSchema.safeParse(config) : null
  const oidc = row.protocol === 'oidc' ? oidcConfigSchema.safeParse(config) : null

  // "Configured" describes the stored config, nothing more. No identity
  // provider is reachable from here, so this must never be read as "SSO works".
  const configured =
    row.protocol === 'saml'
      ? Boolean(saml?.success)
      : Boolean(oidc?.success) && row.has_client_secret

  return ssoConfigurationSchema.parse({
    id: row.id,
    protocol: row.protocol,
    enabled: row.enabled,
    defaultRole: row.default_role,
    configured,
    hasClientSecret: row.has_client_secret,
    saml: saml?.success ? saml.data : null,
    oidc: oidc?.success ? oidc.data : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

/**
 * `client_secret` is never selected — only whether one exists. A secret that
 * cannot leave the database cannot leak through a response or a log line.
 */
export async function findSsoConfiguration(tx: Tx, tenantId: string): Promise<SsoConfiguration | null> {
  const [row] = await tx<SsoRow[]>`
    SELECT
      id, protocol, enabled, default_role, config,
      (client_secret IS NOT NULL) AS has_client_secret, created_at, updated_at
    FROM sso_configurations WHERE tenant_id = ${tenantId} LIMIT 1
  `
  return row ? toSsoConfiguration(row) : null
}

export async function upsertSsoConfiguration(
  tx: Tx,
  tenantId: string,
  input: {
    protocol: SsoProtocol
    enabled: boolean
    defaultRole: Role
    config: Record<string, unknown>
    /** Undefined leaves an existing secret in place; it is never returned. */
    clientSecret?: string
  },
): Promise<SsoConfiguration> {
  const [row] = await tx<SsoRow[]>`
    INSERT INTO sso_configurations (tenant_id, protocol, enabled, default_role, config, client_secret)
    VALUES (
      ${tenantId}, ${input.protocol}, ${input.enabled}, ${input.defaultRole},
      ${jsonParam(tx, input.config)}, ${input.clientSecret ?? null}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      protocol      = EXCLUDED.protocol,
      enabled       = EXCLUDED.enabled,
      default_role  = EXCLUDED.default_role,
      config        = EXCLUDED.config,
      client_secret = COALESCE(${input.clientSecret ?? null}::text, sso_configurations.client_secret)
    RETURNING
      id, protocol, enabled, default_role, config,
      (client_secret IS NOT NULL) AS has_client_secret, created_at, updated_at
  `
  return toSsoConfiguration(row!)
}

// endregion

// region SCIM (tenant-scoped)

export async function insertScimToken(
  tx: Tx,
  input: { tenantId: string; name: string; tokenHash: string; lastFour: string },
): Promise<ScimToken> {
  const [row] = await tx<
    { id: string; name: string; last_four: string; created_at: Date; last_used_at: Date | null; revoked_at: Date | null }[]
  >`
    INSERT INTO scim_tokens (tenant_id, name, token_hash, last_four)
    VALUES (${input.tenantId}, ${input.name}, ${input.tokenHash}, ${input.lastFour})
    RETURNING id, name, last_four, created_at, last_used_at, revoked_at
  `
  return scimTokenSchema.parse({
    id: row!.id,
    name: row!.name,
    lastFour: row!.last_four,
    createdAt: row!.created_at,
    lastUsedAt: row!.last_used_at,
    revokedAt: row!.revoked_at,
  })
}

export async function listScimTokens(tx: Tx, tenantId: string): Promise<ScimToken[]> {
  const rows = await tx<
    { id: string; name: string; last_four: string; created_at: Date; last_used_at: Date | null; revoked_at: Date | null }[]
  >`
    SELECT id, name, last_four, created_at, last_used_at, revoked_at
    FROM scim_tokens WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
  `
  return rows.map((row) =>
    scimTokenSchema.parse({
      id: row.id,
      name: row.name,
      lastFour: row.last_four,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
    }),
  )
}

export async function revokeScimToken(tx: Tx, tenantId: string, tokenId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE scim_tokens SET revoked_at = now()
    WHERE tenant_id = ${tenantId} AND id = ${tokenId} AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}

/**
 * Token → tenant. Uses the SECURITY DEFINER function from 0009: a SCIM request
 * carries a bearer token and nothing else, so there is no tenant context to
 * filter by yet — the same problem host → site solves in 0001.
 */
export async function resolveScimTokenTenant(tx: Tx, tokenHash: string): Promise<string | null> {
  const [row] = await tx<{ resolve_scim_token: string | null }[]>`
    SELECT resolve_scim_token(${tokenHash})
  `
  return row?.resolve_scim_token ?? null
}

interface ScimUserRow {
  id: string
  external_id: string
  user_name: string
  display_name: string | null
  email: string
  role: Role
  active: boolean
  created_at: Date
  updated_at: Date
}

function toScimUser(row: ScimUserRow): ScimUser {
  return scimUserSchema.parse({
    id: row.id,
    externalId: row.external_id,
    userName: row.user_name,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

const SCIM_USER_COLUMNS = [
  'id',
  'external_id',
  'user_name',
  'display_name',
  'email',
  'role',
  'active',
  'created_at',
  'updated_at',
]

export async function upsertScimUser(
  tx: Tx,
  input: {
    tenantId: string
    externalId: string
    userName: string
    displayName: string | null
    email: string
    role: Role
    active: boolean
    raw: Record<string, unknown>
  },
): Promise<ScimUser> {
  const [row] = await tx<ScimUserRow[]>`
    INSERT INTO scim_users (tenant_id, external_id, user_name, display_name, email, role, active, raw)
    VALUES (
      ${input.tenantId}, ${input.externalId}, ${input.userName}, ${input.displayName},
      ${input.email}, ${input.role}, ${input.active}, ${jsonParam(tx, input.raw)}
    )
    ON CONFLICT (tenant_id, external_id) DO UPDATE SET
      user_name    = EXCLUDED.user_name,
      display_name = EXCLUDED.display_name,
      email        = EXCLUDED.email,
      active       = EXCLUDED.active,
      raw          = EXCLUDED.raw
    RETURNING ${tx(SCIM_USER_COLUMNS)}
  `
  return toScimUser(row!)
}

export async function listScimUsers(tx: Tx, tenantId: string, limit = 200): Promise<ScimUser[]> {
  const rows = await tx<ScimUserRow[]>`
    SELECT ${tx(SCIM_USER_COLUMNS)} FROM scim_users
    WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit}
  `
  return rows.map(toScimUser)
}

export async function deactivateScimUser(tx: Tx, tenantId: string, externalId: string): Promise<ScimUser | null> {
  const [row] = await tx<ScimUserRow[]>`
    UPDATE scim_users SET active = false
    WHERE tenant_id = ${tenantId} AND external_id = ${externalId}
    RETURNING ${tx(SCIM_USER_COLUMNS)}
  `
  return row ? toScimUser(row) : null
}

// endregion

// region Audit export (tenant-scoped)

export async function countAuditEvents(
  tx: Tx,
  tenantId: string,
  filters: { from?: string; to?: string; name?: string },
): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*)::text AS count FROM audit_events
    WHERE tenant_id = ${tenantId}
      AND (${filters.from ?? null}::timestamptz IS NULL OR created_at >= ${filters.from ?? null}::timestamptz)
      AND (${filters.to ?? null}::timestamptz IS NULL OR created_at <= ${filters.to ?? null}::timestamptz)
      AND (${filters.name ?? null}::text IS NULL OR name = ${filters.name ?? null}::text)
  `
  return Number(row!.count)
}

/** Paginated, ordered oldest-first so an export can be resumed deterministically. */
export async function listAuditEventsForExport(
  tx: Tx,
  tenantId: string,
  filters: { from?: string; to?: string; name?: string; limit: number; offset: number },
): Promise<AuditExportRow[]> {
  const rows = await tx<
    {
      id: string
      name: string
      actor: unknown
      resource_type: string | null
      resource_id: string | null
      payload: unknown
      created_at: Date
    }[]
  >`
    SELECT id, name, actor, resource_type, resource_id, payload, created_at
    FROM audit_events
    WHERE tenant_id = ${tenantId}
      AND (${filters.from ?? null}::timestamptz IS NULL OR created_at >= ${filters.from ?? null}::timestamptz)
      AND (${filters.to ?? null}::timestamptz IS NULL OR created_at <= ${filters.to ?? null}::timestamptz)
      AND (${filters.name ?? null}::text IS NULL OR name = ${filters.name ?? null}::text)
    ORDER BY created_at ASC, id ASC
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `

  return rows.map((row) =>
    auditExportRowSchema.parse({
      id: row.id,
      name: row.name,
      actor: readJson<Record<string, unknown>>(row.actor, { type: 'system', id: null }),
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      payload: readJson<Record<string, unknown>>(row.payload, {}),
      createdAt: row.created_at,
    }),
  )
}

/** Counts for the client workspace overview, read inside the client's own context. */
export async function loadClientWorkspaceCounts(
  tx: Tx,
  tenantId: string,
): Promise<{ siteCount: number; pageCount: number; publishedPageCount: number }> {
  const [row] = await tx<{ sites: string; pages: string; published: string }[]>`
    SELECT
      (SELECT count(*) FROM sites WHERE tenant_id = ${tenantId})::text AS sites,
      (SELECT count(*) FROM pages WHERE tenant_id = ${tenantId})::text AS pages,
      (SELECT count(*) FROM pages WHERE tenant_id = ${tenantId} AND status = 'published')::text AS published
  `
  return {
    siteCount: Number(row!.sites),
    pageCount: Number(row!.pages),
    publishedPageCount: Number(row!.published),
  }
}

// endregion
