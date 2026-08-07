import { z } from 'zod'
import { defineCollectionBlock } from './define-collection.js'
import { field, text } from '../fields.js'

/**
 * MotionSites React island embed (ADR-0003 escape hatch).
 *
 * The CMS stores only `{ sectionId }` — the sandboxed iframe loads a first-party
 * Vite+React build from `/motionsites/islands/{sectionId}/`. AI site planning
 * must not select this block (class D + category `gallery` is picker-only).
 */
export const motionSection01 = defineCollectionBlock({
  collection: 'spotlight',
  tags: ['motionsites', 'embed', 'island', 'react', 'video'],
  id: 'motion-section-01',
  name: 'MotionSites island',
  description:
    'Exact MotionSites section as a sandboxed React island (Tailwind, framer-motion, local video). Not AI-planned — insert from the MotionSites catalogue when islandReady.',
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
  ],
  schema: z.object({
    sectionId: z.string().min(1).max(120).default('velorah-hero'),
    title: text(''),
    minHeight: z.enum(['100vh', 'auto']).default('100vh'),
  }),
})

export const MOTIONSITES_ISLAND_BLOCKS = [motionSection01]
