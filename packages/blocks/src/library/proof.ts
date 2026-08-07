import { z } from 'zod'
import { defineBlock } from '../define.js'
import { field, imageUrl, text } from '../fields.js'

const statItem = z.object({
  value: text('100+'),
  label: text('Projects delivered'),
})

const statItemFields = [
  { key: 'value', label: 'Number', type: 'text' as const },
  { key: 'label', label: 'Label', type: 'text' as const },
]

export const statsBand01 = defineBlock({
  id: 'stats-band-01',
  name: 'Statistics — number band',
  description: 'A row of large numbers with labels. Good directly under a hero.',
  category: 'stats',
  capabilities: ['list', 'numbers', 'motion'],
  industries: ['*'],
  style: ['bold', 'clean'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 98, mobile: 97 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.items('items', 'Statistics', statItemFields, { itemLabel: 'Statistic', maxItems: 4 }),
  ],
  schema: z.object({
    items: z
      .array(statItem)
      .max(4)
      .default([
        { value: '15+', label: 'Years in business' },
        { value: '2 500', label: 'Jobs completed' },
        { value: '4.9', label: 'Average rating' },
      ]),
  }),
})

const testimonialItem = z.object({
  quote: text('They were quick, tidy and honest about the price.'),
  author: text('Customer name'),
  role: text(''),
  rating: z.number().min(0).max(5).default(5),
})

const testimonialItemFields = [
  { key: 'quote', label: 'Quote', type: 'textarea' as const },
  { key: 'author', label: 'Name', type: 'text' as const },
  { key: 'role', label: 'Role or location', type: 'text' as const },
  { key: 'rating', label: 'Rating (0–5)', type: 'number' as const },
]

export const testimonialsGrid01 = defineBlock({
  id: 'testimonials-grid-01',
  name: 'Testimonials — quote cards',
  description: 'Customer quotes with a star rating and attribution.',
  category: 'testimonials',
  capabilities: ['heading', 'list', 'ratings', 'social-proof', 'motion'],
  industries: ['*'],
  style: ['trustworthy', 'clean'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 97, mobile: 97 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.items('items', 'Reviews', testimonialItemFields, { itemLabel: 'Review', maxItems: 9 }),
  ],
  schema: z.object({
    heading: text('What customers say'),
    items: z
      .array(testimonialItem)
      .max(9)
      .default([
        { quote: 'Fast, friendly and the price was exactly as quoted.', author: 'A. de Vries', role: 'Rotterdam', rating: 5 },
        { quote: 'Fixed the problem the same afternoon.', author: 'M. Jansen', role: 'Schiedam', rating: 5 },
      ]),
  }),
})

const logoItem = z.object({
  name: text('Brand'),
  image: imageUrl(''),
})

const logoItemFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'image', label: 'Logo', type: 'image' as const },
]

export const logosStrip01 = defineBlock({
  id: 'logos-strip-01',
  name: 'Logos — client strip',
  description: 'A quiet row of client or certification logos. Falls back to names.',
  category: 'logos',
  capabilities: ['list', 'images', 'social-proof'],
  industries: ['*'],
  style: ['minimal', 'clean'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 97, mobile: 97 },
  fields: [
    field.text('heading', 'Heading', { help: 'Leave empty to show only the logos.' }),
    field.items('items', 'Logos', logoItemFields, { itemLabel: 'Logo', maxItems: 12 }),
  ],
  schema: z.object({
    heading: text('Trusted by'),
    items: z
      .array(logoItem)
      .max(12)
      .default([
        { name: 'Client one', image: '' },
        { name: 'Client two', image: '' },
        { name: 'Client three', image: '' },
      ]),
  }),
})
