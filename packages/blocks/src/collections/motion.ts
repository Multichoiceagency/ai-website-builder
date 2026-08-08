import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import { featureItemFields, featureItemSchema } from './shared.js'
import { field, imageUrl, longText, text } from '../fields.js'

/**
 * The `motion` collection — scroll as choreography.
 *
 * Every block here binds an effect to scroll position: a pinned sequence, a
 * sticky stack, a horizontal track. That is genuinely more expensive than
 * static markup, so these are class B–C and the registry keeps C out of
 * generated sites unless the chosen style direction pays for it.
 *
 * Implementation rules these renderers follow:
 *  - the effect is CSS scroll-driven or IntersectionObserver-driven; no scroll
 *    event handler runs layout on every frame
 *  - only `transform`, `opacity`, `filter` and `clip-path` animate
 *  - `prefers-reduced-motion` collapses each one to its finished state, and the
 *    content is readable in document order either way
 */

export const heroMaskReveal01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'reveal', 'clip-path', 'headline'],
  id: 'hero-mask-reveal-01',
  name: 'Hero — masked line reveal',
  description:
    'Headline lines rise out from behind a mask, one after another, with a quiet rule that draws itself underneath.',
  category: 'hero',
  capabilities: ['eyebrow', 'headline', 'subtitle', 'cta', 'motion'],
  industries: ['agency', 'consultant', 'legal', 'accounting', 'saas', 'real_estate'],
  style: ['editorial', 'premium', 'minimal'],
  performanceClass: 'B',
  scores: { performance: 93, accessibility: 97, mobile: 94 },
  defaultMotion: { preset: 'none', trigger: 'load' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.textarea('headline', 'Headline', { help: 'One line per row. Each line reveals separately.' }),
    field.textarea('subheadline', 'Supporting text'),
    field.text('primaryLabel', 'Primary button'),
    field.url('primaryHref', 'Primary link'),
    field.text('secondaryLabel', 'Secondary button', { help: 'Leave empty to hide.' }),
    field.url('secondaryHref', 'Secondary link'),
  ],
  schema: z.object({
    eyebrow: text(''),
    headline: longText('Design that carries\nits own weight'),
    subheadline: longText('One sentence that earns the next scroll.'),
    primaryLabel: text('Start a project'),
    primaryHref: text('/contact'),
    secondaryLabel: text(''),
    secondaryHref: text(''),
  }),
})

export const contentScrollReveal01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'reveal', 'typography', 'editorial'],
  id: 'content-scroll-reveal-01',
  name: 'Text — statement that reveals as you read',
  description:
    'A large paragraph whose words brighten as the section moves through the viewport. Reads as a plain paragraph without motion.',
  category: 'content',
  capabilities: ['heading', 'text', 'motion', 'scroll'],
  industries: ['*'],
  style: ['editorial', 'premium', 'bold'],
  performanceClass: 'B',
  scores: { performance: 92, accessibility: 97, mobile: 92 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading', { help: 'Leave empty to show only the statement.' }),
    field.textarea('body', 'Statement', { help: 'Keep it to two or three sentences — this is a pull quote, not an essay.' }),
  ],
  schema: z.object({
    heading: text(''),
    body: longText(
      'We build the thing you actually need, in the time we said we would, for the number we agreed at the start.',
    ),
  }),
})

export const featuresStickyStack01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'sticky', 'stack', 'cards'],
  id: 'features-sticky-stack-01',
  name: 'Features — cards that stack as you scroll',
  description:
    'Each card sticks to the top and the next one slides over it, so the section reads as a deck being dealt. Stacks into a plain list on small screens.',
  category: 'features',
  capabilities: ['heading', 'list', 'icons', 'motion', 'scroll', 'sticky'],
  industries: ['saas', 'agency', 'consultant', 'ecommerce', 'accounting'],
  style: ['premium', 'modern', 'bold'],
  performanceClass: 'C',
  scores: { performance: 86, accessibility: 96, mobile: 88 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items('items', 'Cards', featureItemFields, { itemLabel: 'Card', maxItems: 6 }),
  ],
  schema: z.object({
    heading: text('How the work goes'),
    intro: longText(''),
    items: z
      .array(featureItemSchema)
      .max(6)
      .default([
        { icon: 'phone', title: 'We talk first', description: 'Twenty minutes to understand the job properly.' },
        { icon: 'wrench', title: 'We plan the work', description: 'A written scope, a date and a fixed price.' },
        { icon: 'check', title: 'We finish it', description: 'Delivered, tested and handed over — not "nearly done".' },
      ]),
  }),
})

