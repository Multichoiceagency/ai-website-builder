-- ===========================================================================
-- 0029 — Platform SEO network: online sites auto-exchange contextual backlinks.
--
-- Membership is platform-wide (cross-tenant). Edges are directed dofollow
-- partner links injected on the public storefront. Opt-out via seo_settings.
-- ===========================================================================

ALTER TABLE seo_settings
  ADD COLUMN IF NOT EXISTS network_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS network_niche text NOT NULL DEFAULT '';

COMMENT ON COLUMN seo_settings.network_enabled IS
  'When true (default), a published online site joins the platform partner-link network.';
COMMENT ON COLUMN seo_settings.network_niche IS
  'Optional niche tag for matching partner sites (e.g. dental, saas, agency).';

CREATE TABLE seo_network_members (
  site_id              uuid PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  tenant_id            uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostname             text NOT NULL,
  title                text NOT NULL,
  locale               text NOT NULL DEFAULT 'en',
  kind                 text NOT NULL DEFAULT 'website',
  niche                text NOT NULL DEFAULT '',
  origin               text NOT NULL,
  published_page_count integer NOT NULL DEFAULT 0,
  active               boolean NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seo_network_members_active_idx
  ON seo_network_members (active) WHERE active = true;
CREATE INDEX seo_network_members_locale_idx
  ON seo_network_members (locale) WHERE active = true;
CREATE INDEX seo_network_members_niche_idx
  ON seo_network_members (niche) WHERE active = true AND niche <> '';

CREATE TABLE seo_network_edges (
  from_site_id uuid NOT NULL REFERENCES seo_network_members(site_id) ON DELETE CASCADE,
  to_site_id   uuid NOT NULL REFERENCES seo_network_members(site_id) ON DELETE CASCADE,
  anchor       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_site_id, to_site_id),
  CHECK (from_site_id <> to_site_id)
);

CREATE INDEX seo_network_edges_to_idx ON seo_network_edges (to_site_id);

-- Platform-wide reads for public injection + dashboard (no tenant RLS).
CREATE OR REPLACE FUNCTION seo_network_list_active()
RETURNS TABLE (
  site_id              uuid,
  tenant_id            uuid,
  hostname             text,
  title                text,
  locale               text,
  kind                 text,
  niche                text,
  origin               text,
  published_page_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT site_id, tenant_id, hostname, title, locale, kind, niche, origin, published_page_count
  FROM seo_network_members
  WHERE active = true
  ORDER BY title ASC
$$;

CREATE OR REPLACE FUNCTION seo_network_links_for(p_site_id uuid)
RETURNS TABLE (
  to_site_id uuid,
  hostname   text,
  title      text,
  origin     text,
  niche      text,
  anchor     text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.to_site_id, m.hostname, m.title, m.origin, m.niche, e.anchor
  FROM seo_network_edges e
  JOIN seo_network_members m ON m.site_id = e.to_site_id AND m.active = true
  WHERE e.from_site_id = p_site_id
  ORDER BY m.title ASC
$$;

CREATE OR REPLACE FUNCTION seo_network_backlinks_for(p_site_id uuid)
RETURNS TABLE (
  from_site_id uuid,
  hostname     text,
  title        text,
  origin       text,
  niche        text,
  anchor       text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.from_site_id, m.hostname, m.title, m.origin, m.niche, e.anchor
  FROM seo_network_edges e
  JOIN seo_network_members m ON m.site_id = e.from_site_id AND m.active = true
  WHERE e.to_site_id = p_site_id
  ORDER BY m.title ASC
$$;

DO $$
DECLARE
  app_role text := coalesce(current_setting('app.db_user', true), 'app');
BEGIN
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON seo_network_members, seo_network_edges TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION seo_network_list_active() TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION seo_network_links_for(uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION seo_network_backlinks_for(uuid) TO %I', app_role);
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
