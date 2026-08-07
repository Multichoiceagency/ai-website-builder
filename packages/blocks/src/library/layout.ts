import { z } from 'zod'
import { defineBlock } from '../define.js'
import { bool, field, href, imageUrl, text } from '../fields.js'

const linkItem = z.object({
  label: text('Link'),
  href: href('/'),
})

const linkItemFields = [
  { key: 'label', label: 'Label', type: 'text' as const },
  { key: 'href', label: 'Link', type: 'url' as const },
]

export const headerSimple01 = defineBlock({
  id: 'header-simple-01',
  name: 'Header — logo and links',
  description: 'Sticky header with a wordmark, up to six links and one call-to-action button.',
  category: 'header',
  capabilities: ['logo', 'navigation', 'cta', 'sticky'],
  industries: ['*'],
  style: ['minimal', 'clean'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 98, mobile: 97 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  fields: [
    field.text('brand', 'Brand name'),
    field.image('logo', 'Logo image', { help: 'Leave empty to show the brand name as text.' }),
    field.items('links', 'Navigation links', linkItemFields, { itemLabel: 'Link', maxItems: 6 }),
    field.text('ctaLabel', 'Button label'),
    field.url('ctaHref', 'Button link'),
    field.boolean('sticky', 'Stick to the top while scrolling'),
  ],
  schema: z.object({
    brand: text('Your business'),
    logo: imageUrl(''),
    links: z
      .array(linkItem)
      .max(6)
      .default([
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ]),
    ctaLabel: text('Request a quote'),
    ctaHref: href('/contact'),
    sticky: bool(true),
  }),
})

export const footerSimple01 = defineBlock({
  id: 'footer-simple-01',
  name: 'Footer — columns and legal line',
  description: 'Footer with contact details, two link columns and a copyright line.',
  category: 'footer',
  capabilities: ['navigation', 'contact', 'legal'],
  industries: ['*'],
  style: ['minimal', 'clean'],
  performanceClass: 'A',
  scores: { performance: 99, accessibility: 98, mobile: 98 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  fields: [
    field.text('brand', 'Brand name'),
    field.textarea('tagline', 'Short description'),
    field.text('phone', 'Phone'),
    field.text('email', 'E-mail'),
    field.text('address', 'Address'),
    field.items('links', 'Footer links', linkItemFields, { itemLabel: 'Link', maxItems: 8 }),
    field.text('legal', 'Legal line'),
  ],
  schema: z.object({
    brand: text('Your business'),
    tagline: text(''),
    phone: text(''),
    email: text(''),
    address: text(''),
    links: z
      .array(linkItem)
      .max(8)
      .default([
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ]),
    legal: text(''),
  }),
})
