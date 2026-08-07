import { rendersConfigurableHeading, type HeadingLevel, type Section, type Seo } from '@platform/schemas'

/**
 * Reading a page document for SEO purposes.
 *
 * Pages are `{ block, props }` documents, not HTML (ADR-0003), so every signal
 * an audit needs — copy, links, headings — is derived here rather than by
 * rendering and parsing markup. That is also what keeps the audit usable on a
 * draft that has never been rendered.
 */

/** What the SEO module needs to know about one page. */
export interface SeoPageInput {
  id: string
  path: string
  title: string
  status: 'draft' | 'published'
  seo: Seo
  sections: Section[]
  publishedAt: string | null
  updatedAt: string
}

/** Prop keys that hold a link rather than copy. */
function isLinkKey(key: string): boolean {
  return key.toLowerCase().endsWith('href')
}

/** Prop keys that hold an asset or an identifier rather than readable copy. */
function isNonCopyKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    isLinkKey(lower) ||
    lower.endsWith('url') ||
    lower.endsWith('image') ||
    lower === 'logo' ||
    lower === 'icon' ||
    lower === 'sku' ||
    lower === 'preset' ||
    lower === 'tone' ||
    lower === 'align' ||
    lower === 'speed' ||
    lower === 'intensity'
  )
}

/**
 * Walk a props object, handing every string leaf to a visitor together with the
 * key it sat under. Blocks nest arrays of objects (`items`, `links`), so this
 * has to recurse rather than read one level.
 */
function walkProps(value: unknown, key: string, visit: (key: string, value: string) => void): void {
  if (typeof value === 'string') {
    visit(key, value)
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) walkProps(entry, key, visit)
    return
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      walkProps(childValue, childKey, visit)
    }
  }
}

/** Every internal or external link a page points at, in document order. */
export function collectLinks(sections: Section[]): string[] {
  const links: string[] = []
  for (const section of sections) {
    walkProps(section.props, section.block, (key, value) => {
      if (isLinkKey(key) && value.trim()) links.push(value.trim())
    })
  }
  return links
}

/** Every readable copy value on a page, one entry per prop leaf. */
export function collectCopyValues(sections: Section[]): string[] {
  const values: string[] = []
  for (const section of sections) {
    walkProps(section.props, section.block, (key, value) => {
      if (!isNonCopyKey(key) && value.trim()) values.push(value.trim())
    })
  }
  return values
}

/** The readable copy of a page, joined into one string. */
export function collectText(sections: Section[]): string {
  return collectCopyValues(sections).join(' ')
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/**
 * Hero blocks are what a renderer turns into the page's `<h1>`, so "how many
 * heroes" is the same question as "how many H1s" — and two of them is the
 * classic generated-page defect.
 */
export function heroSections(sections: Section[]): Section[] {
  return sections.filter((section) => section.block.startsWith('hero-'))
}

/**
 * The rank a block renders on its own: `h1` for a hero, `h2` for every other
 * section. This is the convention the block library is built on, and it is what
 * a page renders when no section overrides it.
 */
export function naturalHeadingLevel(section: Section): HeadingLevel {
  return section.block.startsWith('hero-') ? 'h1' : 'h2'
}

/**
 * The rank a section actually renders.
 *
 * A declared level only counts for a block whose renderer accepts one
 * (`HEADING_LEVEL_AWARE_BLOCKS`). Believing it everywhere would make the audit
 * describe an outline the page does not have.
 */
export function effectiveHeadingLevel(section: Section): HeadingLevel {
  const declared = section.seo?.headingLevel
  if (declared && rendersConfigurableHeading(section.block)) return declared
  return naturalHeadingLevel(section)
}

/** The section's own heading text, whichever prop the block calls it. */
export function sectionHeading(section: Section): string {
  const props = section.props as { heading?: unknown; headline?: unknown }
  const value = typeof props.heading === 'string' ? props.heading : props.headline
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Whether this section puts a heading in the document outline. Heroes always
 * do — their renderers emit the tag even when the headline is empty, which is
 * itself worth knowing. Other blocks only render theirs when it has text.
 */
export function rendersHeading(section: Section): boolean {
  return section.block.startsWith('hero-') || sectionHeading(section).length > 0
}

/** Question/answer pairs a section carries, for FAQ structured data. */
export function faqItems(section: Section): { question: string; answer: string }[] {
  const items = (section.props as { items?: unknown }).items
  if (!Array.isArray(items)) return []

  return items
    .map((item) => item as { question?: unknown; answer?: unknown })
    .filter((item) => typeof item.question === 'string' && typeof item.answer === 'string')
    .map((item) => ({ question: String(item.question).trim(), answer: String(item.answer).trim() }))
    .filter((item) => item.question && item.answer)
}

export function hasBlock(sections: Section[], blockId: string): boolean {
  return sections.some((section) => section.block === blockId)
}

export function findSections(sections: Section[], blockId: string): Section[] {
  return sections.filter((section) => section.block === blockId)
}

/** A link that points at another page of this site, normalized to a path. */
export function internalPath(href: string): string | null {
  const value = href.trim()
  if (!value.startsWith('/')) return null
  // Anchors and query strings address the same document.
  const path = value.split('#')[0]!.split('?')[0]!
  if (!path) return null
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path
}

/** The title a search engine will show: the SEO override, else the page title. */
export function effectiveTitle(page: Pick<SeoPageInput, 'title' | 'seo'>): string {
  return (page.seo.title ?? '').trim() || page.title.trim()
}
