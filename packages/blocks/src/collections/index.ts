import type { RegistryCollection } from '@platform/schemas'
import type { CollectionBlockDefinition } from './define-collection.js'
import { MOTION_COLLECTION_BLOCKS } from './motion.js'
import { SHOWCASE_COLLECTION_BLOCKS } from './showcase.js'
import { EDITORIAL_COLLECTION_BLOCKS } from './editorial.js'
import { SPOTLIGHT_COLLECTION_BLOCKS } from './spotlight.js'
import { VENDORED_BLOCKS } from './vendor/index.js'
import { MARKETING_HERO_BLOCKS } from './marketing-heroes.js'
import { MOTIONSITES_ISLAND_BLOCKS } from './motionsites-island.js'
import { COMMERCE_COLLECTION_BLOCKS } from './commerce.js'
import { CORE_BLOCK_TAGS } from './core.js'

export * from './define-collection.js'
export * from './core.js'
export * from './motion.js'
export * from './showcase.js'
export * from './editorial.js'
export * from './spotlight.js'
export * from './marketing-heroes.js'
export * from './motionsites-island.js'
export * from './commerce.js'
export * from './vendor/index.js'

/**
 * Collection metadata.
 *
 * Collections are named for what they *are* — what a section built from one
 * looks and behaves like — never for a third-party product. Naming a collection
 * after somebody else's library implies derivation or endorsement even when the
 * code is entirely ours, and that is a trademark and misrepresentation problem
 * independent of copyright. It is also simply inaccurate: every block here is an
 * original implementation written against our own block contract, our own motion
 * layer and our own design tokens.
 *
 * `inspiration` therefore records the design vocabulary a collection works in,
 * which is not ownable — patterns are not copyrightable, specific code and
 * markup are. Where a block genuinely *is* derived from a licence-cleared
 * source, the lineage belongs on that block as attribution, not on the
 * collection as a borrowed name.
 */
export const COLLECTIONS: Omit<RegistryCollection, 'entryCount'>[] = [
  {
    id: 'core',
    name: 'Core',
    description:
      'The sections every business site needs: header, hero, services, proof, contact, footer. Mostly class A, and the pool AI generation builds from.',
    styleDirection: 'Clean, trustworthy, unfashionable on purpose',
    inspiration: 'Written for this platform from the ground up.',
    licence: 'Platform-owned. No third-party code.',
  },
  {
    id: 'motion',
    name: 'Motion',
    description:
      'Scroll as choreography: pinned sequences, sticky stacks, horizontal tracks, reveals bound to scroll position.',
    styleDirection: 'Cinematic, deliberate, editorial pacing',
    inspiration:
      'The scrollytelling tradition — scroll position as a timeline rather than as a trigger. Built on CSS and IntersectionObserver.',
    licence: 'Platform-owned. Written from scratch; no third-party code.',
  },
  {
    id: 'showcase',
    name: 'Showcase',
    description:
      'Polished marketing primitives: testimonial marquees, logo orbits, before/after sliders, animated accordions, card decks, pricing toggles.',
    styleDirection: 'Modern SaaS marketing — friendly, precise, well-finished',
    inspiration:
      'The marketing-primitive vocabulary a landing page reaches for once the copy is written. Built on native controls — button, details, input[type=range] — so they stay keyboard-operable.',
    licence: 'Platform-owned. Written from scratch; no third-party code.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description:
      'Bold and editorial: oversized type, hard split screens, brutalist grids, high-contrast calls to action.',
    styleDirection: 'Loud, typographic, high contrast, zero decoration',
    inspiration:
      'The brutalist-editorial tradition in print and on the web. Cheap to render, because type set large is not an effect.',
    licence: 'Platform-owned. Written from scratch; no third-party code.',
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    description:
      'Premium effects: aurora fields, glowing borders, 3D tilt cards, animated borders, generated text reveals.',
    styleDirection: 'Dark, luminous, expensive-feeling',
    inspiration:
      'The pointer-lit, gradient-driven effect vocabulary of premium dark interfaces. Deliberately built from gradients and transforms rather than WebGL, which is why the heaviest of these is class C.',
    licence: 'Platform-owned. Written from scratch; no third-party code.',
  },
]

/**
 * Every block declared inside a collection, in display order. `VENDORED_BLOCKS`
 * is whatever `pnpm registry:add` has installed since — empty in a clean
 * checkout, and never populated at runtime.
 */
export const COLLECTION_BLOCKS: CollectionBlockDefinition[] = [
  ...MOTION_COLLECTION_BLOCKS,
  ...SHOWCASE_COLLECTION_BLOCKS,
  ...EDITORIAL_COLLECTION_BLOCKS,
  ...SPOTLIGHT_COLLECTION_BLOCKS,
  // Marketing-layout heroes — agency proof, property cover, portrait, etc.
  ...MARKETING_HERO_BLOCKS,
  // Commerce PDP + shop chrome
  ...COMMERCE_COLLECTION_BLOCKS,
  // MotionSites React islands (ADR-0003 escape hatch — curated builds only).
  ...MOTIONSITES_ISLAND_BLOCKS,
  ...VENDORED_BLOCKS,
]

/**
 * Collection + tags for blocks that predate collections. Fed to the registry at
 * startup so `core` is a first-class collection in the picker, the lab and the
 * manifest without its definitions having to change.
 */
export const CORE_BLOCK_FACETS: Record<string, { collection: 'core'; tags: string[] }> = Object.fromEntries(
  Object.entries(CORE_BLOCK_TAGS).map(([id, tags]) => [id, { collection: 'core' as const, tags }]),
)
