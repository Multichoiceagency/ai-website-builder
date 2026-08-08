import { z } from 'zod'
import { isoTimestampSchema, slugSchema, uuidSchema } from './common.js'
import { pageDocumentSchema } from './blocks.js'
import { seoSchema } from './cms.js'

/**
 * Blog (§6) and media (§14).
 *
 * A post is a page with a different shape: the body is the same
 * `Section[]` document, validated against the same block registry, so the same
 * editor and the same renderer work on it without a second content model
 * (ADR-0003). Everything the two share — `seo`, `sections`, the draft/published
 * pair — is imported from `cms.ts` rather than re-declared here.
 */

// region Media

/**
 * The upload allow-list. It is an allow-list rather than a deny-list because a
 * deny-list is only ever as good as the last format someone remembered to add,
 * and every one of these is decided by *sniffing the bytes* — never by the
 * filename or the client's `content-type`, both of which the uploader controls.
 */
export const MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
] as const
export const mediaMimeSchema = z.enum(MEDIA_MIME_TYPES)
export type MediaMime = z.infer<typeof mediaMimeSchema>

/** True for the two video containers the library accepts. */
export function isVideoMime(mime: string): boolean {
  return mime === 'video/mp4' || mime === 'video/webm'
}

/**
 * Where the `alt` value came from.
 *
 * A value derived from the filename is a placeholder, not alt text, so it stays
 * flagged as missing — otherwise the accessibility report reads "complete"
 * while every image on the site announces itself as `hero-final-v2`.
 */
export const mediaAltSourceSchema = z.enum(['none', 'derived', 'human'])
export type MediaAltSource = z.infer<typeof mediaAltSourceSchema>

/** A folder is a flat path segment list, stored as text. `''` is the root. */
export const mediaFolderSchema = z
  .string()
  .max(200)
  .regex(/^$|^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/, 'must be a lowercase path like `blog/2026`')

/**
 * Scroll-scrub frame pack status for videos.
 *
 * Images stay `none`. Videos move `pending` → `ready` (or `failed`) after the
 * post-upload ffmpeg extract. Caps live in core-api (`frames.ts`).
 */
export const MEDIA_FRAME_STATUSES = ['none', 'pending', 'ready', 'failed'] as const
export const mediaFrameStatusSchema = z.enum(MEDIA_FRAME_STATUSES)
export type MediaFrameStatus = z.infer<typeof mediaFrameStatusSchema>

export const mediaAssetSchema = z.object({
  id: uuidSchema,
  folder: mediaFolderSchema.default(''),
  /** The display name. The *stored* name is `storageKey`, which we generate. */
  filename: z.string().min(1).max(300),
  /**
   * The object key inside the active `StorageProvider`. Always generated
   * server-side: a client-supplied name is a path-traversal primitive.
   */
  storageKey: z.string().min(1).max(400),
  mime: mediaMimeSchema,
  sizeBytes: z.number().int().min(0),
  width: z.number().int().min(0).nullable().default(null),
  height: z.number().int().min(0).nullable().default(null),
  alt: z.string().max(500).default(''),
  altSource: mediaAltSourceSchema.default('none'),
  /** True while the asset has no human-written alt text. Blocks require one. */
  needsAlt: z.boolean().default(true),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  /** SHA-256 of the stored bytes, so a re-upload of the same file is visible. */
  checksum: z.string().max(64).default(''),
  /** Where a renderer fetches the bytes. Relative — the host is the caller's. */
  url: z.string().max(600),
  /**
   * How many pages, posts and authors reference this asset. Computed on read
   * from the documents themselves, never stored — a counter maintained by hand
   * is a counter that drifts the first time a document is edited elsewhere.
   */
  usageCount: z.number().int().min(0).default(0),
  /** Scroll-frame pack lifecycle. Images are always `none`. */
  frameStatus: mediaFrameStatusSchema.default('none'),
  frameCount: z.number().int().min(0).default(0),
  frameFps: z.number().min(0).max(60).default(0),
  frameWidth: z.number().int().min(0).default(0),
  frameError: z.string().max(500).default(''),
  createdBy: z.string().max(320).default(''),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type MediaAsset = z.infer<typeof mediaAssetSchema>

/** True when the asset can drive a scroll-scrub canvas section. */
export function mediaHasScrollFrames(asset: Pick<MediaAsset, 'frameStatus' | 'frameCount'>): boolean {
  return asset.frameStatus === 'ready' && asset.frameCount > 0
}

export const mediaSortSchema = z.enum(['newest', 'oldest', 'largest', 'smallest', 'name'])
export type MediaSort = z.infer<typeof mediaSortSchema>

export const mediaListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  folder: mediaFolderSchema.optional(),
  tag: z.string().max(40).optional(),
  mime: mediaMimeSchema.optional(),
  minBytes: z.coerce.number().int().min(0).optional(),
  maxBytes: z.coerce.number().int().min(0).optional(),
  createdAfter: isoTimestampSchema.optional(),
  createdBefore: isoTimestampSchema.optional(),
  /** Only assets still waiting for human alt text. */
  missingAlt: z.coerce.boolean().optional(),
  /** Only assets no page, post or author references. */
  unused: z.coerce.boolean().optional(),
  sort: mediaSortSchema.default('newest'),
  limit: z.coerce.number().int().min(1).max(200).default(60),
  offset: z.coerce.number().int().min(0).default(0),
})
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>

