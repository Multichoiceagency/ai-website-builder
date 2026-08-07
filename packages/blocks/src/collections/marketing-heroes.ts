import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import { field, href, icon, imageUrl, longText, text } from '../fields.js'

/**
 * Marketing-layout heroes — the visual variety a block browser expects
 * (agency + proof, property cover, dark portrait, product preview).
 *
 * First-party Vue implementations of common layout *patterns*. Not ports of
 * any third-party Pro catalogue (ADR-0003).
 */

const logoItemSchema = z.object({
  name: text('Partner'),
  image: imageUrl(''),
})

const logoItemFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'image', label: 'Logo', type: 'image' as const },
]

const avatarItemSchema = z.object({
  name: text('Client'),
  image: imageUrl(''),
})

const avatarItemFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'image', label: 'Photo', type: 'image' as const },
]

const factItemSchema = z.object({
  icon: icon('home'),
  label: text('Detail'),
  value: text(''),
})

const factItemFields = [
  { key: 'icon', label: 'Icon', type: 'icon' as const },
  { key: 'label', label: 'Label', type: 'text' as const },
  { key: 'value', label: 'Value', type: 'text' as const },
]

/** Soft gradient stage, dual-tone headline, CTA + avatars, logo strip. */
export const heroAgencyProof01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['agency', 'social-proof', 'logos', 'gradient', 'conversion'],
  id: 'hero-agency-proof-01',
  name: 'Hero — agency with proof',
  description:
    'Gradient stage, statement headline with an accent line, primary CTA, avatar trust row, and a logo strip. The classic agency landing opener.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'social-proof', 'logos', 'motion'],
  industries: ['agency', 'saas', 'consultant', 'ecommerce', 'beauty'],
  style: ['modern', 'premium', 'clean'],
  performanceClass: 'A',
  scores: { performance: 96, accessibility: 97, mobile: 96 },
  defaultMotion: { preset: 'hero-reveal', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.text('headlineAccent', 'Accent line', {
      help: 'Renders in italic serif under or beside the headline.',
    }),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.text('trustLabel', 'Trust label', { help: 'e.g. Trusted by 1000+ clients' }),
    field.text('ratingLabel', 'Rating label', { help: 'Leave empty to hide stars row.' }),
    field.items('avatars', 'Avatars', avatarItemFields, { itemLabel: 'Person', maxItems: 6 }),
    field.items('logos', 'Logos', logoItemFields, { itemLabel: 'Logo', maxItems: 8 }),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: text('Building bold brands with'),
    headlineAccent: text('thoughtful design'),
    subheadline: longText(
      'We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.',
    ),
    primaryLabel: text('Get Started'),
    primaryHref: href('/contact'),
    trustLabel: text('Trusted by 1000+ clients'),
    ratingLabel: text('5.0'),
    avatars: z
      .array(avatarItemSchema)
      .max(6)
      .default([
        { name: 'A', image: '' },
        { name: 'B', image: '' },
        { name: 'C', image: '' },
        { name: 'D', image: '' },
      ]),
    logos: z
      .array(logoItemSchema)
      .max(8)
      .default([
        { name: 'Northwind', image: '' },
        { name: 'Acme', image: '' },
        { name: 'Globex', image: '' },
        { name: 'Initech', image: '' },
        { name: 'Umbrella', image: '' },
      ]),
  }),
})

/** Full-bleed photo, title + CTA, bottom fact bar — property / place openers. */
export const heroProperty01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['property', 'cover', 'image', 'stats', 'real-estate'],
  id: 'hero-property-01',
  name: 'Hero — property cover',
  description:
    'Full-bleed photograph with a large title, a compact CTA, and a bottom bar of facts (beds, baths, price). Built for places and products that sell on image.',
  category: 'hero',
  capabilities: ['headline', 'image', 'cta', 'stats', 'motion'],
  industries: ['real-estate', 'hospitality', 'automotive', 'agency', 'ecommerce'],
  style: ['premium', 'modern', 'cinematic'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'fade-up', trigger: 'load' },
  fields: [
    field.text('headline', 'Headline'),
    field.text('primaryLabel', 'Button label'),
    field.url('primaryHref', 'Button link'),
    field.image('image', 'Background image'),
    field.text('imageAlt', 'Image description'),
    field.items('facts', 'Facts', factItemFields, { itemLabel: 'Fact', maxItems: 6 }),
  ],
  schema: z.object({
    headline: text('Space Residence'),
    primaryLabel: text('Schedule a tour'),
    primaryHref: href('/contact'),
    image: imageUrl(''),
    imageAlt: text('Exterior of the residence'),
    facts: z
      .array(factItemSchema)
      .max(6)
      .default([
        { icon: 'home', label: 'Bedrooms', value: '3' },
        { icon: 'building', label: 'Bathrooms', value: '2' },
        { icon: 'car', label: 'Parking', value: 'Included' },
        { icon: 'credit-card', label: 'Price', value: '$4,750,000' },
      ]),
  }),
})

