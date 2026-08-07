import type { CollectionId } from '@platform/schemas'

/**
 * The `core` collection is *described*, not redefined.
 *
 * The eighteen blocks in `src/library` were here first and are the sections a
 * generated business site is actually built from. Re-declaring them inside a
 * collection would fork the registry; instead this file gives each one its
 * collection membership and its search tags, and the definitions stay exactly
 * where they are.
 */
export const CORE_BLOCK_TAGS: Record<string, string[]> = {
  'header-simple-01': ['navigation', 'sticky', 'essential'],
  'footer-simple-01': ['navigation', 'contact', 'essential'],
  'hero-split-01': ['hero', 'image', 'conversion', 'essential'],
  'hero-centered-01': ['hero', 'statement', 'lightweight', 'essential'],
  'logos-strip-01': ['logos', 'social-proof', 'lightweight'],
  'stats-band-01': ['numbers', 'social-proof', 'lightweight'],
  'services-list-01': ['services', 'cards', 'links'],
  'features-grid-01': ['features', 'icons', 'grid'],
  'content-richtext-01': ['text', 'editorial', 'lightweight'],
  'testimonials-grid-01': ['reviews', 'social-proof', 'ratings'],
  'faq-accordion-01': ['faq', 'accordion', 'schema.org', 'interactive'],
  'cta-banner-01': ['cta', 'conversion', 'lightweight'],
  'contact-details-01': ['contact', 'hours', 'local', 'schema.org'],
  'hero-kinetic-01': ['hero', 'animated-typography', 'motion'],
  'showcase-parallax-01': ['parallax', 'scroll', 'image'],
  'marquee-strip-01': ['marquee', 'loop', 'motion'],
  'feature-spotlight-01': ['spotlight', 'hover', 'cards'],
  'stats-counter-01': ['numbers', 'count-up', 'scroll'],
}

export const CORE_COLLECTION: CollectionId = 'core'
