import { money, type Money } from '@platform/schemas'

/**
 * Read a money column pair.
 *
 * Postgres `bigint` arrives as a *string* — postgres.js refuses to silently
 * narrow int8 to a JS number, and it is right to. Amounts in minor units stay
 * far below `Number.MAX_SAFE_INTEGER` (90 trillion euros in cents), so the
 * conversion is safe here and nowhere near safe in general, which is why it
 * lives in one function instead of at forty call sites.
 */
export function readAmount(value: unknown): number {
  if (value === null || value === undefined) return 0

  const amount = typeof value === 'bigint' ? Number(value) : Number(value)
  if (!Number.isInteger(amount)) {
    throw new Error('A money column returned a non-integer amount; minor units must be whole.')
  }
  return amount
}

export function readMoney(amount: unknown, currency: string): Money {
  return money(readAmount(amount), currency)
}

/** For nullable money pairs — `compare_at_amount`, `free_above_amount`. */
export function readOptionalMoney(amount: unknown, currency: string | null): Money | null {
  if (amount === null || amount === undefined || !currency) return null
  return readMoney(amount, currency)
}

/** `count(*)` and `sum(...)` come back as strings for the same reason. */
export function readCount(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value)
}
