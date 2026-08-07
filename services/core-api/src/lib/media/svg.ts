import { parse, type HTMLElement } from 'node-html-parser'

/**
 * SVG sanitisation.
 *
 * An SVG is not an image file — it is an XML document with a script engine, a
 * fetch capability and a link target. Served from our own origin, an unfiltered
 * one is stored XSS against every session on that origin. The two defences are
 * independent and both apply:
 *
 *   1. this pass, which rewrites the document down to an element and attribute
 *      allow-list before it is ever stored, and
 *   2. the response headers on the serving route (`Content-Disposition:
 *      attachment`, a `default-src 'none'` CSP, `nosniff`), which stop a
 *      surviving construct from executing even if it survives.
 *
 * Allow-list, not deny-list: the set of dangerous SVG constructs grows with
 * every browser release, and the set of drawing primitives does not.
 */

const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'title', 'desc', 'metadata',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textpath',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clippath', 'mask',
  'filter', 'fegaussianblur', 'feoffset', 'feblend', 'feflood', 'fecomposite',
  'femerge', 'femergenode', 'fecolormatrix', 'fedropshadow',
  'marker', 'switch', 'style',
].map((name) => name.toLowerCase()))

/**
 * Attributes are matched case-insensitively and namespace-stripped, so
 * `XLINK:HREF` cannot slip past a check written for `xlink:href`.
 */
const ALLOWED_ATTRIBUTES = new Set([
  'id', 'class', 'viewbox', 'xmlns', 'version', 'width', 'height',
  'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'd', 'points', 'transform', 'fill', 'fill-rule', 'fill-opacity',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'stroke-miterlimit',
  'opacity', 'offset', 'stop-color', 'stop-opacity', 'gradientunits',
  'gradienttransform', 'patternunits', 'clip-path', 'clip-rule', 'mask',
  'filter', 'preserveaspectratio', 'font-family', 'font-size', 'font-weight',
  'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing',
  'marker-end', 'marker-start', 'marker-mid', 'vector-effect', 'shape-rendering',
  'stddeviation', 'in', 'in2', 'result', 'mode', 'type', 'values', 'flood-color',
  'flood-opacity', 'dx', 'dy', 'refx', 'refy', 'markerwidth', 'markerheight', 'orient',
])

export interface SvgSanitisation {
  svg: Buffer
  /** What was taken out. Surfaced to the uploader rather than silently dropped. */
  removed: string[]
}

function localName(name: string): string {
  const stripped = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name
  return stripped.toLowerCase()
}

function scrub(element: HTMLElement, removed: string[]): void {
  // A copy: removing a child mutates the live list we would otherwise iterate.
  for (const child of [...element.childNodes]) {
    const candidate = child as HTMLElement
    if (!candidate.tagName) continue

    const tag = localName(candidate.tagName)
    if (!ALLOWED_ELEMENTS.has(tag)) {
      removed.push(`<${tag}>`)
      candidate.remove()
      continue
    }

    scrub(candidate, removed)
  }

  for (const name of Object.keys(element.attributes ?? {})) {
    const local = localName(name)

    // Every `on*` handler, in one rule, before the allow-list is consulted —
    // so a new event name invented next year is already covered.
    if (local.startsWith('on') || !ALLOWED_ATTRIBUTES.has(local)) {
      removed.push(`@${name}`)
      element.removeAttribute(name)
      continue
    }

    const value = element.getAttribute(name) ?? ''
    // `style` can smuggle a URL, and a URL can smuggle a scheme.
    if (/(javascript|vbscript|data)\s*:/i.test(value.replace(/\s+/g, ''))) {
      removed.push(`@${name}`)
      element.removeAttribute(name)
    }
  }
}

/**
 * Returns the safe form of an SVG document, or `null` when the input has no
 * `<svg>` root at all — which means it is something else pretending.
 */
export function sanitiseSvg(input: Buffer): SvgSanitisation | null {
  const source = input.toString('utf8')
  const root = parse(source, { comment: false, lowerCaseTagName: false })

  const svg = root.querySelector('svg')
  if (!svg) return null

  const removed: string[] = []
  scrub(svg, removed)

  // Serialise the `<svg>` subtree alone. Anything the document carried outside
  // the root element — a stray script, an HTML wrapper — does not come along.
  return { svg: Buffer.from(svg.toString(), 'utf8'), removed }
}
