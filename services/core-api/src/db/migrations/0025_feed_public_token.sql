-- Public marketplace feed resolution.
--
-- Merchant tools (Google Merchant Center, Meta) fetch a live URL with no
-- session. Feed settings live in `settings_documents` behind RLS, so the
-- storefront/public API has the same chicken-and-egg problem as host → site.
-- This SECURITY DEFINER function is the narrow, read-only escape hatch: it
-- returns the tenant id for a matching opaque feed token, nothing else.

CREATE OR REPLACE FUNCTION resolve_feed_tenant_by_token(p_token text)
RETURNS TABLE (tenant_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.tenant_id
  FROM settings_documents d
  WHERE d.scope = 'commerce'
    AND d.key = 'feeds'
    AND nullif(btrim(d.value ->> 'publicToken'), '') = p_token
    AND length(p_token) >= 24
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION resolve_feed_tenant_by_token(text) FROM PUBLIC;

DO $$
BEGIN
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION resolve_feed_tenant_by_token(text) TO %I',
    current_setting('platform.app_role', true)
  );
END
$$;
