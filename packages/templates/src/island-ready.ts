/**
 * Island ids that have a built React app in `@platform/motionsites-islands`.
 * Keep in sync with `packages/motionsites-islands/ready.json`.
 */
export const MOTIONSITES_ISLAND_READY = [
  'velorah-hero',
  'asme-hero',
  'wanderful-hero',
  'nexum-hero',
  'interactive-discovery',
] as const

/** System-wide liquid-glass header — inserted once beside exact islands. */
export const MOTIONSITES_ISLAND_HEADER_BLOCK = 'header-liquid-glass-01' as const
