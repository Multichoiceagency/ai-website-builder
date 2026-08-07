import { z } from 'zod'
import { defineBlock } from '../define.js'
import { field, href, icon, longText, text } from '../fields.js'

const featureItem = z.object({
  icon: icon('check'),
  title: text('Feature'),
  description: text('One sentence about this feature.'),
})

const featureItemFields = [
  { key: 'icon', label: 'Icon', type: 'icon' as const },
  { key: 'title', label: 'Title', type: 'text' as const },
  { key: 'description', label: 'Description', type: 'textarea' as const },
]

export const featuresGrid01 = defineBlock({
  id: 'features-grid-01',
  name: 'Features — icon grid',
  description: 'Three-column grid of icon, title and one line of copy. Stacks on mobile.',
  category: 'features',
  capabilities: ['heading', 'list', 'icons', 'motion'],
  industries: ['*'],
  style: ['clean', 'modern'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Features', featureItemFields, { itemLabel: 'Feature', maxItems: 9 }),
  ],
  schema: z.object({
    eyebrow: text(''),
    heading: text('Why clients choose us'),
    intro: text(''),
    items: z
      .array(featureItem)
      .max(9)
      .default([
        { icon: 'clock', title: 'Available 24/7', description: 'Call us any time, we pick up.' },
        { icon: 'shield', title: 'Fully insured', description: 'Certified and covered work.' },
        { icon: 'star', title: 'Rated 4.9', description: 'Based on verified customer reviews.' },
      ]),
  }),
})

const serviceItem = z.object({
  title: text('Service'),
  description: longText('What this service includes and who it is for.'),
  href: href(''),
  linkLabel: text('Read more'),
})

const serviceItemFields = [
  { key: 'title', label: 'Title', type: 'text' as const },
  { key: 'description', label: 'Description', type: 'textarea' as const },
  { key: 'href', label: 'Link', type: 'url' as const },
  { key: 'linkLabel', label: 'Link label', type: 'text' as const },
]

export const servicesList01 = defineBlock({
  id: 'services-list-01',
  name: 'Services — card list',
  description: 'Cards describing each service, each optionally linking to its own page.',
  category: 'services',
  capabilities: ['heading', 'list', 'links', 'motion'],
  industries: ['contractor', 'healthcare', 'agency', 'consultant', 'automotive', 'legal', 'local'],
  style: ['clean', 'modern', 'trustworthy'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 98, mobile: 97 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Services', serviceItemFields, { itemLabel: 'Service', maxItems: 12 }),
  ],
  schema: z.object({
    eyebrow: text(''),
    heading: text('What we do'),
    intro: text(''),
    items: z
      .array(serviceItem)
      .max(12)
      .default([
        {
          title: 'Service one',
          description: 'Describe the service in a sentence or two.',
          href: '',
          linkLabel: 'Read more',
        },
        {
          title: 'Service two',
          description: 'Describe the service in a sentence or two.',
          href: '',
          linkLabel: 'Read more',
        },
        {
          title: 'Service three',
          description: 'Describe the service in a sentence or two.',
          href: '',
          linkLabel: 'Read more',
        },
      ]),
  }),
})

export const contentRichText01 = defineBlock({
  id: 'content-richtext-01',
  name: 'Text — heading and paragraphs',
  description: 'A readable column of text. Blank lines start a new paragraph.',
  category: 'content',
  capabilities: ['heading', 'text'],
  industries: ['*'],
  style: ['editorial', 'minimal'],
  performanceClass: 'A',
  scores: { performance: 100, accessibility: 99, mobile: 99 },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('body', 'Text', { help: 'Leave a blank line between paragraphs.' }),
  ],
  schema: z.object({
    heading: text(''),
    body: longText('Write about your business here.'),
  }),
})

const faqItem = z.object({
  question: text('A question customers ask'),
  answer: longText('The answer, in plain language.'),
})

const faqItemFields = [
  { key: 'question', label: 'Question', type: 'text' as const },
  { key: 'answer', label: 'Answer', type: 'textarea' as const },
]

export const faqAccordion01 = defineBlock({
  id: 'faq-accordion-01',
  name: 'FAQ — accordion',
  description: 'Keyboard-accessible accordion. Emits FAQPage structured data.',
  category: 'faq',
  capabilities: ['heading', 'list', 'schema.org', 'interactive'],
  industries: ['*'],
  style: ['clean', 'minimal'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 99, mobile: 98 },
  fields: [
    field.text('heading', 'Heading'),
    field.items('items', 'Questions', faqItemFields, { itemLabel: 'Question', maxItems: 20 }),
  ],
  schema: z.object({
    heading: text('Frequently asked questions'),
    items: z
      .array(faqItem)
      .max(20)
      .default([
        { question: 'How quickly can you come out?', answer: 'Usually the same day.' },
        { question: 'What does it cost?', answer: 'We quote up front, with no call-out fee.' },
      ]),
  }),
})
