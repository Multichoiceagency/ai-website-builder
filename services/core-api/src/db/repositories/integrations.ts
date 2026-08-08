import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { decryptToken, encryptToken } from '../../lib/integrations/crypto.js'

/**
 * Integration connections and their in-flight OAuth states.
 *
 * Tokens are encrypted on the way in and decrypted on the way out, so no caller
 * ever holds a ciphertext and no row ever holds a plaintext (ADR-0009, §60).
 */

export interface OAuthState {
  state: string
  tenantId: string
  userId: string
  provider: string
  codeVerifier: string
  redirectTo: string
}

export async function insertOAuthState(
  tx: Tx,
  input: OAuthState & { ttlSeconds: number },
): Promise<void> {
  await tx`
    INSERT INTO integration_oauth_states
      (state, tenant_id, user_id, provider, code_verifier, redirect_to, expires_at)
    VALUES (
      ${input.state}, ${input.tenantId}, ${input.userId}, ${input.provider},
      ${input.codeVerifier}, ${input.redirectTo},
      now() + make_interval(secs => ${input.ttlSeconds})
    )
  `
}

/**
 * Consume a state exactly once.
 *
 * The UPDATE ... RETURNING is the whole point: marking it consumed and reading
 * it are one atomic step, so a replayed callback loses the race and gets
 * nothing. A read-then-update would leave a window.
 */
export async function consumeOAuthState(tx: Tx, state: string): Promise<OAuthState | null> {
  const [row] = await tx<
    { state: string; tenant_id: string; user_id: string; provider: string; code_verifier: string; redirect_to: string }[]
  >`
    UPDATE integration_oauth_states
    SET consumed_at = now()
    WHERE state = ${state} AND consumed_at IS NULL AND expires_at > now()
    RETURNING state, tenant_id, user_id, provider, code_verifier, redirect_to
  `

  if (!row) return null
  return {
    state: row.state,
    tenantId: row.tenant_id,
    userId: row.user_id,
    provider: row.provider,
    codeVerifier: row.code_verifier,
    redirectTo: row.redirect_to,
  }
}

export async function deleteExpiredOAuthStates(tx: Tx): Promise<number> {
  const rows = await tx<{ state: string }[]>`
    DELETE FROM integration_oauth_states WHERE expires_at <= now() RETURNING state
  `
  return rows.length
}

export interface ConnectionSummary {
  id: string
  provider: string
  accountLabel: string
  externalAccountId: string
  scopes: string[]
  connectedAt: string
  lastUsedAt: string | null
  lastError: string | null
  expiresAt: string | null
  broker: 'native' | 'nango'
}

interface ConnectionRow {
  id: string
  provider: string
  account_label: string
  external_account_id: string
  scopes: string[]
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  access_token_expires_at: Date | null
  last_used_at: Date | null
  last_error: string | null
  created_at: Date
  broker?: string
  broker_connection_id?: string | null
}

function toSummary(row: ConnectionRow): ConnectionSummary {
  return {
    id: row.id,
    provider: row.provider,
    accountLabel: row.account_label,
    externalAccountId: row.external_account_id,
    scopes: row.scopes ?? [],
    connectedAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    lastError: row.last_error,
    expiresAt: row.access_token_expires_at?.toISOString() ?? null,
    broker: row.broker === 'nango' ? 'nango' : 'native',
  }
}

export async function upsertConnection(
  tx: Tx,
  input: {
    tenantId: string
    provider: string
    externalAccountId: string
    accountLabel: string
    scopes: string[]
    accessToken: string
    refreshToken: string | null
    expiresAt: Date | null
    connectedBy: string
    broker?: 'native' | 'nango'
    brokerConnectionId?: string | null
  },
): Promise<ConnectionSummary> {
  const broker = input.broker ?? 'native'
  const brokerConnectionId = input.brokerConnectionId ?? null
  // Reconnecting must not lose an existing refresh token: Google only issues
  // one on first consent, so `COALESCE` keeps the old one when the new grant
  // omits it.
  const [row] = await tx<ConnectionRow[]>`
    INSERT INTO integration_connections (
      tenant_id, provider, external_account_id, account_label, scopes,
      access_token_encrypted, refresh_token_encrypted, access_token_expires_at, connected_by, last_error,
      broker, broker_connection_id
    )
    VALUES (
      ${input.tenantId}, ${input.provider}, ${input.externalAccountId}, ${input.accountLabel},
      ${input.scopes}, ${encryptToken(input.accessToken)},
      ${input.refreshToken ? encryptToken(input.refreshToken) : null},
      ${input.expiresAt}, ${input.connectedBy}, NULL,
      ${broker}, ${brokerConnectionId}
    )
    ON CONFLICT (tenant_id, provider) DO UPDATE SET
      external_account_id     = EXCLUDED.external_account_id,
      account_label           = EXCLUDED.account_label,
      scopes                  = EXCLUDED.scopes,
      access_token_encrypted  = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, integration_connections.refresh_token_encrypted),
      access_token_expires_at = EXCLUDED.access_token_expires_at,
      connected_by            = EXCLUDED.connected_by,
      last_error              = NULL,
      broker                  = EXCLUDED.broker,
      broker_connection_id    = EXCLUDED.broker_connection_id
    RETURNING id, provider, account_label, external_account_id, scopes,
              access_token_encrypted, refresh_token_encrypted, access_token_expires_at,
              last_used_at, last_error, created_at, broker, broker_connection_id
  `
  return toSummary(row!)
}

