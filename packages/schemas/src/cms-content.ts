import { z } from 'zod'
import { isoTimestampSchema, slugSchema, uuidSchema } from './common.js'
import { cmsProviderSchema } from './cms-bind.js'

export const cmsCollectionSchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  slug: slugSchema,
  name: z.string().min(1).max(120),
  fields: z.array(z.string().min(1).max(64)).max(32).default(['title', 'body']),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CmsCollection = z.infer<typeof cmsCollectionSchema>

export const createCmsCollectionInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  fields: z.array(z.string().min(1).max(64)).max(32).optional(),
})
export type CreateCmsCollectionInput = z.infer<typeof createCmsCollectionInputSchema>

export const cmsEntrySchema = z.object({
  id: uuidSchema,
  collectionId: uuidSchema,
  slug: slugSchema,
  title: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()).default({}),
  published: z.boolean().default(false),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type CmsEntry = z.infer<typeof cmsEntrySchema>

export const createCmsEntryInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()).default({}),
  published: z.boolean().default(false),
})
export type CreateCmsEntryInput = z.infer<typeof createCmsEntryInputSchema>

export const updateCmsEntryInputSchema = createCmsEntryInputSchema.partial()
export type UpdateCmsEntryInput = z.infer<typeof updateCmsEntryInputSchema>

export const cmsRemoteQuerySchema = z.object({
  provider: cmsProviderSchema,
  collection: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(120).optional(),
})
export type CmsRemoteQuery = z.infer<typeof cmsRemoteQuerySchema>
