import type { TemplateMotionType } from '@platform/schemas'

/**
 * HTML5 drag payload for InsertPanel → EditorCanvas library drops.
 *
 * Kept as a MIME + JSON envelope so reorder (pointer events) and insert
 * (HTML5 DnD) never collide, and only registry block ids cross the boundary
 * (ADR-0003).
 */
export const LIBRARY_DRAG_MIME = 'application/x-platform-library'

export type LibraryDragKind = 'insert-block' | 'insert-template'

export interface LibraryDragPayload {
  kind: LibraryDragKind
  blockIds: string[]
  templateId?: string
  motionTypes?: TemplateMotionType[]
}

export function parseLibraryDrag(dataTransfer: DataTransfer | null): LibraryDragPayload | null {
  if (!dataTransfer) return null
  const raw = dataTransfer.getData(LIBRARY_DRAG_MIME)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as LibraryDragPayload
    if (parsed.kind !== 'insert-block' && parsed.kind !== 'insert-template') return null
    if (!Array.isArray(parsed.blockIds) || !parsed.blockIds.every((id) => typeof id === 'string')) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function hasLibraryDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false
  return [...dataTransfer.types].includes(LIBRARY_DRAG_MIME)
}
