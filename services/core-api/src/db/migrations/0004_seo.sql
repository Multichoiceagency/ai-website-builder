-- ===========================================================================
-- 0004 — SEO engine: per-site settings, stored audits, tracked keywords.
--
-- Runs as the table owner. Services connect as the app role, so every table
-- here is tenant-scoped and carries row-level security (ADR-0004).
--
-- What is deliberately *not* here: a table of keyword positions we made up.
-- Positions only ever arrive from a configured SERP provider, and until one
-- exists `seo_keyword_positions` stays empty rather than plausible.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Per-site SEO settings
--
-- One row per site, created lazily on first write. `business` holds the facts
-- structured data needs; it is a projection of the discovered business profile
-- that a human can correct by hand.
-- ---------------------------------------------------------------------------

CREATE TABLE seo_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id           uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- False asks every crawler to stay away — robots.txt and the sitemap both
  -- read this, so a staging site cannot be indexed by forgetting one of them.
  indexing_enabled  boolean NOT NULL DEFAULT true,
  excluded_paths    jsonb NOT NULL DEFAULT '[]'::jsonb,
  robots_extra      text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id)
);

CREATE INDEX seo_settings_tenant_id_idx ON seo_settings (tenant_id);
CREATE TRIGGER seo_settings_set_updated_at BEFORE UPDATE ON seo_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Stored audit runs
--
-- The audit itself is a pure function of the pages, so this is a history for
-- trend and for the dashboard's first paint — never the source of truth.
-- ---------------------------------------------------------------------------

CREATE TABLE seo_audits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id       uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  score         integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  issue_counts  jsonb NOT NULL DEFAULT '{}'::jsonb,
  report        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seo_audits_site_created_idx ON seo_audits (site_id, created_at DESC);
CREATE INDEX seo_audits_tenant_id_idx ON seo_audits (tenant_id);

-- ---------------------------------------------------------------------------
-- Tracked keywords
-- ---------------------------------------------------------------------------

CREATE TABLE seo_keywords (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id      uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  keyword      text NOT NULL CHECK (length(keyword) BETWEEN 1 AND 200),
  locale       text NOT NULL DEFAULT 'nl',
  country      text NOT NULL DEFAULT 'NL' CHECK (length(country) = 2),
  -- The page meant to rank for this term. Kept as a path rather than a page id
  -- so a term can target a page that has not been built yet.
  target_path  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, keyword, country)
);

CREATE INDEX seo_keywords_tenant_id_idx ON seo_keywords (tenant_id);
CREATE INDEX seo_keywords_site_id_idx ON seo_keywords (site_id);

-- Position history. `source` is NOT NULL because a rank without a provider
-- behind it is a guess, and a guess must never be storable here.
CREATE TABLE seo_keyword_positions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword_id  uuid NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  position    integer NOT NULL CHECK (position BETWEEN 1 AND 200),
  url         text,
  source      text NOT NULL,
  checked_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seo_keyword_positions_keyword_checked_idx
  ON seo_keyword_positions (keyword_id, checked_at DESC);
CREATE INDEX seo_keyword_positions_tenant_id_idx ON seo_keyword_positions (tenant_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['seo_settings', 'seo_audits', 'seo_keywords', 'seo_keyword_positions']
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
    'GRANT SELECT, INSERT, UPDATE, DELETE ON seo_settings, seo_audits, seo_keywords, seo_keyword_positions TO %I',
    app_role
  );
END
$$;
