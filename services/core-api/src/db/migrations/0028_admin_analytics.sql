-- ===========================================================================
-- 0028 — Staff console: richer user roster + analytics helpers
-- ===========================================================================

-- Postgres cannot change OUT columns via CREATE OR REPLACE — drop first.
DROP FUNCTION IF EXISTS platform_users_overview();
DROP FUNCTION IF EXISTS platform_daily_signups(int);
DROP FUNCTION IF EXISTS platform_daily_tenants(int);
DROP FUNCTION IF EXISTS platform_daily_events(int);

CREATE OR REPLACE FUNCTION platform_users_overview()
RETURNS TABLE (
  user_id            uuid,
  email              text,
  name               text,
  created_at         timestamptz,
  tenant_count       bigint,
  tenants            text,
  is_platform_admin  boolean,
  last_seen_at       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    u.id,
    u.email,
    u.name,
    u.created_at,
    (SELECT count(*) FROM memberships m WHERE m.user_id = u.id),
    coalesce(
      (
        SELECT string_agg(t.name, ', ' ORDER BY t.name)
        FROM memberships m
        JOIN tenants t ON t.id = m.tenant_id
        WHERE m.user_id = u.id
      ),
      ''
    ),
    EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id),
    (SELECT max(s.created_at) FROM sessions s WHERE s.user_id = u.id)
  FROM users u
  ORDER BY u.created_at DESC
$$;

CREATE OR REPLACE FUNCTION platform_daily_signups(p_days int DEFAULT 30)
RETURNS TABLE (day date, signup_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT greatest(1, least(p_days, 90)) AS days
  ),
  series AS (
    SELECT generate_series(
      (current_date - ((SELECT days FROM bounds) - 1)),
      current_date,
      interval '1 day'
    )::date AS day
  )
  SELECT
    s.day,
    count(u.id)
  FROM series s
  LEFT JOIN users u ON u.created_at::date = s.day
  GROUP BY s.day
  ORDER BY s.day
$$;

CREATE OR REPLACE FUNCTION platform_daily_tenants(p_days int DEFAULT 30)
RETURNS TABLE (day date, tenant_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT greatest(1, least(p_days, 90)) AS days
  ),
  series AS (
    SELECT generate_series(
      (current_date - ((SELECT days FROM bounds) - 1)),
      current_date,
      interval '1 day'
    )::date AS day
  )
  SELECT
    s.day,
    count(t.id)
  FROM series s
  LEFT JOIN tenants t ON t.created_at::date = s.day
  GROUP BY s.day
  ORDER BY s.day
$$;

CREATE OR REPLACE FUNCTION platform_daily_events(p_days int DEFAULT 30)
RETURNS TABLE (day date, event_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT greatest(1, least(p_days, 90)) AS days
  ),
  series AS (
    SELECT generate_series(
      (current_date - ((SELECT days FROM bounds) - 1)),
      current_date,
      interval '1 day'
    )::date AS day
  )
  SELECT
    s.day,
    count(a.id)
  FROM series s
  LEFT JOIN audit_events a ON a.created_at::date = s.day
  GROUP BY s.day
  ORDER BY s.day
$$;

REVOKE ALL ON FUNCTION platform_users_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_daily_signups(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_daily_tenants(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_daily_events(int) FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_users_overview() TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_daily_signups(int) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_daily_tenants(int) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_daily_events(int) TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, DELETE ON platform_admins TO %I', app_role);
END
$$;
