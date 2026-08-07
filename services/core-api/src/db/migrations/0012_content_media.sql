-- ===========================================================================
-- 0012 — Blog (§6) and the media library (§14).
--
-- The blog is deliberately shaped like `pages` from 0001: a draft document, a
-- live document, a revision table, and one write that can make content public.
-- That is not symmetry for its own sake — it is what lets the same editor, the
-- same block validation and the same renderer serve both (ADR-0003).
--
-- Runs as the table owner; services connect as the app role, which is why
-- every table below gets row-level security (ADR-0004).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------

CREATE TABLE media_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- A flat text path (`blog/2026`), not a folder table: folders here are a
  -- browsing convenience, and a tree of rows would add joins to every list
  -- without adding a single capability.
  folder       text NOT NULL DEFAULT '',
  -- The name a human sees. Never used to build a filesystem or object path.
  filename     text NOT NULL,
  -- The name we generated. This is the only thing that reaches storage, which
  -- is what makes `../../etc/passwd` a display string instead of a traversal.
  storage_key  text NOT NULL,
  mime         text NOT NULL
                 CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp',
                                 'image/avif', 'image/gif', 'image/svg+xml',
                                 'video/mp4', 'video/webm')),
  size_bytes   bigint NOT NULL DEFAULT 0,
  width        integer,
  height       integer,
  alt          text NOT NULL DEFAULT '',
  -- `derived` means "we made this up from the filename". It counts as missing,
  -- because a filename is not a description of an image.
  alt_source   text NOT NULL DEFAULT 'none' CHECK (alt_source IN ('none', 'derived', 'human')),
  tags         text[] NOT NULL DEFAULT '{}',
  checksum     text NOT NULL DEFAULT '',
  created_by   text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX media_assets_tenant_idx ON media_assets (tenant_id, created_at DESC);
CREATE INDEX media_assets_folder_idx ON media_assets (tenant_id, folder);
CREATE INDEX media_assets_tags_idx ON media_assets USING gin (tags);
-- The alt-text report is a list view, so it gets its own partial index rather
-- than a sequential scan of the whole library.
CREATE INDEX media_assets_missing_alt_idx
  ON media_assets (tenant_id, created_at DESC) WHERE alt_source <> 'human';
CREATE UNIQUE INDEX media_assets_storage_key_idx ON media_assets (storage_key);

CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Blog taxonomy
-- ---------------------------------------------------------------------------

CREATE TABLE blog_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id      uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX blog_categories_tenant_idx ON blog_categories (tenant_id);

CREATE TABLE blog_authors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id          uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug             text NOT NULL,
  name             text NOT NULL,
  bio              text NOT NULL DEFAULT '',
  -- SET NULL rather than CASCADE: deleting a portrait must not delete a person.
  avatar_media_id  uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX blog_authors_tenant_idx ON blog_authors (tenant_id);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

CREATE TABLE blog_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id             uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug                text NOT NULL,
  title               text NOT NULL,
  excerpt             text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'published')),
  category_id         uuid REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_id           uuid REFERENCES blog_authors(id) ON DELETE SET NULL,
  cover_media_id      uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  tags                text[] NOT NULL DEFAULT '{}',
  seo                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The working document, identical in shape to `pages.sections`.
  sections            jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- The live document. Only publishing copies the draft over it.
  published_sections  jsonb,
  published_seo       jsonb,
  published_title     text,
  published_excerpt   text,
  -- Set on publish. A *future* value is what "scheduled" means: the public read
  -- model filters on `published_at <= now()`, so nothing has to wake up and
  -- flip a flag for the post to appear, and nothing can leak it early either.
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX blog_posts_tenant_idx ON blog_posts (tenant_id);
CREATE INDEX blog_posts_site_idx ON blog_posts (site_id, published_at DESC NULLS LAST);
CREATE INDEX blog_posts_category_idx ON blog_posts (category_id);
CREATE INDEX blog_posts_author_idx ON blog_posts (author_id);

CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE blog_post_revisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  title       text NOT NULL,
  excerpt     text NOT NULL DEFAULT '',
  seo         jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections    jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason      text NOT NULL DEFAULT 'manual',
  created_by  text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_post_revisions_post_idx ON blog_post_revisions (post_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'media_assets', 'blog_categories', 'blog_authors', 'blog_posts', 'blog_post_revisions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      target || '_tenant_isolation',
      target
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- Privileges for the runtime role
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON media_assets, blog_categories, blog_authors, blog_posts, blog_post_revisions TO %I',
    app_role
  );
END
$$;

-- ---------------------------------------------------------------------------
-- Public reads
--
-- The storefront arrives with a hostname and no tenant context, exactly as in
-- 0001. These two SECURITY DEFINER functions are the same narrow, read-only
-- escape hatch `resolve_site_by_host` already is, and they are deliberately
-- unable to return anything a publish did not make public:
--
--   * `resolve_public_media` returns the storage locator for one asset by id.
--     Media in the library exists to be embedded in public pages, so serving
--     it by unguessable id is the intended reach — but the tenant comes back
--     with it, so the caller still streams within one tenant's storage.
--   * `list_public_blog_posts` filters on `published_at <= now()`, in SQL, so
--     a scheduled post cannot be read early through any code path.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION resolve_public_media(p_media_id uuid)
RETURNS TABLE (tenant_id uuid, storage_key text, mime text, size_bytes bigint, filename text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.tenant_id, m.storage_key, m.mime, m.size_bytes, m.filename
  FROM media_assets m
  WHERE m.id = p_media_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION resolve_public_media(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION list_public_blog_posts(p_site_id uuid, p_slug text, p_limit integer)
RETURNS TABLE (
  slug text,
  title text,
  excerpt text,
  seo jsonb,
  sections jsonb,
  tags text[],
  cover_media_id uuid,
  category_slug text,
  category_name text,
  author_name text,
  published_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.slug,
    coalesce(p.published_title, p.title),
    coalesce(p.published_excerpt, p.excerpt),
    coalesce(p.published_seo, '{}'::jsonb),
    coalesce(p.published_sections, '[]'::jsonb),
    p.tags,
    p.cover_media_id,
    coalesce(c.slug, ''),
    coalesce(c.name, ''),
    coalesce(a.name, ''),
    p.published_at
  FROM blog_posts p
  LEFT JOIN blog_categories c ON c.id = p.category_id
  LEFT JOIN blog_authors a ON a.id = p.author_id
  WHERE p.site_id = p_site_id
    AND p.status IN ('published', 'scheduled')
    AND p.published_at IS NOT NULL
    AND p.published_at <= now()
    AND (p_slug IS NULL OR p.slug = p_slug)
  ORDER BY p.published_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
$$;

REVOKE ALL ON FUNCTION list_public_blog_posts(uuid, text, integer) FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  EXECUTE format('GRANT EXECUTE ON FUNCTION resolve_public_media(uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION list_public_blog_posts(uuid, text, integer) TO %I', app_role);
END
$$;
