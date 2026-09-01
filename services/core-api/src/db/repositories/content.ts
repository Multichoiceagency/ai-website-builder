import {
  blogAuthorSchema,
  blogCategorySchema,
  blogPostRevisionSchema,
  blogPostSchema,
  blogPostSummarySchema,
  mediaAssetSchema,
  mediaUsageSchema,
  publicBlogPostSchema,
  seoSchema,
  type BlogAuthor,
  type BlogCategory,
  type BlogPost,
  type BlogPostListQuery,
  type BlogPostRevision,
  type BlogPostStatus,
  type BlogPostSummary,
  type MediaAsset,
  type MediaFrameStatus,
  type MediaLibrary,
  type MediaListQuery,
  type MediaMime,
  type MediaUsage,
  type PublicBlogPost,
  type Section,
  type Seo,
} from '@platform/schemas'
import { normalizeDocument } from '@platform/blocks'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import { mediaPublicUrl } from '../../lib/media/url.js'

/**
 * Storage for the blog and the media library.
 *
 * The post half is deliberately a near-copy of `pages.ts`: the same draft /
 * published pair, the same revision snapshot on publish, the same
 * `normalizeDocument` on every read of a JSONB document. Sharing an abstraction
 * between the two would have to model "a page except the address is a slug and
 * it has an author and it can be scheduled", which is a worse thing to maintain
 * than two honest tables.
 */

// region Media

interface MediaRow {
  id: string
  folder: string
  filename: string
  storage_key: string
  mime: MediaMime
  size_bytes: string | number
  width: number | null
  height: number | null
  alt: string
  alt_source: 'none' | 'derived' | 'human'
  tags: string[]
  checksum: string
  frame_status?: MediaFrameStatus
  frame_count?: number
  frame_fps?: number
  frame_width?: number
  frame_error?: string
  created_by: string
  created_at: Date
  updated_at: Date
}

