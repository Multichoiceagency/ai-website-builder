import { z } from 'zod'
import { defineBlock } from '../define.js'
import { TONE_OPTIONS, bool, field, href, text, toneSchema } from '../fields.js'

export const ctaBanner01 = defineBlock({
  id: 'cta-banner-01',
  name: 'Call to action — banner',
  description: 'A full-width band with one message and one action. Use it once per page.',
  category: 'cta',
  capabilities: ['heading', 'text', 'cta', 'motion'],
  industries: ['*'],
  style: ['bold', 'clean'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('body', 'Supporting text'),
    field.text('ctaLabel', 'Button label'),
    field.url('ctaHref', 'Button link'),
    field.select('tone', 'Background', TONE_OPTIONS),
  ],
  schema: z.object({
    heading: text('Need help today?'),
    body: text('Call us and speak to someone who can actually come out.'),
    ctaLabel: text('Request a quote'),
    ctaHref: href('/contact'),
    tone: toneSchema.default('primary'),
  }),
})

export const contactDetails01 = defineBlock({
  id: 'contact-details-01',
  name: 'Contact — details and hours',
  description:
    'Phone, e-mail, address and opening hours. Emits LocalBusiness structured data when the address is filled in.',
  category: 'contact',
  capabilities: ['contact', 'hours', 'map', 'schema.org'],
  industries: ['contractor', 'healthcare', 'restaurant', 'automotive', 'beauty', 'local'],
  style: ['clean', 'trustworthy'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.text('phone', 'Phone'),
    field.text('email', 'E-mail'),
    field.text('street', 'Street and number'),
    field.text('postalCode', 'Postal code'),
    field.text('city', 'City'),
    field.textarea('hours', 'Opening hours', { help: 'One line per day.' }),
    field.boolean('showMap', 'Show a map link'),
  ],
  schema: z.object({
    heading: text('Get in touch'),
    intro: text(''),
    phone: text(''),
    email: text(''),
    street: text(''),
    postalCode: text(''),
    city: text(''),
    hours: text('Monday–Friday 08:00–18:00\nSaturday 09:00–13:00'),
    showMap: bool(true),
  }),
})

export const contactForm01 = defineBlock({
  id: 'contact-form-01',
  name: 'Contact — lead form',
  description:
    'Name, e-mail, message and consent. Submissions become CRM leads on the published site.',
  category: 'contact',
  capabilities: ['contact', 'form', 'leads'],
  industries: ['*'],
  style: ['clean', 'trustworthy'],
  performanceClass: 'A',
  scores: { performance: 98, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('heading', 'Heading'),
    field.textarea('intro', 'Intro text'),
    field.text('submitLabel', 'Submit label'),
    field.text('successMessage', 'Success message'),
    field.boolean('showPhone', 'Ask for a phone number'),
    field.boolean('requireConsent', 'Require consent'),
  ],
  schema: z.object({
    heading: text('Send a message'),
    intro: text('Tell us what you need. We reply the same day.'),
    submitLabel: text('Send'),
    successMessage: text('Thanks — we will get back to you shortly.'),
    showPhone: bool(true),
    requireConsent: bool(true),
  }),
})
