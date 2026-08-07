/**
 * A small fixed-window limiter for the unauthenticated form endpoint.
 *
 * In-process and therefore per-instance: behind two API instances the real
 * limit is twice this. That is a known and acceptable approximation for an
 * abuse brake — it is not a security control, and nothing downstream treats it
 * as one. When the platform gets a shared Redis, this moves there and the
 * call sites do not change.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()

/** Bounded so a flood of unique keys cannot grow the map without limit. */
const MAX_TRACKED_KEYS = 10_000

export interface ThrottleResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function consumeToken(key: string, limit: number, windowSeconds: number, now = Date.now()): ThrottleResult {
  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now)
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
  // Still full of live windows: drop the oldest rather than refuse everyone.
  if (windows.size >= MAX_TRACKED_KEYS) {
    const oldest = [...windows.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt).slice(0, 1000)
    for (const [key] of oldest) windows.delete(key)
  }
}

export function resetThrottle(): void {
  windows.clear()
}
