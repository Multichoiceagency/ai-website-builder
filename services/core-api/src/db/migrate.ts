/**
 * Forward-only migration runner.
 *
 * Connects as the *owner* role (migrations create and alter tables, and must
 * bypass RLS to do so), applies each unapplied `.sql` file in order, and
 * records it in the same transaction as the migration itself — so a failed
 * migration leaves no partial record behind.
 */
import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { env } from '../config/env.js'

/**
 * SQL files live under `src/db/migrations`. Compiled `dist/db/migrate.js` must
 * still find them — tsc does not copy `.sql`. Prefer a sibling `migrations/`
 * (if a packaging step copied them), then fall back to the source tree.
 */
async function resolveMigrationsDir(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, 'migrations'),
    join(here, '../../src/db/migrations'),
  ]
  for (const dir of candidates) {
    try {
      await access(dir)
      return dir
    } catch {
      // try next
    }
  }
  throw new Error(
    `No migrations directory found. Tried:\n${candidates.map((c) => `  - ${c}`).join('\n')}`,
  )
}

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
  const migrationsDir = await resolveMigrationsDir()
  await ensureMigrationsTable()
  const applied = await appliedMigrations()

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()
  const pending = files.filter((file) => !applied.has(file))

  if (pending.length === 0) {
    console.log(`database up to date (${applied.size} migration(s) applied) from ${migrationsDir}`)
    return
  }

  console.log(`migrating from ${migrationsDir} (${pending.length} pending)`)
  for (const file of pending) {
    const contents = await readFile(join(migrationsDir, file), 'utf8')
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
