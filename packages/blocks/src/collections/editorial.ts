import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import {
  ctaFields,
  ctaProps,
  featureItemFields,
  featureItemSchema,
  serviceItemFields,
  serviceItemSchema,
  splitHeroFields,
  splitHeroProps,
} from './shared.js'
import { field, imageUrl, longText, text } from '../fields.js'

/**
 * The `editorial` collection — bold and editorial.
 *
 * Oversized type, hard rules, high contrast, no rounded corners asking to be
 * liked. The point of the collection is that most of it is *cheap*: a headline
 * set at 14vw costs the browser nothing, so these are class A and B and are
 * perfectly reasonable defaults for a brand that wants to be loud.
 *
 * Contrast is a design constraint here, not an accident — every surface pairs
 * with a text colour from the same token, so a theme swap cannot produce grey
 * on grey.
 */

export const heroOversizedType01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['oversized', 'typography', 'editorial', 'statement'],
  id: 'hero-oversized-type-01',
  name: 'Hero — oversized statement',
  description:
    'One enormous headline set edge to edge, with the supporting detail pushed to a corner. For brands that lead with a claim rather than a photo.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'motion'],
  industries: ['agency', 'beauty', 'restaurant', 'ecommerce', 'saas', 'real_estate'],
  style: ['bold', 'editorial', 'brutalist'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 97, mobile: 92 },
  defaultMotion: { preset: 'fade-up', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline', { help: 'Two or three words carry this layout best.' }),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.text('meta', 'Corner detail', { help: 'Small print in the opposite corner, e.g. a city or a year.' }),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: text('Make it obvious'),
    subheadline: longText('A studio for companies that would rather be understood than admired.'),
    primaryLabel: text('Start a project'),
    primaryHref: text('/contact'),
    meta: text('Rotterdam — since 2014'),
  }),
})

export const heroSplitScreen01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['split-screen', 'editorial', 'image', 'contrast'],
  id: 'hero-split-screen-01',
  name: 'Hero — hard split screen',
  description:
    'The viewport cut in half: type on one side, full-bleed image on the other, no gutter between them. Stacks cleanly on mobile.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'image', 'cta', 'motion'],
  industries: ['agency', 'real_estate', 'beauty', 'restaurant', 'automotive', 'ecommerce'],
  style: ['bold', 'editorial', 'premium'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 97, mobile: 94 },
  defaultMotion: { preset: 'fade-in', trigger: 'load' },
  fields: [...splitHeroFields],
  // Shares `hero-split-01`'s prop names *and* its id prefix on purpose: the
  // generation pipeline fills hero props by prefix, so this block receives real
  // business copy rather than its own placeholders if AI ever picks it.
  schema: z.object({ ...splitHeroProps }),
})

export const featuresBrutalistGrid01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['brutalist', 'grid', 'contrast', 'numbered'],
  id: 'features-brutalist-grid-01',
  name: 'Features — hard grid',
  description:
    'Numbered cells divided by one-pixel rules, no shadows and no rounding. Inverts on hover so the grid reads as a single object.',
  category: 'features',
  capabilities: ['heading', 'list', 'icons', 'numbered'],
  industries: ['agency', 'saas', 'ecommerce', 'consultant', 'restaurant'],
  style: ['bold', 'brutalist', 'editorial'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 97, mobile: 96 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Cells', featureItemFields, { itemLabel: 'Cell', maxItems: 9 }),
  ],
  schema: z.object({
    heading: text('What you get'),
    intro: longText(''),
    items: z
      .array(featureItemSchema)
      .max(9)
      .default([
        { icon: 'bolt', title: 'Fast', description: 'Loads before your customer decides to leave.' },
        { icon: 'shield', title: 'Solid', description: 'Backed up, monitored and patched without being asked.' },
        { icon: 'chart', title: 'Measured', description: 'Every euro spent is traceable to something that happened.' },
        { icon: 'phone', title: 'Answered', description: 'A person, in your timezone, who knows your account.' },
      ]),
  }),
})

