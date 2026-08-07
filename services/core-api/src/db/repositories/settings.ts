import { createHash, randomBytes } from 'node:crypto'
import {
  apiKeySchema,
  dataRequestSchema,
  domainSettingSchema,
  invitationSchema,
  teamMemberSchema,
  webhookDeliverySchema,
  webhookEndpointSchema,
  type ApiKey,
  type DataRequest,
  type DomainSetting,
  type Invitation,
  type Role,
  type SecretState,
  type SettingsScope,
  type TeamMember,
  type WebhookDelivery,
  type WebhookEndpoint,
} from '@platform/schemas'
import { resolvePermissions } from '@platform/permissions'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { decryptToken, encryptToken } from '../../lib/integrations/crypto.js'

/**
 * Persistence for every settings surface.
 *
 * Two rules hold across this whole file:
 *
 *   1. A secret is written through `encryptToken` and is read back only by
 *      `findSecretValue`, which no route calls to build a response. Everything
 *      the API returns about a credential comes from `listSecretStates`, which
 *      cannot produce a plaintext because it never decrypts.
 *   2. Documents are stored and returned as opaque JSON. Validation against the
 *      section's Zod schema happens in the route, so this layer stays a
 *      transport and the contract stays in one place (ADR-0002).
 */

// region Documents

export async function findSettingsDocument(
  tx: Tx,
  tenantId: string,
  scope: SettingsScope,
  key: string,
): Promise<{ value: unknown; updatedBy: string; updatedAt: Date } | null> {
  const [row] = await tx<{ value: unknown; updated_by: string; updated_at: Date }[]>`
    SELECT value, updated_by, updated_at FROM settings_documents
    WHERE tenant_id = ${tenantId} AND scope = ${scope} AND key = ${key}
    LIMIT 1
  `
  if (!row) return null
  return { value: readJson<Record<string, unknown>>(row.value, {}), updatedBy: row.updated_by, updatedAt: row.updated_at }
}

export async function upsertSettingsDocument(
  tx: Tx,
  input: { tenantId: string; scope: SettingsScope; key: string; value: unknown; updatedBy: string },
): Promise<void> {
  await tx`
    INSERT INTO settings_documents (tenant_id, scope, key, value, updated_by)
    VALUES (${input.tenantId}, ${input.scope}, ${input.key}, ${jsonParam(tx, input.value)}, ${input.updatedBy})
    ON CONFLICT (tenant_id, scope, key)
    DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by
  `
}

/** Every document a workspace has, for the settings index and the export. */
export async function listSettingsDocuments(
  tx: Tx,
  tenantId: string,
): Promise<{ scope: SettingsScope; key: string; value: unknown; updatedAt: Date }[]> {
  const rows = await tx<{ scope: SettingsScope; key: string; value: unknown; updated_at: Date }[]>`
    SELECT scope, key, value, updated_at FROM settings_documents
    WHERE tenant_id = ${tenantId}
    ORDER BY scope, key
  `
  return rows.map((row) => ({
    scope: row.scope,
    key: row.key,
    value: readJson<Record<string, unknown>>(row.value, {}),
    updatedAt: row.updated_at,
  }))
}

// endregion

// region Secrets

/** `sk_live_51H…4242` → `sk_live_••••4242`. Prefix keeps it recognisable. */
export function maskSecret(value: string): string {
  const trimmed = value.trim()
  const tail = trimmed.slice(-4)
  const head = trimmed.length > 12 ? trimmed.slice(0, 8) : ''
  return `${head}••••${tail}`
}

export async function putSecret(
  tx: Tx,
  input: {
    tenantId: string
    scope: SettingsScope
    key: string
    field: string
    value: string
    updatedBy: string
  },
): Promise<SecretState> {
  const hint = maskSecret(input.value)

  const [row] = await tx<{ updated_at: Date }[]>`
    INSERT INTO settings_secrets (tenant_id, scope, key, field, value_encrypted, hint, updated_by)
    VALUES (
      ${input.tenantId}, ${input.scope}, ${input.key}, ${input.field},
      ${encryptToken(input.value)}, ${hint}, ${input.updatedBy}
    )
    ON CONFLICT (tenant_id, scope, key, field)
    DO UPDATE SET
      value_encrypted = EXCLUDED.value_encrypted,
      hint = EXCLUDED.hint,
      updated_by = EXCLUDED.updated_by
    RETURNING updated_at
  `

  return { field: input.field, configured: true, hint, updatedAt: row!.updated_at.toISOString() }
}

