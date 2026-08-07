import { z } from 'zod'
import { defineBlock } from '../define.js'
import { ALIGN_OPTIONS, field, href, imageUrl, text } from '../fields.js'

const ctaProps = {
  primaryLabel: text('Request a quote'),
  primaryHref: href('/contact'),
  secondaryLabel: text(''),
  secondaryHref: href(''),
}

const ctaFields = [
  field.text('primaryLabel', 'Primary button'),
  field.url('primaryHref', 'Primary link'),
  field.text('secondaryLabel', 'Secondary button', { help: 'Leave empty to hide.' }),
  field.url('secondaryHref', 'Secondary link'),
]

export const heroSplit01 = defineBlock({
  id: 'hero-split-01',
  name: 'Hero — text beside image',
  description: 'Headline, supporting copy and two buttons on the left, a photo on the right.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'image', 'cta', 'motion'],
  industries: ['contractor', 'healthcare', 'automotive', 'agency', 'consultant', 'local'],
  style: ['modern', 'clean', 'trustworthy'],
  performanceClass: 'B',
  scores: { performance: 95, accessibility: 97, mobile: 96 },
  defaultMotion: { preset: 'fade-up', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow', { help: 'Small line above the headline.' }),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    ...ctaFields,
    field.image('image', 'Image'),
    field.text('imageAlt', 'Image description', { help: 'Required for accessibility and SEO.' }),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: text('A headline that says what you do'),
    subheadline: text('One or two sentences explaining who you help and why they should call you.'),
    ...ctaProps,
    image: imageUrl(''),
    imageAlt: text(''),
  }),
})

export const heroCentered01 = defineBlock({
  id: 'hero-centered-01',
  name: 'Hero — centred statement',
  description: 'Large centred headline with supporting copy and buttons. No imagery required.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'motion'],
  industries: ['*'],
  style: ['minimal', 'editorial', 'premium'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'fade-up', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('headline', 'Headline'),
    field.textarea('subheadline', 'Supporting text'),
    ...ctaFields,
    field.select('align', 'Alignment', ALIGN_OPTIONS),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: text('A headline that says what you do'),
    subheadline: text('One or two sentences explaining who you help and why they should call you.'),
    ...ctaProps,
    align: z.enum(['left', 'center']).default('center'),
  }),
})
