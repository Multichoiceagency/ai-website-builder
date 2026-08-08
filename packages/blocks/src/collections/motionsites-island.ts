import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import { field, text } from '../fields.js'

/**
 * MotionSites React island embed (ADR-0003 escape hatch).
 *
 * The CMS stores `{ sectionId }` + optional overlay copy/fonts. The sandboxed
 * iframe loads a first-party Vite+React build that stays fully animated
 * (video / spotlight / GSAP). Host props arrive via postMessage — never by
 * rewriting React source into the page document.
 */
export const motionSection01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['motionsites', 'embed', 'island', 'react', 'video'],
  id: 'motion-section-01',
  name: 'MotionSites island',
  description:
    'Exact MotionSites section as a sandboxed React island (Tailwind, framer-motion, local video). Overlay copy is editable; the island keeps its animation.',
  category: 'gallery',
  capabilities: ['embed', 'motion', 'video'],
  industries: ['*', 'creative', 'agency'],
  style: ['bold', 'premium', 'modern'],
  performanceClass: 'D',
  scores: { performance: 72, accessibility: 92, mobile: 86 },
  defaultMotion: { preset: 'none', trigger: 'none' },
  fields: [
    field.text('sectionId', 'Island id'),
    field.text('title', 'Label'),
    field.select('minHeight', 'Height', [
      { label: 'Full viewport', value: '100vh' },
      { label: 'Auto (postMessage)', value: 'auto' },
    ]),
    field.text('headline', 'Headline line 1', {
      help: 'Overlay on animated media — leave blank to keep the island default.',
    }),
    field.text('headlineLine2', 'Headline line 2'),
    field.textarea('bodyLeft', 'Body (left)'),
    field.textarea('bodyRight', 'Body (right)'),
    field.text('ctaLabel', 'CTA label'),
    field.text('fontDisplay', 'Display font', {
      help: 'Google Font family for the headline (e.g. Playfair Display).',
    }),
    field.text('fontBody', 'Body font', {
      help: 'Google Font family for supporting copy.',
    }),
  ],
  schema: z.object({
    sectionId: z.string().min(1).max(120).default('velorah-hero'),
    title: text(''),
    minHeight: z.enum(['100vh', 'auto']).default('100vh'),
    headline: text(''),
    headlineLine2: text(''),
    bodyLeft: text(''),
    bodyRight: text(''),
    ctaLabel: text(''),
    fontDisplay: text(''),
    fontBody: text(''),
  }),
})

export const MOTIONSITES_ISLAND_BLOCKS = [motionSection01]