export const servicesEditorialIndex01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['index', 'list', 'editorial', 'hover'],
  id: 'services-editorial-index-01',
  name: 'Services — editorial index',
  description:
    'Services as a numbered index of full-width rows. Hovering a row lifts its detail into view; touch devices simply show it.',
  category: 'services',
  capabilities: ['heading', 'list', 'links', 'numbered', 'hover'],
  industries: ['agency', 'consultant', 'legal', 'accounting', 'real_estate', 'contractor'],
  style: ['editorial', 'bold', 'premium'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Services', serviceItemFields, { itemLabel: 'Service', maxItems: 12 }),
  ],
  schema: z.object({
    heading: text('What we do'),
    intro: longText(''),
    items: z
      .array(serviceItemSchema)
      .max(12)
      .default([
        { title: 'Strategy', description: 'Deciding what to build before anyone builds it.', href: '', linkLabel: 'Read more' },
        { title: 'Design', description: 'Interfaces that look like the company behind them.', href: '', linkLabel: 'Read more' },
        { title: 'Engineering', description: 'Software that still works in three years.', href: '', linkLabel: 'Read more' },
      ]),
  }),
})

export const contentManifesto01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['manifesto', 'statement', 'editorial', 'typography'],
  id: 'content-manifesto-01',
  name: 'Text — manifesto',
  description:
    'A statement set at display size against a flat field of colour, with an attribution line beneath. No motion, all voice.',
  category: 'content',
  capabilities: ['heading', 'text', 'quote'],
  industries: ['*'],
  style: ['bold', 'editorial', 'brutalist'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 97, mobile: 96 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Small heading', { help: 'Optional label above the statement.' }),
    field.textarea('body', 'Statement'),
    field.text('attribution', 'Attribution'),
    field.select('tone', 'Background', [
      { label: 'Light', value: 'light' },
      { label: 'Muted', value: 'muted' },
      { label: 'Primary', value: 'primary' },
      { label: 'Dark', value: 'dark' },
    ]),
  ],
  schema: z.object({
    heading: text(''),
    body: longText('We would rather ship one thing that works than five that demo well.'),
    attribution: text(''),
    tone: z.enum(['light', 'muted', 'primary', 'dark']).default('dark'),
  }),
})

export const ctaHighContrast01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['cta', 'contrast', 'conversion', 'bold'],
  id: 'cta-high-contrast-01',
  name: 'Call to action — hard stop',
  description:
    'A full-bleed band of solid colour with one oversized action. Deliberately the loudest thing on the page — use it once.',
  category: 'cta',
  capabilities: ['heading', 'text', 'cta'],
  industries: ['*'],
  style: ['bold', 'brutalist', 'editorial'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'fade-up' },
  fields: [...ctaFields, field.text('kicker', 'Kicker', { help: 'Small line above the heading.' })],
  schema: z.object({ ...ctaProps, kicker: text('') }),
})

export const teamEditorial01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['team', 'portraits', 'editorial', 'grid'],
  id: 'team-editorial-01',
  name: 'Team — editorial portraits',
  description:
    'Portraits in a tight grid with names set as captions, the way a magazine masthead would run them. Greyscale until hovered.',
  category: 'team',
  capabilities: ['heading', 'list', 'images', 'hover'],
  industries: ['agency', 'consultant', 'legal', 'accounting', 'healthcare', 'real_estate'],
  style: ['editorial', 'premium', 'bold'],
  performanceClass: 'A',
  scores: { performance: 97, accessibility: 97, mobile: 96 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items(
      'items',
      'People',
      [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'image', label: 'Portrait', type: 'image' },
        { key: 'imageAlt', label: 'Portrait description', type: 'text' },
      ],
      { itemLabel: 'Person', maxItems: 12 },
    ),
  ],
  schema: z.object({
    heading: text('The people who do the work'),
    intro: longText(''),
    items: z
      .array(
        z.object({
          name: text('Name'),
          role: text('Role'),
          image: imageUrl(''),
          imageAlt: text(''),
        }),
      )
      .max(12)
      .default([
        { name: 'A. de Vries', role: 'Founder', image: '', imageAlt: '' },
        { name: 'M. Jansen', role: 'Lead engineer', image: '', imageAlt: '' },
        { name: 'S. Bakker', role: 'Design', image: '', imageAlt: '' },
      ]),
  }),
})

export const EDITORIAL_COLLECTION_BLOCKS = [
  heroOversizedType01,
  heroSplitScreen01,
  featuresBrutalistGrid01,
  servicesEditorialIndex01,
  contentManifesto01,
  ctaHighContrast01,
  teamEditorial01,
]