/**
 * What the browser is allowed to know about stored credentials. No decryption
 * happens here, which is what makes "a secret leaked through the settings API"
 * a structural impossibility rather than a review item.
 */
export async function listSecretStates(
  tx: Tx,
  tenantId: string,
  scope: SettingsScope,
  key: string,
): Promise<SecretState[]> {
  const rows = await tx<{ field: string; hint: string; updated_at: Date }[]>`
    SELECT field, hint, updated_at FROM settings_secrets
    WHERE tenant_id = ${tenantId} AND scope = ${scope} AND key = ${key}
    ORDER BY field
  `
  return rows.map((row) => ({
    field: row.field,
    configured: true,
    hint: row.hint,
    updatedAt: row.updated_at.toISOString(),
  }))
}

/**
 * The only read that yields plaintext. Reserved for the adapter that has to
 * call the provider — never for a response body.
 */
export async function findSecretValue(
  tx: Tx,
  tenantId: string,
  scope: SettingsScope,
  key: string,
  field: string,
): Promise<string | null> {
  const [row] = await tx<{ value_encrypted: string }[]>`
    SELECT value_encrypted FROM settings_secrets
    WHERE tenant_id = ${tenantId} AND scope = ${scope} AND key = ${key} AND field = ${field}
    LIMIT 1
  `
  return row ? decryptToken(row.value_encrypted) : null
}

export async function deleteSecret(
  tx: Tx,
  tenantId: string,
  scope: SettingsScope,
  key: string,
  field: string,
): Promise<boolean> {
  const rows = await tx<{ field: string }[]>`
    DELETE FROM settings_secrets
    WHERE tenant_id = ${tenantId} AND scope = ${scope} AND key = ${key} AND field = ${field}
    RETURNING field
  `
  return rows.length > 0
}

// endregion

// region Team
//
// `memberships` and `users` are global tables with no RLS, so these take a
// transaction from `withoutTenant` and filter explicitly. The tenant id they
// filter on has already been proven by `requireTenant`.

export async function listTeamMembers(tx: Tx, tenantId: string): Promise<TeamMember[]> {
  const rows = await tx<
    { user_id: string; email: string; name: string; role: Role; created_at: Date }[]
  >`
    SELECT m.user_id, u.email, u.name, m.role, m.created_at
    FROM memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.tenant_id = ${tenantId}
    ORDER BY m.created_at ASC
  `

  return rows.map((row) =>
    teamMemberSchema.parse({
      userId: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      // Resolved from the permission engine, so the screen cannot drift from
      // what the server actually enforces.
      permissions: resolvePermissions(row.role),
      joinedAt: row.created_at,
    }),
  )
}

export async function countOwners(tx: Tx, tenantId: string): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*)::text AS count FROM memberships
    WHERE tenant_id = ${tenantId} AND role = 'owner'
  `
  return Number(row!.count)
}

export async function findMemberRole(tx: Tx, tenantId: string, userId: string): Promise<Role | null> {
  const [row] = await tx<{ role: Role }[]>`
    SELECT role FROM memberships WHERE tenant_id = ${tenantId} AND user_id = ${userId} LIMIT 1
  `
  return row?.role ?? null
}

export async function updateMemberRole(tx: Tx, tenantId: string, userId: string, role: Role): Promise<boolean> {
  const rows = await tx<{ user_id: string }[]>`
    UPDATE memberships SET role = ${role}
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    RETURNING user_id
  `
  return rows.length > 0
}

export async function deleteMember(tx: Tx, tenantId: string, userId: string): Promise<boolean> {
  const rows = await tx<{ user_id: string }[]>`
    DELETE FROM memberships WHERE tenant_id = ${tenantId} AND user_id = ${userId} RETURNING user_id
  `
  return rows.length > 0
}

// endregion

// region Invitations

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

interface InvitationRow {
  id: string
  email: string
  role: Role
  invited_by: string
  expires_at: Date
  accepted_at: Date | null
  revoked_at: Date | null
  created_at: Date
}

function toInvitation(row: InvitationRow): Invitation {
  return invitationSchema.parse({
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  })
}

const INVITATION_COLUMNS = (tx: Tx) => tx`
  id, email, role, invited_by, expires_at, accepted_at, revoked_at, created_at
