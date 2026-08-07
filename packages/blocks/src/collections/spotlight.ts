import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import {
  ctaFields,
  ctaProps,
  featureItemFields,
  featureItemSchema,
  statItemFields,
  statItemSchema,
} from './shared.js'
import { field, imageUrl, longText, text } from '../fields.js'

/**
 * The `spotlight` collection — premium effects.
 *
 * Aurora fields, pointer spotlights, animated borders, 3D tilt. The tier where
 * a section is expected to feel expensive. Two rules keep that from becoming a
 * performance apology:
 *
 *  1. No effect here uses WebGL or a canvas. They are gradients, blurs and
 *     transforms — things the compositor already knows how to draw — which is
 *     why the heaviest of them is class C rather than D.
 *  2. Every effect layer is `aria-hidden` and `pointer-events: none`. Turning
 *     the decoration off leaves the section fully readable and fully operable.
 */

export const heroAurora01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['aurora', 'gradient', 'ambient', 'dark'],
  id: 'hero-aurora-01',
  name: 'Hero — aurora field',
  description:
    'Slow bands of colour drifting behind a centred statement. Expensive to paint on large screens, so it earns its place only above the fold.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'image', 'motion', 'ambient'],
  industries: ['saas', 'agency', 'beauty', 'consultant', 'ecommerce'],
  style: ['premium', 'cinematic', 'dark', 'modern'],
  performanceClass: 'C',
  scores: { performance: 85, accessibility: 96, mobile: 84 },
  defaultMotion: { preset: 'hero-reveal', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.text('secondaryLabel', 'Secondary button', { help: 'Leave empty to hide.' }),
    field.url('secondaryHref', 'Secondary link'),
    field.image('image', 'Optional background'),
    field.url('video', 'Background video', {
      help: 'Same-origin path (e.g. /motionsites/…). When set, plays instead of the image.',
    }),
    field.text('imageAlt', 'Background description'),
    field.select('intensity', 'Effect intensity', [
      { label: 'Subtle', value: 'subtle' },
      { label: 'Pronounced', value: 'pronounced' },
    ]),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: text('Software that feels inevitable'),
    subheadline: longText('One sentence that explains the product without explaining the industry.'),
    primaryLabel: text('Get started'),
    primaryHref: text('/contact'),
    secondaryLabel: text(''),
    secondaryHref: text(''),
    image: imageUrl(''),
    /** Same-origin looping background (`.mp4`); `imageUrl` allows any path string. */
    video: imageUrl(''),
    imageAlt: text(''),
    intensity: z.enum(['subtle', 'pronounced']).default('subtle'),
  }),
})

export const featuresGlowCards01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['glow', 'border', 'cards', 'hover'],
  id: 'features-glow-cards-01',
  name: 'Features — glowing borders',
  description:
    'Cards whose borders light up from the pointer as it crosses the grid. The glow is a background layer, so nothing reflows on hover.',
  category: 'features',
  capabilities: ['heading', 'list', 'icons', 'hover', 'motion'],
  industries: ['saas', 'agency', 'consultant', 'ecommerce', 'accounting'],
  style: ['premium', 'dark', 'modern'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Cards', featureItemFields, { itemLabel: 'Card', maxItems: 9 }),
  ],
  schema: z.object({
    heading: text('Built for the details'),
    intro: longText(''),
    items: z
      .array(featureItemSchema)
      .max(9)
      .default([
        { icon: 'bolt', title: 'Instant', description: 'Every page rendered ahead of time and served from the edge.' },
        { icon: 'shield', title: 'Guarded', description: 'Isolated per customer, audited on every change.' },
        { icon: 'sparkles', title: 'Considered', description: 'Designed to a system, not assembled from a template.' },
      ]),
  }),
})

export const galleryTiltCards01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['3d', 'tilt', 'hover', 'showcase'],
  id: 'gallery-tilt-cards-01',
  name: 'Showcase — tilting cards',
  description:
    'Cards that tip towards the pointer in perspective, lifting their caption as they go. Pointer-only, so touch devices get a still, tidy grid.',
  category: 'gallery',
  capabilities: ['image', 'list', 'hover', 'motion', '3d'],
  industries: ['agency', 'ecommerce', 'real_estate', 'automotive', 'beauty'],
  style: ['premium', 'modern', 'cinematic'],
  performanceClass: 'B',
  scores: { performance: 91, accessibility: 96, mobile: 93 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items(
      'items',
      'Cards',
      [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'caption', label: 'Caption', type: 'text' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'imageAlt', label: 'Image description', type: 'text' },
        { key: 'href', label: 'Link', type: 'url' },
      ],
      { itemLabel: 'Card', maxItems: 9 },
    ),
  ],
  schema: z.object({
    heading: text('Selected work'),
    intro: longText(''),
    items: z
      .array(
        z.object({
          title: text('Project'),
          caption: text(''),
          image: imageUrl(''),
          imageAlt: text(''),
          href: text(''),
        }),
      )
      .max(9)
      .default([
        { title: 'Northbound', caption: 'Brand and site', image: '', imageAlt: '', href: '' },
        { title: 'Harbour Co.', caption: 'Commerce', image: '', imageAlt: '', href: '' },
        { title: 'Kade 12', caption: 'Campaign', image: '', imageAlt: '', href: '' },
      ]),
  }),
})

