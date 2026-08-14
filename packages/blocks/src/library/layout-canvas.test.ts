import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LAYOUT_CANVAS_ROOT,
  LAYOUT_CANVAS_BLOCK_ID,
  isLayoutCanvasBlock,
  layoutCanvasPropsSchema,
  resolveLayoutBind,
  walkLayoutNodes,
} from '@platform/schemas'
import { createSection, getBlock, resolveRenderProps } from '../index.js'
import { layoutCanvas01 } from './layout-canvas.js'

describe('layout-canvas-01', () => {
  it('registers with empty flex-column root defaults', () => {
    const block = getBlock(LAYOUT_CANVAS_BLOCK_ID)
    expect(block?.id).toBe(LAYOUT_CANVAS_BLOCK_ID)
    expect(block?.name).toBe('Empty section')

    const defaults = layoutCanvas01.schema.parse({})
    expect(defaults.root).toMatchObject({
      id: 'root',
      type: 'container',
      children: [],
    })
    expect(defaults.root).toEqual(layoutCanvasPropsSchema.parse({}).root)
    expect(DEFAULT_LAYOUT_CANVAS_ROOT.styles?.display).toBe('flex')
    expect(DEFAULT_LAYOUT_CANVAS_ROOT.styles?.flexDirection).toBe('column')
  })

  it('createSection yields ADR-0003 section shape only', () => {
    const section = createSection(LAYOUT_CANVAS_BLOCK_ID)
    expect(section.block).toBe(LAYOUT_CANVAS_BLOCK_ID)
    expect(section.props).toHaveProperty('root')
    expect(Object.keys(section).sort()).toEqual(['block', 'id', 'motion', 'props'].sort())
    expect(isLayoutCanvasBlock(section.block)).toBe(true)
  })

  it('resolveRenderProps recovers from invalid tree', () => {
    const props = resolveRenderProps({
      id: 'sec_test',
      block: LAYOUT_CANVAS_BLOCK_ID,
      props: { root: { type: 'not-a-node' } },
    })
    expect(props.root).toMatchObject({ id: 'root', type: 'container' })
  })

  it('walkLayoutNodes visits nested containers', () => {
    const tree = layoutCanvasPropsSchema.parse({
      root: {
        id: 'root',
        type: 'container',
        children: [
          {
            id: 'row',
            type: 'container',
            styles: { display: 'flex', flexDirection: 'row', gap: '1rem' },
            children: [
              { id: 't1', type: 'text', content: 'Hello' },
              { id: 'b1', type: 'button', label: 'Go', href: '/go' },
            ],
          },
        ],
      },
    })
    const ids: string[] = []
    walkLayoutNodes(tree.root, (node) => ids.push(node.id))
    expect(ids).toEqual(['root', 'row', 't1', 'b1'])
  })

  it('keeps customScripts empty by default and accepts https src', () => {
    const parsed = layoutCanvasPropsSchema.parse({})
    expect(parsed.customScripts).toEqual([])
    const withScript = layoutCanvasPropsSchema.parse({
      customScripts: [{ id: 's1', src: 'https://cdn.example.com/x.js' }],
    })
    expect(withScript.customScripts).toHaveLength(1)
    expect(() =>
      layoutCanvasPropsSchema.parse({
        customScripts: [{ id: 's1', src: 'http://insecure.example/x.js' }],
      }),
    ).toThrow()
  })

  it('resolves CMS and URL binds without storing payloads', () => {
    expect(
      resolveLayoutBind({ source: 'url', queryKey: 'headline' }, { query: { headline: 'Hello' } }),
    ).toBe('Hello')
    expect(
      resolveLayoutBind(
        { source: 'cms', path: 'fields.hero' },
        { cms: { fields: { hero: 'From CMS' } } },
      ),
    ).toBe('From CMS')
  })
})
