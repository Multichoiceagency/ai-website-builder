import type { Tx } from './client.js'

/**
 * Read a JSONB column.
 *
 * Depending on the query path, the driver hands back either an already-parsed
 * value or the raw JSON text. Repositories must not care which, so every JSONB
 * read goes through here and then through a Zod schema — the database is a
 * boundary like any other (ADR-0002).
 */
export function readJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return (parsed ?? fallback) as T
    } catch {
      return fallback
    }
  }

  return value as T
}

/**
 * Bind a value as a JSONB parameter.
 *
 * The driver must do the encoding: a hand-stringified value combined with a
 * `::jsonb` cast gets encoded a second time and lands in the column as a JSON
 * *string* rather than an object — which then fails at read time, or worse,
 * silently on `jsonb_array_length`.
 *
 * The cast here is the one place we bridge our domain types to the driver's
 * recursive `JSONValue`; our types are structurally JSON but TypeScript cannot
 * prove it for a `Record<string, unknown>`.
 */
export function jsonParam(tx: Tx, value: unknown): ReturnType<Tx['json']> {
  return tx.json(value as never)
}
