/**
 * Editor layout mode: classic (layers + canvas + properties) vs interactive
 * (Lovable-style assistant left + live preview right).
 *
 * Persisted per browser so the next open remembers the choice.
 */
export type EditorBuilderMode = 'classic' | 'interactive'

const STORAGE_KEY = 'editor:builder-mode'

function readStoredMode(): EditorBuilderMode {
  if (!import.meta.client) return 'classic'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'interactive' || stored === 'classic' ? stored : 'classic'
}

export function useEditorBuilderMode() {
  const mode = useState<EditorBuilderMode>('editor-builder-mode', readStoredMode)

  watch(mode, (next) => {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, next)
  })

  function setMode(next: EditorBuilderMode) {
    mode.value = next
  }

  function toggleMode() {
    mode.value = mode.value === 'interactive' ? 'classic' : 'interactive'
  }

  return { mode, setMode, toggleMode }
}