export const galleryPinnedSequence01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'pinned', 'sequence', 'storytelling'],
  id: 'gallery-pinned-sequence-01',
  name: 'Showcase — pinned sequence',
  description:
    'The visual pins to the viewport while captions advance beneath it. The classic scrollytelling section, at the cost of one pinned layer.',
  category: 'gallery',
  capabilities: ['image', 'list', 'motion', 'scroll', 'sticky'],
  industries: ['agency', 'real_estate', 'automotive', 'saas', 'restaurant'],
  style: ['cinematic', 'premium', 'editorial'],
  performanceClass: 'C',
  scores: { performance: 84, accessibility: 95, mobile: 86 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.items(
      'items',
      'Steps',
      [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'imageAlt', label: 'Image description', type: 'text' },
      ],
      { itemLabel: 'Step', maxItems: 5 },
    ),
  ],
  schema: z.object({
    heading: text('How it comes together'),
    items: z
      .array(
        z.object({
          title: text('Step'),
          description: longText('What happens at this point, in one or two sentences.'),
          image: imageUrl(''),
          imageAlt: text(''),
        }),
      )
      .max(5)
      .default([
        { title: 'Survey', description: 'We measure, photograph and note every constraint before quoting.', image: '', imageAlt: '' },
        { title: 'Build', description: 'One team on site from start to finish, so nothing gets handed over twice.', image: '', imageAlt: '' },
        { title: 'Handover', description: 'Cleaned, tested and signed off with you in the room.', image: '', imageAlt: '' },
      ]),
  }),
})

export const galleryHorizontalScroll01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'horizontal', 'gallery', 'carousel'],
  id: 'gallery-horizontal-scroll-01',
  name: 'Gallery — horizontal track',
  description:
    'A row of work that moves sideways as the page scrolls down. Becomes an ordinary swipeable row on touch devices and with reduced motion.',
  category: 'gallery',
  capabilities: ['image', 'list', 'motion', 'scroll'],
  industries: ['agency', 'real_estate', 'beauty', 'restaurant', 'ecommerce', 'automotive'],
  style: ['premium', 'cinematic', 'bold'],
  performanceClass: 'C',
  scores: { performance: 85, accessibility: 94, mobile: 89 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.items(
      'items',
      'Slides',
      [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'caption', label: 'Caption', type: 'text' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'imageAlt', label: 'Image description', type: 'text' },
      ],
      { itemLabel: 'Slide', maxItems: 10 },
    ),
  ],
  schema: z.object({
    heading: text('Recent work'),
    intro: longText(''),
    items: z
      .array(
        z.object({
          title: text('Project'),
          caption: text(''),
          image: imageUrl(''),
          imageAlt: text(''),
        }),
      )
      .max(10)
      .default([
        { title: 'Kitchen renovation', caption: 'Rotterdam · 2 weeks', image: '', imageAlt: '' },
        { title: 'Office fit-out', caption: 'Delft · 6 weeks', image: '', imageAlt: '' },
        { title: 'Roof replacement', caption: 'Schiedam · 4 days', image: '', imageAlt: '' },
      ]),
  }),
})

