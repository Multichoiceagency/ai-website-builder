-- ===========================================================================
-- 0017 — AI usage metering (§9, §68).
--
-- One row per successful gateway call. Tokens and cost come from the provider
-- response; the gateway records them after the call returns, never before.
-- ===========================================================================

CREATE TABLE ai_usage (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature        text NOT NULL DEFAULT '',
  model          text NOT NULL DEFAULT '',
  input_tokens   integer NOT NULL DEFAULT 0,
  output_tokens  integer NOT NULL DEFAULT 0,
  cost_usd       numeric(16, 8) NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_tenant_created_idx ON ai_usage (tenant_id, created_at DESC);
CREATE INDEX ai_usage_tenant_feature_idx ON ai_usage (tenant_id, feature, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_tenant_isolation ON ai_usage
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT ON ai_usage TO %I',
    app_role
  );
  -- Metering is append-only evidence: the app role never rewrites or deletes.
  EXECUTE format('REVOKE UPDATE, DELETE ON ai_usage FROM %I', app_role);
END
$$;
