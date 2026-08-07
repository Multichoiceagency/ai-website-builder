import { userSchema, type User } from '@platform/schemas'
import type { Tx } from '../client.js'

interface UserRow {
  id: string
  email: string
  name: string
  password_hash: string
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

export async function findUserByEmail(tx: Tx, email: string): Promise<{ user: User; passwordHash: string } | null> {
  const [row] = await tx<UserRow[]>`
    SELECT id, email, name, password_hash, created_at FROM users WHERE email = ${email} LIMIT 1
  `
  return row ? { user: toUser(row), passwordHash: row.password_hash } : null
}

export async function findUserById(tx: Tx, id: string): Promise<User | null> {
  const [row] = await tx<UserRow[]>`
    SELECT id, email, name, password_hash, created_at FROM users WHERE id = ${id} LIMIT 1
  `
  return row ? toUser(row) : null
}

export async function insertUser(
  tx: Tx,
  input: { email: string; name: string; passwordHash: string },
): Promise<User> {
  const [row] = await tx<UserRow[]>`
    INSERT INTO users (email, name, password_hash)
    VALUES (${input.email}, ${input.name}, ${input.passwordHash})
    RETURNING id, email, name, password_hash, created_at
  `
  return toUser(row!)
}
