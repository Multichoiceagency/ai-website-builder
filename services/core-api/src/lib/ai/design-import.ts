/**
 * HTML → layout-canvas tree (Design import / Figma clipboard).
 * Maps basic tags only — never Motionsites / registry blocks (ADR-0003).
 */
import { parse as parseHtml, type HTMLElement } from 'node-html-parser'
import {
  createLayoutNode,
  layoutCanvasPropsSchema,
  type LayoutContainerNode,
  type LayoutNode,
} from '@platform/schemas'

const MAX_HTML_CHARS = 400_000
const MAX_DEPTH = 24
const MAX_NODES = 200

function parseInlineStyle(styleAttr: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!styleAttr) return out
  for (const part of styleAttr.split(';')) {
    const idx = part.indexOf(':')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim().toLowerCase()
    const value = part.slice(idx + 1).trim()
    if (key && value) out[key] = value
  }
  return out
}

function camelStyles(inline: Record<string, string>): Record<string, unknown> {
  const styles: Record<string, unknown> = {}
  const map: Record<string, string> = {
    width: 'width',
    height: 'height',
    left: 'left',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    padding: 'padding',
    margin: 'margin',
    background: 'background',
    'background-color': 'background',
    'border-radius': 'borderRadius',
    opacity: 'opacity',
    'font-size': 'fontSize',
    'font-weight': 'fontWeight',
    'line-height': 'lineHeight',
    'letter-spacing': 'letterSpacing',
    'text-align': 'textAlign',
    color: 'color',
    'z-index': 'zIndex',
    position: 'position',
    display: 'display',
    'flex-direction': 'flexDirection',
    gap: 'gap',
    'object-fit': 'objectFit',
  }
  for (const [css, key] of Object.entries(map)) {
    const raw = inline[css]
    if (!raw) continue
    if (key === 'opacity' || key === 'zIndex' || key === 'fontWeight') {
      const num = Number(raw)
      if (Number.isFinite(num)) styles[key] = num
      else if (key === 'fontWeight') styles[key] = raw
    } else if (key === 'position' && (raw === 'absolute' || raw === 'relative')) {
      styles.position = raw
    } else if (key === 'display' && (raw === 'block' || raw === 'flex' || raw === 'grid')) {
      styles.display = raw
    } else if (key === 'flexDirection') {
      styles.flexDirection = raw
    } else if (key === 'objectFit') {
      styles.objectFit = raw
    } else if (key === 'textAlign') {
      styles.textAlign = raw
    } else {
      styles[key] = raw
    }
  }
  return styles
}

function textContent(el: HTMLElement): string {
  return (el.text || '').replace(/\s+/g, ' ').trim().slice(0, 4000)
}

