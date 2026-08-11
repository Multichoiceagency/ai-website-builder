import { z } from 'zod'

/**
 * Nestable layout tree for `layout-canvas-01` (ADR-0003).
 *
 * Page JSON stores `{ block: 'layout-canvas-01', props: { root } }` only —
 * never framework source. Containers nest; text / image / button are leaves.
 */

export const LAYOUT_NODE_TYPES = ['container', 'text', 'image', 'button'] as const
export type LayoutNodeType = (typeof LAYOUT_NODE_TYPES)[number]

export const LAYOUT_DISPLAY = ['block', 'flex', 'grid'] as const
export const LAYOUT_FLEX_DIRECTION = ['row', 'column', 'row-reverse', 'column-reverse'] as const
export const LAYOUT_FLEX_WRAP = ['nowrap', 'wrap', 'wrap-reverse'] as const
export const LAYOUT_JUSTIFY = [
  'flex-start',
  'flex-end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
] as const
export const LAYOUT_ALIGN = ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'] as const
export const LAYOUT_POSITION = ['relative', 'absolute'] as const

const cssLength = z.string().max(64)
const cssColor = z.string().max(120)

/** Shared box / visual styles applied to any node. */
export const layoutBoxStylesSchema = z.object({
  width: cssLength.optional(),
  height: cssLength.optional(),
  minWidth: cssLength.optional(),
  minHeight: cssLength.optional(),
  maxWidth: cssLength.optional(),
  maxHeight: cssLength.optional(),
  padding: cssLength.optional(),
  margin: cssLength.optional(),
  background: cssColor.optional(),
  borderRadius: cssLength.optional(),
  opacity: z.number().min(0).max(1).optional(),
  flexGrow: z.number().min(0).max(10).optional(),
  flexShrink: z.number().min(0).max(10).optional(),
  alignSelf: z.enum(LAYOUT_ALIGN).optional(),
  /** Design-mode absolute placement (Figma-style artboard). */
  position: z.enum(LAYOUT_POSITION).optional(),
  left: cssLength.optional(),
  top: cssLength.optional(),
  right: cssLength.optional(),
  bottom: cssLength.optional(),
  zIndex: z.number().int().min(-999).max(9999).optional(),
})

/** Flex / grid layout styles — meaningful on containers. */
export const layoutContainerStylesSchema = layoutBoxStylesSchema.extend({
  display: z.enum(LAYOUT_DISPLAY).optional(),
  flexDirection: z.enum(LAYOUT_FLEX_DIRECTION).optional(),
  flexWrap: z.enum(LAYOUT_FLEX_WRAP).optional(),
  justifyContent: z.enum(LAYOUT_JUSTIFY).optional(),
  alignItems: z.enum(LAYOUT_ALIGN).optional(),
  gap: cssLength.optional(),
  rowGap: cssLength.optional(),
  columnGap: cssLength.optional(),
  gridTemplateColumns: z.string().max(160).optional(),
  gridTemplateRows: z.string().max(160).optional(),
})
export type LayoutContainerStyles = z.infer<typeof layoutContainerStylesSchema>

export const layoutTextStylesSchema = layoutBoxStylesSchema.extend({
  fontSize: cssLength.optional(),
  fontWeight: z.union([z.string().max(32), z.number()]).optional(),
  lineHeight: cssLength.optional(),
  letterSpacing: cssLength.optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  color: cssColor.optional(),
})
export type LayoutTextStyles = z.infer<typeof layoutTextStylesSchema>

export const layoutImageStylesSchema = layoutBoxStylesSchema.extend({
  objectFit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).optional(),
})
export type LayoutImageStyles = z.infer<typeof layoutImageStylesSchema>

export const layoutButtonStylesSchema = layoutBoxStylesSchema.extend({
  fontSize: cssLength.optional(),
  fontWeight: z.union([z.string().max(32), z.number()]).optional(),
  color: cssColor.optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
})
export type LayoutButtonStyles = z.infer<typeof layoutButtonStylesSchema>

