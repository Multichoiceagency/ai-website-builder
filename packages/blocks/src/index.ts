/**
 * `@platform/blocks` — the universal block registry.
 *
 * Framework-agnostic definitions only. Renderers live in per-framework packages
 * (`@platform/blocks-nuxt` today) and resolve by block id. See ADR-0003.
 *
 * Blocks are organised into collections (`core`, `motion`, `showcase`,
 * `editorial`, `spotlight`). A collection is metadata, not a mechanism: every
 * block, wherever it was declared, ends up in the same registry and is reachable
 * through the same `searchBlocks()` query the AI selector uses.
 */
import { registerBlock, registerBlockFacets } from './registry.js'
import { footerSimple01, headerSimple01 } from './library/layout.js'
import { heroCentered01, heroSplit01 } from './library/hero.js'
import { contentRichText01, faqAccordion01, featuresGrid01, servicesList01 } from './library/content.js'
import { logosStrip01, statsBand01, testimonialsGrid01 } from './library/proof.js'
import { contactDetails01, ctaBanner01 } from './library/conversion.js'
import {
  featureSpotlight01,
  heroKinetic01,
  marqueeStrip01,
  showcaseParallax01,
  statsCounter01,
} from './library/experience.js'
import { COLLECTION_BLOCKS, CORE_BLOCK_FACETS } from './collections/index.js'

export * from './define.js'
export * from './registry.js'
export * from './fields.js'
export * from './collections/index.js'

/** The blocks that predate collections. Described as `core`, never rewritten. */
const CORE_BLOCKS = [
  headerSimple01,
  heroSplit01,
  heroCentered01,
  logosStrip01,
  statsBand01,
  servicesList01,
  featuresGrid01,
  contentRichText01,
  testimonialsGrid01,
  faqAccordion01,
  ctaBanner01,
  contactDetails01,
  footerSimple01,

  // Experience UI (§4). Class B–C: available to pick, kept out of generated
  // sites unless the site's performance ceiling allows them.
  heroKinetic01,
  showcaseParallax01,
  marqueeStrip01,
  featureSpotlight01,
  statsCounter01,
]

/** Everything the platform ships, registered in display order. */
export const BUILT_IN_BLOCKS = [...CORE_BLOCKS, ...COLLECTION_BLOCKS]

for (const block of BUILT_IN_BLOCKS) registerBlock(block)

// Core blocks carry no collection of their own, so their facets are attached
// here rather than by editing eighteen definitions that were already correct.
for (const [id, facet] of Object.entries(CORE_BLOCK_FACETS)) registerBlockFacets(id, facet)

export {
  headerSimple01,
  footerSimple01,
  heroSplit01,
  heroCentered01,
  featuresGrid01,
  servicesList01,
  contentRichText01,
  faqAccordion01,
  statsBand01,
  testimonialsGrid01,
  logosStrip01,
  ctaBanner01,
  contactDetails01,
  heroKinetic01,
  showcaseParallax01,
  marqueeStrip01,
  featureSpotlight01,
  statsCounter01,
}
