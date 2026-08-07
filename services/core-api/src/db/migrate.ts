/**
 * Forward-only migration runner.
 *
 * Connects as the *owner* role (migrations create and alter tables, and must
 * bypass RLS to do so), applies each unapplied `.sql` file in order, and
 * records it in the same transaction as the migration itself — so a failed
 * migration leaves no partial record behind.
 */
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { env } from '../config/env.js'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

const owner = postgres({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  max: 1,
  onnotice: () => {},
})

async function ensureMigrationsTable(): Promise<void> {
  await owner`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await owner<{ name: string }[]>`SELECT name FROM schema_migrations`
  return new Set(rows.map((row) => row.name))
}

async function run(): Promise<void> {
  await ensureMigrationsTable()
  const applied = await appliedMigrations()

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()
  const pending = files.filter((file) => !applied.has(file))

  if (pending.length === 0) {
    console.log(`database up to date (${applied.size} migration(s) applied)`)
    return
  }

  for (const file of pending) {
    const contents = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
    process.stdout.write(`applying ${file} ... `)

    await owner.begin(async (tx) => {
      // Migrations grant privileges to the runtime role by name. Passing it as
      // a transaction-scoped setting keeps the role name out of the SQL files.
      await tx`SELECT set_config('platform.app_role', ${env.APP_DB_USER}, true)`
      await tx.unsafe(contents)
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`
    })

    process.stdout.write('ok\n')
  }

  console.log(`applied ${pending.length} migration(s)`)
}

try {
  await run()
} catch (error) {
  console.error('migration failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await owner.end({ timeout: 5 })
}