function mapElement(el: HTMLElement, depth: number, counter: { n: number }): LayoutNode | null {
  if (depth > MAX_DEPTH || counter.n >= MAX_NODES) return null
  if (el.nodeType !== 1) return null
  const tag = el.tagName.toLowerCase()
  if (['script', 'style', 'meta', 'link', 'noscript', 'svg', 'path'].includes(tag)) return null

  counter.n += 1
  const inline = parseInlineStyle(el.getAttribute('style') ?? undefined)
  const styles = camelStyles(inline)

  if (tag === 'img') {
    const node = createLayoutNode('image')
    if (node.type !== 'image') return null
    return {
      ...node,
      src: (el.getAttribute('src') || '').slice(0, 2048),
      alt: (el.getAttribute('alt') || '').slice(0, 400),
      styles: {
        ...styles,
        ...(styles.position ? {} : Object.keys(styles).some((k) => k === 'left' || k === 'top')
          ? { position: 'absolute' as const }
          : {}),
      },
    }
  }

  if (tag === 'a' || tag === 'button') {
    const node = createLayoutNode('button')
    if (node.type !== 'button') return null
    const label = textContent(el) || 'Button'
    return {
      ...node,
      label: label.slice(0, 120),
      href: (el.getAttribute('href') || '#').slice(0, 2048),
      styles: {
        ...styles,
        ...(inline.left || inline.top ? { position: 'absolute' as const } : {}),
      },
    }
  }

  if (['h1', 'h2', 'h3', 'h4', 'p', 'span', 'label', 'li'].includes(tag)) {
    const node = createLayoutNode('text')
    if (node.type !== 'text') return null
    const tagName =
      tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'span' || tag === 'p'
        ? tag
        : 'p'
    return {
      ...node,
      tag: tagName,
      content: textContent(el) || 'Text',
      styles: {
        ...styles,
        ...(inline.left || inline.top ? { position: 'absolute' as const } : {}),
      },
    }
  }

  // Containers: div, section, article, main, header, footer, nav, ul, body, …
  const children: LayoutNode[] = []
  for (const child of el.childNodes) {
    if ((child as HTMLElement).nodeType === 1) {
      const mapped = mapElement(child as HTMLElement, depth + 1, counter)
      if (mapped) children.push(mapped)
    } else if ((child as { nodeType?: number; text?: string }).nodeType === 3) {
      const text = ((child as { text?: string }).text || '').replace(/\s+/g, ' ').trim()
      if (text) {
        counter.n += 1
        const textNode = createLayoutNode('text')
        if (textNode.type === 'text') {
          children.push({ ...textNode, content: text.slice(0, 4000), tag: 'p' })
        }
      }
    }
  }

  const node = createLayoutNode('container')
  if (node.type !== 'container') return null
  const hasAbs = inline.position === 'absolute' || Boolean(inline.left || inline.top)
  return {
    ...node,
    styles: {
      display: (styles.display as 'block' | 'flex' | 'grid') || (hasAbs ? 'block' : 'flex'),
      flexDirection: (styles.flexDirection as 'column') || 'column',
      ...(hasAbs ? {} : { gap: (styles.gap as string) || '0.5rem' }),
      ...styles,
      position: hasAbs ? ('absolute' as const) : ('relative' as const),
    },
    children,
  }
}

/**
 * Convert an HTML document/fragment into a validated layout-canvas root.
 */
export function htmlToLayoutRoot(html: string): LayoutContainerNode {
  const trimmed = html.trim()
  if (!trimmed) {
    throw new Error('HTML was empty.')
  }
  if (trimmed.length > MAX_HTML_CHARS) {
    throw new Error(`HTML is larger than ${Math.floor(MAX_HTML_CHARS / 1000)}k characters.`)
  }

  const doc = parseHtml(trimmed, { comment: false })
  const body = doc.querySelector('body') || doc
  const counter = { n: 0 }
  const children: LayoutNode[] = []

  for (const child of body.childNodes) {
    if ((child as HTMLElement).nodeType === 1) {
      const mapped = mapElement(child as HTMLElement, 0, counter)
      if (mapped) children.push(mapped)
    }
  }

  if (!children.length) {
    // Whole body as one text if only text nodes
    const text = textContent(body as HTMLElement)
    if (text) {
      const t = createLayoutNode('text')
      if (t.type === 'text') children.push({ ...t, content: text })
    }
  }

  if (!children.length) {
    throw new Error('No importable elements found in that HTML.')
  }

  const hasAbsolute = children.some(
    (child) => child.styles && 'position' in child.styles && child.styles.position === 'absolute',
  )

  const root: LayoutContainerNode = {
    id: 'root',
    type: 'container',
    styles: {
      position: 'relative',
      display: hasAbsolute ? 'block' : 'flex',
      flexDirection: 'column',
      gap: hasAbsolute ? undefined : '1rem',
      width: '1440px',
      minHeight: '900px',
      background: '#ffffff',
      padding: hasAbsolute ? undefined : '1.5rem',
    },
    children,
  }

  return layoutCanvasPropsSchema.parse({ root }).root as LayoutContainerNode
}
