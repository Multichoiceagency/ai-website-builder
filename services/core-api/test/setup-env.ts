/**
 * Tests read the same root `.env` the services do, so there is no second
 * source of configuration to keep in sync.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootEnv = join(dirname(fileURLToPath(import.meta.url)), '../../../.env')

try {
  for (const line of readFileSync(rootEnv, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    // A real environment variable always wins, so CI can override any of these.
    if (!(key in process.env)) process.env[key] = value
  }
} catch {
  // No .env — rely on the ambient environment (CI supplies it directly).
}

process.env.NODE_ENV = 'test'

/**
 * Language-model credentials are stripped, whatever the developer has in `.env`.
 *
 * Two reasons, both load-bearing. The suite asserts the behaviour of the
 * zero-credential configuration the platform actually ships in — the
 * deterministic composer answering, by name. And no test may spend money or
 * depend on a third party being up: a provider that finds a key here would make
 * a live call from `pnpm test`.
 *
 * A test that wants a provider configured sets the variable itself, in its own
 * scope, and restores it afterwards.
 */
delete process.env.ANTHROPIC_API_KEY
delete process.env.GEMINI_API_KEY
delete process.env.GEMINI_MODEL
delete process.env.OPENAI_API_KEY
