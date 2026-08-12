import { ref, type Ref } from 'vue'
import {
  isLayoutCanvasBlock,
  findLayoutNode,
  findLayoutNodeParent,
  createLayoutNode,
  insertLayoutNode,
  removeLayoutNode,
  moveLayoutNode,
  duplicateLayoutNode,
  updateLayoutNode,
  updateLayoutNodeStyles,
  updateLayoutNodeHoverStyles,
  setLayoutNodeFrame,
  alignLayoutNodeInParent,
  nudgeLayoutNode,
  bumpLayoutNodeZIndex,
  replaceLayoutSubtree,
  DEFAULT_LAYOUT_CANVAS_ROOT,
  type LayoutNode,
  type LayoutNodeFrame,
  type LayoutNodeType,
  type Section,
  type LayoutCanvasProps,
} from '@platform/schemas'

export type LayoutCanvasOpResult = {
  root: LayoutNode
  selectedNodeId?: string
}

/**
 * Selection + pure tree ops for the layout-canvas freeform editor.
 * Only `selectedNodeId` is reactive; ops take a root and return a new one.
 */
export function useLayoutCanvasSelection() {
  const selectedNodeId: Ref<string | null> = ref(null)

  function clearNodeSelection(): void {
    selectedNodeId.value = null
  }

  function rootOf(section: Section | null): LayoutNode | null {
    if (!section || !isLayoutCanvasBlock(section.block)) return null
    const props = section.props as Partial<LayoutCanvasProps> | undefined
    const root = props?.root
    if (root && typeof root === 'object' && 'id' in root && 'type' in root) {
      return root as LayoutNode
    }
    return DEFAULT_LAYOUT_CANVAS_ROOT
  }

  function syncWithSection(section: Section | null): void {
    if (!section || !isLayoutCanvasBlock(section.block)) {
      selectedNodeId.value = null
      return
    }
    const root = rootOf(section)
    if (!root) {
      selectedNodeId.value = null
      return
    }
    const current = selectedNodeId.value
    if (current !== null && !findLayoutNode(root, current)) {
      selectedNodeId.value = root.id
    }
  }

  function selectedNode(section: Section | null): LayoutNode | null {
    const root = rootOf(section)
    const id = selectedNodeId.value
    if (!root || id === null) return null
    return findLayoutNode(root, id)
  }

  function addChild(
    root: LayoutNode,
    parentId: string,
    type: LayoutNodeType,
  ): LayoutCanvasOpResult {
    const node = createLayoutNode(type)
    return {
      root: insertLayoutNode(root, parentId, node),
      selectedNodeId: node.id,
    }
  }

  function removeNode(root: LayoutNode, id: string): LayoutCanvasOpResult {
    if (root.id === id) return { root }
    const parent = findLayoutNodeParent(root, id)
    if (!parent) return { root }
    return {
      root: removeLayoutNode(root, id),
      selectedNodeId: parent.parent.id,
    }
  }

  function duplicateNode(root: LayoutNode, id: string): LayoutCanvasOpResult {
    const { root: next, newId } = duplicateLayoutNode(root, id)
    return newId ? { root: next, selectedNodeId: newId } : { root: next }
  }

  function moveNodeUp(root: LayoutNode, id: string): LayoutCanvasOpResult {
    const loc = findLayoutNodeParent(root, id)
    if (!loc || loc.index <= 0) return { root }
    return {
      root: moveLayoutNode(root, id, loc.parent.id, loc.index - 1),
    }
  }

  function moveNodeDown(root: LayoutNode, id: string): LayoutCanvasOpResult {
    const loc = findLayoutNodeParent(root, id)
    if (!loc) return { root }
    const siblingCount = loc.parent.children?.length ?? 0
    if (loc.index >= siblingCount - 1) return { root }
    return {
      root: moveLayoutNode(root, id, loc.parent.id, loc.index + 1),
    }
  }

  function patchNode(
    root: LayoutNode,
    id: string,
    patch: Partial<LayoutNode>,
  ): LayoutCanvasOpResult {
    return { root: updateLayoutNode(root, id, patch) }
  }

  function patchStyles(
    root: LayoutNode,
    id: string,
    styles: Record<string, unknown>,
  ): LayoutCanvasOpResult {
    return { root: updateLayoutNodeStyles(root, id, styles) }
  }

  function patchHoverStyles(
    root: LayoutNode,
    id: string,
    styles: Record<string, unknown>,
  ): LayoutCanvasOpResult {
    return { root: updateLayoutNodeHoverStyles(root, id, styles) }
  }

  function setFrame(root: LayoutNode, id: string, frame: LayoutNodeFrame): LayoutCanvasOpResult {
    return { root: setLayoutNodeFrame(root, id, frame) }
  }

  function alignInParent(
    root: LayoutNode,
    id: string,
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
    parentSize?: { width: number; height: number },
  ): LayoutCanvasOpResult {
    return { root: alignLayoutNodeInParent(root, id, alignment, parentSize) }
  }

  function nudge(
    root: LayoutNode,
    id: string,
    dx: number,
    dy: number,
  ): LayoutCanvasOpResult {
    return { root: nudgeLayoutNode(root, id, dx, dy) }
  }

  function bumpZ(root: LayoutNode, id: string, delta: number): LayoutCanvasOpResult {
    return { root: bumpLayoutNodeZIndex(root, id, delta) }
  }

  function replaceSubtree(
    root: LayoutNode,
    id: string,
    replacement: LayoutNode,
  ): LayoutCanvasOpResult {
    return { root: replaceLayoutSubtree(root, id, replacement), selectedNodeId: id }
  }

  return {
    selectedNodeId,
    clearNodeSelection,
    syncWithSection,
    rootOf,
    selectedNode,
    addChild,
    removeNode,
    duplicateNode,
    moveNodeUp,
    moveNodeDown,
    patchNode,
    patchStyles,
    patchHoverStyles,
    setFrame,
    alignInParent,
    nudge,
    bumpZ,
    replaceSubtree,
  }
}
