import { z } from 'zod'
import type { BlockField } from '@platform/schemas'
import { field, href, icon, longText, text, toneSchema } from '../fields.js'

/**
 * Canonical prop shapes per category.
 *
 * The generation pipeline fills a section's props by looking at the *category
 * prefix* of the block id (`services-…`, `testimonials-…`, `cta-…`). A new
 * block that adopts its category's prefix and these prop names therefore
 * receives real business content the moment AI selects it; one that invents its
 * own prop names would silently render its placeholder defaults on a customer's
 * live site.
 *
 * So: every block in an AI-reachable category is built from the shapes below.
 * Blocks in categories the generator never plans (gallery, pricing, team, blog)
 * are free to define whatever their design needs.
 */

// region Items

export const featureItemSchema = z.object({
  icon: icon('check'),
  title: text('Feature'),
  description: text('One sentence about this feature.'),
})

export const featureItemFields: BlockField['itemFields'] = [
  { key: 'icon', label: 'Icon', type: 'icon' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
]

export const serviceItemSchema = z.object({
  title: text('Service'),
  description: longText('What this service includes and who it is for.'),
  href: href(''),
  linkLabel: text('Read more'),
})

export const serviceItemFields: BlockField['itemFields'] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'href', label: 'Link', type: 'url' },
  { key: 'linkLabel', label: 'Link label', type: 'text' },
]

/**
 * One cell of a bento grid. `size` is a *span intent*, not pixels — the renderer
 * maps it to column and row spans and ignores it entirely below the breakpoint
 * where every cell is full width anyway.
 */
export const bentoCellSchema = z.object({
  title: text('Capability'),
  description: longText('One sentence about this panel.'),
  size: z.enum(['normal', 'wide', 'tall']).default('normal'),
})

export const bentoCellFields: BlockField['itemFields'] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    help: 'Wide spans two columns; tall spans two rows.',
    options: [
      { label: 'Normal', value: 'normal' },
      { label: 'Wide', value: 'wide' },
      { label: 'Tall', value: 'tall' },
    ],
  },
]

export const testimonialItemSchema = z.object({
  quote: longText('They were quick, tidy and honest about the price.'),
  author: text('Customer name'),
  role: text(''),
  rating: z.number().min(0).max(5).default(5),
})

export const testimonialItemFields: BlockField['itemFields'] = [
  { key: 'quote', label: 'Quote', type: 'textarea' },
  { key: 'author', label: 'Name', type: 'text' },
  { key: 'role', label: 'Role or location', type: 'text' },
  { key: 'rating', label: 'Rating (0–5)', type: 'number' },
]

export const faqItemSchema = z.object({
  question: text('A question customers ask'),
  answer: longText('The answer, in plain language.'),
})

export const faqItemFields: BlockField['itemFields'] = [
  { key: 'question', label: 'Question', type: 'text' },
  { key: 'answer', label: 'Answer', type: 'textarea' },
]

/** Stats carry a *string* value: "4,9" and "same day" are both valid answers. */
export const statItemSchema = z.object({
  value: text('100+'),
  label: text('Projects delivered'),
})

export const statItemFields: BlockField['itemFields'] = [
  { key: 'value', label: 'Number', type: 'text' },
  { key: 'label', label: 'Label', type: 'text' },
]

// endregion

// region Prop groups

export const ctaProps = {
  heading: text('Need help today?'),
  body: longText('Call us and speak to someone who can actually come out.'),
  ctaLabel: text('Request a quote'),
  ctaHref: href('/contact'),
  tone: toneSchema.default('primary'),
}

export const ctaFields: BlockField[] = [
  field.text('heading', 'Heading'),
  field.textarea('body', 'Supporting text'),
  field.text('ctaLabel', 'Button label'),
  field.url('ctaHref', 'Button link'),
  field.select('tone', 'Background', [
    { label: 'Light', value: 'light' },
    { label: 'Muted', value: 'muted' },
    { label: 'Primary', value: 'primary' },
    { label: 'Dark', value: 'dark' },
  ]),
]

/** The hero contract shared with `hero-split-01`, prefix and all. */
export const splitHeroProps = {
  eyebrow: text(''),
  headline: text('A headline that says what you do'),
  subheadline: longText('One or two sentences explaining who you help and why they should call you.'),
  primaryLabel: text('Request a quote'),
  primaryHref: href('/contact'),
  secondaryLabel: text(''),
  secondaryHref: href(''),
  image: text(''),
  imageAlt: text(''),
}

export const splitHeroFields: BlockField[] = [
  field.text('eyebrow', 'Eyebrow'),
  field.text('headline', 'Headline'),
  field.textarea('subheadline', 'Supporting text'),
  field.text('primaryLabel', 'Primary button'),
  field.url('primaryHref', 'Primary link'),
  field.text('secondaryLabel', 'Secondary button', { help: 'Leave empty to hide.' }),
  field.url('secondaryHref', 'Secondary link'),
  field.image('image', 'Image'),
  field.text('imageAlt', 'Image description', { help: 'Required for accessibility and SEO.' }),
]

// endregion
