import { z } from 'zod'
import { mediaFolderSchema } from './content.js'

/**
 * Stock media (§14 extension) — browse free stock and import into the tenant
 * media library.
 *
 * Shapes here are platform-owned (ADR-0002 / ADR-0006). Vendor field names
 * never leave the adapter that maps them into these types.
 */

export const stockProviderIdSchema = z.enum(['mixkit'])
export type StockProviderId = z.infer<typeof stockProviderIdSchema>

export const stockMediaKindSchema = z.enum(['video', 'image'])
export type StockMediaKind = z.infer<typeof stockMediaKindSchema>

export const stockMediaItemSchema = z.object({
  provider: stockProviderIdSchema,
  /** Vendor-stable id (e.g. Mixkit clip / art number). */
  externalId: z.string().min(1).max(64),
  kind: stockMediaKindSchema,
  title: z.string().min(1).max(300),
  /** Public preview / poster URL (may be a CDN thumbnail). */
  thumbnailUrl: z.string().url().max(1000),
  /**
   * Direct file URL on an allowlisted CDN. The dashboard never downloads this
   * itself — import goes through the core-api proxy.
   */
  downloadUrl: z.string().url().max(1000),
  /** Optional lower-res preview for hover (video). */
  previewUrl: z.string().url().max(1000).optional(),
  pageUrl: z.string().url().max(1000),
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  durationSeconds: z.number().nonnegative().nullable().default(null),
  licenseUrl: z.string().url().max(1000).optional(),
  licenseName: z.string().max(120).optional(),
  attribution: z.string().max(300).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
})
export type StockMediaItem = z.infer<typeof stockMediaItemSchema>

export const stockSearchQuerySchema = z.object({
  q: z.string().max(120).default(''),
  kind: stockMediaKindSchema.default('video'),
  provider: stockProviderIdSchema.default('mixkit'),
  page: z.coerce.number().int().min(1).max(50).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
})
export type StockSearchQuery = z.infer<typeof stockSearchQuerySchema>

export const stockSearchResultSchema = z.object({
  provider: stockProviderIdSchema,
  kind: stockMediaKindSchema,
  query: z.string(),
  page: z.number().int().min(1),
  items: z.array(stockMediaItemSchema),
  /** True when the provider page suggests more results exist. */
  hasMore: z.boolean().default(false),
})
export type StockSearchResult = z.infer<typeof stockSearchResultSchema>

export const stockImportInputSchema = z.object({
  provider: stockProviderIdSchema,
  externalId: z.string().min(1).max(64),
  kind: stockMediaKindSchema,
  /** Must match an allowlisted CDN URL for the chosen provider. */
  downloadUrl: z.string().url().max(1000),
  title: z.string().min(1).max(300).optional(),
  pageUrl: z.string().url().max(1000).optional(),
  folder: mediaFolderSchema.default(''),
  alt: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
})
export type StockImportInput = z.infer<typeof stockImportInputSchema>
