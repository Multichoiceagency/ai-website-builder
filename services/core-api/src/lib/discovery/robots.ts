import { fetchDocument } from './fetch.js'

/**
 * robots.txt handling.
 *
 * §47 of the spec is explicit: respect robots, respect platform terms, do not
 * bypass technical restrictions. A disallowed path is simply not read, and the
 * omission is reported to the user rather than worked around.
 */

interface RobotsRules {
  disallow: string[]
  allow: string[]
  crawlDelayMs: number
}

const cache = new Map<string, RobotsRules>()

const EMPTY: RobotsRules = { disallow: [], allow: [], crawlDelayMs: 0 }

function parseRobots(text: string, userAgent: string): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: 0 }

  let applies = false
  let sawSpecificGroup = false

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0]!.trim()
    if (!line) continue

    const separator = line.indexOf(':')
    if (separator === -1) continue

    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'user-agent') {
      const agent = value.toLowerCase()
      // A group naming us specifically overrides the wildcard group.
      if (agent === userAgent.toLowerCase()) {
        applies = true
        sawSpecificGroup = true
        rules.disallow = []
        rules.allow = []
      } else if (agent === '*' && !sawSpecificGroup) {
        applies = true
      } else {
        applies = false
      }
      continue
    }

    if (!applies) continue

    if (field === 'disallow' && value) rules.disallow.push(value)
    if (field === 'allow' && value) rules.allow.push(value)
    if (field === 'crawl-delay') {
      const seconds = Number(value)
      if (Number.isFinite(seconds)) rules.crawlDelayMs = Math.min(seconds * 1000, 5_000)
    }
  }

  return rules
}

export async function loadRobots(origin: string, userAgent = 'platformbot'): Promise<RobotsRules> {
  const cached = cache.get(origin)
  if (cached) return cached

  const document = await fetchDocument(`${origin}/robots.txt`).catch(() => null)
  const rules = document?.body ? parseRobots(document.body, userAgent) : EMPTY

  cache.set(origin, rules)
  return rules
}

function matches(pattern: string, path: string): boolean {
  // robots.txt supports `*` wildcards and a `$` end anchor.
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  const anchored = escaped.endsWith('$') ? `^${escaped.slice(0, -1)}$` : `^${escaped}`
  try {
    return new RegExp(anchored).test(path)
  } catch {
    return false
  }
}

export function isAllowed(rules: RobotsRules, path: string): boolean {
  // The most specific matching rule wins; Allow beats Disallow on a tie.
  const longestAllow = rules.allow.filter((rule) => matches(rule, path)).sort((a, b) => b.length - a.length)[0]
  const longestDisallow = rules.disallow
    .filter((rule) => matches(rule, path))
    .sort((a, b) => b.length - a.length)[0]

  if (!longestDisallow) return true
  if (!longestAllow) return false
  return longestAllow.length >= longestDisallow.length
}

export function clearRobotsCache(): void {
  cache.clear()
}