`

export async function listInvitations(tx: Tx, tenantId: string): Promise<Invitation[]> {
  const rows = await tx<InvitationRow[]>`
    SELECT ${INVITATION_COLUMNS(tx)} FROM settings_invitations
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 100
  `
  return rows.map(toInvitation)
}

/**
 * Returns the invitation *and* the one-time token. The token is hashed before
 * it is stored, so this is the only moment it exists in a readable form — the
 * caller mails it and forgets it (ADR-0009).
 */
export async function insertInvitation(
  tx: Tx,
  input: { tenantId: string; email: string; role: Role; invitedBy: string; ttlSeconds: number },
): Promise<{ invitation: Invitation; token: string }> {
  const token = randomBytes(32).toString('base64url')

  const [row] = await tx<InvitationRow[]>`
    INSERT INTO settings_invitations (tenant_id, email, role, token_hash, invited_by, expires_at)
    VALUES (
      ${input.tenantId}, ${input.email}, ${input.role}, ${hashToken(token)}, ${input.invitedBy},
      now() + make_interval(secs => ${input.ttlSeconds}::int)
    )
    RETURNING ${INVITATION_COLUMNS(tx)}
  `

  return { invitation: toInvitation(row!), token }
}

export async function revokeInvitation(tx: Tx, tenantId: string, invitationId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE settings_invitations SET revoked_at = now()
    WHERE tenant_id = ${tenantId} AND id = ${invitationId} AND accepted_at IS NULL AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}

// endregion

// region API keys

interface ApiKeyRow {
  id: string
  name: string
  hint: string
  scopes: string[]
  last_used_at: Date | null
  revoked_at: Date | null
  created_at: Date
}

function toApiKey(row: ApiKeyRow): ApiKey {
  return apiKeySchema.parse({
    id: row.id,
    name: row.name,
    hint: row.hint,
    scopes: row.scopes,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  })
}

export async function listApiKeys(tx: Tx, tenantId: string): Promise<ApiKey[]> {
  const rows = await tx<ApiKeyRow[]>`
    SELECT id, name, hint, scopes, last_used_at, revoked_at, created_at
    FROM settings_api_keys
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 100
  `
  return rows.map(toApiKey)
}

/**
 * The plaintext key is returned once and is unrecoverable afterwards: the row
 * holds only its SHA-256 hash and a masked hint. Losing it means creating a new
 * one, which is the correct trade.
 */
export async function insertApiKey(
  tx: Tx,
  input: { tenantId: string; name: string; scopes: string[]; createdBy: string; live: boolean },
): Promise<{ key: ApiKey; secret: string }> {
  const secret = `${input.live ? 'pk_live' : 'pk_test'}_${randomBytes(24).toString('base64url')}`

  const [row] = await tx<ApiKeyRow[]>`
    INSERT INTO settings_api_keys (tenant_id, name, token_hash, hint, scopes, created_by)
    VALUES (
      ${input.tenantId}, ${input.name}, ${hashToken(secret)}, ${maskSecret(secret)},
      ${input.scopes}, ${input.createdBy}
    )
    RETURNING id, name, hint, scopes, last_used_at, revoked_at, created_at
  `

  return { key: toApiKey(row!), secret }
}

export async function revokeApiKey(tx: Tx, tenantId: string, keyId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE settings_api_keys SET revoked_at = now()
    WHERE tenant_id = ${tenantId} AND id = ${keyId} AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Webhooks

interface WebhookRow {
  id: string
  url: string
  events: string[]
  active: boolean
  secret_hint: string
  last_delivery_at: Date | null
  last_status: number | null
  created_at: Date
}

function toWebhook(row: WebhookRow): WebhookEndpoint {
  return webhookEndpointSchema.parse({
    id: row.id,
    url: row.url,
    events: row.events,
    active: row.active,
    secretHint: row.secret_hint,
    lastDeliveryAt: row.last_delivery_at,
    lastStatus: row.last_status,
    createdAt: row.created_at,
  })
}

const WEBHOOK_COLUMNS = (tx: Tx) => tx`
  id, url, events, active, secret_hint, last_delivery_at, last_status, created_at
`

export async function listWebhookEndpoints(tx: Tx, tenantId: string): Promise<WebhookEndpoint[]> {
  const rows = await tx<WebhookRow[]>`
    SELECT ${WEBHOOK_COLUMNS(tx)} FROM settings_webhook_endpoints
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 100
  `
  return rows.map(toWebhook)
}

function newSigningSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`
}

