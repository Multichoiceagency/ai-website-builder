import { z } from 'zod'
import { defineCollectionBlock } from '../define-collection.js'
import { field, imageUrl, longText, text } from '../../fields.js'

/**
 * Installed by `pnpm registry:add blog-card-grid-01`.
 *
 * This file was vendored into the repository at build time. It is ordinary
 * source now: reviewed, versioned and type-checked like anything else.
 */
export const blogCardGrid01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['blog', 'cards', 'grid', 'editorial'],
  id: 'blog-card-grid-01',
  name: 'Blog — article cards',
  description:
    'A grid of article cards with cover, category, date and reading time. Static markup, so it costs nothing above what the images cost.',
  category: 'blog',
  capabilities: ['heading', 'list', 'images', 'links'],
  industries: ['*'],
  style: ['clean', 'editorial', 'modern'],
  performanceClass: 'A',
  scores: { performance: 97, accessibility: 98, mobile: 97 },
  defaultMotion: { preset: 'stagger-children' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items(
      'items',
      'Articles',
      [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'date', label: 'Date', type: 'text' },
        { key: 'readingTime', label: 'Reading time', type: 'text' },
        { key: 'image', label: 'Cover image', type: 'image' },
        { key: 'imageAlt', label: 'Cover description', type: 'text' },
        { key: 'href', label: 'Link', type: 'url' },
      ],
      { itemLabel: 'Article', maxItems: 12 },
    ),
  ],
  schema: z.object({
    heading: text('From the blog'),
    intro: longText(''),
    items: z
      .array(
        z.object({
          title: text('Article title'),
          excerpt: longText('One or two sentences that make the click worth it.'),
          category: text(''),
          date: text(''),
          readingTime: text(''),
          image: imageUrl(''),
          imageAlt: text(''),
          href: text(''),
        }),
      )
      .max(12)
      .default([
        {
          title: 'What a quote should actually contain',
          excerpt: 'Six things to check before you accept a price for building work.',
          category: 'Guides',
          date: '',
          readingTime: '4 min',
          image: '',
          imageAlt: '',
          href: '',
        },
        {
          title: 'Why we stopped offering the cheapest option',
          excerpt: 'And what we offer instead, which costs less over five years.',
          category: 'Opinion',
          date: '',
          readingTime: '6 min',
          image: '',
          imageAlt: '',
          href: '',
        },
        {
          title: 'A week on site, hour by hour',
          excerpt: 'What actually happens between the survey and the handover.',
          category: 'Behind the scenes',
          date: '',
          readingTime: '8 min',
          image: '',
          imageAlt: '',
          href: '',
        },
      ]),
  }),
})