function toAsset(row: MediaRow, usageCount = 0): MediaAsset {
  return mediaAssetSchema.parse({
    usageCount,
    id: row.id,
    folder: row.folder,
    filename: row.filename,
    storageKey: row.storage_key,
    mime: row.mime,
    sizeBytes: Number(row.size_bytes),
    width: row.width,
    height: row.height,
    alt: row.alt,
    altSource: row.alt_source,
    // Derived, never stored: an asset whose alt came from its filename is an
    // asset still waiting for a description.
    needsAlt: row.alt_source !== 'human',
    tags: row.tags ?? [],
    checksum: row.checksum,
    url: mediaPublicUrl(row.id),
    frameStatus: row.frame_status ?? 'none',
    frameCount: Number(row.frame_count ?? 0),
    frameFps: Number(row.frame_fps ?? 0),
    frameWidth: Number(row.frame_width ?? 0),
    frameError: row.frame_error ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export async function insertMediaAsset(
  tx: Tx,
  tenantId: string,
  input: {
    folder: string
    filename: string
    storageKey: string
    mime: MediaMime
    sizeBytes: number
    width: number | null
    height: number | null
    alt: string
    altSource: 'none' | 'derived' | 'human'
    tags: string[]
    checksum: string
    createdBy: string
    frameStatus?: MediaFrameStatus
  },
): Promise<MediaAsset> {
  const frameStatus = input.frameStatus ?? (input.mime.startsWith('video/') ? 'pending' : 'none')
  const [row] = await tx<MediaRow[]>`
    INSERT INTO media_assets (
      tenant_id, folder, filename, storage_key, mime, size_bytes,
      width, height, alt, alt_source, tags, checksum, created_by,
      frame_status
    )
    VALUES (
      ${tenantId}, ${input.folder}, ${input.filename}, ${input.storageKey}, ${input.mime}, ${input.sizeBytes},
      ${input.width}, ${input.height}, ${input.alt}, ${input.altSource},
      ${input.tags}, ${input.checksum}, ${input.createdBy},
      ${frameStatus}
    )
    RETURNING *
  `
  return toAsset(row!)
}

export async function findMediaByChecksum(
  tx: Tx,
  tenantId: string,
  checksum: string,
): Promise<MediaAsset | null> {
  const [row] = await tx<MediaRow[]>`
    SELECT * FROM media_assets
    WHERE tenant_id = ${tenantId} AND checksum = ${checksum}
    ORDER BY created_at ASC
    LIMIT 1
  `
  return row ? toAsset(row) : null
}

export async function findMediaById(tx: Tx, tenantId: string, mediaId: string): Promise<MediaAsset | null> {
  const [row] = await tx<MediaRow[]>`
    SELECT * FROM media_assets WHERE tenant_id = ${tenantId} AND id = ${mediaId} LIMIT 1
  `
  return row ? toAsset(row) : null
}

export async function findMediaByIds(tx: Tx, tenantId: string, ids: string[]): Promise<MediaAsset[]> {
  if (!ids.length) return []
  const rows = await tx<MediaRow[]>`
    SELECT * FROM media_assets WHERE tenant_id = ${tenantId} AND id = ANY (${ids}::uuid[])
  `
  return rows.map((row) => toAsset(row))
}

/** The shape of a UUID, used to pull asset ids back out of stored documents. */
const UUID_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

/**
 * How many documents reference each asset, for the whole tenant, in one pass.
 *
 * The naive version asks "is this asset used?" once per asset, which is one
 * scan of every page per row in the library. This inverts it: scan the
 * documents once, pull every UUID-shaped string out of them, and count. Ids
 * that belong to nothing simply never match an asset.
 *
 * It is a text scan rather than a foreign key on purpose — block props are
 * open-ended by design (ADR-0003), so a schema able to enumerate every place an
 * image may be referenced would be a schema that forbids new blocks.
 */
export async function referencedMediaCounts(tx: Tx, tenantId: string): Promise<Map<string, number>> {
  const rows = await tx<{ media_id: string; uses: string }[]>`
    SELECT refs.media_id, count(DISTINCT refs.kind || ':' || refs.doc_id) AS uses
    FROM (
      SELECT 'page' AS kind, p.id::text AS doc_id, hit.parts[1] AS media_id
      FROM pages p,
        LATERAL regexp_matches(
          coalesce(p.sections::text, '') || coalesce(p.published_sections::text, '') || coalesce(p.seo::text, ''),
          ${UUID_PATTERN}, 'g'
        ) AS hit(parts)
      WHERE p.tenant_id = ${tenantId}

      UNION ALL

      SELECT 'post', b.id::text, hit.parts[1]
      FROM blog_posts b,
        LATERAL regexp_matches(
          coalesce(b.sections::text, '') || coalesce(b.published_sections::text, '')
            || coalesce(b.seo::text, '') || coalesce(b.cover_media_id::text, ''),
          ${UUID_PATTERN}, 'g'
        ) AS hit(parts)
      WHERE b.tenant_id = ${tenantId}

      UNION ALL

      SELECT 'author', a.id::text, a.avatar_media_id::text
      FROM blog_authors a
      WHERE a.tenant_id = ${tenantId} AND a.avatar_media_id IS NOT NULL
    ) refs
    GROUP BY refs.media_id
  `

  return new Map(rows.map((row) => [row.media_id.toLowerCase(), Number(row.uses)]))
}

export async function listMediaLibrary(
  tx: Tx,
  tenantId: string,
  query: MediaListQuery,
): Promise<MediaLibrary> {
  const search = query.search?.trim() ? `%${query.search.trim().toLowerCase()}%` : null

  const counts = await referencedMediaCounts(tx, tenantId)
  // Ids that reached a document. Passed as one array rather than re-running the
  // document scan per row — it is bounded by the content, not by the library.
  const referenced = [...counts.keys()]

  // `folder` prefixed rather than equal, so opening `blog` also shows
  // `blog/2026`. A library that hides everything one level down turns folders
  // into a place assets go missing.
  const folderPrefix = query.folder ? `${query.folder}/%` : null

  const rows = await tx<(MediaRow & { total: string })[]>`
    SELECT *, count(*) OVER () AS total FROM media_assets
    WHERE tenant_id = ${tenantId}
      AND (
        ${query.folder ?? null}::text IS NULL
        OR folder = ${query.folder ?? null}::text
        OR folder LIKE ${folderPrefix}::text
      )
      AND (${query.tag ?? null}::text IS NULL OR ${query.tag ?? null}::text = ANY (tags))
      AND (${query.mime ?? null}::text IS NULL OR mime = ${query.mime ?? null}::text)
      AND (${query.minBytes ?? null}::bigint IS NULL OR size_bytes >= ${query.minBytes ?? null}::bigint)
      AND (${query.maxBytes ?? null}::bigint IS NULL OR size_bytes <= ${query.maxBytes ?? null}::bigint)
      AND (${query.createdAfter ?? null}::timestamptz IS NULL OR created_at >= ${query.createdAfter ?? null}::timestamptz)
      AND (${query.createdBefore ?? null}::timestamptz IS NULL OR created_at <= ${query.createdBefore ?? null}::timestamptz)
      AND (${query.missingAlt ? true : null}::boolean IS NULL OR alt_source <> 'human')
      AND (${query.unused ? true : null}::boolean IS NULL OR NOT (id = ANY (${referenced}::uuid[])))
      AND (
        ${search}::text IS NULL
        OR lower(filename) LIKE ${search}::text
        OR lower(alt) LIKE ${search}::text
        OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE lower(tag) LIKE ${search}::text)
      )
    ORDER BY
      CASE WHEN ${query.sort} = 'newest'   THEN created_at END DESC,
      CASE WHEN ${query.sort} = 'oldest'   THEN created_at END ASC,
      CASE WHEN ${query.sort} = 'largest'  THEN size_bytes END DESC,
      CASE WHEN ${query.sort} = 'smallest' THEN size_bytes END ASC,
      CASE WHEN ${query.sort} = 'name'     THEN lower(filename) END ASC,
      created_at DESC
    LIMIT ${query.limit} OFFSET ${query.offset}
  `

  // The tag list comes from a subquery rather than a join: unnesting inline
  // would drop every untagged asset and quietly halve the counts beside it.
  const [facets] = await tx<{ missing_alt: string; unused: string; tags: string[] }[]>`
    SELECT
      count(*) FILTER (WHERE alt_source <> 'human') AS missing_alt,
      count(*) FILTER (WHERE NOT (id = ANY (${referenced}::uuid[]))) AS unused,
      coalesce(
        (SELECT array_agg(DISTINCT tag) FROM media_assets inner_assets, unnest(inner_assets.tags) AS tag
         WHERE inner_assets.tenant_id = ${tenantId}),
        '{}'
      ) AS tags
    FROM media_assets
    WHERE tenant_id = ${tenantId}
  `

  const folders = await tx<{ folder: string; asset_count: string }[]>`
    SELECT folder, count(*) AS asset_count FROM media_assets
    WHERE tenant_id = ${tenantId}
    GROUP BY folder
    ORDER BY folder ASC
  `

  return {
    assets: rows.map((row) => toAsset(row, counts.get(row.id.toLowerCase()) ?? 0)),
    folders: folders.map((row) => ({ folder: row.folder, assetCount: Number(row.asset_count) })),
    tags: facets?.tags ?? [],
    total: rows.length ? Number(rows[0]!.total) : 0,
    missingAltCount: Number(facets?.missing_alt ?? 0),
    unusedCount: Number(facets?.unused ?? 0),
  }
}

export async function updateMediaAsset(
  tx: Tx,
  tenantId: string,
  mediaId: string,
  patch: { filename?: string; folder?: string; alt?: string; tags?: string[] },
): Promise<MediaAsset | null> {
  const [row] = await tx<MediaRow[]>`
    UPDATE media_assets SET
      filename   = COALESCE(${patch.filename ?? null}::text, filename),
      folder     = COALESCE(${patch.folder ?? null}::text, folder),
      alt        = COALESCE(${patch.alt ?? null}::text, alt),
      -- Any alt text a person typed is human alt text, including an empty one:
      -- clearing it deliberately means "this image is decorative".
      alt_source = CASE WHEN ${patch.alt ?? null}::text IS NULL THEN alt_source ELSE 'human' END,
      tags       = COALESCE(${patch.tags ?? null}::text[], tags)
    WHERE tenant_id = ${tenantId} AND id = ${mediaId}
    RETURNING *
  `
  return row ? toAsset(row) : null
}

/** Point an existing asset at newly uploaded bytes. The id and every reference to it survive. */
export async function replaceMediaBytes(
  tx: Tx,
  tenantId: string,
  mediaId: string,
  input: {
    storageKey: string
    mime: MediaMime
    sizeBytes: number
    width: number | null
    height: number | null
    checksum: string
    filename: string
  },
): Promise<MediaAsset | null> {
  const frameStatus = input.mime.startsWith('video/') ? 'pending' : 'none'
  const [row] = await tx<MediaRow[]>`
    UPDATE media_assets SET
      storage_key = ${input.storageKey},
      mime        = ${input.mime},
      size_bytes  = ${input.sizeBytes},
      width       = ${input.width},
      height      = ${input.height},
      checksum    = ${input.checksum},
      filename    = ${input.filename},
      frame_status = ${frameStatus},
      frame_count  = 0,
      frame_fps    = 0,
      frame_width  = 0,
      frame_error  = ''
    WHERE tenant_id = ${tenantId} AND id = ${mediaId}
    RETURNING *
  `
  return row ? toAsset(row) : null
}

export async function updateMediaFramePack(
  tx: Tx,
  tenantId: string,
  mediaId: string,
  pack: {
    frameStatus: MediaFrameStatus
    frameCount: number
    frameFps: number
    frameWidth: number
    frameError: string
  },
): Promise<MediaAsset | null> {
  const [row] = await tx<MediaRow[]>`
    UPDATE media_assets SET
      frame_status = ${pack.frameStatus},
      frame_count  = ${pack.frameCount},
      frame_fps    = ${pack.frameFps},
      frame_width  = ${pack.frameWidth},
      frame_error  = ${pack.frameError}
    WHERE tenant_id = ${tenantId} AND id = ${mediaId}
    RETURNING *
  `
  return row ? toAsset(row) : null
}

export async function deleteMediaAsset(tx: Tx, tenantId: string, mediaId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM media_assets WHERE tenant_id = ${tenantId} AND id = ${mediaId} RETURNING id
  `
  return rows.length > 0
}

export async function deleteMediaAssets(tx: Tx, tenantId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0
  const rows = await tx<{ id: string }[]>`
    DELETE FROM media_assets WHERE tenant_id = ${tenantId} AND id = ANY (${ids}::uuid[]) RETURNING id
  `
  return rows.length
}

export async function moveMediaAssets(
  tx: Tx,
  tenantId: string,
  ids: string[],
  folder: string,
): Promise<number> {
  if (!ids.length) return 0
  const rows = await tx<{ id: string }[]>`
    UPDATE media_assets SET folder = ${folder}
    WHERE tenant_id = ${tenantId} AND id = ANY (${ids}::uuid[])
    RETURNING id
  `
  return rows.length
}

/**
 * Add or remove tags across a selection.
 *
 * Set semantics, done in SQL: adding a tag an asset already carries is not an
 * error and does not duplicate it, and removing one it never had is a no-op.
 * A read-modify-write in the service would race two people tagging at once.
 */
export async function retagMediaAssets(
  tx: Tx,
  tenantId: string,
  ids: string[],
  tags: string[],
  mode: 'add' | 'remove',
): Promise<number> {
  if (!ids.length || !tags.length) return 0

  const rows =
    mode === 'add'
      ? await tx<{ id: string }[]>`
          UPDATE media_assets SET tags = (
            SELECT array_agg(DISTINCT merged ORDER BY merged)
            FROM unnest(tags || ${tags}::text[]) AS merged
          )
          WHERE tenant_id = ${tenantId} AND id = ANY (${ids}::uuid[])
          RETURNING id
        `
      : await tx<{ id: string }[]>`
          UPDATE media_assets SET tags = coalesce((
            SELECT array_agg(kept ORDER BY kept)
            FROM unnest(tags) AS kept
            WHERE NOT (kept = ANY (${tags}::text[]))
          ), '{}')
          WHERE tenant_id = ${tenantId} AND id = ANY (${ids}::uuid[])
          RETURNING id
        `

  return rows.length
}

/**
 * Every page, post and author that references this asset — down to the section.
 *
 * The `LEFT JOIN LATERAL` is what gives section-level detail without losing the
 * document: a match inside `sections` yields the section that holds it, while a
 * match in SEO metadata or in a published-only copy still yields the document
 * with an empty section. Both are things that break on delete, so both are
 * reported.
 */
export async function findMediaUsage(tx: Tx, tenantId: string, mediaId: string): Promise<MediaUsage> {
  const needle = `%${mediaId}%`

  const pages = await tx<
    { id: string; title: string; path: string; section_id: string | null; block: string | null }[]
  >`
    SELECT p.id, p.title, p.path, section->>'id' AS section_id, section->>'block' AS block
    FROM pages p
    LEFT JOIN LATERAL jsonb_array_elements(coalesce(p.sections, '[]'::jsonb)) AS section
      ON section::text LIKE ${needle}
    WHERE p.tenant_id = ${tenantId}
      AND (
        p.sections::text LIKE ${needle}
        OR p.published_sections::text LIKE ${needle}
        OR p.seo::text LIKE ${needle}
      )
    ORDER BY p.path ASC
    LIMIT 100
  `

  const posts = await tx<
    {
      id: string
      title: string
      slug: string
      section_id: string | null
      block: string | null
      is_cover: boolean
    }[]
  >`
    SELECT p.id, p.title, p.slug, section->>'id' AS section_id, section->>'block' AS block,
           (p.cover_media_id = ${mediaId}) AS is_cover
    FROM blog_posts p
    LEFT JOIN LATERAL jsonb_array_elements(coalesce(p.sections, '[]'::jsonb)) AS section
      ON section::text LIKE ${needle}
    WHERE p.tenant_id = ${tenantId}
      AND (
        p.sections::text LIKE ${needle}
        OR p.published_sections::text LIKE ${needle}
        OR p.seo::text LIKE ${needle}
        OR p.cover_media_id = ${mediaId}
      )
    ORDER BY p.slug ASC
    LIMIT 100
  `

  const authors = await tx<{ id: string; name: string; slug: string }[]>`
    SELECT id, name, slug FROM blog_authors
    WHERE tenant_id = ${tenantId} AND avatar_media_id = ${mediaId}
    ORDER BY name ASC
    LIMIT 50
  `

  const references = [
    ...pages.map((row) => ({
      kind: 'page' as const,
      id: row.id,
      title: row.title,
      path: row.path,
      sectionId: row.section_id ?? '',
      block: row.block ?? '',
    })),
    ...posts.map((row) => ({
      kind: 'post' as const,
      id: row.id,
      title: row.title,
      path: `/blog/${row.slug}`,
      sectionId: row.section_id ?? (row.is_cover ? 'cover' : ''),
      block: row.block ?? (row.is_cover ? 'cover image' : ''),
    })),
    ...authors.map((row) => ({
      kind: 'author' as const,
      id: row.id,
      title: row.name,
      path: `/blog/author/${row.slug}`,
      sectionId: 'avatar',
      block: 'author portrait',
    })),
  ]

  return mediaUsageSchema.parse({ mediaId, references, total: references.length })
}

/**
 * The storage locator for one asset, resolved without tenant context.
 *
 * Goes through the `resolve_public_media` SECURITY DEFINER function from 0012,
 * the same narrow escape hatch `resolve_site_by_host` is: a storefront fetching
 * an image has a URL and nothing else. It returns the owning tenant with it, so
 * the caller still streams from within one tenant's storage.
 */
export async function resolvePublicMedia(
  tx: Tx,
  mediaId: string,
): Promise<{
  tenantId: string
  storageKey: string
  mime: MediaMime
  filename: string
  frameStatus: MediaFrameStatus
  frameCount: number
} | null> {
  const [row] = await tx<
    {
      tenant_id: string
      storage_key: string
      mime: MediaMime
      filename: string
      frame_status: MediaFrameStatus
      frame_count: number
    }[]
  >`SELECT * FROM resolve_public_media(${mediaId})`

  if (!row) return null
  return {
    tenantId: row.tenant_id,
    storageKey: row.storage_key,
    mime: row.mime,
    filename: row.filename,
    frameStatus: row.frame_status ?? 'none',
    frameCount: Number(row.frame_count ?? 0),
  }
}

// endregion

// region Blog taxonomy

interface CategoryRow {
  id: string
  site_id: string
  slug: string
  name: string
  description: string
  created_at: Date
  post_count?: string
}

function toCategory(row: CategoryRow): BlogCategory {
  return blogCategorySchema.parse({
    id: row.id,
    siteId: row.site_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    postCount: Number(row.post_count ?? 0),
    createdAt: row.created_at,
  })
}

export async function listBlogCategories(tx: Tx, tenantId: string, siteId: string): Promise<BlogCategory[]> {
  const rows = await tx<CategoryRow[]>`
    SELECT c.*, count(p.id) AS post_count
    FROM blog_categories c
    LEFT JOIN blog_posts p ON p.category_id = c.id
    WHERE c.tenant_id = ${tenantId} AND c.site_id = ${siteId}
    GROUP BY c.id
    ORDER BY c.name ASC
  `
  return rows.map(toCategory)
}

export async function insertBlogCategory(
  tx: Tx,
  tenantId: string,
  siteId: string,
  input: { slug: string; name: string; description?: string },
): Promise<BlogCategory> {
  const [row] = await tx<CategoryRow[]>`
    INSERT INTO blog_categories (tenant_id, site_id, slug, name, description)
    VALUES (${tenantId}, ${siteId}, ${input.slug}, ${input.name}, ${input.description ?? ''})
    RETURNING *
  `
  return toCategory(row!)
}

export async function deleteBlogCategory(tx: Tx, tenantId: string, categoryId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM blog_categories WHERE tenant_id = ${tenantId} AND id = ${categoryId} RETURNING id
  `
  return rows.length > 0
}

interface AuthorRow {
  id: string
  site_id: string
  slug: string
  name: string
  bio: string
  avatar_media_id: string | null
  created_at: Date
  post_count?: string
}

function toAuthor(row: AuthorRow): BlogAuthor {
  return blogAuthorSchema.parse({
    id: row.id,
    siteId: row.site_id,
    slug: row.slug,
    name: row.name,
    bio: row.bio,
    avatarMediaId: row.avatar_media_id,
    postCount: Number(row.post_count ?? 0),
    createdAt: row.created_at,
  })
}

export async function listBlogAuthors(tx: Tx, tenantId: string, siteId: string): Promise<BlogAuthor[]> {
  const rows = await tx<AuthorRow[]>`
    SELECT a.*, count(p.id) AS post_count
    FROM blog_authors a
    LEFT JOIN blog_posts p ON p.author_id = a.id
    WHERE a.tenant_id = ${tenantId} AND a.site_id = ${siteId}
    GROUP BY a.id
    ORDER BY a.name ASC
  `
  return rows.map(toAuthor)
}

export async function insertBlogAuthor(
  tx: Tx,
  tenantId: string,
  siteId: string,
  input: { slug: string; name: string; bio?: string; avatarMediaId?: string | null },
): Promise<BlogAuthor> {
  const [row] = await tx<AuthorRow[]>`
    INSERT INTO blog_authors (tenant_id, site_id, slug, name, bio, avatar_media_id)
    VALUES (
      ${tenantId}, ${siteId}, ${input.slug}, ${input.name},
      ${input.bio ?? ''}, ${input.avatarMediaId ?? null}
    )
    RETURNING *
  `
  return toAuthor(row!)
}

export async function deleteBlogAuthor(tx: Tx, tenantId: string, authorId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM blog_authors WHERE tenant_id = ${tenantId} AND id = ${authorId} RETURNING id
  `
  return rows.length > 0
}

// endregion

// region Posts

interface PostRow {
  id: string
  site_id: string
  slug: string
  title: string
  excerpt: string
  status: BlogPostStatus
  category_id: string | null
  author_id: string | null
  cover_media_id: string | null
  tags: string[]
  seo: unknown
  sections: unknown
  published_at: Date | null
  created_at: Date
  updated_at: Date
  section_count: string | number
  has_unpublished_changes: boolean
  category_name: string
  author_name: string
}

/** A bad JSONB document surfaces here, not in a renderer. Mirrors `pages.ts`. */
function readDocument(value: unknown): Section[] {
  try {
    return normalizeDocument(readJson<unknown[]>(value, []))
  } catch {
    return []
  }
}

function toPostSummary(row: PostRow): BlogPostSummary {
  return blogPostSummarySchema.parse({
    id: row.id,
    siteId: row.site_id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    status: row.status,
    categoryId: row.category_id,
    categoryName: row.category_name ?? '',
    authorId: row.author_id,
    authorName: row.author_name ?? '',
    coverMediaId: row.cover_media_id,
    coverUrl: mediaPublicUrl(row.cover_media_id),
    tags: row.tags ?? [],
    sectionCount: Number(row.section_count),
    hasUnpublishedChanges: row.has_unpublished_changes,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  })
}

function toPost(row: PostRow): BlogPost {
  return blogPostSchema.parse({
    ...toPostSummary(row),
    seo: seoSchema.parse(readJson<Record<string, unknown>>(row.seo, {})),
    sections: readDocument(row.sections),
    createdAt: row.created_at,
  })
}

/**
 * `status` is *derived*, not read.
 *
 * A scheduled post whose moment has passed is published — that is already true
 * of what the public API serves, and a stored column that only becomes correct
 * when something remembers to run is a column that lies between runs.
 */
const POST_SELECT = (tx: Tx) => tx`
  p.id, p.site_id, p.slug, p.title, p.excerpt, p.category_id, p.author_id,
  CASE
    WHEN p.status = 'scheduled' AND p.published_at IS NOT NULL AND p.published_at <= now()
    THEN 'published' ELSE p.status
  END AS status,
  p.cover_media_id, p.tags, p.seo, p.sections, p.published_at, p.created_at, p.updated_at,
  coalesce(jsonb_array_length(p.sections), 0) AS section_count,
  (
    p.published_at IS NULL
    OR p.published_sections IS DISTINCT FROM p.sections
    OR p.published_title IS DISTINCT FROM p.title
    OR p.published_seo IS DISTINCT FROM p.seo
    OR p.published_excerpt IS DISTINCT FROM p.excerpt
  ) AS has_unpublished_changes,
  coalesce(c.name, '') AS category_name,
  coalesce(a.name, '') AS author_name
`

const POST_FROM = (tx: Tx) => tx`
  FROM blog_posts p
  LEFT JOIN blog_categories c ON c.id = p.category_id
  LEFT JOIN blog_authors a ON a.id = p.author_id
`

export async function listBlogPosts(
  tx: Tx,
  tenantId: string,
  siteId: string,
  query: BlogPostListQuery,
): Promise<BlogPostSummary[]> {
  const search = query.search?.trim() ? `%${query.search.trim().toLowerCase()}%` : null

  const rows = await tx<PostRow[]>`
    SELECT ${POST_SELECT(tx)} ${POST_FROM(tx)}
    WHERE p.tenant_id = ${tenantId} AND p.site_id = ${siteId}
      AND (${query.status ?? null}::text IS NULL OR p.status = ${query.status ?? null}::text)
      AND (${query.categoryId ?? null}::uuid IS NULL OR p.category_id = ${query.categoryId ?? null}::uuid)
      AND (${query.authorId ?? null}::uuid IS NULL OR p.author_id = ${query.authorId ?? null}::uuid)
      AND (${search}::text IS NULL OR lower(p.title) LIKE ${search}::text OR lower(p.excerpt) LIKE ${search}::text)
    ORDER BY coalesce(p.published_at, p.updated_at) DESC
    LIMIT ${query.limit} OFFSET ${query.offset}
  `
  return rows.map(toPostSummary)
}

export async function findBlogPostById(tx: Tx, tenantId: string, postId: string): Promise<BlogPost | null> {
  const [row] = await tx<PostRow[]>`
    SELECT ${POST_SELECT(tx)} ${POST_FROM(tx)}
    WHERE p.tenant_id = ${tenantId} AND p.id = ${postId}
    LIMIT 1
  `
  return row ? toPost(row) : null
}

export async function insertBlogPost(
  tx: Tx,
  input: {
    tenantId: string
    siteId: string
    slug: string
    title: string
    excerpt: string
    seo: Seo
    sections: Section[]
    categoryId: string | null
    authorId: string | null
    coverMediaId: string | null
    tags: string[]
  },
): Promise<BlogPost> {
  const [inserted] = await tx<{ id: string }[]>`
    INSERT INTO blog_posts (
      tenant_id, site_id, slug, title, excerpt, seo, sections,
      category_id, author_id, cover_media_id, tags
    )
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.slug}, ${input.title}, ${input.excerpt},
      ${jsonParam(tx, input.seo)}, ${jsonParam(tx, input.sections)},
      ${input.categoryId}, ${input.authorId}, ${input.coverMediaId}, ${input.tags}
    )
    RETURNING id
  `
  return (await findBlogPostById(tx, input.tenantId, inserted!.id))!
}

export async function updateBlogPost(
  tx: Tx,
  tenantId: string,
  postId: string,
  patch: {
    slug?: string
    title?: string
    excerpt?: string
    seo?: Seo
    sections?: Section[]
    categoryId?: string | null
    authorId?: string | null
    coverMediaId?: string | null
    tags?: string[]
  },
): Promise<BlogPost | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE blog_posts SET
      slug           = COALESCE(${patch.slug ?? null}::text, slug),
      title          = COALESCE(${patch.title ?? null}::text, title),
      excerpt        = COALESCE(${patch.excerpt ?? null}::text, excerpt),
      seo            = COALESCE(${patch.seo ? jsonParam(tx, patch.seo) : null}::jsonb, seo),
      sections       = COALESCE(${patch.sections ? jsonParam(tx, patch.sections) : null}::jsonb, sections),
      -- An omitted field leaves the link alone; an explicit null clears it,
      -- which is the only way to detach a category, author or cover image.
      category_id    = CASE WHEN ${patch.categoryId === undefined} THEN category_id ELSE ${patch.categoryId ?? null}::uuid END,
      author_id      = CASE WHEN ${patch.authorId === undefined} THEN author_id ELSE ${patch.authorId ?? null}::uuid END,
      cover_media_id = CASE WHEN ${patch.coverMediaId === undefined} THEN cover_media_id ELSE ${patch.coverMediaId ?? null}::uuid END,
      tags           = COALESCE(${patch.tags ?? null}::text[], tags)
    WHERE tenant_id = ${tenantId} AND id = ${postId}
    RETURNING id
  `
  return rows.length ? findBlogPostById(tx, tenantId, postId) : null
}

/**
 * Copy the draft onto the live document.
 *
 * `publishAt` in the future stores the post as `scheduled` with that timestamp;
 * the public read model compares it to `now()`, so nothing has to wake up later
 * and nothing can serve it early.
 */
export async function publishBlogPost(
  tx: Tx,
  tenantId: string,
  postId: string,
  publishAt: Date,
): Promise<BlogPost | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE blog_posts SET
      status             = CASE WHEN ${publishAt} > now() THEN 'scheduled' ELSE 'published' END,
      published_sections = sections,
      published_title    = title,
      published_seo      = seo,
      published_excerpt  = excerpt,
      published_at       = ${publishAt}
    WHERE tenant_id = ${tenantId} AND id = ${postId}
    RETURNING id
  `
  return rows.length ? findBlogPostById(tx, tenantId, postId) : null
}

export async function unpublishBlogPost(tx: Tx, tenantId: string, postId: string): Promise<BlogPost | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE blog_posts SET
      status             = 'draft',
      published_sections = NULL,
      published_title    = NULL,
      published_seo      = NULL,
      published_excerpt  = NULL,
      published_at       = NULL
    WHERE tenant_id = ${tenantId} AND id = ${postId}
    RETURNING id
  `
  return rows.length ? findBlogPostById(tx, tenantId, postId) : null
}

