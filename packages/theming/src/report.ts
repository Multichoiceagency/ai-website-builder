import type { ContrastPair, ContrastReport, ThemeTokens } from '@platform/schemas'
import { MINIMUM_FOR_USAGE, contrastRatio, type ContrastUsage } from './contrast.js'

/**
 * The contrast report.
 *
 * Everything the editor needs to say *which* pair fails, by *how much*, and
 * what it needed. Failures are never summarised away — a theme that ships one
 * unreadable button is not "97% accessible", it is a theme with an unreadable
 * button, and the editor shows exactly that.
 */

interface PairSpec {
  key: string
  label: string
  foreground: keyof ThemeTokens
  background: keyof ThemeTokens
  usage: ContrastUsage
}

/**
 * Every pair a block can actually produce.
 *
 * Note what is *not* here: `line` against anything. A hairline divider is a
 * decorative boundary and exempt from SC 1.4.11 — gating it at 3:1 would force
 * every site to draw charcoal rules between its sections. `lineStrong` is the
 * token blocks use for control boundaries, and that one is gated.
 */
const PAIRS: PairSpec[] = [
  { key: 'text-on-surface', label: 'Body text on page background', foreground: 'text', background: 'surface', usage: 'body' },
  { key: 'text-on-surface-alt', label: 'Body text on alternate section', foreground: 'text', background: 'surfaceAlt', usage: 'body' },
  { key: 'text-on-surface-sunken', label: 'Body text on sunken surface', foreground: 'text', background: 'surfaceSunken', usage: 'body' },
  { key: 'text-muted-on-surface', label: 'Muted text on page background', foreground: 'textMuted', background: 'surface', usage: 'body' },
  { key: 'text-muted-on-surface-alt', label: 'Muted text on alternate section', foreground: 'textMuted', background: 'surfaceAlt', usage: 'body' },
  { key: 'text-muted-on-surface-sunken', label: 'Muted text on sunken surface', foreground: 'textMuted', background: 'surfaceSunken', usage: 'body' },
  { key: 'primary-ink-on-primary', label: 'Button label on primary button', foreground: 'primaryInk', background: 'primary', usage: 'body' },
  { key: 'primary-ink-on-primary-hover', label: 'Button label on hovered primary button', foreground: 'primaryInk', background: 'primaryHover', usage: 'body' },
  { key: 'accent-ink-on-accent', label: 'Label on accent fill', foreground: 'accentInk', background: 'accent', usage: 'body' },
  { key: 'primary-on-surface', label: 'Primary as link or heading colour', foreground: 'primary', background: 'surface', usage: 'large' },
  { key: 'primary-on-surface-alt', label: 'Primary on alternate section', foreground: 'primary', background: 'surfaceAlt', usage: 'large' },
  { key: 'accent-on-surface', label: 'Accent as eyebrow or label colour', foreground: 'accent', background: 'surface', usage: 'large' },
  { key: 'line-strong-on-surface', label: 'Control border on page background', foreground: 'lineStrong', background: 'surface', usage: 'ui' },
  { key: 'line-strong-on-surface-alt', label: 'Control border on alternate section', foreground: 'lineStrong', background: 'surfaceAlt', usage: 'ui' },
  { key: 'focus-on-surface', label: 'Focus ring on page background', foreground: 'focus', background: 'surface', usage: 'ui' },
  { key: 'positive-on-surface', label: 'Success text on page background', foreground: 'positive', background: 'surface', usage: 'body' },
  { key: 'positive-on-surface-alt', label: 'Success text on alternate section', foreground: 'positive', background: 'surfaceAlt', usage: 'body' },
  { key: 'warning-on-surface', label: 'Warning text on page background', foreground: 'warning', background: 'surface', usage: 'body' },
  { key: 'warning-on-surface-alt', label: 'Warning text on alternate section', foreground: 'warning', background: 'surfaceAlt', usage: 'body' },
  { key: 'danger-on-surface', label: 'Error text on page background', foreground: 'danger', background: 'surface', usage: 'body' },
  { key: 'danger-on-surface-alt', label: 'Error text on alternate section', foreground: 'danger', background: 'surfaceAlt', usage: 'body' },
]

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Every checked pair for one mode, passing and failing alike. */
export function tokenContrastPairs(tokens: ThemeTokens, mode: 'light' | 'dark'): ContrastPair[] {
  return PAIRS.map((spec) => {
    const foreground = tokens[spec.foreground]
    const background = tokens[spec.background]
    const minimum = MINIMUM_FOR_USAGE[spec.usage]
    const ratio = round(contrastRatio(foreground, background))

    return {
      id: `${mode}.${spec.key}`,
      label: spec.label,
      mode,
      foreground,
      background,
      usage: spec.usage,
      ratio,
      minimum,
      passes: ratio >= minimum,
    }
  })
}

/**
 * Report over one or both modes. `dark` is optional because a light-only site
 * is a valid choice, not an incomplete one.
 */
export function contrastReport(light: ThemeTokens, dark?: ThemeTokens | null): ContrastReport {
  const pairs = [...tokenContrastPairs(light, 'light'), ...(dark ? tokenContrastPairs(dark, 'dark') : [])]
  const failures = pairs.filter((pair) => !pair.passes)
  return { passes: failures.length === 0, pairs, failures }
}

/** How far short a failing pair falls, for the editor's "needs 4.5, has 3.1" line. */
export function shortfall(pair: ContrastPair): number {
  return round(Math.max(0, pair.minimum - pair.ratio))
}
