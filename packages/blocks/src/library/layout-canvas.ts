import { z } from 'zod'
import {
  DEFAULT_LAYOUT_CANVAS_ROOT,
  LAYOUT_CANVAS_BLOCK_ID,
  layoutCanvasPropsSchema,
  layoutNodeSchema,
} from '@platform/schemas'
import { defineBlock } from '../define.js'

/**
 * Empty / manual layout canvas — nestable flex & grid tree (Wave 0.5).
 *
 * ADR-0003: the page stores `{ block, props: { root } }` only. Structure editing
 * (Layers → Structure) and the node inspector land in follow-up waves; this
 * block must exist so InsertPanel / Components pins are not ghosts.
 */
export const layoutCanvas01 = defineBlock({
  id: LAYOUT_CANVAS_BLOCK_ID,
  name: 'Empty section',
  description:
    'Blank nestable layout: flex or grid containers holding text, images and buttons. Start empty and build the structure yourself.',
  category: 'content',
  capabilities: ['layout', 'flex', 'grid', 'nestable', 'empty', 'manual'],
  industries: ['*'],
  style: ['minimal', 'clean', 'manual'],
  performanceClass: 'A',
  // Below content-richtext so AI site plans never prefer an empty canvas.
  scores: { performance: 96, accessibility: 96, mobile: 96 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  // Tree editing is Layers Structure / inspector — not SectionForm fields yet.
  fields: [],
  schema: layoutCanvasPropsSchema as z.ZodType<Record<string, unknown>, z.ZodTypeDef, unknown>,
})

/** Re-export for editor helpers that already import from `@platform/blocks`. */
export {
  DEFAULT_LAYOUT_CANVAS_ROOT,
  LAYOUT_CANVAS_BLOCK_ID,
  layoutCanvasPropsSchema,
  layoutNodeSchema,
}
