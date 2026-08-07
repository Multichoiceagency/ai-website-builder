-- ===========================================================================
-- 0010 — Integration Gateway (§18): OAuth connections to external providers.
--
-- The security posture here matters more than the feature:
--   * refresh tokens are encrypted at rest and NEVER leave the server (ADR-0009)
--   * the OAuth `state` is server-side, single-use and short-lived, so a
--     callback cannot be replayed or forged
--   * PKCE verifiers are stored with the state, never sent to the browser
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- In-flight authorisations
--
-- Rows here exist only between "user clicked connect" and "provider called us
-- back". Consumed on use and swept after expiry.
-- ---------------------------------------------------------------------------
CREATE TABLE integration_oauth_states (
  state          text PRIMARY KEY,
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       text NOT NULL,
  -- PKCE. The verifier never reaches the browser; only its S256 challenge does.
  code_verifier  text NOT NULL,
  redirect_to    text NOT NULL DEFAULT '/',
  consumed_at    timestamptz,
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX integration_oauth_states_expires_idx ON integration_oauth_states (expires_at);

-- ---------------------------------------------------------------------------
-- Established connections
-- ---------------------------------------------------------------------------
CREATE TABLE integration_connections (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider               text NOT NULL,
  -- The provider's own account identifier, for reconnect detection.
  external_account_id    text NOT NULL DEFAULT '',
  account_label          text NOT NULL DEFAULT '',
  scopes                 text[] NOT NULL DEFAULT '{}',
  -- AES-256-GCM ciphertext. A database dump yields no usable token.
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  connected_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  last_used_at           timestamptz,
  last_error             text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  -- One connection per provider per tenant; reconnecting replaces it.
  UNIQUE (tenant_id, provider)
);

CREATE INDEX integration_connections_tenant_idx ON integration_connections (tenant_id);

CREATE TRIGGER integration_connections_set_updated_at BEFORE UPDATE ON integration_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Imported provider resources (Business Profile locations, ad accounts, …)
-- ---------------------------------------------------------------------------
CREATE TABLE integration_resources (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id  uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  kind           text NOT NULL,
  external_id    text NOT NULL,
  label          text NOT NULL DEFAULT '',
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, kind, external_id)
);

CREATE INDEX integration_resources_tenant_idx ON integration_resources (tenant_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['integration_oauth_states', 'integration_connections', 'integration_resources']
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
    'GRANT SELECT, INSERT, UPDATE, DELETE ON integration_oauth_states, integration_connections, integration_resources TO %I',
    app_role
  );
END
$$;
