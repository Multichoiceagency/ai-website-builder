import { z } from 'zod'
import {
  sectionMotionSchema,
  type BlockCategory,
  type BlockField,
  type BlockMetadata,
  type BlockScores,
  type PerformanceClass,
  type SectionMotion,
} from '@platform/schemas'

/**
 * A block's props schema. Every field must carry a default so that
 * `schema.parse({})` yields a complete, renderable set of props — that is how
 * "add this block" works in the editor and how AI-generated sections degrade
 * safely when a prop is missing.
 */
export type BlockPropsSchema = z.ZodType<Record<string, unknown>, z.ZodTypeDef, unknown>

export interface BlockDefinitionInput {
  /** Stable id, e.g. `hero-split-01`. Never reused for a different design. */
  id: string
  /** Bump when props change in a backward-incompatible way. */
  version?: number
  name: string
  description: string
  category: BlockCategory
  /** What the block can express: `headline`, `image`, `cta`, `list`, … */
  capabilities: string[]
  /** Industry hints for AI selection. `*` means "suits anything". */
  industries: string[]
  /** Style hints: `minimal`, `premium`, `editorial`, `bold`, … */
  style: string[]
  performanceClass: PerformanceClass
  scores: BlockScores
  frameworks?: ('nuxt' | 'react')[]
  fields: BlockField[]
  defaultMotion?: Partial<SectionMotion>
  schema: BlockPropsSchema
}

export interface BlockDefinition extends BlockDefinitionInput {
  version: number
  frameworks: ('nuxt' | 'react')[]
  defaultMotion: SectionMotion
}

/**
 * Declare a block. Definitions are framework-agnostic: they describe *what* a
 * block is and what it accepts, never how it is rendered. Renderers live in
 * per-framework packages and resolve by id (ADR-0003).
 */
export function defineBlock(input: BlockDefinitionInput): BlockDefinition {
  const defaultMotion = sectionMotionSchema.parse(input.defaultMotion ?? {})

  const definition: BlockDefinition = {
    ...input,
    version: input.version ?? 1,
    frameworks: input.frameworks ?? ['nuxt'],
    defaultMotion,
  }

  // Fail at import time rather than at render time: a block whose defaults do
  // not satisfy its own schema is unusable in the editor.
  const parsed = input.schema.safeParse({})
  if (!parsed.success) {
    throw new Error(
      `Block "${input.id}" has fields without defaults: ${parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`,
    )
  }

  // Every editor field must correspond to a real prop, or the editor writes
  // values the renderer will never read.
  const propKeys = new Set(Object.keys(parsed.data))
  const unknownField = input.fields.find((field) => !propKeys.has(field.key))
  if (unknownField) {
    throw new Error(`Block "${input.id}" declares editor field "${unknownField.key}" with no matching prop`)
  }

  return definition
}

/** The serialisable projection sent to the dashboard, the AI selector and the API. */
export function toBlockMetadata(definition: BlockDefinition): BlockMetadata {
  return {
    id: definition.id,
    version: definition.version,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    capabilities: definition.capabilities,
    industries: definition.industries,
    style: definition.style,
    performanceClass: definition.performanceClass,
    scores: definition.scores,
    frameworks: definition.frameworks,
    fields: definition.fields,
    defaults: definition.schema.parse({}),
    defaultMotion: definition.defaultMotion,
  }
}