/**
 * Upload metadata. The bytes arrive as the raw request body, so nothing here
 * is trusted for anything except display: the real type comes from sniffing.
 */
export const mediaUploadQuerySchema = z.object({
  filename: z.string().min(1).max(300),
  folder: mediaFolderSchema.default(''),
  alt: z.string().max(500).optional(),
  tags: z.string().max(400).optional(),
})
export type MediaUploadQuery = z.infer<typeof mediaUploadQuerySchema>

export const updateMediaInputSchema = z
  .object({
    filename: z.string().min(1).max(300),
    folder: mediaFolderSchema,
    alt: z.string().max(500),
    tags: z.array(z.string().min(1).max(40)).max(20),
  })
  .partial()
export type UpdateMediaInput = z.infer<typeof updateMediaInputSchema>

export const mediaFolderSummarySchema = z.object({
  folder: mediaFolderSchema,
  assetCount: z.number().int().min(0),
})
export type MediaFolderSummary = z.infer<typeof mediaFolderSummarySchema>

export const mediaLibrarySchema = z.object({
  assets: z.array(mediaAssetSchema),
  folders: z.array(mediaFolderSummarySchema),
  tags: z.array(z.string()),
  total: z.number().int().min(0),
  missingAltCount: z.number().int().min(0),
  unusedCount: z.number().int().min(0),
})
export type MediaLibrary = z.infer<typeof mediaLibrarySchema>

/**
 * One place an asset is referenced from.
 *
 * `sectionId` and `block` are filled when the reference is inside a page or
 * post document, so "what breaks if I delete this" names the actual section
 * rather than only the page it sits on.
 */
export const mediaReferenceSchema = z.object({
  kind: z.enum(['page', 'post', 'author']),
  id: uuidSchema,
  title: z.string().max(300),
  path: z.string().max(600),
  sectionId: z.string().max(64).default(''),
  block: z.string().max(64).default(''),
})
export type MediaReference = z.infer<typeof mediaReferenceSchema>

/**
 * Bulk edits over a selection.
 *
 * One endpoint with an explicit action rather than four near-identical routes:
 * the selection, the permission check and the tenant scope are the same for all
 * of them, and only the verb differs.
 */
export const bulkMediaInputSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(200),
  action: z.enum(['move', 'tag', 'untag', 'delete']),
  folder: mediaFolderSchema.optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  /** Delete referenced assets anyway. Refused without it — see `mediaUsage`. */
  force: z.boolean().default(false),
})
export type BulkMediaInput = z.infer<typeof bulkMediaInputSchema>

export const bulkMediaResultSchema = z.object({
  changed: z.number().int().min(0),
  /** Assets left alone because something still references them. */
  blocked: z.array(z.object({ id: uuidSchema, filename: z.string(), uses: z.number().int().min(0) })),
})
export type BulkMediaResult = z.infer<typeof bulkMediaResultSchema>

export const mediaUsageSchema = z.object({
  mediaId: uuidSchema,
  references: z.array(mediaReferenceSchema),
  total: z.number().int().min(0),
})
export type MediaUsage = z.infer<typeof mediaUsageSchema>

// endregion

// region Blog — taxonomy

export const blogCategorySchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(''),
  postCount: z.number().int().min(0).default(0),
  createdAt: isoTimestampSchema,
})
export type BlogCategory = z.infer<typeof blogCategorySchema>

export const createBlogCategoryInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
})
export type CreateBlogCategoryInput = z.infer<typeof createBlogCategoryInputSchema>

export const blogAuthorSchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  slug: slugSchema,
  name: z.string().min(1).max(160),
  bio: z.string().max(1000).default(''),
  avatarMediaId: uuidSchema.nullable().default(null),
  postCount: z.number().int().min(0).default(0),
  createdAt: isoTimestampSchema,
})
export type BlogAuthor = z.infer<typeof blogAuthorSchema>

