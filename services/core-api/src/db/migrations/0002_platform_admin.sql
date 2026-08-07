-- ===========================================================================
-- 0002 — Platform administration (internal staff console).
--
-- This migration creates the platform's most dangerous capability: the ability
-- to see across tenant boundaries. It is therefore built as narrowly as
-- possible —
--
--   * membership is an explicit table, never a flag derived from anything else
--   * cross-tenant reads happen only through named SECURITY DEFINER functions
--     that return aggregates and metadata, never customer content
--   * every function is granted to the app role alone, and the API checks
--     platform-admin membership before calling one
--   * looking at a specific tenant is logged
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Who is staff
-- ---------------------------------------------------------------------------

CREATE TABLE platform_admins (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Append-only record of staff looking at customer workspaces. Support access
-- that leaves no trace is indistinguishable from a breach.
CREATE TABLE admin_access_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      text NOT NULL,
  tenant_id   uuid,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_access_log_created_idx ON admin_access_log (created_at DESC);
CREATE INDEX admin_access_log_tenant_idx ON admin_access_log (tenant_id);

-- ---------------------------------------------------------------------------
-- Cross-tenant read functions
--
-- SECURITY DEFINER means these run as the owner and are not filtered by RLS.
-- That is the entire point, and the entire risk. Each one is deliberately
-- limited to counts, names and timestamps — none of them returns page content,
-- customer records or credentials.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION platform_tenant_overview()
RETURNS TABLE (
  tenant_id          uuid,
  name               text,
  slug               text,
  plan               text,
  organization_name  text,
  created_at         timestamptz,
  member_count       bigint,
  site_count         bigint,
  page_count         bigint,
  published_count    bigint,
  last_activity_at   timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id, t.name, t.slug, t.plan, o.name, t.created_at,
    (SELECT count(*) FROM memberships m WHERE m.tenant_id = t.id),
    (SELECT count(*) FROM sites s WHERE s.tenant_id = t.id),
    (SELECT count(*) FROM pages p WHERE p.tenant_id = t.id),
    (SELECT count(*) FROM pages p WHERE p.tenant_id = t.id AND p.status = 'published'),
    (SELECT max(a.created_at) FROM audit_events a WHERE a.tenant_id = t.id)
  FROM tenants t
  JOIN organizations o ON o.id = t.organization_id
  ORDER BY t.created_at DESC
$$;

CREATE OR REPLACE FUNCTION platform_tenant_members(p_tenant uuid)
RETURNS TABLE (user_id uuid, email text, name text, role text, joined_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.name, m.role, m.created_at
  FROM memberships m
  JOIN users u ON u.id = m.user_id
  WHERE m.tenant_id = p_tenant
  ORDER BY m.created_at ASC
$$;

CREATE OR REPLACE FUNCTION platform_tenant_sites(p_tenant uuid)
RETURNS TABLE (
  site_id          uuid,
  name             text,
  slug             text,
  primary_hostname text,
  locale           text,
  page_count       bigint,
  published_count  bigint,
  created_at       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id, s.name, s.slug, s.primary_hostname, s.locale,
    (SELECT count(*) FROM pages p WHERE p.site_id = s.id),
    (SELECT count(*) FROM pages p WHERE p.site_id = s.id AND p.status = 'published'),
    s.created_at
  FROM sites s
  WHERE s.tenant_id = p_tenant
  ORDER BY s.created_at ASC
$$;

-- Event names and timestamps only. Payloads stay inside the tenant.
CREATE OR REPLACE FUNCTION platform_recent_activity(p_limit int DEFAULT 50)
RETURNS TABLE (
  id          uuid,
  tenant_id   uuid,
  tenant_name text,
  name        text,
  actor_label text,
  created_at  timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.tenant_id, t.name, a.name, a.actor ->> 'label', a.created_at
  FROM audit_events a
  JOIN tenants t ON t.id = a.tenant_id
  ORDER BY a.created_at DESC
  LIMIT least(greatest(p_limit, 1), 200)
$$;

CREATE OR REPLACE FUNCTION platform_stats()
RETURNS TABLE (
  tenant_count      bigint,
  user_count        bigint,
  site_count        bigint,
  page_count        bigint,
  published_count   bigint,
  active_sessions   bigint,
  events_last_24h   bigint,
  signups_last_7d   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM tenants),
    (SELECT count(*) FROM users),
    (SELECT count(*) FROM sites),
    (SELECT count(*) FROM pages),
    (SELECT count(*) FROM pages WHERE status = 'published'),
    (SELECT count(*) FROM sessions WHERE expires_at > now()),
    (SELECT count(*) FROM audit_events WHERE created_at > now() - interval '24 hours'),
    (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')
$$;

-- Plan distribution, for the internal overview.
CREATE OR REPLACE FUNCTION platform_plan_distribution()
RETURNS TABLE (plan text, tenant_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.plan, count(*) FROM tenants t GROUP BY t.plan ORDER BY count(*) DESC
$$;

-- ---------------------------------------------------------------------------
-- Privileges
--
-- Revoke from PUBLIC first: a SECURITY DEFINER function is executable by
-- everyone by default, which would hand cross-tenant reads to any role.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION platform_tenant_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_tenant_members(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_tenant_sites(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_recent_activity(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_plan_distribution() FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format('GRANT SELECT ON platform_admins TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT ON admin_access_log TO %I', app_role);

  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_tenant_overview() TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_tenant_members(uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_tenant_sites(uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_recent_activity(int) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_stats() TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_plan_distribution() TO %I', app_role);
END
$$;
