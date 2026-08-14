/**
 * Single visual studio: Lovable-style assistant + Figma artboard.
 * Legacy mode keys in localStorage are ignored.
 */
export type EditorBuilderMode = 'studio'

const STORAGE_KEY = 'editor:builder-mode'

export function useEditorBuilderMode() {
  const mode = useState<EditorBuilderMode>('editor-builder-mode', () => 'studio')

  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, 'studio')
  }

  function setMode(_next: EditorBuilderMode) {
    mode.value = 'studio'
  }

  function toggleMode() {
    mode.value = 'studio'
  }

  return { mode, setMode, toggleMode }
}