export async function insertWebhookEndpoint(
  tx: Tx,
  input: { tenantId: string; url: string; events: string[]; active: boolean; createdBy: string },
): Promise<{ endpoint: WebhookEndpoint; secret: string }> {
  const secret = newSigningSecret()

  const [row] = await tx<WebhookRow[]>`
    INSERT INTO settings_webhook_endpoints (tenant_id, url, events, active, secret_encrypted, secret_hint, created_by)
    VALUES (
      ${input.tenantId}, ${input.url}, ${input.events}, ${input.active},
      ${encryptToken(secret)}, ${maskSecret(secret)}, ${input.createdBy}
    )
    RETURNING ${WEBHOOK_COLUMNS(tx)}
  `

  return { endpoint: toWebhook(row!), secret }
}

/** Rotation returns the new secret once, then it is only ever a hint again. */
export async function rotateWebhookSecret(
  tx: Tx,
  tenantId: string,
  endpointId: string,
): Promise<{ endpoint: WebhookEndpoint; secret: string } | null> {
  const secret = newSigningSecret()

  const [row] = await tx<WebhookRow[]>`
    UPDATE settings_webhook_endpoints
    SET secret_encrypted = ${encryptToken(secret)}, secret_hint = ${maskSecret(secret)}
    WHERE tenant_id = ${tenantId} AND id = ${endpointId}
    RETURNING ${WEBHOOK_COLUMNS(tx)}
  `
  return row ? { endpoint: toWebhook(row), secret } : null
}