export const aboutScrollStory01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'sticky', 'timeline', 'storytelling'],
  id: 'about-scroll-story-01',
  name: 'About — sticky visual with scrolling steps',
  description:
    'A visual holds still on one side while the story scrolls past on the other, highlighting the active step. Collapses to a normal timeline on mobile.',
  category: 'about',
  capabilities: ['heading', 'text', 'image', 'list', 'motion', 'scroll', 'sticky'],
  industries: ['agency', 'consultant', 'legal', 'healthcare', 'saas', 'contractor'],
  style: ['editorial', 'premium', 'trustworthy'],
  performanceClass: 'C',
  scores: { performance: 86, accessibility: 96, mobile: 87 },
  defaultMotion: { preset: 'none' },
  fields: [
    field.text('heading', 'Heading'),
    field.image('image', 'Image'),
    field.text('imageAlt', 'Image description'),
    field.items(
      'items',
      'Steps',
      [
        { key: 'year', label: 'Year or label', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
      { itemLabel: 'Step', maxItems: 8 },
    ),
  ],
  schema: z.object({
    heading: text('How we got here'),
    image: imageUrl(''),
    imageAlt: text(''),
    items: z
      .array(
        z.object({
          year: text('2019'),
          title: text('A milestone'),
          description: longText('What changed, and what it meant for the people we work for.'),
        }),
      )
      .max(8)
      .default([
        { year: '2014', title: 'Two of us and a van', description: 'One town, word of mouth, no website.' },
        { year: '2019', title: 'A proper workshop', description: 'Room to prefabricate meant shorter jobs on site.' },
        { year: '2024', title: 'Twelve people', description: 'Same standard of work, more of it, still local.' },
      ]),
  }),
})

/**
 * Apple-style scroll scrub: paints a media-library WebP frame pack on a sticky
 * canvas as the user scrolls. Frames are extracted server-side on video upload.
 */
export const scrollVideoScrub01 = defineCollectionBlock({
  collection: 'motion',
  tags: ['scroll', 'video', 'frames', 'scrub', '3d', 'canvas', 'sticky', 'frame-pack', 'scrollytelling'],
  id: 'scroll-video-scrub-01',
  name: 'Scroll — video frame scrub',
  description:
    'A tall scroll section that scrubs through extracted video frames on a sticky canvas (Apple-style 3D product scrub). Pick a library video with frames ready; overlay copy fades in by progress.',
  category: 'gallery',
  capabilities: ['video', 'motion', 'scroll', 'sticky', 'headline', 'text'],
  industries: ['*', 'creative', 'agency', 'saas', 'product'],
  style: ['bold', 'premium', 'cinematic'],
  performanceClass: 'C',
  scores: { performance: 82, accessibility: 94, mobile: 88 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  fields: [
    field.image('video', 'Scroll video', {
      help: 'Library video with scroll frames ready (auto-extracted after upload).',
    }),
    field.text('mediaId', 'Media id', {
      help: 'Filled automatically when you pick a video.',
    }),
    field.text('frameCount', 'Frame count'),
    field.text('frameFps', 'Frame fps'),
    field.select('scrollHeightVh', 'Scroll length', [
      { label: '200vh', value: '200' },
      { label: '300vh', value: '300' },
      { label: '400vh', value: '400' },
      { label: '500vh', value: '500' },
    ]),
    field.items(
      'steps',
      'Overlay steps',
      [
        { key: 'at', label: 'At progress (0–1)', type: 'text' },
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'body', label: 'Body', type: 'textarea' },
      ],
      { itemLabel: 'Step', maxItems: 6 },
    ),
  ],
  schema: z.object({
    video: imageUrl(''),
    mediaId: text(''),
    frameCount: z.coerce.number().int().min(0).max(500).default(0),
    frameFps: z.coerce.number().min(0).max(60).default(24),
    scrollHeightVh: z.enum(['200', '300', '400', '500']).default('300'),
    steps: z
      .array(
        z.object({
          at: text('0'),
          headline: text(''),
          body: longText(''),
        }),
      )
      .max(6)
      .default([
        { at: '0', headline: 'Scroll to explore', body: 'Move through the story one frame at a time.' },
        { at: '0.45', headline: 'Every angle matters', body: 'The product reveals itself as you go.' },
        { at: '0.85', headline: 'Ready when you are', body: 'End on the detail that sells.' },
      ]),
  }),
})

export const MOTION_COLLECTION_BLOCKS = [
  heroMaskReveal01,
  contentScrollReveal01,
  featuresStickyStack01,
  galleryPinnedSequence01,
  galleryHorizontalScroll01,
  aboutScrollStory01,
  scrollVideoScrub01,
]
