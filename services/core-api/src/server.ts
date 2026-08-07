import { buildApp } from './app.js'
import { env } from './config/env.js'
import { closeDatabase } from './db/client.js'

const app = await buildApp()

async function shutdown(signal: string): Promise<void> {
  app.log.info(`${signal} received, shutting down`)
  try {
    await app.close()
    await closeDatabase()
    process.exit(0)
  } catch (error) {
    app.log.error({ err: error }, 'shutdown failed')
    process.exit(1)
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ port: env.CORE_API_PORT, host: env.CORE_API_HOST })
} catch (error) {
  app.log.error({ err: error }, 'failed to start')
  process.exit(1)
}
