import postgres from 'postgres'
import { env, isProduction } from '../config/env.js'

export type Sql = postgres.Sql
/** A transaction handle. Repositories only ever accept one of these. */
export type Tx = postgres.TransactionSql

/**
 * The runtime connection. Deliberately uses the *app* role, not the owner:
 * row-level security is only enforced against a non-owner, non-superuser role.
 */
export const sql: Sql = postgres({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  username: env.APP_DB_USER,
  password: env.APP_DB_PASSWORD,
  max: isProduction ? 20 : 5,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
})

/**
 * Run work inside a transaction bound to one tenant.
 *
 * `set_config(..., true)` scopes the setting to this transaction, so a pooled
 * connection can never carry one tenant's context into the next request. Every
 * tenant-scoped read and write in the platform goes through here.
 */
export async function withTenant<T>(tenantId: string, work: (tx: Tx) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_tenant', ${tenantId}, true)`
    return work(tx)
  }) as Promise<T>
}

/**
 * Run work outside any tenant context — only valid for the global tables
 * (users, sessions, organizations, tenants, memberships), which carry no RLS
 * because resolving them is what *establishes* tenant context.
 */
export async function withoutTenant<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  return sql.begin((tx) => work(tx)) as Promise<T>
}

export async function closeDatabase(): Promise<void> {
  await sql.end({ timeout: 5 })
}
