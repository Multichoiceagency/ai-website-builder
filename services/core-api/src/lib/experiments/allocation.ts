/**
 * Traffic allocation.
 *
 * Assignment is a *pure function* of (experiment id, visitor id). Nothing is
 * randomised per request and nothing is read from a session, so a visitor sees
 * the same variant on every page, in every tab, after every cache purge, and
 * across a server restart. A per-request coin flip would contaminate the very
 * measurement the experiment exists to take.
 */
import { createHash } from 'node:crypto'

/**
 * A stable value in [0, 1) from arbitrary parts.
 *
 * Six bytes of the digest is 48 bits — well inside the 53 bits a JavaScript
 * number represents exactly, so the mapping never loses precision at the top
 * of the range.
 */
export function hashToUnitInterval(...parts: readonly string[]): number {
  const digest = createHash('sha256').update(parts.join(':')).digest()
  return digest.readUIntBE(0, 6) / 2 ** 48
}

/**
 * Whether this visitor is in the test at all.
 *
 * Salted differently from variant selection so that admitting more traffic
 * later does not reshuffle the variant of anybody already admitted.
 */
export function isAdmitted(experimentId: string, anonymousId: string, trafficAllocation: number): boolean {
  if (trafficAllocation >= 100) return true
  if (trafficAllocation <= 0) return false
  return hashToUnitInterval('admission', experimentId, anonymousId) * 100 < trafficAllocation
}

export interface AllocatableVariant {
  id: string
  key: string
  weight: number
}

/**
 * Pick a variant by weight.
 *
 * Variants are ordered by key rather than by whatever order the database
 * returned them in — otherwise an unordered query could silently re-assign
 * every visitor in the middle of a running test.
 */
export function selectVariant<T extends AllocatableVariant>(
  experimentId: string,
  anonymousId: string,
  variants: readonly T[],
): T | null {
  const ordered = [...variants].sort((a, b) => a.key.localeCompare(b.key))
  const totalWeight = ordered.reduce((sum, variant) => sum + Math.max(0, variant.weight), 0)
  if (ordered.length === 0 || totalWeight <= 0) return null

  const point = hashToUnitInterval('variant', experimentId, anonymousId) * totalWeight

  let cumulative = 0
  for (const variant of ordered) {
    cumulative += Math.max(0, variant.weight)
    if (point < cumulative) return variant
  }

  // Only reachable through floating-point rounding at the very top of the
  // range. Falling back to the last arm keeps the function total.
  return ordered[ordered.length - 1] ?? null
}
