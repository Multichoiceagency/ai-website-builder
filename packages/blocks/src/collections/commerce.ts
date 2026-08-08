import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import { bool, field, href, icon, imageUrl, longText, text } from '../fields.js'

/**
 * Commerce product surfaces — conversion-first PDPs and shop chrome.
 *
 * Layout vocabulary matches modern DTC product pages (gallery + buy box +
 * purchase plans + trust), painted with site theme tokens so each brand keeps
 * its own colours rather than a hard-coded look.
 */

const galleryImageSchema = z.object({
  image: imageUrl(''),
  alt: text(''),
})

const featureTagSchema = z.object({
  label: text('Feature'),
})

const optionGroupSchema = z.object({
  label: text('Choose'),
  /** One choice per line: `Label | icon-name | optional hint` */
  choices: longText('Small | package | Under 10kg\nMedium | package | 10–25kg\nLarge | package | 25–40kg'),
})

const purchasePlanSchema = z.object({
  title: text('One-time'),
  price: text('$48'),
  compareAt: text(''),
  badge: text(''),
  description: text(''),
})

const trustItemSchema = z.object({
  icon: icon('shield'),
  label: text('Guarantee'),
})

export const productDetail01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['product', 'ecommerce', 'pdp', 'commerce', 'buy-box', 'conversion'],
  id: 'product-detail-01',
  name: 'Product — detail buy box',
  description:
    'Full product detail: image gallery with thumbs, rating, feature pills, option pickers, purchase plans (one-time / subscribe), primary CTA and a trust row. Built for DTC ecommerce pages.',
  category: 'product',
  capabilities: ['heading', 'image', 'list', 'pricing', 'cta', 'interactive', 'commerce'],
  industries: ['ecommerce', 'beauty', 'restaurant', 'local', 'agency'],
  style: ['bold', 'modern', 'premium'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 96, mobile: 95 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('title', 'Product title'),
    field.textarea('subtitle', 'Subtitle'),
    field.text('rating', 'Rating', { help: 'e.g. 4.9' }),
    field.text('ratingCount', 'Review count label'),
    field.text('priceLine', 'Price line'),
    field.items(
      'featureTags',
      'Feature tags',
      [{ key: 'label', label: 'Tag', type: 'text' }],
      { itemLabel: 'Tag', maxItems: 8 },
    ),
    field.items(
      'gallery',
      'Gallery images',
      [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'alt', label: 'Alt text', type: 'text' },
      ],
      { itemLabel: 'Image', maxItems: 8 },
    ),
    field.text('galleryPanelColor', 'Gallery panel colour', {
      help: 'Optional hex for the image stage (e.g. #F4A99A). Empty uses site accent.',
    }),
    field.items(
      'optionGroups',
      'Option groups',
      [
        { key: 'label', label: 'Group label', type: 'text' },
        {
          key: 'choices',
          label: 'Choices',
          type: 'textarea',
          help: 'One per line: Label | icon-name | optional hint',
        },
      ],
      { itemLabel: 'Group', maxItems: 4 },
    ),
    field.items(
      'purchasePlans',
      'Purchase plans',
      [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'compareAt', label: 'Compare-at', type: 'text' },
        { key: 'badge', label: 'Badge', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
      { itemLabel: 'Plan', maxItems: 4 },
    ),
    field.text('ctaLabel', 'CTA label'),
    field.url('ctaHref', 'CTA link'),
    field.items(
      'trustItems',
      'Trust row',
      [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'label', label: 'Label', type: 'text' },
      ],
      { itemLabel: 'Item', maxItems: 4 },
    ),
    field.boolean('thickBorders', 'Strong borders', {
      help: 'Neobrutalist 2px ink borders on cards and controls.',
    }),
  ],
  schema: z.object({
    eyebrow: text('AIR-DRIED · SMALL BATCH'),
    title: text('Heritage Blend'),
    subtitle: longText('For sensitive stomachs and everyday heroes.'),
    rating: text('4.9'),
    ratingCount: text('3,894 reviews'),
    priceLine: text('$48 / 1.5kg bag · about 30 meals'),
    featureTags: z
      .array(featureTagSchema)
      .max(8)
      .default([
        { label: '74% PROTEIN' },
        { label: 'ONE SOURCE' },
        { label: 'GRAIN-INCLUSIVE' },
        { label: 'AIR-DRIED' },
      ]),
    gallery: z
      .array(galleryImageSchema)
      .max(8)
      .default([
        { image: '', alt: 'Product front' },
        { image: '', alt: 'Product side' },
        { image: '', alt: 'Product detail' },
        { image: '', alt: 'Product open' },
      ]),
    galleryPanelColor: text(''),
    optionGroups: z
      .array(optionGroupSchema)
      .max(4)
      .default([
        {
          label: "WHAT'S THE RIGHT SIZE?",
          choices:
            'Small | package | Under 10kg\nMedium | package | 10–25kg\nLarge | package | 25–40kg\nXL | package | 40kg+',
        },
        {
          label: 'PROTEIN',
          choices: 'Chicken | flame |\nSalmon | leaf |\nLamb | heart |',
        },
      ]),
    purchasePlans: z
      .array(purchasePlanSchema)
      .max(4)
      .default([
        {
          title: 'One-time bag',
          price: '$48',
          compareAt: '',
          badge: '',
          description: '',
        },
        {
          title: 'Subscribe · every 4 weeks',
          price: '$33.60',
          compareAt: '$48',
          badge: 'MOST CHOSEN',
          description: 'Skip or cancel anytime.',
        },
        {
          title: 'Subscribe · every 8 weeks',
          price: '$40.80',
          compareAt: '',
          badge: '',
          description: '',
        },
      ]),
    ctaLabel: text('START FOR $33.60 — FIRST BAG'),
    ctaHref: href('/commerce'),
    trustItems: z
      .array(trustItemSchema)
      .max(4)
      .default([
        { icon: 'package', label: 'One named protein — no rendered meal.' },
        { icon: 'leaf', label: 'Gently dried so nutrients stay put.' },
        { icon: 'refresh', label: '30-day fuss-free guarantee.' },
      ]),
    thickBorders: bool(true),
  }),
})

export const shopAnnouncement01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['ecommerce', 'announcement', 'marquee', 'commerce'],
  id: 'header-shop-announce-01',
  name: 'Shop — announcement bar',
  description:
    'Full-bleed promo strip above the shop header — shipping offers, new drops, rotating messages.',
  category: 'header',
  capabilities: ['text', 'commerce'],
  industries: ['ecommerce', 'beauty', 'local'],
  style: ['bold', 'modern'],
  performanceClass: 'A',
  scores: { performance: 97, accessibility: 97, mobile: 98 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  fields: [
    field.textarea('messages', 'Messages', {
      help: 'One message per line. Shown separated by a middle dot.',
    }),
    field.boolean('sticky', 'Stick to top'),
  ],
  schema: z.object({
    messages: longText(
      'NEW RECIPE IN STOCK · FREE SHIPPING ON YOUR FIRST BOX · SUBSCRIBE AND SAVE 30%',
    ),
    sticky: bool(false),
  }),
})

export const COMMERCE_COLLECTION_BLOCKS = [shopAnnouncement01, productDetail01]
