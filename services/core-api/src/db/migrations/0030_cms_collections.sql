-- ===========================================================================
-- 0030 — CMS collections + entries for layout-canvas data binding.
-- Platform CMS is first-party; Frappe / WordPress are remote adapters.
-- ===========================================================================

CREATE TABLE cms_collections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id    uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug       text NOT NULL,
  name       text NOT NULL,
  fields     jsonb NOT NULL DEFAULT '["title","body"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX cms_collections_site_idx ON cms_collections (site_id);

CREATE TRIGGER cms_collections_set_updated_at BEFORE UPDATE ON cms_collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE cms_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES cms_collections(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  title         text NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  published     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, slug)
);

CREATE INDEX cms_entries_collection_idx ON cms_entries (collection_id, published);

CREATE TRIGGER cms_entries_set_updated_at BEFORE UPDATE ON cms_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
  target text;
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  FOREACH target IN ARRAY ARRAY['cms_collections', 'cms_entries']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      target || '_tenant_isolation',
      target
    );
  END LOOP;

  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON cms_collections, cms_entries TO %I', app_role);
END $$;

CREATE OR REPLACE FUNCTION find_published_cms_entry(p_site_id uuid, p_collection text, p_slug text)
RETURNS TABLE (
  id uuid,
  collection_id uuid,
  slug text,
  title text,
  data jsonb,
  published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.collection_id, e.slug, e.title, e.data, e.published, e.created_at, e.updated_at
  FROM cms_entries e
  JOIN cms_collections c ON c.id = e.collection_id
  WHERE c.site_id = p_site_id
    AND c.slug = p_collection
    AND e.slug = p_slug
    AND e.published = true
  LIMIT 1
$$;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  EXECUTE format('GRANT EXECUTE ON FUNCTION find_published_cms_entry(uuid, text, text) TO %I', app_role);
END $$;
