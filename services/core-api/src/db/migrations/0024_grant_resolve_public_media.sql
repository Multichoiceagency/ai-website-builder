-- ===========================================================================
-- 0024 — Restore EXECUTE on resolve_public_media after 0023 recreate.
--
-- DROP FUNCTION in 0023 removed the GRANT from 0012. Without EXECUTE the app
-- role cannot serve public media URLs (previews, storefront embeds).
-- ===========================================================================

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION resolve_public_media(uuid) TO %I', app_role);
END
$$;
