-- ===========================================================================
-- 0018 — Resolve OAuth state tenant without RLS (§18).
--
-- The Google callback arrives with no tenant context. Looking up
-- `integration_oauth_states` under the app role returns nothing because of
-- tenant RLS — the authorize step inserts WITH a tenant, the callback cannot
-- set one until it finds the row. Same chicken-and-egg as `resolve_scim_token`
-- and `resolve_public_media`: a narrow SECURITY DEFINER function that returns
-- only the tenant id for an unconsumed, unexpired state.
-- ===========================================================================

CREATE OR REPLACE FUNCTION resolve_oauth_state_tenant(p_state text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM integration_oauth_states
  WHERE state = p_state
    AND consumed_at IS NULL
    AND expires_at > now()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION resolve_oauth_state_tenant(text) FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION resolve_oauth_state_tenant(text) TO %I', app_role);
END
$$;
