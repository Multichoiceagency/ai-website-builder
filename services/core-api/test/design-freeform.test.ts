import { describe, expect, it } from 'vitest'
import {
  createDesignArtboardRoot,
  createLayoutNode,
  insertLayoutNode,
  layoutBoxStylesSchema,
  layoutCanvasPropsSchema,
  parseLayoutPx,
  setLayoutNodeFrame,
} from '@platform/schemas'
import { htmlToLayoutRoot } from '../src/lib/ai/design-import.js'
import { optimizeDesignRoot } from '../src/lib/ai/design-optimize.js'

describe('layout absolute frame', () => {
  it('round-trips position styles in the schema', () => {
    const parsed = layoutBoxStylesSchema.parse({
      position: 'absolute',
      left: '120px',
      top: '40px',
      width: '200px',
      height: '80px',
      zIndex: 3,
    })
    expect(parsed.position).toBe('absolute')
    expect(parsed.left).toBe('120px')
    expect(parsed.zIndex).toBe(3)
  })

  it('setLayoutNodeFrame is immutable and sets absolute children', () => {
    const root = createDesignArtboardRoot()
    const child = createLayoutNode('text')
    const withChild = insertLayoutNode(root, root.id, child)
    const framed = setLayoutNodeFrame(withChild, child.id, {
      left: '10px',
      top: '20px',
      width: '100px',
      height: '40px',
    })
    expect(withChild).not.toBe(framed)
    const node = framed.type === 'container' ? framed.children?.[0] : null
    expect(node?.styles?.position).toBe('absolute')
    expect(node?.styles?.left).toBe('10px')
    expect(parseLayoutPx('10px')).toBe(10)
  })
})

describe('htmlToLayoutRoot', () => {
  it('maps absolute HTML into artboard children with left/top', () => {
    const root = htmlToLayoutRoot(`
      <div style="position:absolute;left:50px;top:80px;width:200px;height:40px">
        <p>Hello fitness</p>
      </div>
      <img src="https://cdn.sanity.io/images/x/y.jpg" alt="Hero" style="position:absolute;left:10px;top:10px;width:100px;height:100px" />
    `)
    expect(root.styles?.position).toBe('relative')
    expect(root.children?.length).toBeGreaterThanOrEqual(1)
    layoutCanvasPropsSchema.parse({ root })
    const abs = (root.children ?? []).filter((c) => c.styles?.position === 'absolute')
    expect(abs.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects empty HTML', () => {
    expect(() => htmlToLayoutRoot('   ')).toThrow(/empty/i)
  })
})

describe('optimizeDesignRoot', () => {
  it('returns a validated layout-canvas root without registry blocks', async () => {
    const root = createDesignArtboardRoot()
    const text = createLayoutNode('text')
    const tree = insertLayoutNode(root, root.id, text)
    const result = await optimizeDesignRoot({
      root: tree,
      instruction: 'Add more spacing and air',
    })
    expect(result.root.type).toBe('container')
    layoutCanvasPropsSchema.parse({ root: result.root })
    expect(JSON.stringify(result.root)).not.toMatch(/scroll-video|motion-section|header-/)
  })
})