export async function deleteWebhookEndpoint(tx: Tx, tenantId: string, endpointId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM settings_webhook_endpoints
    WHERE tenant_id = ${tenantId} AND id = ${endpointId}
    RETURNING id
  `
  return rows.length > 0
}

export async function listWebhookDeliveries(
  tx: Tx,
  tenantId: string,
  endpointId: string,
): Promise<WebhookDelivery[]> {
  const rows = await tx<
    { id: string; event: string; status_code: number | null; error: string | null; duration_ms: number; created_at: Date }[]
  >`
    SELECT id, event, status_code, error, duration_ms, created_at
    FROM settings_webhook_deliveries
    WHERE tenant_id = ${tenantId} AND endpoint_id = ${endpointId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map((row) =>
    webhookDeliverySchema.parse({
      id: row.id,
      event: row.event,
      statusCode: row.status_code,
      error: row.error,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
    }),
  )
}

// endregion

// region Domains

export async function listDomains(tx: Tx, tenantId: string): Promise<DomainSetting[]> {
  const rows = await tx<
    { id: string; site_id: string; hostname: string; is_primary: boolean; verified_at: Date | null; created_at: Date }[]
  >`
    SELECT id, site_id, hostname, is_primary, verified_at, created_at
    FROM domains
    WHERE tenant_id = ${tenantId}
    ORDER BY is_primary DESC, hostname ASC
  `
  return rows.map((row) =>
    domainSettingSchema.parse({
      id: row.id,
      siteId: row.site_id,
      hostname: row.hostname,
      isPrimary: row.is_primary,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
    }),
  )
}

export async function countDomains(tx: Tx, tenantId: string): Promise<number> {
  const [row] = await tx<{ count: string }[]>`
    SELECT count(*)::text AS count FROM domains WHERE tenant_id = ${tenantId}
  `
  return Number(row!.count)
}

export async function insertDomain(
  tx: Tx,
  input: { tenantId: string; siteId: string; hostname: string },
): Promise<DomainSetting> {
  const [row] = await tx<
    { id: string; site_id: string; hostname: string; is_primary: boolean; verified_at: Date | null; created_at: Date }[]
  >`
    INSERT INTO domains (tenant_id, site_id, hostname)
    VALUES (${input.tenantId}, ${input.siteId}, ${input.hostname.toLowerCase()})
    RETURNING id, site_id, hostname, is_primary, verified_at, created_at
  `
  return domainSettingSchema.parse({
    id: row!.id,
    siteId: row!.site_id,
    hostname: row!.hostname,
    isPrimary: row!.is_primary,
    verifiedAt: row!.verified_at,
    createdAt: row!.created_at,
  })
}

/**
 * Exactly one primary per site, enforced by demoting the others in the same
 * statement pair — a second primary would make host resolution ambiguous.
 */
export async function setPrimaryDomain(tx: Tx, tenantId: string, domainId: string): Promise<boolean> {
  const [target] = await tx<{ site_id: string }[]>`
    SELECT site_id FROM domains WHERE tenant_id = ${tenantId} AND id = ${domainId} LIMIT 1
  `
  if (!target) return false

  await tx`
    UPDATE domains SET is_primary = false
    WHERE tenant_id = ${tenantId} AND site_id = ${target.site_id}
  `
  await tx`
    UPDATE domains SET is_primary = true
    WHERE tenant_id = ${tenantId} AND id = ${domainId}
  `
  return true
}

export async function markDomainVerified(tx: Tx, tenantId: string, domainId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE domains SET verified_at = now()
    WHERE tenant_id = ${tenantId} AND id = ${domainId}
    RETURNING id
  `
  return rows.length > 0
}

export async function deleteDomain(tx: Tx, tenantId: string, domainId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM domains WHERE tenant_id = ${tenantId} AND id = ${domainId} RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Data requests

interface DataRequestRow {
  id: string
  kind: 'export' | 'workspace_deletion'
  status: 'pending' | 'ready' | 'cancelled' | 'completed'
  requested_by: string
  scheduled_for: Date | null
  created_at: Date
}

function toDataRequest(row: DataRequestRow): DataRequest {
  return dataRequestSchema.parse({
    id: row.id,
    kind: row.kind,
    status: row.status,
    requestedBy: row.requested_by,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
  })
}

const DATA_REQUEST_COLUMNS = (tx: Tx) => tx`id, kind, status, requested_by, scheduled_for, created_at`

export async function listDataRequests(tx: Tx, tenantId: string): Promise<DataRequest[]> {
  const rows = await tx<DataRequestRow[]>`
    SELECT ${DATA_REQUEST_COLUMNS(tx)} FROM settings_data_requests
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map(toDataRequest)
}

export async function insertDataRequest(
  tx: Tx,
  input: {
    tenantId: string
    kind: 'export' | 'workspace_deletion'
    status: 'pending' | 'ready'
    requestedBy: string
    payload: Record<string, unknown>
    scheduledInDays: number | null
  },
): Promise<DataRequest> {
  const [row] = await tx<DataRequestRow[]>`
    INSERT INTO settings_data_requests (tenant_id, kind, status, requested_by, payload, scheduled_for)
    VALUES (
      ${input.tenantId}, ${input.kind}, ${input.status}, ${input.requestedBy},
      ${jsonParam(tx, input.payload)},
      CASE
        WHEN ${input.scheduledInDays}::int IS NULL THEN NULL
        ELSE now() + make_interval(days => ${input.scheduledInDays}::int)
      END
    )
    RETURNING ${DATA_REQUEST_COLUMNS(tx)}
  `
  return toDataRequest(row!)
}

export async function cancelDataRequest(tx: Tx, tenantId: string, requestId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE settings_data_requests SET status = 'cancelled'
    WHERE tenant_id = ${tenantId} AND id = ${requestId} AND status = 'pending'
    RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Audit

export interface AuditFilter {
  name?: string
  actorId?: string
  resourceType?: string
  since?: Date
  limit: number
}

/**
 * The audit log, filterable. Kept here rather than in `audit.ts` because that
 * module is the *write* path shared by every domain, and widening its read API
 * for one screen would make every caller carry the filter.
 */
export async function listFilteredAuditEvents(
  tx: Tx,
  tenantId: string,
  filter: AuditFilter,
): Promise<
  {
    id: string
    name: string
    actor: { type: string; id: string | null; label?: string }
    resourceType: string | null
    resourceId: string | null
    payload: Record<string, unknown>
    createdAt: string
  }[]
> {
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
      AND (${filter.name ?? null}::text IS NULL OR name = ${filter.name ?? null})
      AND (${filter.resourceType ?? null}::text IS NULL OR resource_type = ${filter.resourceType ?? null})
      AND (${filter.actorId ?? null}::text IS NULL OR actor ->> 'id' = ${filter.actorId ?? null})
      AND (${filter.since ?? null}::timestamptz IS NULL OR created_at >= ${filter.since ?? null})
    ORDER BY created_at DESC
    LIMIT ${filter.limit}
  `

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    actor: readJson<{ type: string; id: string | null; label?: string }>(row.actor, { type: 'system', id: null }),
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    payload: readJson<Record<string, unknown>>(row.payload, {}),
    createdAt: row.created_at.toISOString(),
  }))
}

/**
 * Settings actions that have no name in the shared `DomainEventName` enum are
 * recorded directly, matching what the ads and agency modules already do. The
 * audit table takes a free-form name on purpose: an audit trail that can only
 * express the events someone remembered to enumerate is not an audit trail.
 */
export async function recordSettingsAudit(
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