export async function deleteBlogPost(tx: Tx, tenantId: string, postId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM blog_posts WHERE tenant_id = ${tenantId} AND id = ${postId} RETURNING id
  `
  return rows.length > 0
}

export async function insertBlogRevision(
  tx: Tx,
  input: {
    tenantId: string
    postId: string
    title: string
    excerpt: string
    seo: Seo
    sections: Section[]
    reason: string
    createdBy: string
  },
): Promise<void> {
  await tx`
    INSERT INTO blog_post_revisions (tenant_id, post_id, title, excerpt, seo, sections, reason, created_by)
    VALUES (
      ${input.tenantId}, ${input.postId}, ${input.title}, ${input.excerpt},
      ${jsonParam(tx, input.seo)}, ${jsonParam(tx, input.sections)},
      ${input.reason}, ${input.createdBy}
    )
  `
}

export async function listBlogRevisions(
  tx: Tx,
  tenantId: string,
  postId: string,
): Promise<BlogPostRevision[]> {
  const rows = await tx<
    { id: string; post_id: string; title: string; sections: unknown; reason: string; created_by: string; created_at: Date }[]
  >`
    SELECT id, post_id, title, sections, reason, created_by, created_at
    FROM blog_post_revisions
    WHERE tenant_id = ${tenantId} AND post_id = ${postId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map((row) =>
    blogPostRevisionSchema.parse({
      id: row.id,
      postId: row.post_id,
      title: row.title,
      sectionCount: readJson<unknown[]>(row.sections, []).length,
      reason: row.reason,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }),
  )
}

export async function findBlogRevision(
  tx: Tx,
  tenantId: string,
  postId: string,
  revisionId: string,
): Promise<{ title: string; excerpt: string; seo: Seo; sections: Section[] } | null> {
  const [row] = await tx<{ title: string; excerpt: string; seo: unknown; sections: unknown }[]>`
    SELECT title, excerpt, seo, sections FROM blog_post_revisions
    WHERE tenant_id = ${tenantId} AND post_id = ${postId} AND id = ${revisionId}
    LIMIT 1
  `
  if (!row) return null
  return {
    title: row.title,
    excerpt: row.excerpt,
    seo: seoSchema.parse(readJson<Record<string, unknown>>(row.seo, {})),
    sections: readDocument(row.sections),
  }
}

// endregion

// region Public read model

interface PublicPostRow {
  slug: string
  title: string
  excerpt: string
  seo: unknown
  sections: unknown
  tags: string[]
  cover_media_id: string | null
  category_slug: string
  category_name: string
  author_name: string
  published_at: Date | null
}

function toPublicPost(row: PublicPostRow): PublicBlogPost {
  return publicBlogPostSchema.parse({
    path: `/blog/${row.slug}`,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    seo: seoSchema.parse(readJson<Record<string, unknown>>(row.seo, {})),
    sections: readDocument(row.sections),
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    authorName: row.author_name,
    coverUrl: mediaPublicUrl(row.cover_media_id),
    tags: row.tags ?? [],
    publishedAt: row.published_at,
  })
}

/**
 * Published posts for one site, resolved without tenant context.
 *
 * The `published_at <= now()` filter lives inside `list_public_blog_posts`
 * (0012), in SQL, so a scheduled post cannot be read early through this
 * function, the RSS feed, or anything else that ever calls it.
 */
export async function listPublicBlogPosts(
  tx: Tx,
  siteId: string,
  options: { slug?: string; limit?: number } = {},
): Promise<PublicBlogPost[]> {
  const rows = await tx<PublicPostRow[]>`
    SELECT * FROM list_public_blog_posts(${siteId}, ${options.slug ?? null}, ${options.limit ?? 20})
  `
  return rows.map(toPublicPost)
}

// endregion
