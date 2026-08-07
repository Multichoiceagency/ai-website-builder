import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import {
  bentoCellFields,
  bentoCellSchema,
  faqItemFields,
  faqItemSchema,
  featureItemFields,
  featureItemSchema,
  testimonialItemFields,
  testimonialItemSchema,
} from './shared.js'
import { bool, field, imageUrl, longText, text } from '../fields.js'

/**
 * The `showcase` collection — polished marketing primitives.
 *
 * The pieces a landing page reaches for once the copy is written: proof that
 * moves, a before/after, an accordion that opens properly, a pricing table with
 * a toggle. Nothing here is decorative for its own sake, and nothing here pins
 * the viewport — that is why the collection sits at class B rather than C.
 *
 * The interactive ones (tabs, accordion, compare slider, pricing toggle) are
 * built on real controls: `<button>`, `<details>`, `<input type="range">`. They
 * are keyboard-operable because the element already was, not because a
 * `keydown` handler was bolted on afterwards.
 */

export const testimonialsMarquee01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['marquee', 'social-proof', 'loop', 'reviews'],
  id: 'testimonials-marquee-01',
  name: 'Testimonials — moving wall',
  description:
    'Two rows of review cards drifting in opposite directions. Pauses on hover and on focus, and stands still for reduced-motion users.',
  category: 'testimonials',
  capabilities: ['heading', 'list', 'ratings', 'social-proof', 'motion', 'loop'],
  industries: ['*'],
  style: ['modern', 'premium', 'playful'],
  performanceClass: 'B',
  scores: { performance: 91, accessibility: 95, mobile: 92 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.select('speed', 'Speed', [
      { label: 'Slow', value: 'slow' },
      { label: 'Medium', value: 'medium' },
      { label: 'Fast', value: 'fast' },
    ]),
    field.items('items', 'Reviews', testimonialItemFields, { itemLabel: 'Review', maxItems: 12 }),
  ],
  schema: z.object({
    heading: text('What customers say'),
    speed: z.enum(['slow', 'medium', 'fast']).default('slow'),
    items: z
      .array(testimonialItemSchema)
      .max(12)
      .default([
        { quote: 'Turned up when they said, finished when they said.', author: 'A. de Vries', role: 'Rotterdam', rating: 5 },
        { quote: 'The quote was the price. That alone is worth it.', author: 'M. Jansen', role: 'Schiedam', rating: 5 },
        { quote: 'Tidy, quiet and gone by four.', author: 'S. Bakker', role: 'Delft', rating: 5 },
        { quote: 'Explained the options without selling me the expensive one.', author: 'R. Visser', role: 'Vlaardingen', rating: 5 },
      ]),
  }),
})

export const testimonialsCardStack01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['stack', 'cards', 'social-proof', 'interactive'],
  id: 'testimonials-card-stack-01',
  name: 'Testimonials — card deck',
  description:
    'One review at a time on a fanned stack of cards, with previous and next buttons. Every quote stays in the document for search engines and screen readers.',
  category: 'testimonials',
  capabilities: ['heading', 'list', 'ratings', 'social-proof', 'interactive'],
  industries: ['*'],
  style: ['premium', 'modern', 'playful'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 95, mobile: 94 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.items('items', 'Reviews', testimonialItemFields, { itemLabel: 'Review', maxItems: 8 }),
  ],
  schema: z.object({
    heading: text('In their words'),
    items: z
      .array(testimonialItemSchema)
      .max(8)
      .default([
        { quote: 'They found the actual problem instead of replacing the whole unit.', author: 'K. Mulder', role: 'Rotterdam', rating: 5 },
        { quote: 'Second job we have given them. There will be a third.', author: 'J. Willems', role: 'Capelle', rating: 5 },
        { quote: 'Sent photos every day while we were away.', author: 'P. de Groot', role: 'Delft', rating: 5 },
      ]),
  }),
})

export const logosOrbit01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['logos', 'orbit', 'social-proof', 'loop'],
  id: 'logos-orbit-01',
  name: 'Logos — orbit',
  description:
    'Client marks circling a central statement on slow, offset rings. Falls back to a static ring when motion is reduced.',
  category: 'logos',
  capabilities: ['list', 'images', 'social-proof', 'motion', 'loop'],
  industries: ['saas', 'agency', 'consultant', 'accounting', 'ecommerce'],
  style: ['premium', 'modern', 'dark'],
  performanceClass: 'B',
  scores: { performance: 90, accessibility: 95, mobile: 89 },
  defaultMotion: { preset: 'scale-in' },
  fields: [
    field.text('heading', 'Centre heading'),
    field.text('subheading', 'Centre subheading'),
    field.items(
      'items',
      'Logos',
      [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'image', label: 'Logo', type: 'image' },
      ],
      { itemLabel: 'Logo', maxItems: 12 },
    ),
  ],
  schema: z.object({
    heading: text('Trusted by teams like yours'),
    subheading: text(''),
    items: z
      .array(z.object({ name: text('Brand'), image: imageUrl('') }))
      .max(12)
      .default([
        { name: 'Client one', image: '' },
        { name: 'Client two', image: '' },
        { name: 'Client three', image: '' },
        { name: 'Client four', image: '' },
        { name: 'Client five', image: '' },
        { name: 'Client six', image: '' },
      ]),
  }),
})

