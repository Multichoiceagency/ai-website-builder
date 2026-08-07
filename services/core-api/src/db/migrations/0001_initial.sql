-- ===========================================================================
-- 0001 — Platform foundation: identity, tenancy, sites, pages, audit.
--
-- Runs as the table owner. Services connect as the app role instead, which is
-- why every tenant-scoped table below gets row-level security (ADR-0004).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- The tenant a transaction is allowed to see. Unset resolves to NULL, and a
-- NULL comparison matches no rows — so the failure mode is "no data", never
-- "all data".
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_tenant', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Global tables (not tenant-scoped, no RLS)
-- ---------------------------------------------------------------------------

CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL UNIQUE,
  name           text NOT NULL,
  -- scrypt, encoded as `scrypt$N$r$p$salt$hash`. Never a plaintext column.
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 of the cookie value. Reading this table yields no usable session.
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE tenants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  plan             text NOT NULL DEFAULT 'launch'
                     CHECK (plan IN ('launch', 'grow', 'scale', 'advanced', 'enterprise')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenants_organization_id_idx ON tenants (organization_id);
CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Membership is the *only* thing that grants a user access to a tenant. It is
-- deliberately global: resolving it is what establishes tenant context, so it
-- cannot itself depend on tenant context.
CREATE TABLE memberships (
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner', 'admin', 'developer', 'marketer', 'seo_manager',
                                'sales', 'content_editor', 'support', 'viewer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX memberships_user_id_idx ON memberships (user_id);

-- ---------------------------------------------------------------------------
-- Tenant-scoped tables (RLS enforced)
-- ---------------------------------------------------------------------------

CREATE TABLE sites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  locale            text NOT NULL DEFAULT 'nl',
  theme             jsonb NOT NULL DEFAULT '{}'::jsonb,
  primary_hostname  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX sites_tenant_id_idx ON sites (tenant_id);
CREATE TRIGGER sites_set_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE domains (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id      uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  hostname     text NOT NULL UNIQUE,
  is_primary   boolean NOT NULL DEFAULT false,
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX domains_site_id_idx ON domains (site_id);
CREATE INDEX domains_tenant_id_idx ON domains (tenant_id);

CREATE TABLE pages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id             uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path                text NOT NULL,
  title               text NOT NULL,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  seo                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The working document. Editor and AI mutate this.
  sections            jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- The live document. Only `publish` copies draft over it, so the public API
  -- has no path to unpublished content.
  published_sections  jsonb,
  published_seo       jsonb,
  published_title     text,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, path)
);

CREATE INDEX pages_tenant_id_idx ON pages (tenant_id);
CREATE INDEX pages_site_id_idx ON pages (site_id);
CREATE TRIGGER pages_set_updated_at BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Every publish snapshots the document, so rollback is a copy rather than a
-- reconstruction.
CREATE TABLE page_revisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id     uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title       text NOT NULL,
  seo         jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections    jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason      text NOT NULL DEFAULT 'manual',
  created_by  text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX page_revisions_page_id_created_at_idx ON page_revisions (page_id, created_at DESC);

CREATE TABLE navigations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id     uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  key         text NOT NULL CHECK (key IN ('primary', 'footer')),
  items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, key)
);

CREATE TRIGGER navigations_set_updated_at BEFORE UPDATE ON navigations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only. Every mutating action — human or agent — lands here (ADR-0007).
CREATE TABLE audit_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           text NOT NULL,
  actor          jsonb NOT NULL DEFAULT '{}'::jsonb,
  resource_type  text,
  resource_id    text,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_tenant_created_idx ON audit_events (tenant_id, created_at DESC);
CREATE INDEX audit_events_name_idx ON audit_events (name);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['sites', 'domains', 'pages', 'page_revisions', 'navigations', 'audit_events']
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

  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION current_tenant_id() TO %I', app_role);

  -- The audit log is append-only for the application.
  EXECUTE format('REVOKE UPDATE, DELETE ON audit_events FROM %I', app_role);
END
$$;

-- ---------------------------------------------------------------------------
-- Host → site resolution
--
-- The storefront arrives with a hostname and no tenant context, but `domains`
-- is behind RLS — a chicken-and-egg problem. This SECURITY DEFINER function is
-- the single, narrow, read-only escape hatch that breaks it. It returns ids
-- only, for verified domains only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION resolve_site_by_host(p_hostname text)
RETURNS TABLE (tenant_id uuid, site_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.tenant_id, d.site_id
  FROM domains d
  WHERE d.hostname = lower(p_hostname)
    AND d.verified_at IS NOT NULL
  ORDER BY d.is_primary DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION resolve_site_by_host(text) FROM PUBLIC;

DO $$
BEGIN
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION resolve_site_by_host(text) TO %I',
    current_setting('platform.app_role', true)
  );
END
$$;
