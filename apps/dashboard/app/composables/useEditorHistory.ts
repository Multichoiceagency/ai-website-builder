import { computed, ref } from 'vue'

/**
 * Undo/redo for the editor.
 *
 * Snapshot-based rather than command-based: a page document is small (tens of
 * sections of plain JSON), so storing whole states is cheaper to reason about
 * than an inverse operation per mutation — and it cannot drift out of sync with
 * the document the way a hand-written inverse can.
 *
 * `commit` is called with the state *before* a change, so the first undo
 * returns you to it.
 */
export function useEditorHistory<T>(limit = 60) {
  const past = ref<string[]>([])
  const future = ref<string[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function snapshot(state: T): string {
    return JSON.stringify(state)
  }

  /** Record the pre-change state. Any redo branch is discarded, as usual. */
  function commit(previous: T): void {
    past.value = [...past.value, snapshot(previous)].slice(-limit)
    future.value = []
  }

  function undo(current: T): T | null {
    const entry = past.value.at(-1)
    if (entry === undefined) return null

    past.value = past.value.slice(0, -1)
    future.value = [...future.value, snapshot(current)]
    return JSON.parse(entry) as T
  }

  function redo(current: T): T | null {
    const entry = future.value.at(-1)
    if (entry === undefined) return null

    future.value = future.value.slice(0, -1)
    past.value = [...past.value, snapshot(current)]
    return JSON.parse(entry) as T
  }

  /** Called when the document is reloaded from the server. */
  function reset(): void {
    past.value = []
    future.value = []
  }

  return { commit, undo, redo, reset, canUndo, canRedo }
}