export async function listConnections(tx: Tx, tenantId: string): Promise<ConnectionSummary[]> {
  const rows = await tx<ConnectionRow[]>`
    SELECT id, provider, account_label, external_account_id, scopes,
           access_token_encrypted, refresh_token_encrypted, access_token_expires_at,
           last_used_at, last_error, created_at, broker, broker_connection_id
    FROM integration_connections
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at ASC
  `
  return rows.map(toSummary)
}

/** Tokens in the clear — server-side only, never serialised to a response. */
export async function findConnectionTokens(
  tx: Tx,
  tenantId: string,
  provider: string,
): Promise<{
  id: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  broker: 'native' | 'nango'
  brokerConnectionId: string | null
} | null> {
  const [row] = await tx<ConnectionRow[]>`
    SELECT id, provider, account_label, external_account_id, scopes,
           access_token_encrypted, refresh_token_encrypted, access_token_expires_at,
           last_used_at, last_error, created_at, broker, broker_connection_id
    FROM integration_connections
    WHERE tenant_id = ${tenantId} AND provider = ${provider}
    LIMIT 1
  `
  if (!row) return null

  return {
    id: row.id,
    accessToken: decryptToken(row.access_token_encrypted),
    refreshToken: decryptToken(row.refresh_token_encrypted),
    expiresAt: row.access_token_expires_at,
    scopes: row.scopes ?? [],
    broker: row.broker === 'nango' ? 'nango' : 'native',
    brokerConnectionId: row.broker_connection_id ?? null,
  }
}

export async function updateAccessToken(
  tx: Tx,
  connectionId: string,
  accessToken: string,
  expiresAt: Date | null,
): Promise<void> {
  await tx`
    UPDATE integration_connections
    SET access_token_encrypted = ${encryptToken(accessToken)},
        access_token_expires_at = ${expiresAt},
        last_used_at = now(),
        last_error = NULL
    WHERE id = ${connectionId}
  `
}

export async function recordConnectionError(tx: Tx, connectionId: string, message: string): Promise<void> {
  await tx`UPDATE integration_connections SET last_error = ${message.slice(0, 500)} WHERE id = ${connectionId}`
}

export async function deleteConnection(tx: Tx, tenantId: string, provider: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM integration_connections
    WHERE tenant_id = ${tenantId} AND provider = ${provider}
    RETURNING id
  `
  return rows.length > 0
}

export async function replaceResources(
  tx: Tx,
  input: {
    tenantId: string
    connectionId: string
    kind: string
    resources: { externalId: string; label: string; payload: Record<string, unknown> }[]
  },
): Promise<void> {
  await tx`
    DELETE FROM integration_resources
    WHERE tenant_id = ${input.tenantId} AND connection_id = ${input.connectionId} AND kind = ${input.kind}
  `

  for (const resource of input.resources) {
    await tx`
      INSERT INTO integration_resources (tenant_id, connection_id, kind, external_id, label, payload)
      VALUES (
        ${input.tenantId}, ${input.connectionId}, ${input.kind},
        ${resource.externalId}, ${resource.label}, ${jsonParam(tx, resource.payload)}
      )
      ON CONFLICT (connection_id, kind, external_id) DO UPDATE
        SET label = EXCLUDED.label, payload = EXCLUDED.payload, fetched_at = now()
    `
  }
}

export async function listResources(
  tx: Tx,
  tenantId: string,
  kind: string,
): Promise<{ externalId: string; label: string; payload: Record<string, unknown> }[]> {
  const rows = await tx<{ external_id: string; label: string; payload: unknown }[]>`
    SELECT external_id, label, payload
    FROM integration_resources
    WHERE tenant_id = ${tenantId} AND kind = ${kind}
    ORDER BY label ASC
  `
  return rows.map((row) => ({
    externalId: row.external_id,
    label: row.label,
    payload: readJson<Record<string, unknown>>(row.payload, {}),
  }))
}
