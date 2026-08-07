import { createHash, randomBytes } from 'node:crypto'
import type { Tx } from '../client.js'

/** Only the hash is stored, so a database read yields no usable session. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export interface SessionRecord {
  id: string
  userId: string
  expiresAt: Date
}

export async function insertSession(
  tx: Tx,
  input: { userId: string; token: string; ttlSeconds: number },
): Promise<SessionRecord> {
  const [row] = await tx<{ id: string; user_id: string; expires_at: Date }[]>`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (
      ${input.userId},
      ${hashSessionToken(input.token)},
      now() + make_interval(secs => ${input.ttlSeconds})
    )
    RETURNING id, user_id, expires_at
  `
  return { id: row!.id, userId: row!.user_id, expiresAt: row!.expires_at }
}

/** Returns null for unknown *and* expired tokens — the caller cannot tell them apart. */
export async function findValidSession(tx: Tx, token: string): Promise<SessionRecord | null> {
  const [row] = await tx<{ id: string; user_id: string; expires_at: Date }[]>`
    SELECT id, user_id, expires_at
    FROM sessions
    WHERE token_hash = ${hashSessionToken(token)} AND expires_at > now()
    LIMIT 1
  `
  return row ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at } : null
}

export async function deleteSession(tx: Tx, token: string): Promise<void> {
  await tx`DELETE FROM sessions WHERE token_hash = ${hashSessionToken(token)}`
}

/** Housekeeping. Safe to run at any time; expired rows are already unusable. */
export async function deleteExpiredSessions(tx: Tx): Promise<number> {
  const rows = await tx<{ id: string }[]>`DELETE FROM sessions WHERE expires_at <= now() RETURNING id`
  return rows.length
}
