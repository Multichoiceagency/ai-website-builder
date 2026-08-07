/**
 * Condition evaluation for automation graphs.
 *
 * Conditions address the run context by dot-path (`lead.score`,
 * `contact.email`). Path resolution is deliberately dumb — property access on
 * plain objects, nothing else — because the paths come from tenant-authored
 * graphs and an expression language over those is a sandbox nobody wants to
 * maintain.
 */
import type { AutomationCondition } from '@platform/schemas'

export function resolvePath(context: Record<string, unknown>, path: string): unknown {
  let current: unknown = context

  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    // Prototype keys are never data. Reading one would let a graph observe —
    // and a branch on — the runtime rather than the record.
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') return undefined
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

function compareNumbers(left: unknown, right: unknown, compare: (a: number, b: number) => boolean): boolean {
  const a = Number(left)
  const b = Number(right)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return compare(a, b)
}

export function evaluateCondition(condition: AutomationCondition, context: Record<string, unknown>): boolean {
  const actual = resolvePath(context, condition.field)
  const expected = condition.value

  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null && actual !== ''
    case 'not_exists':
      return actual === undefined || actual === null || actual === ''
    case 'eq':
      return String(actual) === String(expected)
    case 'neq':
      return String(actual) !== String(expected)
    case 'gt':
      return compareNumbers(actual, expected, (a, b) => a > b)
    case 'gte':
      return compareNumbers(actual, expected, (a, b) => a >= b)
    case 'lt':
      return compareNumbers(actual, expected, (a, b) => a < b)
    case 'lte':
      return compareNumbers(actual, expected, (a, b) => a <= b)
    case 'contains':
      return String(actual ?? '')
        .toLowerCase()
        .includes(String(expected ?? '').toLowerCase())
    default:
      return false
  }
}
