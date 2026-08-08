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