export const contentTextGenerate01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['text-effect', 'reveal', 'typewriter', 'motion'],
  id: 'content-text-generate-01',
  name: 'Text — generated reveal',
  description:
    'Words fade up one after another, as if being written. The full text is present in the markup from the first byte, so nothing depends on the animation running.',
  category: 'content',
  capabilities: ['heading', 'text', 'motion', 'animated-typography'],
  industries: ['saas', 'agency', 'consultant', 'beauty', 'ecommerce'],
  style: ['premium', 'modern', 'editorial'],
  performanceClass: 'B',
  scores: { performance: 91, accessibility: 96, mobile: 92 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('body', 'Text'),
    field.select('speed', 'Reveal speed', [
      { label: 'Slow', value: 'slow' },
      { label: 'Medium', value: 'medium' },
      { label: 'Fast', value: 'fast' },
    ]),
  ],
  schema: z.object({
    heading: text(''),
    body: longText(
      'Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.',
    ),
    speed: z.enum(['slow', 'medium', 'fast']).default('medium'),
  }),
})

export const featuresBeamSteps01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['beam', 'steps', 'scroll', 'process'],
  id: 'features-beam-steps-01',
  name: 'Process — travelling beam',
  description:
    'A line of light draws itself down the page as each step comes into view. Scroll-linked, so budget for it before adding a second one.',
  category: 'features',
  capabilities: ['heading', 'list', 'icons', 'motion', 'scroll', 'numbered'],
  industries: ['saas', 'agency', 'consultant', 'contractor', 'healthcare'],
  style: ['premium', 'dark', 'modern'],
  performanceClass: 'C',
  scores: { performance: 87, accessibility: 96, mobile: 89 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Steps', featureItemFields, { itemLabel: 'Step', maxItems: 6 }),
  ],
  schema: z.object({
    heading: text('From first call to handover'),
    intro: longText(''),
    items: z
      .array(featureItemSchema)
      .max(6)
      .default([
        { icon: 'phone', title: 'First call', description: 'We listen before we quote.' },
        { icon: 'wrench', title: 'Build', description: 'One team, one plan, dates you can hold us to.' },
        { icon: 'check', title: 'Handover', description: 'Documented, tested and yours.' },
      ]),
  }),
})

export const statsMeteorPanel01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['meteor', 'ambient', 'numbers', 'dark'],
  id: 'stats-meteor-panel-01',
  name: 'Statistics — night panel',
  description:
    'Large figures on a dark panel with slow streaks passing behind them. The streaks are decorative and vanish under reduced motion.',
  category: 'stats',
  capabilities: ['list', 'numbers', 'motion', 'ambient'],
  industries: ['*'],
  style: ['premium', 'dark', 'bold'],
  performanceClass: 'B',
  scores: { performance: 91, accessibility: 96, mobile: 92 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.items('items', 'Statistics', statItemFields, { itemLabel: 'Statistic', maxItems: 4 }),
  ],
  schema: z.object({
    heading: text(''),
    items: z
      .array(statItemSchema)
      .max(4)
      .default([
        { value: '15+', label: 'Years in business' },
        { value: '2 500', label: 'Jobs completed' },
        { value: '4.9', label: 'Average rating' },
      ]),
  }),
})

export const ctaAnimatedBorder01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['border', 'glow', 'cta', 'conversion'],
  id: 'cta-animated-border-01',
  name: 'Call to action — lit border',
  description:
    'A panel ringed by a slowly rotating band of light. One conic gradient behind one mask — no canvas, no per-frame JavaScript.',
  category: 'cta',
  capabilities: ['heading', 'text', 'cta', 'motion'],
  industries: ['saas', 'agency', 'consultant', 'ecommerce', 'beauty'],
  style: ['premium', 'dark', 'modern'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 97, mobile: 93 },
  defaultMotion: { preset: 'scale-in' },
  fields: [...ctaFields, field.text('secondaryLabel', 'Secondary link label'), field.url('secondaryHref', 'Secondary link')],
  schema: z.object({ ...ctaProps, secondaryLabel: text(''), secondaryHref: text('') }),
})

export const SPOTLIGHT_COLLECTION_BLOCKS = [
  heroAurora01,
  featuresGlowCards01,
  galleryTiltCards01,
  contentTextGenerate01,
  featuresBeamSteps01,
  statsMeteorPanel01,
  ctaAnimatedBorder01,
]
