import type { Money } from '@platform/schemas'

/**
 * Money formatting for the dashboard.
 *
 * The API speaks integer minor units; only the last step before a human reads
 * it may divide by 100. Doing that here — once — is what keeps a float out of
 * every form, table and total in the commerce screens.
 */
export function formatMoney(value: Money | null | undefined, locale = 'nl-NL'): string {
  if (!value) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency }).format(
    value.amount / 100,
  )
}

/** "19,99" or "19.99" → 1999. Rejects anything that is not a clean amount. */
export function parseMoneyInput(input: string, currency = 'EUR'): Money | null {
  const normalized = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return { amount: cents, currency }
}

export function useMoney() {
  return { formatMoney, parseMoneyInput }
}
