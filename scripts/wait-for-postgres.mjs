/**
 * Blocks until Postgres accepts TCP connections, so `pnpm setup` can chain
 * `infra:up` straight into `db:migrate` without a sleep.
 */
import net from 'node:net'
import process from 'node:process'

const host = process.env.POSTGRES_HOST ?? 'localhost'
const port = Number(process.env.POSTGRES_PORT ?? 5433)
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 60_000)
const intervalMs = 500

function tryConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(2_000)
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    socket.once('timeout', () => done(false))
  })
}

const deadline = Date.now() + timeoutMs
process.stdout.write(`waiting for postgres on ${host}:${port} `)

while (Date.now() < deadline) {
  if (await tryConnect()) {
    process.stdout.write(' ready\n')
    process.exit(0)
  }
  process.stdout.write('.')
  await new Promise((resolve) => setTimeout(resolve, intervalMs))
}

process.stdout.write('\n')
console.error(`postgres did not become reachable on ${host}:${port} within ${timeoutMs}ms`)
process.exit(1)
