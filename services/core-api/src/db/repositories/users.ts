import { userSchema, type User } from '@platform/schemas'
import type { Tx } from '../client.js'

interface UserRow {
  id: string
  email: string
  name: string
  password_hash: string | null
  google_sub: string | null
  created_at: Date
}

function toUser(row: UserRow): User {
  return userSchema.parse({
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  })
}

export async function findUserByEmail(
  tx: Tx,
  email: string,
): Promise<{ user: User; passwordHash: string | null; googleSub: string | null } | null> {
  const [row] = await tx<UserRow[]>`
    SELECT id, email, name, password_hash, google_sub, created_at
    FROM users WHERE email = ${email} LIMIT 1
  `
  return row
    ? { user: toUser(row), passwordHash: row.password_hash, googleSub: row.google_sub }
    : null
}

export async function findUserByGoogleSub(tx: Tx, googleSub: string): Promise<User | null> {
  const [row] = await tx<UserRow[]>`
    SELECT id, email, name, password_hash, google_sub, created_at
    FROM users WHERE google_sub = ${googleSub} LIMIT 1
  `
  return row ? toUser(row) : null
}

export async function findUserById(tx: Tx, id: string): Promise<User | null> {
  const [row] = await tx<UserRow[]>`
    SELECT id, email, name, password_hash, google_sub, created_at FROM users WHERE id = ${id} LIMIT 1
  `
  return row ? toUser(row) : null
}

export async function insertUser(
  tx: Tx,
  input: {
    email: string
    name: string
    passwordHash?: string | null
    googleSub?: string | null
  },
): Promise<User> {
  const [row] = await tx<UserRow[]>`
    INSERT INTO users (email, name, password_hash, google_sub)
    VALUES (
      ${input.email},
      ${input.name},
      ${input.passwordHash ?? null},
      ${input.googleSub ?? null}
    )
    RETURNING id, email, name, password_hash, google_sub, created_at
  `
  return toUser(row!)
}

export async function linkGoogleSub(tx: Tx, userId: string, googleSub: string): Promise<void> {
  await tx`
    UPDATE users SET google_sub = ${googleSub}, updated_at = now()
    WHERE id = ${userId} AND (google_sub IS NULL OR google_sub = ${googleSub})
  `
}