export const galleryCompareSlider01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['before-after', 'slider', 'interactive', 'proof'],
  id: 'gallery-compare-slider-01',
  name: 'Gallery — before and after',
  description:
    'Two photographs under one draggable divider. Built on a range input, so it works with a keyboard and reads correctly to assistive tech.',
  category: 'gallery',
  capabilities: ['image', 'interactive', 'proof'],
  industries: ['contractor', 'beauty', 'automotive', 'real_estate', 'healthcare'],
  style: ['clean', 'trustworthy', 'modern'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 96, mobile: 95 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.image('beforeImage', 'Before image'),
    field.text('beforeAlt', 'Before image description'),
    field.text('beforeLabel', 'Before label'),
    field.image('afterImage', 'After image'),
    field.text('afterAlt', 'After image description'),
    field.text('afterLabel', 'After label'),
  ],
  schema: z.object({
    heading: text('Before and after'),
    intro: longText(''),
    beforeImage: imageUrl(''),
    beforeAlt: text(''),
    beforeLabel: text('Before'),
    afterImage: imageUrl(''),
    afterAlt: text(''),
    afterLabel: text('After'),
  }),
})

export const faqRevealAccordion01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['accordion', 'interactive', 'faq', 'schema.org'],
  id: 'faq-reveal-accordion-01',
  name: 'FAQ — animated accordion',
  description:
    'Questions that unfold with a soft reveal and a rotating marker. Native disclosure elements, so it works before the JavaScript does.',
  category: 'faq',
  capabilities: ['heading', 'list', 'schema.org', 'interactive', 'motion'],
  industries: ['*'],
  style: ['modern', 'clean', 'premium'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 97, mobile: 96 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Questions', faqItemFields, { itemLabel: 'Question', maxItems: 20 }),
  ],
  schema: z.object({
    heading: text('Frequently asked questions'),
    intro: longText(''),
    items: z
      .array(faqItemSchema)
      .max(20)
      .default([
        { question: 'How quickly can you come out?', answer: 'Usually the same day, and always within two working days.' },
        { question: 'What does it cost?', answer: 'We quote up front, in writing, with no call-out fee.' },
        { question: 'Do you guarantee the work?', answer: 'Two years on labour, and we come back if something moves.' },
      ]),
  }),
})

export const featuresTabSwitcher01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['tabs', 'interactive', 'features', 'showcase'],
  id: 'features-tab-switcher-01',
  name: 'Features — tabbed showcase',
  description:
    'Tabs along one edge with a panel that cross-fades in. Arrow-key navigation and proper tab semantics come from the ARIA tabs pattern.',
  category: 'features',
  capabilities: ['heading', 'list', 'icons', 'interactive', 'motion'],
  industries: ['saas', 'agency', 'consultant', 'ecommerce', 'accounting', 'legal'],
  style: ['modern', 'clean', 'premium'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 96, mobile: 93 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Tabs', featureItemFields, { itemLabel: 'Tab', maxItems: 6 }),
  ],
  schema: z.object({
    heading: text('One platform, several jobs'),
    intro: longText(''),
    items: z
      .array(featureItemSchema)
      .max(6)
      .default([
        { icon: 'bolt', title: 'Fast to start', description: 'Live in a day, not a quarter. We migrate what you already have.' },
        { icon: 'shield', title: 'Safe by default', description: 'Backups, monitoring and a rollback that has actually been tested.' },
        { icon: 'chart', title: 'Measured', description: 'You see what it earns, not just what it costs.' },
      ]),
  }),
})

