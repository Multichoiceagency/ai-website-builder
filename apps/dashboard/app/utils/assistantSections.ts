/**
 * Puts an assistant change in the same undo history as a hand edit — a direct
 * PATCH of the stored page loses to the editor's next save of stale sections.
 *
 * A transform signals "nothing matched" by returning the array it was given;
 * `mutate` is then never called, so the page stays clean.
 */
export function applySectionsThrough<T>(
  current: T[],
  transform: (input: T[]) => T[],
  mutate: (next: T[]) => void,
): { applied: boolean } {
  const next = transform(current)
  if (next === current) return { applied: false }
  mutate(next)
  return { applied: true }
}
