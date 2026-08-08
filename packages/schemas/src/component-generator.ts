import { z } from 'zod'
import { isoTimestampSchema, uuidSchema } from './common.js'

/**
 * System slots a generated UX component can be assigned to.
 *
 * Assignment always stores a registry block id + props (ADR-0003) — never
 * React/Vue source in the CMS document. Motionsites custom UX lands as
 * `motion-section-01` with a `sectionId` island pointer.
 */
export const COMPONENT_TARGETS = [
  'header',
  'product-card',
  'section',
  'hero',
  'footer',
  'theme',
  'custom',
] as const

export const componentTargetSchema = z.enum(COMPONENT_TARGETS)
export type ComponentTarget = z.infer<typeof componentTargetSchema>

export const COMPONENT_TARGET_LABELS: Record<ComponentTarget, string> = {
  header: 'Header',
  'product-card': 'Product card',
  section: 'Page section',
  hero: 'Hero',
  footer: 'Footer',
  theme: 'Design tokens',
  custom: 'Custom slot',
}

/**
 * What the site remembers for one slot. Renderers / commerce chrome read this
 * and resolve `block` + `props` — they never execute generated source.
 */
export const componentTargetAssignmentSchema = z.object({
  target: componentTargetSchema,
  block: z.string().min(1).max(64),
  props: z.record(z.unknown()).default({}),
  /** Present when `block` is a Motionsites island embed. */
  sectionId: z.string().min(1).max(120).optional(),
  /** Workspace asset that holds the same section composition. */
  assetId: uuidSchema.optional(),
  title: z.string().max(200).default(''),
  /** Short echo of the brief for the Components lab. */
  brief: z.string().max(500).default(''),
  referenceImage: z.string().max(2048).optional(),
  updatedAt: isoTimestampSchema,
})
export type ComponentTargetAssignment = z.infer<typeof componentTargetAssignmentSchema>

export const componentTargetsMapSchema = z
  .record(componentTargetSchema, componentTargetAssignmentSchema)
  .default({})
export type ComponentTargetsMap = z.infer<typeof componentTargetsMapSchema>

export const generateComponentInputSchema = z.object({
  siteId: uuidSchema,
  brief: z.string().trim().min(8).max(16_000),
  target: componentTargetSchema,
  title: z.string().trim().min(1).max(200).optional(),
  /**
   * Public media URL, `/api/v1/content/media/...` path, or data-URL.
   * Vision describes it when Gemini is configured; otherwise the path is
   * appended to the brief as reference text.
   */
  referenceImage: z.string().trim().max(2_000_000).optional(),
  /** Optional page to append the generated section onto. */
  pageId: uuidSchema.optional(),
  /** Persist a workspace asset (default true). */
  saveAsset: z.boolean().default(true),
  /** Write into `site.componentTargets[target]` (default true). */
  assign: z.boolean().default(true),
})
export type GenerateComponentInput = z.infer<typeof generateComponentInputSchema>

export const generateComponentResultSchema = z.object({
  ok: z.boolean(),
  target: componentTargetSchema,
  title: z.string(),
  /** Motionsites island id when an island was built. */
  sectionId: z.string().nullable(),
  /** ADR-0003 sections ready to insert / already assigned. */
  sections: z.array(
    z.object({
      id: z.string(),
      block: z.string(),
      props: z.record(z.unknown()),
      motion: z.record(z.unknown()).optional(),
    }),
  ),
  assignment: componentTargetAssignmentSchema.nullable(),
  assetId: z.string().nullable(),
  pageId: z.string().nullable(),
  model: z.string(),
  referenceMode: z.enum(['vision', 'text-fallback', 'none']),
  referenceSummary: z.string().max(4_000).default(''),
  themePatch: z.record(z.unknown()).nullable().default(null),
  errors: z.array(z.string()).default([]),
  note: z.string(),
})
export type GenerateComponentResult = z.infer<typeof generateComponentResultSchema>
