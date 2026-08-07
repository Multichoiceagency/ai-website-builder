/**
 * Number formatting for the analytics screens.
 *
 * Every helper here has a defined answer for "there is nothing to show". A
 * dashboard's honesty lives in these edge cases: `0%` and "no baseline" are
 * different statements, and formatting them the same way is how a screen starts
 * lying without anyone writing a lie.
 */

const LOCALE = 'nl-NL'

export function formatCount(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(Math.round(value))
}

/** Fractional attribution credit is real — `0.5` conversions is not a rounding bug. */
export function formatCredit(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded)
    ? formatCount(rounded)
    : new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(rounded)
}

/** A ratio in 0–1. Null means "no denominator", which is not the same as zero. */
export function formatRatio(value: number | null, digits = 1): string {
  if (value === null) return '—'
  return `${new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value * 100)}%`
}

/**
 * An amount in a currency the API named. Without a currency the amount is
 * still a real number, so it is shown as one rather than dressed as euros.
 */
export function formatAmount(value: number, currency: string | null): string {
  if (!currency) {
    return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(value)
  }
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value)
}

/**
 * The period-over-period sentence.
 *
 * `changePct === null` means the previous period was empty. There is no honest
 * percentage for that, so it says so instead of showing an arrow.
 */
export function formatChange(changePct: number | null, days: number): string {
  if (changePct === null) return `No data in the previous ${days} days`
  const sign = changePct > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(changePct)}% vs previous ${days} days`
}

export function changeTone(changePct: number | null): 'positive' | 'danger' | 'neutral' {
  if (changePct === null || changePct === 0) return 'neutral'
  return changePct > 0 ? 'positive' : 'danger'
}

/** `2026-08-07` → `7 aug`. Used for chart axes, where the year is noise. */
export function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parsed)
}

export function formatHourLabel(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' }).format(parsed)
}

export function formatDateTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

export function relativeTimeFrom(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (!Number.isFinite(seconds)) return iso
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

/** Event names are a contract, not prose; this only makes them readable. */
export function humanizeEventName(name: string): string {
  return name.replace(/_/g, ' ')
}

export function useAnalyticsFormat() {
  return {
    formatCount,
    formatCredit,
    formatRatio,
    formatAmount,
    formatChange,
    changeTone,
    formatDayLabel,
    formatHourLabel,
    formatDateTime,
    relativeTimeFrom,
    humanizeEventName,
  }
}
