import { z } from 'zod'
import { defineBlock } from '../define.js'
import { bool, field, HEADER_LAYOUT_OPTIONS, href, imageUrl, text } from '../fields.js'

const linkItem = z.object({
  label: text('Link'),
  href: href('/'),
})

const linkItemFields = [
  { key: 'label', label: 'Label', type: 'text' as const },
  { key: 'href', label: 'Link', type: 'url' as const },
]

const headerLayoutSchema = z.enum(['left', 'center', 'split']).default('left')

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
    field.media('logo', 'Logo image', {
      help: 'Pick from the media library. Leave empty to use the site brand logo, or the brand name as text.',
    }),
    field.select('layout', 'Layout', HEADER_LAYOUT_OPTIONS, {
      help: 'Left: logo then links. Centre: logo centred. Split: logo left, links centre, button right.',
    }),
    field.items('links', 'Navigation links', linkItemFields, { itemLabel: 'Link', maxItems: 6 }),
    field.text('ctaLabel', 'Button label'),
    field.url('ctaHref', 'Button link'),
    field.boolean('sticky', 'Stick to the top while scrolling'),
  ],
  schema: z.object({
    brand: text('Your business'),
    logo: imageUrl(''),
    layout: headerLayoutSchema,
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

/**
 * MotionSites liquid-glass chrome — generated once per site and reused.
 * Exact islands (Wanderful, …) intentionally omit their own header and expect
 * this block at the top of the page.
 *
 * Logo is optional: Motionsites islands keep the wordmark when logo is empty
 * (no site-brand fallback), so cinematic chrome stays intact.
 */
export const headerLiquidGlass01 = defineBlock({
  id: 'header-liquid-glass-01',
  name: 'Header — liquid glass',
  description:
    'Fixed cinematic header with wordmark, pill navigation and glass CTA. Shared system-wide for MotionSites islands.',
  category: 'header',
  capabilities: ['logo', 'navigation', 'cta', 'sticky', 'glass'],
  industries: ['*', 'travel', 'creative', 'agency', 'ecommerce'],
  style: ['premium', 'bold', 'modern'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 96, mobile: 94 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  fields: [
    field.text('brand', 'Brand name'),
    field.media('logo', 'Logo image', {
      help: 'Optional. Leave empty to keep the wordmark (MotionSites default).',
    }),
    field.boolean('trademark', 'Show ™ after the brand'),
    field.select('layout', 'Layout', HEADER_LAYOUT_OPTIONS, {
      help: 'Split matches the MotionSites default (logo left, links centre, CTA right).',
    }),
    field.items('links', 'Navigation links', linkItemFields, { itemLabel: 'Link', maxItems: 6 }),
    field.text('ctaLabel', 'Button label'),
    field.url('ctaHref', 'Button link'),
  ],
  schema: z.object({
    brand: text('Wanderful'),
    logo: imageUrl(''),
    trademark: bool(true),
    layout: z.enum(['left', 'center', 'split']).default('split'),
    links: z
      .array(linkItem)
      .max(6)
      .default([
        { label: 'JOURNEY', href: '#journey' },
        { label: 'BENEFITS', href: '#benefits' },
        { label: 'JOURNAL', href: '#journal' },
        { label: 'GUIDEBOOK', href: '#guidebook' },
      ]),
    ctaLabel: text('GET ROAMING'),
    ctaHref: href('#plan'),
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
