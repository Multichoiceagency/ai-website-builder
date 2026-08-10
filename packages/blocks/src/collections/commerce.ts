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

const productCardSchema = z.object({
  image: imageUrl(''),
  title: text('Product'),
  price: text('$29'),
  compareAt: text(''),
  badge: text(''),
  href: href('/shop'),
  meta: text(''),
})

export const productCardGrid01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['product', 'ecommerce', 'grid', 'catalog', 'commerce', 'cards'],
  id: 'product-card-grid-01',
  name: 'Product — card grid',
  description:
    'Responsive product catalogue grid: image, title, price, optional badge and quick CTA. For shop homes and collection pages.',
  category: 'product',
  capabilities: ['image', 'list', 'pricing', 'cta', 'commerce'],
  industries: ['ecommerce', 'beauty', 'restaurant', 'local'],
  style: ['modern', 'minimal', 'premium'],
  performanceClass: 'A',
  scores: { performance: 96, accessibility: 97, mobile: 97 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('title', 'Section title'),
    field.textarea('subtitle', 'Subtitle'),
    field.url('viewAllHref', 'View-all link'),
    field.text('viewAllLabel', 'View-all label'),
    field.items(
      'products',
      'Products',
      [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'compareAt', label: 'Compare-at', type: 'text' },
        { key: 'badge', label: 'Badge', type: 'text' },
        { key: 'meta', label: 'Meta line', type: 'text' },
        { key: 'href', label: 'Link', type: 'url' },
      ],
      { itemLabel: 'Product', maxItems: 12 },
    ),
    field.text('columns', 'Columns', { help: '2, 3, or 4 on desktop' }),
  ],
  schema: z.object({
    eyebrow: text('BEST SELLERS'),
    title: text('Shop the favourites'),
    subtitle: longText('Chef-crafted meals and essentials, ready when you are.'),
    viewAllHref: href('/shop'),
    viewAllLabel: text('View all'),
    columns: text('3'),
    products: z
      .array(productCardSchema)
      .max(12)
      .default([
        {
          image: '',
          title: 'Lemon & Lentil Dahl',
          price: '$8.99',
          compareAt: '',
          badge: 'Plant-based',
          meta: '370 cal · 20g protein',
          href: '/shop',
        },
        {
          image: '',
          title: 'Ayurvedic Curry',
          price: '$9.49',
          compareAt: '$10.99',
          badge: 'Bestseller',
          meta: '420 cal · 24g protein',
          href: '/shop',
        },
        {
          image: '',
          title: 'Tomato Vegetable Lasagne',
          price: '$8.99',
          compareAt: '',
          badge: '',
          meta: '390 cal · 18g protein',
          href: '/shop',
        },
        {
          image: '',
          title: 'Herb Roast Bowl',
          price: '$9.29',
          compareAt: '',
          badge: 'New',
          meta: '410 cal · 28g protein',
          href: '/shop',
        },
      ]),
  }),
})

export const productCarousel01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['product', 'ecommerce', 'carousel', 'catalog', 'commerce', 'scroll'],
  id: 'product-carousel-01',
  name: 'Product — horizontal carousel',
  description:
    'Snap-scroll product strip with cards (image, price, CTA). Editorial “best sellers” rows for DTC storefronts.',
  category: 'product',
  capabilities: ['image', 'list', 'pricing', 'cta', 'interactive', 'commerce'],
  industries: ['ecommerce', 'beauty', 'creative'],
  style: ['editorial', 'modern', 'premium'],
  performanceClass: 'B',
  scores: { performance: 94, accessibility: 95, mobile: 96 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('eyebrow', 'Eyebrow'),
    field.text('title', 'Section title'),
    field.textarea('subtitle', 'Subtitle'),
    field.url('viewAllHref', 'View-all link'),
    field.text('viewAllLabel', 'View-all label'),
    field.items(
      'products',
      'Products',
      [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'compareAt', label: 'Compare-at', type: 'text' },
        { key: 'badge', label: 'Badge', type: 'text' },
        { key: 'meta', label: 'Meta line', type: 'text' },
        { key: 'href', label: 'Link', type: 'url' },
      ],
      { itemLabel: 'Product', maxItems: 16 },
    ),
  ],
  schema: z.object({
    eyebrow: text('THE VAULT'),
    title: text('More looks'),
    subtitle: longText('Swipe the latest issues, covers, and variants.'),
    viewAllHref: href('/shop'),
    viewAllLabel: text('Shop all'),
    products: z
      .array(productCardSchema)
      .max(16)
      .default([
        {
          image: '',
          title: 'Issue #07 — Quiet City',
          price: '$4.99',
          compareAt: '',
          badge: 'New',
          meta: '32 pages · Full colour',
          href: '/shop',
        },
        {
          image: '',
          title: 'Variant cover — Anderson',
          price: '$6.99',
          compareAt: '$8.99',
          badge: 'Limited',
          meta: 'Bagged & boarded',
          href: '/shop',
        },
        {
          image: '',
          title: 'Back-issue pack',
          price: '$18',
          compareAt: '',
          badge: '',
          meta: '3 issues',
          href: '/shop',
        },
        {
          image: '',
          title: 'Creator signed edition',
          price: '$24',
          compareAt: '',
          badge: 'Signed',
          meta: 'While stocks last',
          href: '/shop',
        },
        {
          image: '',
          title: 'Subscription box',
          price: '$42',
          compareAt: '$54',
          badge: 'Best value',
          meta: '6 issues',
          href: '/shop',
        },
      ]),
  }),
})

export const productCategoryTiles01 = defineCollectionBlock({
  collection: 'showcase',
  tags: ['product', 'ecommerce', 'categories', 'commerce', 'tiles'],
  id: 'product-category-tiles-01',
  name: 'Product — category tiles',
  description:
    'Large image tiles for shop categories (Face / Body / Tools style). One job: route shoppers into a collection.',
  category: 'product',
  capabilities: ['image', 'list', 'cta', 'commerce'],
  industries: ['ecommerce', 'beauty', 'fashion'],
  style: ['editorial', 'premium', 'minimal'],
  performanceClass: 'A',
  scores: { performance: 96, accessibility: 96, mobile: 96 },
  defaultMotion: { preset: 'fade-up' },
  fields: [
    field.text('title', 'Section title'),
    field.textarea('subtitle', 'Subtitle'),
    field.items(
      'categories',
      'Categories',
      [
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'href', label: 'Link', type: 'url' },
        { key: 'meta', label: 'Meta', type: 'text' },
      ],
      { itemLabel: 'Category', maxItems: 6 },
    ),
  ],
  schema: z.object({
    title: text('Shop by ritual'),
    subtitle: longText('Pick a lane — we keep the rest simple.'),
    categories: z
      .array(
        z.object({
          image: imageUrl(''),
          title: text('Category'),
          href: href('/shop'),
          meta: text(''),
        }),
      )
      .max(6)
      .default([
        { image: '', title: 'Face', href: '/shop', meta: '12 products' },
        { image: '', title: 'Body', href: '/shop', meta: '8 products' },
        { image: '', title: 'Tools', href: '/shop', meta: '5 products' },
      ]),
  }),
})

export const COMMERCE_COLLECTION_BLOCKS = [
  shopAnnouncement01,
  productDetail01,
  productCardGrid01,
  productCarousel01,
  productCategoryTiles01,
]
