import { z } from 'zod'
import { blockMetadataSchema, blockQuerySchema, blockScoresSchema, performanceClassSchema } from './blocks.js'

/**
 * Component registry contracts (ADR-0002, ADR-0003).
 *
 * Two words that sound the same and are not:
 *
 *   INSTALL  — a build-time act. The CLI copies a component's *source* into
 *              this repository, where it is reviewed, typed and committed.
 *              Code only ever enters the platform this way.
 *   ENABLE   — a runtime act. A tenant switches on an entry that is already
 *              installed. That is a row in a table holding an id. No source is
 *              fetched, compiled or executed at runtime, ever.
 *
 * Everything below describes one of those two states and nothing in between.
 */

// region Collections

export const REGISTRY_COLLECTIONS = ['core', 'motion', 'showcase', 'editorial', 'spotlight'] as const

export const collectionIdSchema = z.enum(REGISTRY_COLLECTIONS)
export type CollectionId = z.infer<typeof collectionIdSchema>

/**
 * A named family of blocks with one visual point of view. Collections exist so
 * that "pick a section" can be a design decision ("something editorial") rather
 * than a scroll through 45 undifferentiated cards.
 */
export const registryCollectionSchema = z.object({
  id: collectionIdSchema,
  name: z.string(),
  description: z.string(),
  /** The visual direction the collection commits to, in plain words. */
  styleDirection: z.string(),
  /**
   * What the collection is *inspired by*. Every entry is an original
   * implementation written for this platform — no third-party source is
   * vendored, copied or re-published. Recorded so the lineage stays honest.
   */
  inspiration: z.string(),
  /** Licence / attribution note carried into the dashboard and the manifest. */
  licence: z.string(),
  entryCount: z.number().int().min(0).default(0),
})
export type RegistryCollection = z.infer<typeof registryCollectionSchema>

// endregion

// region Entries

export const registryFileRoleSchema = z.enum(['definition', 'renderer', 'style', 'test'])
export type RegistryFileRole = z.infer<typeof registryFileRoleSchema>

export const registryFileSchema = z.object({
  /** Repository-relative path, e.g. `packages/blocks/src/collections/motion.ts`. */
  path: z.string(),
  role: registryFileRoleSchema,
  framework: z.enum(['agnostic', 'nuxt', 'react']).default('agnostic'),
})
export type RegistryFile = z.infer<typeof registryFileSchema>

/**
 * One installable component. Generated from the block definition it describes,
 * so the manifest cannot drift from what the platform actually renders.
 */
export const registryEntrySchema = z.object({
  id: z.string(),
  collection: collectionIdSchema,
  title: z.string(),
  description: z.string(),
  /** Free-form search keys: `scroll`, `pinned`, `marquee`, `3d`, … */
  tags: z.array(z.string()).default([]),
  category: z.string(),
  performanceClass: performanceClassSchema,
  scores: blockScoresSchema,
  /** npm packages the entry needs beyond what the platform already ships. */
  dependencies: z.array(z.string()).default([]),
  /** Other registry entries that must be installed first. */
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(registryFileSchema).default([]),
  /** What a reviewer would see, in one sentence. Feeds the component lab. */
  preview: z.string().default(''),
  /** True when the source already lives in this repository. */
  installed: z.boolean().default(true),
})
export type RegistryEntry = z.infer<typeof registryEntrySchema>

export const registryManifestSchema = z.object({
  /** Bumped when the manifest *shape* changes, not when entries change. */
  version: z.number().int().min(1).default(1),
  generatedAt: z.string(),
  collections: z.array(registryCollectionSchema),
  entries: z.array(registryEntrySchema),
})
export type RegistryManifest = z.infer<typeof registryManifestSchema>

// endregion

// region Query surface

/** `?tags=scroll,pinned` and `?tags=scroll&tags=pinned` both mean the same thing. */
const tagListSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : value,
  z.array(z.string().max(40)).max(10),
)

/**
 * The block query, widened with the two facets a collection-organised registry
 * adds. Deliberately an extension rather than a replacement: the AI selector,
 * the block picker and the component lab keep sharing one filter vocabulary.
 */
export const registryBlockQuerySchema = blockQuerySchema.extend({
  collection: collectionIdSchema.optional(),
  tags: tagListSchema.optional(),
})
export type RegistryBlockQuery = z.infer<typeof registryBlockQuerySchema>

/** Block metadata as the registry serves it: with its collection and tags. */
export const registryBlockMetadataSchema = blockMetadataSchema.extend({
  collection: collectionIdSchema,
  tags: z.array(z.string()),
})
export type RegistryBlockMetadata = z.infer<typeof registryBlockMetadataSchema>

// endregion

// region Per-tenant enablement

/**
 * Which installed entries a tenant may place. Pure data: an id, a flag and a
 * timestamp. Enabling never moves code — see the note at the top of this file.
 */
export const tenantRegistryEntrySchema = z.object({
  tenantId: z.string().uuid(),
  entryId: z.string(),
  collection: collectionIdSchema,
  enabled: z.boolean().default(true),
  enabledAt: z.string().optional(),
  enabledBy: z.string().uuid().optional(),
})
export type TenantRegistryEntry = z.infer<typeof tenantRegistryEntrySchema>

export const registryEnablementUpdateSchema = z.object({
  entryId: z.string().min(1).max(64),
  enabled: z.boolean(),
})
export type RegistryEnablementUpdate = z.infer<typeof registryEnablementUpdateSchema>

// endregion