export type LayoutNode =
  | LayoutContainerNode
  | LayoutTextNode
  | LayoutImageNode
  | LayoutButtonNode

export interface LayoutContainerNode {
  id: string
  type: 'container'
  styles?: LayoutContainerStyles
  children?: LayoutNode[]
}

export interface LayoutTextNode {
  id: string
  type: 'text'
  content?: string
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span'
  styles?: LayoutTextStyles
}

export interface LayoutImageNode {
  id: string
  type: 'image'
  src?: string
  alt?: string
  styles?: LayoutImageStyles
}

export interface LayoutButtonNode {
  id: string
  type: 'button'
  label?: string
  href?: string
  styles?: LayoutButtonStyles
}

export const layoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      id: z.string().min(1).max(64),
      type: z.literal('container'),
      styles: layoutContainerStylesSchema.optional(),
      children: z.array(layoutNodeSchema).max(64).default([]),
    }),
    z.object({
      id: z.string().min(1).max(64),
      type: z.literal('text'),
      content: z.string().max(4000).default(''),
      tag: z.enum(['p', 'h1', 'h2', 'h3', 'h4', 'span']).default('p'),
      styles: layoutTextStylesSchema.optional(),
    }),
    z.object({
      id: z.string().min(1).max(64),
      type: z.literal('image'),
      src: z.string().max(2048).default(''),
      alt: z.string().max(400).default(''),
      styles: layoutImageStylesSchema.optional(),
    }),
    z.object({
      id: z.string().min(1).max(64),
      type: z.literal('button'),
      label: z.string().max(120).default('Button'),
      href: z.string().max(2048).default('#'),
      styles: layoutButtonStylesSchema.optional(),
    }),
  ]),
)

/** Empty root flex column — the default “Empty section”. */
export const DEFAULT_LAYOUT_CANVAS_ROOT: LayoutContainerNode = {
  id: 'root',
  type: 'container',
  styles: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: '1rem',
    padding: '1.5rem',
    width: '100%',
    minHeight: '12rem',
  },
  children: [],
}

/** Design-mode artboard — relative root; children use absolute frames. */
export const DEFAULT_DESIGN_ARTBOARD_ROOT: LayoutContainerNode = {
  id: 'root',
  type: 'container',
  styles: {
    position: 'relative',
    display: 'block',
    width: '1440px',
    minHeight: '900px',
    background: '#ffffff',
  },
  children: [],
}

export function createDesignArtboardRoot(): LayoutContainerNode {
  return {
    id: 'root',
    type: 'container',
    styles: { ...DEFAULT_DESIGN_ARTBOARD_ROOT.styles },
    children: [],
  }
}

export type LayoutNodeFrame = {
  left?: string
  top?: string
  width?: string
  height?: string
  zIndex?: number
}

/** Parse a CSS length like `120px` / `12` to a number (px). */
export function parseLayoutPx(value: string | undefined | null): number | null {
  if (value == null || value === '') return null
  const match = String(value).trim().match(/^(-?\d+(?:\.\d+)?)(px)?$/i)
  if (!match) return null
  return Number(match[1])
}

export const layoutCanvasPropsSchema = z.object({
  root: layoutNodeSchema.default(DEFAULT_LAYOUT_CANVAS_ROOT),
})
export type LayoutCanvasProps = z.infer<typeof layoutCanvasPropsSchema>

export const LAYOUT_CANVAS_BLOCK_ID = 'layout-canvas-01' as const

export function isLayoutCanvasBlock(blockId: string): boolean {
  return blockId === LAYOUT_CANVAS_BLOCK_ID
}

/** Depth-first walk for Layers Structure (and future inspectors). */
export function walkLayoutNodes(
  node: LayoutNode,
  visit: (node: LayoutNode, path: readonly string[]) => void,
  path: readonly string[] = [],
): void {
  const nextPath = [...path, node.id]
  visit(node, nextPath)
  if (node.type === 'container') {
    for (const child of node.children ?? []) walkLayoutNodes(child, visit, nextPath)
  }
}

