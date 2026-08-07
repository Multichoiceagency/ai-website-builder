import {
  sectionSchema,
  type CollectionId,
  type PerformanceClass,
  type RegistryBlockMetadata,
  type RegistryBlockQuery,
  type Section,
} from '@platform/schemas'
import { toBlockMetadata, type BlockDefinition } from './define.js'

export class UnknownBlockError extends Error {
  readonly code = 'unknown_block'

  constructor(readonly blockId: string) {
    super(`Unknown block: ${blockId}`)
    this.name = 'UnknownBlockError'
  }
}

export class InvalidBlockPropsError extends Error {
  readonly code = 'invalid_block_props'

  constructor(
    readonly blockId: string,
    readonly issues: { path: string; message: string }[],
  ) {
    super(`Invalid props for block "${blockId}": ${issues.map((i) => `${i.path} ${i.message}`).join('; ')}`)
    this.name = 'InvalidBlockPropsError'
  }
}

const registry = new Map<string, BlockDefinition>()

export const PERFORMANCE_CLASS_ORDER: Record<PerformanceClass, number> = { A: 0, B: 1, C: 2, D: 3 }

/**
 * The two facets a collection adds to a block. Read structurally rather than
 * imported, so `registry.ts` never has to know that collections exist — which
 * is what keeps `collections/` a leaf of the dependency graph.
 */
export interface BlockFacets {
  collection: CollectionId
  tags: string[]
}

const DEFAULT_FACETS: BlockFacets = { collection: 'core', tags: [] }

const facets = new Map<string, BlockFacets>()

/**
 * Attach a collection and tags to a block that does not carry them itself —
 * the eighteen blocks that predate collections. Blocks declared with
 * `defineCollectionBlock` register their own facets automatically.
 */
export function registerBlockFacets(id: string, facet: BlockFacets): void {
  facets.set(id, { collection: facet.collection, tags: [...facet.tags] })
}

function facetsFor(definition: BlockDefinition): BlockFacets {
  const declared = definition as Partial<BlockFacets>
  if (declared.collection) return { collection: declared.collection, tags: declared.tags ?? [] }
  return facets.get(definition.id) ?? DEFAULT_FACETS
}

export function registerBlock(definition: BlockDefinition): void {
  const existing = registry.get(definition.id)
  if (existing && existing !== definition) {
    throw new Error(`Duplicate block id "${definition.id}" — block ids are permanent and unique.`)
  }
  registry.set(definition.id, definition)

  const declared = definition as Partial<BlockFacets>
  if (declared.collection) registerBlockFacets(definition.id, { collection: declared.collection, tags: declared.tags ?? [] })
}

export function getBlock(id: string): BlockDefinition | undefined {
  return registry.get(id)
}

export function requireBlock(id: string): BlockDefinition {
  const definition = registry.get(id)
  if (!definition) throw new UnknownBlockError(id)
  return definition
}

export function listBlocks(): BlockDefinition[] {
  return [...registry.values()]
}

export function listBlockMetadata(): RegistryBlockMetadata[] {
  return listBlocks().map((definition) => ({ ...toBlockMetadata(definition), ...facetsFor(definition) }))
}

/** How many registered blocks each collection holds. Drives the lab and the CLI. */
export function countBlocksByCollection(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const definition of listBlocks()) {
    const { collection } = facetsFor(definition)
    counts[collection] = (counts[collection] ?? 0) + 1
  }
  return counts
}

/**
 * The one query surface shared by the dashboard block picker, the component lab
 * and the AI block selector, so a human and an agent always see the same
 * catalogue (ADR-0003).
 *
 * `collection` and `tags` widen the query without touching its semantics: the
 * performance ceiling is still applied first and still excludes heavy blocks
 * from generated sites, whatever collection they belong to.
 */
export function searchBlocks(query: RegistryBlockQuery = {}): RegistryBlockMetadata[] {
  const search = query.search?.trim().toLowerCase()
  const ceiling = query.maxPerformanceClass ? PERFORMANCE_CLASS_ORDER[query.maxPerformanceClass] : undefined
  const wantedTags = query.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ?? []

  return listBlockMetadata().filter((block) => {
    if (query.category && block.category !== query.category) return false
    if (ceiling !== undefined && PERFORMANCE_CLASS_ORDER[block.performanceClass] > ceiling) return false
    if (query.minPerformanceScore !== undefined && block.scores.performance < query.minPerformanceScore) {
      return false
    }
    if (query.industry && !block.industries.includes('*') && !block.industries.includes(query.industry)) {
      return false
    }
    if (query.style && !block.style.includes(query.style)) return false
    if (query.collection && block.collection !== query.collection) return false
    if (wantedTags.length) {
      // Every requested tag must match: `?tags=scroll,sticky` means both.
      const blockTags = block.tags.map((tag) => tag.toLowerCase())
      if (!wantedTags.every((tag) => blockTags.includes(tag))) return false
    }
    if (search) {
      const haystack = `${block.id} ${block.name} ${block.description} ${block.capabilities.join(' ')} ${block.tags.join(' ')}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    return true
  })
}

/** Validate props against a block's schema. Throws — use on writes. */
export function validateBlockProps(blockId: string, props: unknown): Record<string, unknown> {
  const definition = requireBlock(blockId)
  const result = definition.schema.safeParse(props ?? {})
  if (!result.success) {
    throw new InvalidBlockPropsError(
      blockId,
      result.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    )
  }
  return result.data
}

/** Validate one placed section, filling defaults. Throws — use on writes. */
export function normalizeSection(input: unknown): Section {
  const section = sectionSchema.parse(input)
  return { ...section, props: validateBlockProps(section.block, section.props) }
}

/** Validate a whole page document. Throws on the first bad section. */
export function normalizeDocument(input: unknown): Section[] {
  if (!Array.isArray(input)) throw new TypeError('A page document must be an array of sections.')
  return input.map((section) => normalizeSection(section))
}

/**
 * Render-time props resolution. Never throws: a block revision or a hand-edited
 * document must not be able to take a live page down, so invalid props fall
 * back to the block's defaults.
 */
export function resolveRenderProps(section: Section): Record<string, unknown> {
  const definition = registry.get(section.block)
  if (!definition) return {}
  const result = definition.schema.safeParse(section.props ?? {})
  return result.success ? result.data : definition.schema.parse({})
}

/**
 * Section ids only need to be unique within one page document, so this stays
 * dependency-free and works identically in Node and in the browser.
 */
function randomSectionId(length = 12): string {
  let id = ''
  while (id.length < length) id += Math.random().toString(36).slice(2)
  return `sec_${id.slice(0, length)}`
}

/** Create a new section ready to be appended to a page. */
export function createSection(blockId: string, props: Record<string, unknown> = {}): Section {
  const definition = requireBlock(blockId)
  return {
    id: randomSectionId(),
    block: definition.id,
    props: validateBlockProps(definition.id, { ...definition.schema.parse({}), ...props }),
    motion: definition.defaultMotion,
  }
}

/** Test seam only. Never call this from application code. */
export function __resetRegistryForTests(): void {
  registry.clear()
  facets.clear()
}
