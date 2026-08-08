import type { RegistryBlockMetadata, SiteTemplate } from '@platform/schemas'

/**
 * Shared catalogue splits for Website → Templates / Components and InsertPanel.
 *
 * Labels match InsertPanel section sources where they overlap:
 * Platform blocks · MotionSites · Shadcn Space · Magic UI · Studio.
 */

/** InsertPanel / Components tab labels (keep in sync). */
export const CATALOG_SOURCE_LABELS = {
  platform: 'Platform blocks',
  motionsites: 'MotionSites',
  shadcnspace: 'Shadcn Space',
  magicui: 'Magic UI',
  studio: 'Studio',
  motionTools: 'Motion tools',
  uiLibraries: 'UI libraries',
  emptyManual: 'Empty/Manual layout',
} as const

/** Website → Components primary tabs. */
export const COMPONENT_CATALOG_TABS = [
  { value: 'blocks', label: 'Blocks' },
  { value: 'motionsites', label: CATALOG_SOURCE_LABELS.motionsites },
  { value: 'motionTools', label: CATALOG_SOURCE_LABELS.motionTools },
  { value: 'uiLibraries', label: CATALOG_SOURCE_LABELS.uiLibraries },
  { value: 'empty', label: CATALOG_SOURCE_LABELS.emptyManual },
] as const

export type ComponentCatalogTab = (typeof COMPONENT_CATALOG_TABS)[number]['value']

/** Motion tools always featured (InsertPanel pin + Components → Motion tools). */
export const MOTION_TOOL_BLOCK_IDS = ['scroll-video-scrub-01'] as const

/** Blank / freeform layout block — surface when present in the registry. */
export const EMPTY_LAYOUT_BLOCK_IDS = ['layout-canvas-01'] as const

export function isShadcnSpaceId(id: string): boolean {
  return id.startsWith('shadcnspace-')
}

export function isMagicUiId(id: string): boolean {
  return id.startsWith('magicui-')
}

export function isStudioId(id: string): boolean {
  return id.startsWith('studio-')
}

export function isUiLibraryId(id: string): boolean {
  return isShadcnSpaceId(id) || isMagicUiId(id) || isStudioId(id)
}

/** Motionsites Dropbox catalogue (excludes UI-library prefixes). */
export function isMotionsitesCatalogId(id: string): boolean {
  return !isUiLibraryId(id)
}

/**
 * Full-page / multi-section recipes for Website → Templates.
 * Landing archetypes or recipes with 3+ mapped blocks.
 */
export function isPageRecipe(template: SiteTemplate): boolean {
  return template.pageType === 'landing' || template.blockRecipe.length >= 3
}

/**
 * Motionsites islands / single-band designs for Components → MotionSites.
 * Excludes multi-section page recipes (those live under Templates).
 */
export function isMotionsitesIsland(template: SiteTemplate): boolean {
  if (!isMotionsitesCatalogId(template.id)) return false
  if (isPageRecipe(template)) return false
  return (
    Boolean(template.islandReady) ||
    template.pageType === 'section' ||
    Boolean(template.sourcePrompt?.trim())
  )
}

/** Motionsites entries that are whole-page / multi-section (Templates). */
export function isMotionsitesPageRecipe(template: SiteTemplate): boolean {
  return isMotionsitesCatalogId(template.id) && isPageRecipe(template)
}

export function isUiLibraryTemplate(template: SiteTemplate): boolean {
  return isUiLibraryId(template.id)
}

export function motionToolBlocks(blocks: RegistryBlockMetadata[]): RegistryBlockMetadata[] {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  const featured = MOTION_TOOL_BLOCK_IDS.map((id) => byId.get(id)).filter(
    (block): block is RegistryBlockMetadata => Boolean(block),
  )
  // Prefer explicit pins; fall back to the whole motion collection so the tab is never empty.
  if (featured.length) return featured
  return blocks.filter((block) => block.collection === 'motion')
}

export function emptyLayoutBlocks(blocks: RegistryBlockMetadata[]): RegistryBlockMetadata[] {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  return EMPTY_LAYOUT_BLOCK_IDS.map((id) => byId.get(id)).filter(
    (block): block is RegistryBlockMetadata => Boolean(block),
  )
}

/** Platform registry blocks for Components → Blocks (exclude motion-tool pins + empty canvas). */
export function platformLabBlocks(blocks: RegistryBlockMetadata[]): RegistryBlockMetadata[] {
  const exclude = new Set<string>([...MOTION_TOOL_BLOCK_IDS, ...EMPTY_LAYOUT_BLOCK_IDS])
  return blocks.filter((block) => !exclude.has(block.id))
}