// --- node operations (free-form editor + AI generation share these) ----------
//
// Every operation is IMMUTABLE: it returns a new tree and never mutates the
// input. The editor snapshots the previous tree for undo before calling these,
// and the AI generator builds trees with the same primitives, so a human edit
// and a generated document go through one code path (ADR-0003).

let nodeIdCounter = 0

/**
 * A collision-resistant node id. Not cryptographic — ids only need to be unique
 * within one document. A monotonic counter keeps duplicate-in-a-loop unique
 * even when two calls land in the same millisecond, and the random suffix keeps
 * ids unique across documents merged together (paste, AI insert).
 */
export function newLayoutNodeId(): string {
  nodeIdCounter = (nodeIdCounter + 1) % 1_000_000
  const random = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0')
  return `node_${nodeIdCounter.toString(36)}${random}`
}

/** A fresh node of the given type with editor-friendly defaults. */
export function createLayoutNode(type: LayoutNodeType): LayoutNode {
  const id = newLayoutNodeId()
  switch (type) {
    case 'container':
      return {
        id,
        type: 'container',
        styles: { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' },
        children: [],
      }
    case 'text':
      return { id, type: 'text', tag: 'p', content: 'Text' }
    case 'image':
      return { id, type: 'image', src: '', alt: '' }
    case 'button':
      return { id, type: 'button', label: 'Button', href: '#' }
  }
}

/** Find a node by id anywhere in the tree, or null. */
export function findLayoutNode(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root
  if (root.type === 'container') {
    for (const child of root.children ?? []) {
      const found = findLayoutNode(child, id)
      if (found) return found
    }
  }
  return null
}

/** Find a node's parent container and its index in that container, or null (root has no parent). */
export function findLayoutNodeParent(
  root: LayoutNode,
  id: string,
): { parent: LayoutContainerNode; index: number } | null {
  if (root.type !== 'container') return null
  const children = root.children ?? []
  for (let index = 0; index < children.length; index += 1) {
    if (children[index]!.id === id) return { parent: root, index }
    const nested = findLayoutNodeParent(children[index]!, id)
    if (nested) return nested
  }
  return null
}

/** True when `ancestorId` is `id` or contains `id` — the guard against moving a node into itself. */
export function isLayoutNodeDescendant(root: LayoutNode, ancestorId: string, id: string): boolean {
  const ancestor = findLayoutNode(root, ancestorId)
  if (!ancestor) return false
  return findLayoutNode(ancestor, id) !== null
}

/**
 * Rebuild the tree, replacing the node with matching id by `fn(node)`'s result.
 * Returns a new tree; untouched branches keep their object identity so Vue only
 * re-renders what changed.
 */
function rebuildLayoutTree(node: LayoutNode, id: string, fn: (node: LayoutNode) => LayoutNode): LayoutNode {
  if (node.id === id) return fn(node)
  if (node.type === 'container' && node.children?.length) {
    let changed = false
    const children = node.children.map((child) => {
      const next = rebuildLayoutTree(child, id, fn)
      if (next !== child) changed = true
      return next
    })
    return changed ? { ...node, children } : node
  }
  return node
}

/** Shallow-merge a patch onto a node, preserving its discriminant `type` and `id`. */
export function updateLayoutNode(root: LayoutNode, id: string, patch: Partial<LayoutNode>): LayoutNode {
  return rebuildLayoutTree(root, id, (node) => {
    const { type: _type, id: _id, ...safe } = patch
    return { ...node, ...safe } as LayoutNode
  })
}

/** Merge style keys onto a node; keys set to undefined/'' are removed so documents stay small. */
export function updateLayoutNodeStyles(
  root: LayoutNode,
  id: string,
  styles: Record<string, unknown>,
): LayoutNode {
  return rebuildLayoutTree(root, id, (node) => {
    const next: Record<string, unknown> = { ...(node.styles ?? {}) }
    for (const [key, value] of Object.entries(styles)) {
      if (value === undefined || value === '' || value === null) delete next[key]
      else next[key] = value
    }
    return { ...node, styles: next } as LayoutNode
  })
}

function framePx(value: number | string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value === 'number') return `${Math.round(value)}px`
  return value
}

