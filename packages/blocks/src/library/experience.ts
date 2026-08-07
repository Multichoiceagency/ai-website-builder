import { z } from 'zod'
import { defineBlock } from '../define.js'
import { field, href, imageUrl, longText, text } from '../fields.js'

/**
 * Experience UI — the premium tier from §4.
 *
 * These are the scroll-driven, animated, cinematic sections. They are
 * deliberately class C and D, which means the registry keeps them out of
 * generated sites unless the site's performance ceiling explicitly allows
 * them. A hero that runs a shader is a choice someone makes, never a default
 * a generator falls into.
 *
 * All motion is compositor-only (transform, opacity, clip-path, filter) and
 * every renderer honours `prefers-reduced-motion` through the shared motion
 * layer — the effect degrades to its final state rather than disappearing.
 */

export const heroKinetic01 = defineBlock({
  id: 'hero-kinetic-01',
  name: 'Hero — kinetic headline',
  description:
    'Headline that assembles word by word as the page loads, over a slow gradient field. Heavier: use once, above the fold.',
  category: 'hero',
  capabilities: ['headline', 'subtitle', 'cta', 'motion', 'animated-typography'],
  industries: ['agency', 'saas', 'consultant', 'real_estate', 'beauty'],
  style: ['premium', 'bold', 'cinematic', 'editorial'],
  performanceClass: 'C',
  scores: { performance: 84, accessibility: 94, mobile: 88 },
  defaultMotion: { preset: 'hero-reveal', trigger: 'load', stagger: 0.06 },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline', { help: 'Each word animates in separately.' }),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.select('intensity', 'Motion intensity', [
      { label: 'Subtle', value: 'subtle' },
      { label: 'Pronounced', value: 'pronounced' },
    ]),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: text('Built for the work you actually do'),
    subheadline: text('One sentence that earns the next scroll.'),
    primaryLabel: text('Get started'),
    primaryHref: href('/contact'),
    intensity: z.enum(['subtle', 'pronounced']).default('subtle'),
  }),
})

export const showcaseParallax01 = defineBlock({
  id: 'showcase-parallax-01',
  name: 'Showcase — parallax reveal',
  description:
    'Image that scales and settles as it enters the viewport, with copy travelling at a different rate. Scroll-linked.',
  category: 'gallery',
  capabilities: ['image', 'heading', 'text', 'motion', 'scroll'],
  industries: ['agency', 'real_estate', 'automotive', 'restaurant', 'beauty'],
  style: ['premium', 'cinematic', 'editorial'],
  performanceClass: 'C',
  scores: { performance: 86, accessibility: 96, mobile: 87 },
  defaultMotion: { preset: 'scale-in' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('body', 'Text'),
    field.image('image', 'Image'),
    field.text('imageAlt', 'Image description'),
  ],
  schema: z.object({
    heading: text('The work, up close'),
    body: longText('A short paragraph that gives the image context.'),
    image: imageUrl(''),
    imageAlt: text(''),
  }),
})

export const marqueeStrip01 = defineBlock({
  id: 'marquee-strip-01',
  name: 'Marquee — moving statement',
  description: 'A continuously scrolling line of short phrases. Pauses on hover and for reduced-motion users.',
  category: 'logos',
  capabilities: ['list', 'motion', 'loop'],
  industries: ['agency', 'saas', 'beauty', 'restaurant'],
  style: ['bold', 'playful', 'editorial'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 95, mobile: 93 },
  defaultMotion: { preset: 'fade-in' },
  fields: [
    field.text('items', 'Phrases', { help: 'Separate with a comma.' }),
    field.select('speed', 'Speed', [
      { label: 'Slow', value: 'slow' },
      { label: 'Medium', value: 'medium' },
      { label: 'Fast', value: 'fast' },
    ]),
  ],
  schema: z.object({
    items: text('Reliable, Local, Insured, Same-day, Fixed pricing'),
    speed: z.enum(['slow', 'medium', 'fast']).default('medium'),
  }),
})

export const featureSpotlight01 = defineBlock({
  id: 'feature-spotlight-01',
  name: 'Features — spotlight cards',
  description: 'Cards that lift and light up under the pointer. Falls back to a plain grid on touch.',
  category: 'features',
  capabilities: ['heading', 'list', 'motion', 'hover'],
  industries: ['saas', 'agency', 'consultant', 'accounting'],
  style: ['premium', 'modern', 'dark'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 97, mobile: 94 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.items(
      'items',
      'Cards',
      [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
      { itemLabel: 'Card', maxItems: 6 },
    ),
  ],
  schema: z.object({
    heading: text('What you get'),
    items: z
      .array(z.object({ title: text('Feature'), description: text('One line about it.') }))
      .max(6)
      .default([
        { title: 'Fast to start', description: 'Live in a day, not a quarter.' },
        { title: 'Built to last', description: 'Maintained, monitored, supported.' },
        { title: 'Priced clearly', description: 'One number, agreed up front.' },
      ]),
  }),
})

export const statsCounter01 = defineBlock({
  id: 'stats-counter-01',
  name: 'Statistics — counting numbers',
  description: 'Numbers that count up once when scrolled into view. Shows the final value immediately if motion is reduced.',
  category: 'stats',
  capabilities: ['list', 'numbers', 'motion', 'scroll'],
  industries: ['*'],
  style: ['bold', 'modern'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.items(
      'items',
      'Statistics',
      [
        { key: 'value', label: 'Number', type: 'number' },
        { key: 'suffix', label: 'Suffix', type: 'text' },
        { key: 'label', label: 'Label', type: 'text' },
      ],
      { itemLabel: 'Statistic', maxItems: 4 },
    ),
  ],
  schema: z.object({
    items: z
      .array(
        z.object({
          value: z.number().default(0),
          suffix: text(''),
          label: text('Label'),
        }),
      )
      .max(4)
      .default([
        { value: 15, suffix: '+', label: 'Years in business' },
        { value: 2500, suffix: '', label: 'Jobs completed' },
        { value: 49, suffix: '', label: 'Average rating ×10' },
      ]),
  }),
})
