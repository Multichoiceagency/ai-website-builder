import { createHash, randomBytes } from 'node:crypto'
import type { Tx } from '../client.js'

/**
 * Machine access to one tenant.
 *
 * Mirrors the session repository: only the digest is stored, so a database read
 * yields no usable key. The prefix is kept separately because a person needs to
 * recognise a key in a list without the key itself being recoverable.
 */

/** Long enough that the environment tag and four random characters stay visible. */
const PREFIX_LENGTH = 14

export function generateApiKey(environment: 'live' | 'test'): string {
  return `mcms_${environment}_${randomBytes(24).toString('base64url')}`
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, PREFIX_LENGTH)
}

/** A non-null result is an unverified candidate, not an authenticated key. */
export function readPresentedKey(headers: Record<string, unknown>): string | null {
  const direct = headers['x-api-key']
  if (typeof direct === 'string' && direct.length > 0) return direct

  const authorization = headers.authorization
  if (typeof authorization !== 'string') return null
  const match = /^Bearer\s+(mcms_(?:live|test)_[A-Za-z0-9_-]+)$/.exec(authorization.trim())
  return match?.[1] ?? null
}

export interface ApiKeyRecord {
  id: string
  tenantId: string
  issuedBy: string
  name: string
  tokenPrefix: string
  scopes: string[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

interface Row {
  id: string
  tenant_id: string
  issued_by: string
  name: string
  token_prefix: string
  scopes: string[]
  last_used_at: Date | null
  expires_at: Date | null
  created_at: Date
}

function toRecord(row: Row): ApiKeyRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    issuedBy: row.issued_by,
    name: row.name,
    tokenPrefix: row.token_prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

export async function insertApiKey(
  tx: Tx,
  input: {
    tenantId: string
    issuedBy: string
    name: string
    token: string
    scopes: string[]
    expiresAt?: Date | null
  },
): Promise<ApiKeyRecord> {
  const [row] = await tx<Row[]>`
    INSERT INTO api_keys (tenant_id, issued_by, name, token_hash, token_prefix, scopes, expires_at)
    VALUES (
      ${input.tenantId},
      ${input.issuedBy},
      ${input.name},
      ${hashApiKey(input.token)},
      ${apiKeyPrefix(input.token)},
      ${JSON.stringify(input.scopes)}::jsonb,
      ${input.expiresAt ?? null}
    )
    RETURNING id, tenant_id, issued_by, name, token_prefix, scopes, last_used_at, expires_at, created_at
  `
  return toRecord(row!)
}

/** Returns null for unknown, revoked *and* expired keys — the caller cannot tell them apart. */
export async function findValidApiKey(tx: Tx, token: string): Promise<ApiKeyRecord | null> {
  const [row] = await tx<Row[]>`
    SELECT id, tenant_id, issued_by, name, token_prefix, scopes, last_used_at, expires_at, created_at
    FROM api_keys
    WHERE token_hash = ${hashApiKey(token)}
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `
  return row ? toRecord(row) : null
}

/**
 * Fire-and-forget: a failed touch must not fail the request it belongs to, and
 * the value is a rough "last seen", not an audit record.
 */
export async function touchApiKey(tx: Tx, id: string): Promise<void> {
  await tx`UPDATE api_keys SET last_used_at = now() WHERE id = ${id}`
}

export async function listApiKeys(tx: Tx, tenantId: string): Promise<ApiKeyRecord[]> {
  const rows = await tx<Row[]>`
    SELECT id, tenant_id, issued_by, name, token_prefix, scopes, last_used_at, expires_at, created_at
    FROM api_keys
    WHERE tenant_id = ${tenantId} AND revoked_at IS NULL
    ORDER BY created_at DESC
  `
  return rows.map(toRecord)
}

/** Revocation is a timestamp, not a delete: a key that was used is worth keeping a record of. */
export async function revokeApiKey(tx: Tx, tenantId: string, id: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    UPDATE api_keys SET revoked_at = now()
    WHERE id = ${id} AND tenant_id = ${tenantId} AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}
