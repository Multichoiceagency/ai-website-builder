/**
 * Drop and recreate the public schema, then re-grant the runtime role.
 *
 * Development convenience only — it refuses to run against production, and the
 * caller still has to run `migrate` and `seed` afterwards.
 */
import postgres from 'postgres'
import { env, isProduction } from '../config/env.js'

if (isProduction) {
  console.error('refusing to reset the database with NODE_ENV=production')
  process.exit(1)
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

try {
  await owner.unsafe('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  await owner.unsafe(`GRANT USAGE ON SCHEMA public TO "${env.APP_DB_USER}"`)
  console.log(`schema reset — run \`pnpm db:migrate\` next`)
} catch (error) {
  console.error('reset failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await owner.end({ timeout: 5 })
}