export const pricingToggle01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['pricing', 'toggle', 'interactive', 'conversion'],
  id: 'pricing-toggle-01',
  name: 'Pricing — plans with a billing toggle',
  description:
    'Two or three plans with a monthly/yearly switch and one highlighted tier. Both prices are in the markup, so switching changes no layout.',
  category: 'pricing',
  capabilities: ['heading', 'list', 'pricing', 'cta', 'interactive'],
  industries: ['saas', 'agency', 'consultant', 'accounting', 'ecommerce'],
  style: ['clean', 'modern', 'trustworthy'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 96, mobile: 95 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.text('monthlyLabel', 'Monthly label'),
    field.text('yearlyLabel', 'Yearly label'),
    field.text('yearlyNote', 'Yearly note', { help: 'Shown beside the toggle, e.g. "two months free".' }),
    field.items(
      'items',
      'Plans',
      [
        { key: 'name', label: 'Plan name', type: 'text' },
        { key: 'monthlyPrice', label: 'Monthly price', type: 'text' },
        { key: 'yearlyPrice', label: 'Yearly price', type: 'text' },
        { key: 'period', label: 'Period suffix', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'featureList', label: 'Included', type: 'textarea', help: 'One per line.' },
        { key: 'ctaLabel', label: 'Button label', type: 'text' },
        { key: 'ctaHref', label: 'Button link', type: 'url' },
        { key: 'featured', label: 'Highlight this plan', type: 'boolean' },
      ],
      { itemLabel: 'Plan', maxItems: 4 },
    ),
  ],
  schema: z.object({
    heading: text('Simple pricing'),
    intro: longText(''),
    monthlyLabel: text('Monthly'),
    yearlyLabel: text('Yearly'),
    yearlyNote: text('Two months free'),
    items: z
      .array(
        z.object({
          name: text('Plan'),
          monthlyPrice: text('€49'),
          yearlyPrice: text('€490'),
          period: text('/month'),
          description: longText('Who this plan is for.'),
          featureList: longText('Everything you need to start'),
          ctaLabel: text('Choose plan'),
          ctaHref: text('/contact'),
          featured: bool(false),
        }),
      )
      .max(4)
      .default([
        {
          name: 'Starter',
          monthlyPrice: '€49',
          yearlyPrice: '€490',
          period: '/month',
          description: 'For a single site that needs to look after itself.',
          featureList: 'One website\nHosting and backups\nE-mail support',
          ctaLabel: 'Choose Starter',
          ctaHref: '/contact',
          featured: false,
        },
        {
          name: 'Growth',
          monthlyPrice: '€149',
          yearlyPrice: '€1490',
          period: '/month',
          description: 'For a business that markets as well as it delivers.',
          featureList: 'Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support',
          ctaLabel: 'Choose Growth',
          ctaHref: '/contact',
          featured: true,
        },
        {
          name: 'Scale',
          monthlyPrice: '€399',
          yearlyPrice: '€3990',
          period: '/month',
          description: 'For multiple brands, shops or locations.',
          featureList: 'Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact',
          ctaLabel: 'Talk to us',
          ctaHref: '/contact',
          featured: false,
        },
      ]),
  }),
})

/**
 * The one pattern from the nine reviewed for this collection that the registry
 * did not already cover. Written from scratch: a bento layout is a *grid with
 * uneven spans*, which is a layout idea and not anybody's property — and the
 * implementation here is plain CSS grid over our own tokens.
 *
 * Class A, which surprises people. There is no motion in the layout itself; the
 * span pattern is static CSS and the only movement is the section's entrance.
 * That makes it one of the few visually ambitious sections a class-A site can
 * still afford.
 */
export const featuresBentoGrid01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['bento', 'grid', 'features', 'layout'],
  id: 'features-bento-grid-01',
  name: 'Features — bento grid',
  description:
    'A grid of feature cells at mixed sizes, so the important ones are simply bigger. Collapses to a single column on small screens, where every cell is equal anyway.',
  category: 'features',
  capabilities: ['heading', 'list', 'layout', 'grid'],
  industries: ['*'],
  style: ['modern', 'premium', 'bold'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro'),
    field.items('items', 'Cells', bentoCellFields, { itemLabel: 'Cell', maxItems: 8 }),
  ],
  schema: z.object({
    heading: text('Everything in one place'),
    intro: longText('Each panel is a capability. The bigger ones are the ones customers ask about first.'),
    items: z
      .array(bentoCellSchema)
      .max(8)
      .default([
        { title: 'One place for the work', description: 'Quotes, jobs, invoices and the history behind them.', size: 'wide' },
        { title: 'Live availability', description: 'The calendar customers actually see.', size: 'normal' },
        { title: 'Paid faster', description: 'Invoices that chase themselves.', size: 'normal' },
        { title: 'Built for a phone', description: 'Because that is where the job happens.', size: 'tall' },
        { title: 'Nothing to install', description: 'It runs in a browser and updates itself.', size: 'normal' },
      ]),
  }),
})

export const SHOWCASE_COLLECTION_BLOCKS = [
  testimonialsMarquee01,
  testimonialsCardStack01,
  logosOrbit01,
  galleryCompareSlider01,
  faqRevealAccordion01,
  featuresTabSwitcher01,
  pricingToggle01,
  featuresBentoGrid01,
]
