import { describe, expect, it } from 'vitest'
import {
  createLayoutNode,
  findLayoutNode,
  findLayoutNodeParent,
  insertLayoutNode,
  moveLayoutNode,
  removeLayoutNode,
  type LayoutContainerNode,
  type LayoutNode,
  type LayoutNodeType,
} from '@platform/schemas'

/** Same small tree shape as layout-canvas-ops: root › [row › [t1, b1], img]. */
function tree(): LayoutContainerNode {
  return {
    id: 'root',
    type: 'container',
    children: [
      {
        id: 'row',
        type: 'container',
        children: [
          { id: 't1', type: 'text', content: 'Hello', tag: 'h1' },
          { id: 'b1', type: 'button', label: 'Go', href: '#' },
        ],
      },
      { id: 'img', type: 'image', src: '', alt: '' },
    ],
  }
}

/** Mirrors useLayoutCanvasSelection.addChild — create + insert, return new id. */
function addChild(
  root: LayoutNode,
  parentId: string,
  type: LayoutNodeType,
): { root: LayoutNode; selectedNodeId: string } {
  const node = createLayoutNode(type)
  return {
    root: insertLayoutNode(root, parentId, node),
    selectedNodeId: node.id,
  }
}

/** Mirrors useLayoutCanvasSelection.moveNodeUp. */
function moveNodeUp(root: LayoutNode, id: string): LayoutNode {
  const loc = findLayoutNodeParent(root, id)
  if (!loc || loc.index <= 0) return root
  return moveLayoutNode(root, id, loc.parent.id, loc.index - 1)
}

/** Mirrors useLayoutCanvasSelection.moveNodeDown. */
function moveNodeDown(root: LayoutNode, id: string): LayoutNode {
  const loc = findLayoutNodeParent(root, id)
  if (!loc) return root
  const siblingCount = loc.parent.children?.length ?? 0
  if (loc.index >= siblingCount - 1) return root
  return moveLayoutNode(root, id, loc.parent.id, loc.index + 1)
}

describe('layout-canvas editor flows', () => {
  it('addChild inserts via create+insert and returns the new id to select', () => {
    const { root: next, selectedNodeId } = addChild(tree(), 'row', 'text')
    expect(selectedNodeId).toBeTruthy()
    expect(findLayoutNode(next, selectedNodeId)?.type).toBe('text')
    const row = findLayoutNode(next, 'row') as LayoutContainerNode
    expect(row.children).toHaveLength(3)
    expect(row.children?.[2]?.id).toBe(selectedNodeId)
  })

  it('moveNodeUp / moveNodeDown reorder siblings', () => {
    const root = tree()
    // Under row: [t1, b1] — move b1 up → [b1, t1]
    const up = moveNodeUp(root, 'b1')
    expect(findLayoutNodeParent(up, 'b1')?.index).toBe(0)
    expect(findLayoutNodeParent(up, 't1')?.index).toBe(1)

    // Move b1 down again → [t1, b1]
    const down = moveNodeDown(up, 'b1')
    expect(findLayoutNodeParent(down, 't1')?.index).toBe(0)
    expect(findLayoutNodeParent(down, 'b1')?.index).toBe(1)

    // Boundary: already first / last is a no-op
    expect(moveNodeUp(root, 't1')).toBe(root)
    expect(moveNodeDown(root, 'b1')).toBe(root)
  })

  it('removeLayoutNode deletes a non-root node', () => {
    const next = removeLayoutNode(tree(), 'img')
    expect(findLayoutNode(next, 'img')).toBeNull()
    expect(findLayoutNode(next, 'row')).not.toBeNull()
    expect((next as LayoutContainerNode).children).toHaveLength(1)
  })

  it('cannot delete the root', () => {
    const before = tree()
    const after = removeLayoutNode(before, 'root')
    expect(after.id).toBe('root')
    expect(findLayoutNode(after, 'row')).not.toBeNull()
    expect(findLayoutNode(after, 't1')).not.toBeNull()
  })
})
