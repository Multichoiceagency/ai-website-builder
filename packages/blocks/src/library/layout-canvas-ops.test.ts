import { describe, expect, it } from 'vitest'
import {
  createLayoutNode,
  duplicateLayoutNode,
  findLayoutNode,
  findLayoutNodeParent,
  insertLayoutNode,
  isLayoutNodeDescendant,
  moveLayoutNode,
  newLayoutNodeId,
  removeLayoutNode,
  updateLayoutNode,
  updateLayoutNodeStyles,
  updateLayoutNodeHoverStyles,
  alignLayoutNodeInParent,
  nudgeLayoutNode,
  bumpLayoutNodeZIndex,
  replaceLayoutSubtree,
  setLayoutNodeFrame,
  walkLayoutNodes,
  type LayoutContainerNode,
  type LayoutNode,
} from '@platform/schemas'

/** A small tree: root › [row › [t1, b1], img]. */
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

describe('layout-canvas node ops', () => {
  it('newLayoutNodeId produces unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newLayoutNodeId()))
    expect(ids.size).toBe(200)
  })

  it('createLayoutNode gives sensible per-type defaults', () => {
    expect(createLayoutNode('container')).toMatchObject({ type: 'container', children: [] })
    expect(createLayoutNode('text')).toMatchObject({ type: 'text', tag: 'p' })
    expect(createLayoutNode('image')).toMatchObject({ type: 'image', src: '' })
    expect(createLayoutNode('button')).toMatchObject({ type: 'button', label: 'Button' })
  })

  it('findLayoutNode locates nodes at any depth', () => {
    const root = tree()
    expect(findLayoutNode(root, 't1')?.type).toBe('text')
    expect(findLayoutNode(root, 'missing')).toBeNull()
  })

  it('findLayoutNodeParent returns parent and index', () => {
    const root = tree()
    const loc = findLayoutNodeParent(root, 'b1')
    expect(loc?.parent.id).toBe('row')
    expect(loc?.index).toBe(1)
    expect(findLayoutNodeParent(root, 'root')).toBeNull()
  })

  it('updateLayoutNode merges a patch but never changes id/type', () => {
    const next = updateLayoutNode(tree(), 't1', {
      content: 'Changed',
      // These must be ignored — the discriminant and id are immutable.
      id: 'HACK',
      type: 'button',
    } as Partial<LayoutNode>)
    const node = findLayoutNode(next, 't1')
    expect(node).toMatchObject({ id: 't1', type: 'text', content: 'Changed' })
  })

  it('updateLayoutNodeStyles merges and prunes empty values', () => {
    const withStyle = updateLayoutNodeStyles(tree(), 'row', { gap: '2rem', padding: '1rem' })
    expect(findLayoutNode(withStyle, 'row')?.styles).toMatchObject({ gap: '2rem', padding: '1rem' })
    const pruned = updateLayoutNodeStyles(withStyle, 'row', { padding: '' })
    expect(findLayoutNode(pruned, 'row')?.styles).toEqual({ gap: '2rem' })
  })

  it('insertLayoutNode appends and inserts at index', () => {
    const node = createLayoutNode('text')
    const appended = insertLayoutNode(tree(), 'row', node)
    expect((findLayoutNode(appended, 'row') as LayoutContainerNode).children).toHaveLength(3)
    const atFront = insertLayoutNode(tree(), 'row', node, 0)
    expect((findLayoutNode(atFront, 'row') as LayoutContainerNode).children?.[0]?.id).toBe(node.id)
  })

  it('insertLayoutNode is a no-op into a leaf node', () => {
    const before = tree()
    const after = insertLayoutNode(before, 't1', createLayoutNode('text'))
    expect(findLayoutNode(after, 't1')).toMatchObject({ type: 'text' })
  })

  it('removeLayoutNode deletes a node but never the root', () => {
    const removed = removeLayoutNode(tree(), 'b1')
    expect(findLayoutNode(removed, 'b1')).toBeNull()
    expect(findLayoutNode(removed, 't1')).not.toBeNull()
    expect(removeLayoutNode(tree(), 'root').id).toBe('root')
  })

  it('isLayoutNodeDescendant detects containment', () => {
    const root = tree()
    expect(isLayoutNodeDescendant(root, 'row', 't1')).toBe(true)
    expect(isLayoutNodeDescendant(root, 't1', 'row')).toBe(false)
  })

  it('moveLayoutNode reparents a node', () => {
    const moved = moveLayoutNode(tree(), 't1', 'root', 0)
    expect(findLayoutNodeParent(moved, 't1')?.parent.id).toBe('root')
    expect(findLayoutNodeParent(moved, 't1')?.index).toBe(0)
  })

  it('moveLayoutNode refuses to move a node into its own descendant', () => {
    const before = tree()
    const after = moveLayoutNode(before, 'row', 't1', 0)
    // 'row' contains 't1'; moving row into t1 would orphan the subtree, so no change.
    expect(findLayoutNodeParent(after, 'row')?.parent.id).toBe('root')
  })

  it('duplicateLayoutNode clones with fresh ids right after the original', () => {
    const { root: next, newId } = duplicateLayoutNode(tree(), 'row')
    expect(newId).toBeTruthy()
    // Original + copy are now both under root, side by side.
    const rootChildren = (next as LayoutContainerNode).children!
    expect(rootChildren[0]?.id).toBe('row')
    expect(rootChildren[1]?.id).toBe(newId)
    // Every id in the copy is unique across the whole tree.
    const ids: string[] = []
    walkLayoutNodes(next, (node) => ids.push(node.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('operations do not mutate the input tree', () => {
    const before = tree()
    const snapshot = JSON.stringify(before)
    updateLayoutNodeStyles(before, 'row', { gap: '3rem' })
    removeLayoutNode(before, 'b1')
    insertLayoutNode(before, 'row', createLayoutNode('text'))
    moveLayoutNode(before, 't1', 'root', 0)
    duplicateLayoutNode(before, 'row')
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('hover styles, align, nudge, z-index, and subtree replace work', () => {
    let root = setLayoutNodeFrame(tree(), 't1', {
      left: '10px',
      top: '20px',
      width: '100px',
      height: '40px',
    })
    root = updateLayoutNodeHoverStyles(root, 't1', { background: '#111', opacity: 0.9 })
    expect(findLayoutNode(root, 't1')).toMatchObject({
      stylesHover: { background: '#111', opacity: 0.9 },
    })
    root = nudgeLayoutNode(root, 't1', 5, -2)
    expect(findLayoutNode(root, 't1')?.styles).toMatchObject({ left: '15px', top: '18px' })
    root = bumpLayoutNodeZIndex(root, 't1', 2)
    expect(findLayoutNode(root, 't1')?.styles).toMatchObject({ zIndex: 2 })
    root = alignLayoutNodeInParent(root, 't1', 'left', { width: 400, height: 300 })
    expect(findLayoutNode(root, 't1')?.styles?.left).toBe('0px')
    root = replaceLayoutSubtree(root, 't1', {
      id: 'ignored',
      type: 'text',
      content: 'Replaced',
      tag: 'h2',
    })
    expect(findLayoutNode(root, 't1')).toMatchObject({ id: 't1', content: 'Replaced', tag: 'h2' })
  })
})