export const createBlogAuthorInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(160),
  bio: z.string().max(1000).optional(),
  avatarMediaId: uuidSchema.nullable().optional(),
})
export type CreateBlogAuthorInput = z.infer<typeof createBlogAuthorInputSchema>

// endregion

// region Blog — posts

/**
 * `scheduled` is a published document with a future `publishedAt`. It is not a
 * third storage state: the public read model filters on `published_at <= now()`,
 * so a scheduled post becomes visible at its moment with nothing needing to run.
 */
export const BLOG_POST_STATUSES = ['draft', 'scheduled', 'published'] as const
export const blogPostStatusSchema = z.enum(BLOG_POST_STATUSES)
export type BlogPostStatus = z.infer<typeof blogPostStatusSchema>

export const blogPostSummarySchema = z.object({
  id: uuidSchema,
  siteId: uuidSchema,
  slug: slugSchema,
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).default(''),
  status: blogPostStatusSchema,
  categoryId: uuidSchema.nullable().default(null),
  categoryName: z.string().max(120).default(''),
  authorId: uuidSchema.nullable().default(null),
  authorName: z.string().max(160).default(''),
  coverMediaId: uuidSchema.nullable().default(null),
  coverUrl: z.string().max(600).default(''),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  sectionCount: z.number().int().min(0),
  hasUnpublishedChanges: z.boolean(),
  /** Set for both `scheduled` and `published`; the future is the difference. */
  publishedAt: isoTimestampSchema.nullable(),
  updatedAt: isoTimestampSchema,
})
export type BlogPostSummary = z.infer<typeof blogPostSummarySchema>

export const blogPostSchema = blogPostSummarySchema.extend({
  seo: seoSchema,
  /** The working document — the same `Section[]` a page carries. */
  sections: pageDocumentSchema,
  createdAt: isoTimestampSchema,
})
export type BlogPost = z.infer<typeof blogPostSchema>

export const createBlogPostInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  seo: seoSchema.partial().optional(),
  sections: pageDocumentSchema.optional(),
  categoryId: uuidSchema.nullable().optional(),
  authorId: uuidSchema.nullable().optional(),
  coverMediaId: uuidSchema.nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
})
export type CreateBlogPostInput = z.infer<typeof createBlogPostInputSchema>

export const updateBlogPostInputSchema = createBlogPostInputSchema.partial()
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostInputSchema>

/** Publish now, or park the live document behind a future timestamp. */
export const publishBlogPostInputSchema = z.object({
  scheduledAt: isoTimestampSchema.nullable().optional(),
})
export type PublishBlogPostInput = z.infer<typeof publishBlogPostInputSchema>

export const blogPostListQuerySchema = z.object({
  status: blogPostStatusSchema.optional(),
  categoryId: uuidSchema.optional(),
  authorId: uuidSchema.optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type BlogPostListQuery = z.infer<typeof blogPostListQuerySchema>

export const blogPostRevisionSchema = z.object({
  id: uuidSchema,
  postId: uuidSchema,
  title: z.string(),
  sectionCount: z.number().int().min(0),
  reason: z.string(),
  createdBy: z.string(),
  createdAt: isoTimestampSchema,
})
export type BlogPostRevision = z.infer<typeof blogPostRevisionSchema>

// endregion

// region Blog — public read model

/**
 * A published post, in the shape the storefront already knows. `path` is what a
 * router matches, `sections` is what the block renderer paints — identical to
 * `publicPageSchema.page`, so no renderer changes to show a post.
 */
export const publicBlogPostSchema = z.object({
  path: z.string().max(600),
  slug: slugSchema,
  title: z.string(),
  excerpt: z.string().default(''),
  seo: seoSchema,
  sections: pageDocumentSchema,
  categorySlug: z.string().max(120).default(''),
  categoryName: z.string().max(120).default(''),
  authorName: z.string().max(160).default(''),
  coverUrl: z.string().max(600).default(''),
  tags: z.array(z.string()).default([]),
  publishedAt: isoTimestampSchema.nullable(),
})
export type PublicBlogPost = z.infer<typeof publicBlogPostSchema>

export const publicBlogIndexSchema = z.object({
  site: z.object({ name: z.string(), locale: z.string() }),
  posts: z.array(publicBlogPostSchema.omit({ sections: true })),
  total: z.number().int().min(0),
})
export type PublicBlogIndex = z.infer<typeof publicBlogIndexSchema>

// endregion