/** Dark stage, large portrait, overlaid brand mark and statement. */
export const heroPortrait01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['portrait', 'dark', 'agency', 'cinematic', 'image'],
  id: 'hero-portrait-01',
  name: 'Hero — dark portrait',
  description:
    'Full-bleed dark photography with a portrait focal point, brand mark, and a short statement. High-contrast digital-agency opener.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'image', 'cta', 'motion'],
  industries: ['agency', 'beauty', 'consultant', 'saas'],
  style: ['premium', 'dark', 'cinematic', 'bold'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 95, mobile: 93 },
  defaultMotion: { preset: 'hero-reveal', trigger: 'load' },
  fields: [
    field.text('brandMark', 'Brand mark'),
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.image('image', 'Portrait image'),
    field.text('imageAlt', 'Image description'),
  ],
  schema: z.object({
    brandMark: text('Studio'),
    eyebrow: text('Digital agency'),
    headline: text('Design that earns attention'),
    subheadline: longText('Strategy, identity and product — built to convert without shouting.'),
    primaryLabel: text('View work'),
    primaryHref: href('/work'),
    image: imageUrl(''),
    imageAlt: text('Portrait'),
  }),
})

/** Copy left, product/preview panel right — SaaS / tool openers. */
export const heroSaasPreview01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['saas', 'preview', 'split', 'product', 'conversion'],
  id: 'hero-saas-preview-01',
  name: 'Hero — product preview',
  description:
    'Headline and CTAs on the left, a framed product preview card on the right. The default layout for developer and SaaS tools.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'image', 'motion'],
  industries: ['saas', 'agency', 'consultant', 'ecommerce'],
  style: ['modern', 'clean', 'premium'],
  performanceClass: 'A',
  scores: { performance: 96, accessibility: 97, mobile: 95 },
  defaultMotion: { preset: 'stagger-children', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.text('secondaryLabel', 'Secondary button'),
    field.url('secondaryHref', 'Secondary link'),
    field.image('previewImage', 'Preview image'),
    field.text('previewAlt', 'Preview description'),
    field.text('previewCaption', 'Preview caption'),
  ],
  schema: z.object({
    eyebrow: text('Now in public beta'),
    headline: text('Ship your next site before lunch'),
    subheadline: longText('Describe the business once. We plan the pages, write the copy, and leave you an editor that stays out of the way.'),
    primaryLabel: text('Start free'),
    primaryHref: href('/signup'),
    secondaryLabel: text('See how it works'),
    secondaryHref: href('/demo'),
    previewImage: imageUrl(''),
    previewAlt: text('Product preview'),
    previewCaption: text('Live editor preview'),
  }),
})

/** Centred cover on a soft wash — minimal statement with dual CTAs. */
export const heroCoverStatement01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['cover', 'centered', 'minimal', 'gradient'],
  id: 'hero-cover-statement-01',
  name: 'Hero — cover statement',
  description:
    'Centred statement on a soft colour wash, dual CTAs, optional background image. Quiet and typographic — works when the brand is the product.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'image', 'motion'],
  industries: ['*'],
  style: ['minimal', 'modern', 'editorial'],
  performanceClass: 'A',
  scores: { performance: 97, accessibility: 98, mobile: 97 },
  defaultMotion: { preset: 'fade-up', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.text('secondaryLabel', 'Secondary button'),
    field.url('secondaryHref', 'Secondary link'),
    field.image('image', 'Optional background'),
    field.url('video', 'Background video', {
      help: 'Same-origin path (e.g. /motionsites/…). When set, plays instead of the image.',
    }),
    field.text('imageAlt', 'Background description'),
  ],
  schema: z.object({
    eyebrow: text('Introducing'),
    headline: text('A calmer way to build the web'),
    subheadline: longText('One workspace for the site, the content and the growth work — without a stack of plugins.'),
    primaryLabel: text('Get started'),
    primaryHref: href('/contact'),
    secondaryLabel: text('Browse examples'),
    secondaryHref: href('/templates'),
    image: imageUrl(''),
    /** Same-origin looping background (`.mp4`); `imageUrl` allows any path string. */
    video: imageUrl(''),
    imageAlt: text(''),
  }),
})

/** Asymmetric: large type left, overlapping media card right. */
export const heroAsymmetric01 = defineCollectionBlock({
  collection: 'editorial',
  tags: ['asymmetric', 'overlap', 'editorial', 'image'],
  id: 'hero-asymmetric-01',
  name: 'Hero — asymmetric overlap',
  description:
    'Oversized left-aligned type with a media card that overlaps the copy column. Editorial energy without pinning the scroll.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'image', 'motion'],
  industries: ['agency', 'beauty', 'consultant', 'ecommerce'],
  style: ['editorial', 'bold', 'modern'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'fade-up', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.image('image', 'Image'),
    field.text('imageAlt', 'Image description'),
  ],
  schema: z.object({
    eyebrow: text('Selected work'),
    headline: text('Make the first screen unforgettable'),
    subheadline: longText('A single composition: brand, one line, one action, one image that does the talking.'),
    primaryLabel: text('Book a call'),
    primaryHref: href('/contact'),
    image: imageUrl(''),
    imageAlt: text('Featured project'),
  }),
})

export const MARKETING_HERO_BLOCKS = [
  heroAgencyProof01,
  heroProperty01,
  heroPortrait01,
  heroSaasPreview01,
  heroCoverStatement01,
  heroAsymmetric01,
]
