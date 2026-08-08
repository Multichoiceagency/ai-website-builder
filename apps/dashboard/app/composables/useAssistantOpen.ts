/**
 * Shared open state for the AI assistant drawer.
 *
 * Lives in `useState` so Home (Ask anything), the top bar, and Escape all
 * toggle the same panel without prop drilling through the layout.
 */
export function useAssistantOpen() {
  return useState<boolean>('assistant-open', () => false)
}
