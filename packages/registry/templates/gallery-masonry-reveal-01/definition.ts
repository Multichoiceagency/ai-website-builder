import { z } from 'zod'
import { defineCollectionBlock } from '../define-collection.js'
import { field, imageUrl, longText, text } from '../../fields.js'

/**
 * Installed by `pnpm registry:add gallery-masonry-reveal-01`.
 *
 * This file was vendored into the repository at build time. It is ordinary
 * source now: reviewed, versioned and type-checked like anything else.
 */
export const galleryMasonryReveal01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['masonry', 'reveal', 'scroll', 'gallery'],
  id: 'gallery-masonry-reveal-01',
  name: 'Gallery — masonry reveal',
  description:
    'A column-flow gallery whose tiles rise into place as they enter the viewport. Entrance motion only, so it settles and then costs nothing.',
  category: 'gallery',
  capabilities: ['image', 'list', 'motion', 'scroll'],
  industries: ['agency', 'beauty', 'restaurant', 'real_estate', 'contractor', 'automotive'],
  style: ['editorial', 'modern', 'premium'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 96, mobile: 93 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items(
      'items',
      'Images',
      [
        { key: 'caption', label: 'Caption', type: 'text' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'imageAlt', label: 'Image description', type: 'text' },
      ],
      { itemLabel: 'Image', maxItems: 18 },
    ),
  ],
  schema: z.object({
    heading: text('The work'),
    intro: longText(''),
    items: z
      .array(z.object({ caption: text(''), image: imageUrl(''), imageAlt: text('') }))
      .max(18)
      .default([
        { caption: 'Kitchen, Rotterdam', image: '', imageAlt: '' },
        { caption: 'Roof, Schiedam', image: '', imageAlt: '' },
        { caption: 'Office, Delft', image: '', imageAlt: '' },
        { caption: 'Bathroom, Capelle', image: '', imageAlt: '' },
        { caption: 'Extension, Vlaardingen', image: '', imageAlt: '' },
      ]),
  }),
})
