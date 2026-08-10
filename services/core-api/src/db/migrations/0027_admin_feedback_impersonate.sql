-- ===========================================================================
-- 0027 — Platform feedback, session impersonation, marketing stub
-- ===========================================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS impersonator_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sessions_impersonator_idx
  ON sessions (impersonator_user_id)
  WHERE impersonator_user_id IS NOT NULL;

CREATE TABLE platform_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  tenant_id   uuid REFERENCES tenants(id) ON DELETE SET NULL,
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  page_path   text NOT NULL DEFAULT '' CHECK (char_length(page_path) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_feedback_created_idx ON platform_feedback (created_at DESC);

CREATE TABLE platform_marketing_campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'scheduled', 'sent', 'archived')),
  body        text NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER platform_marketing_campaigns_set_updated_at
  BEFORE UPDATE ON platform_marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION platform_users_overview()
RETURNS TABLE (
  user_id      uuid,
  email        text,
  name         text,
  created_at   timestamptz,
  tenant_count bigint,
  tenants      text
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
    )
  FROM users u
  ORDER BY u.created_at DESC
$$;

REVOKE ALL ON FUNCTION platform_users_overview() FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format('GRANT SELECT, UPDATE ON sessions TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT ON platform_feedback TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON platform_marketing_campaigns TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION platform_users_overview() TO %I', app_role);
  EXECUTE format('GRANT UPDATE ON tenants TO %I', app_role);
END
$$;