/**
 * Set absolute frame on a node (Design mode). Always sets `position: absolute`
 * except when updating the root artboard (still relative).
 */
export function setLayoutNodeFrame(
  root: LayoutNode,
  id: string,
  frame: LayoutNodeFrame,
): LayoutNode {
  return rebuildLayoutTree(root, id, (node) => {
    const styles: Record<string, unknown> = { ...(node.styles ?? {}) }
    const isRoot = node.id === root.id
    if (!isRoot) styles.position = 'absolute'
    if (frame.left !== undefined) {
      if (frame.left === '') delete styles.left
      else styles.left = framePx(frame.left)
    }
    if (frame.top !== undefined) {
      if (frame.top === '') delete styles.top
      else styles.top = framePx(frame.top)
    }
    if (frame.width !== undefined) {
      if (frame.width === '') delete styles.width
      else styles.width = framePx(frame.width)
    }
    if (frame.height !== undefined) {
      if (frame.height === '') delete styles.height
      else styles.height = framePx(frame.height)
    }
    if (frame.zIndex !== undefined) {
      styles.zIndex = frame.zIndex
    }
    return { ...node, styles } as LayoutNode
  })
}

/** Insert `node` into the container `parentId` at `index` (default: append). No-op if parent is missing or a leaf. */
export function insertLayoutNode(
  root: LayoutNode,
  parentId: string,
  node: LayoutNode,
  index?: number,
): LayoutNode {
  return rebuildLayoutTree(root, parentId, (parent) => {
    if (parent.type !== 'container') return parent
    const children = [...(parent.children ?? [])]
    const at = index === undefined ? children.length : Math.max(0, Math.min(index, children.length))
    children.splice(at, 0, node)
    return { ...parent, children }
  })
}

/** Remove a node by id. The root is never removable. */
export function removeLayoutNode(root: LayoutNode, id: string): LayoutNode {
  if (root.id === id) return root
  function prune(node: LayoutNode): LayoutNode {
    if (node.type !== 'container' || !node.children?.length) return node
    let changed = false
    const children: LayoutNode[] = []
    for (const child of node.children) {
      if (child.id === id) {
        changed = true
        continue
      }
      const next = prune(child)
      if (next !== child) changed = true
      children.push(next)
    }
    return changed ? { ...node, children } : node
  }
  return prune(root)
}

/**
 * Move a node under a new parent at an index. Refuses to move the root, to move
 * a node into itself or a descendant (which would orphan the subtree), or into
 * a missing/leaf parent — returning the tree unchanged in those cases.
 */
export function moveLayoutNode(
  root: LayoutNode,
  id: string,
  newParentId: string,
  index: number,
): LayoutNode {
  if (id === root.id || id === newParentId) return root
  if (isLayoutNodeDescendant(root, id, newParentId)) return root
  const moving = findLayoutNode(root, id)
  const target = findLayoutNode(root, newParentId)
  if (!moving || !target || target.type !== 'container') return root

  const detached = removeLayoutNode(root, id)
  return insertLayoutNode(detached, newParentId, moving, index)
}

/** Deep-clone a subtree with every node id reissued, so a paste never collides. */
function reissueIds(node: LayoutNode): LayoutNode {
  const fresh = { ...node, id: newLayoutNodeId() }
  if (fresh.type === 'container' && node.type === 'container') {
    fresh.children = (node.children ?? []).map(reissueIds)
  }
  return fresh
}

/**
 * Duplicate a node right after itself, with fresh ids for the whole subtree.
 * Returns the new tree and the id of the top-level copy (to select it). The
 * root cannot be duplicated.
 */
export function duplicateLayoutNode(
  root: LayoutNode,
  id: string,
): { root: LayoutNode; newId: string | null } {
  const location = findLayoutNodeParent(root, id)
  if (!location) return { root, newId: null }
  const original = location.parent.children![location.index]!
  const copy = reissueIds(original)
  return { root: insertLayoutNode(root, location.parent.id, copy, location.index + 1), newId: copy.id }
}
