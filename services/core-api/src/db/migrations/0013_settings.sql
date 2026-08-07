-- ===========================================================================
-- 0013 — Settings: platform settings, commerce settings, team invitations,
--        API keys, webhook endpoints and data requests (§39, §58–§62, §97/§98).
--
-- Two shapes, deliberately:
--
--   * `settings_documents` — one JSONB value per `(tenant, scope, key)`. Every
--     settings section whose content is a *document* lives here, validated on
--     read and write by its Zod schema in `packages/schemas/src/settings.ts`.
--     Adding a field to a section is a schema default, not a migration.
--
--   * dedicated tables — used only where rows have identity that outlives the
--     document: an invitation is accepted, a key is revoked, a webhook has a
--     delivery history. Those cannot be array elements in a blob.
--
-- Credentials never live in either. `settings_secrets` holds AES-256-GCM
-- ciphertext plus a masked hint, and nothing reads the plaintext except the
-- adapter that needs it. The API has no code path that returns it (ADR-0009).
--
-- Numbering note: 0011 and 0012 were taken by concurrent work, so this file is
-- 0013. The runner applies files in filename order, and the gaps are harmless.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Settings documents
-- ---------------------------------------------------------------------------

CREATE TABLE settings_documents (
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- `platform` or `commerce`. Kept as text rather than an enum so a new scope
  -- is a schema change in one place instead of two.
  scope       text NOT NULL CHECK (scope IN ('platform', 'commerce')),
  key         text NOT NULL CHECK (key ~ '^[a-z][a-z0-9-]{1,40}$'),
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by  text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, scope, key)
);

CREATE TRIGGER settings_documents_set_updated_at BEFORE UPDATE ON settings_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Credentials
--
-- One row per credential field. Splitting them means rotating a webhook secret
-- does not require re-submitting the API key, and a decrypt failure is scoped
-- to the one field that is corrupt.
-- ---------------------------------------------------------------------------

CREATE TABLE settings_secrets (
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope            text NOT NULL CHECK (scope IN ('platform', 'commerce')),
  key              text NOT NULL,
  field            text NOT NULL,
  -- `v1.<iv>.<tag>.<ciphertext>` — see src/lib/integrations/crypto.ts.
  value_encrypted  text NOT NULL,
  -- `sk_live_****4242`. Enough to recognise, never enough to reconstruct.
  hint             text NOT NULL DEFAULT '',
  updated_by       text NOT NULL DEFAULT 'system',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, scope, key, field)
);

CREATE TRIGGER settings_secrets_set_updated_at BEFORE UPDATE ON settings_secrets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Team invitations
--
-- The token is stored hashed, exactly like a session (ADR-0009): a database
-- read yields no usable invitation link.
-- ---------------------------------------------------------------------------

CREATE TABLE settings_invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL
                 CHECK (role IN ('owner', 'admin', 'developer', 'marketer', 'seo_manager',
                                 'sales', 'content_editor', 'support', 'viewer')),
  token_hash   text NOT NULL UNIQUE,
  invited_by   text NOT NULL DEFAULT '',
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settings_invitations_tenant_idx ON settings_invitations (tenant_id, created_at DESC);
-- One live invitation per address per workspace; re-inviting replaces it.
CREATE UNIQUE INDEX settings_invitations_pending_idx
  ON settings_invitations (tenant_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- API keys (§61)
--
-- Same posture as sessions: only the SHA-256 hash is stored, so the plaintext
-- key exists exactly once — in the creation response.
-- ---------------------------------------------------------------------------

CREATE TABLE settings_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  token_hash    text NOT NULL UNIQUE,
  -- `pk_live_****a91f`, for recognising a key in a list.
  hint          text NOT NULL,
  scopes        text[] NOT NULL DEFAULT '{}',
  created_by    text NOT NULL DEFAULT '',
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settings_api_keys_tenant_idx ON settings_api_keys (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Webhook endpoints and their delivery log (§62)
-- ---------------------------------------------------------------------------

CREATE TABLE settings_webhook_endpoints (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url               text NOT NULL,
  events            text[] NOT NULL DEFAULT '{}',
  active            boolean NOT NULL DEFAULT true,
  -- The HMAC signing secret, encrypted. Receivers get it once, at creation or
  -- rotation; it is never readable afterwards.
  secret_encrypted  text NOT NULL,
  secret_hint       text NOT NULL DEFAULT '',
  last_delivery_at  timestamptz,
  last_status       integer,
  created_by        text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, url)
);

CREATE INDEX settings_webhook_endpoints_tenant_idx ON settings_webhook_endpoints (tenant_id);

CREATE TRIGGER settings_webhook_endpoints_set_updated_at BEFORE UPDATE ON settings_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE settings_webhook_deliveries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id  uuid NOT NULL REFERENCES settings_webhook_endpoints(id) ON DELETE CASCADE,
  event        text NOT NULL,
  status_code  integer,
  error        text,
  duration_ms  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settings_webhook_deliveries_endpoint_idx
  ON settings_webhook_deliveries (endpoint_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Data export and deletion requests (§97, §98)
--
-- Workspace deletion is *scheduled*, never immediate. A deletion that takes
-- effect on submit has no undo, and the mistake it protects against — deleting
-- the wrong workspace — is exactly the one people make.
-- ---------------------------------------------------------------------------

CREATE TABLE settings_data_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('export', 'workspace_deletion')),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'ready', 'cancelled', 'completed')),
  requested_by   text NOT NULL DEFAULT '',
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for  timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX settings_data_requests_tenant_idx ON settings_data_requests (tenant_id, created_at DESC);
-- At most one live deletion request per workspace.
CREATE UNIQUE INDEX settings_data_requests_open_deletion_idx
  ON settings_data_requests (tenant_id)
  WHERE kind = 'workspace_deletion' AND status = 'pending';

-- ---------------------------------------------------------------------------
-- Row-level security (ADR-0004)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'settings_documents',
    'settings_secrets',
    'settings_invitations',
    'settings_api_keys',
    'settings_webhook_endpoints',
    'settings_webhook_deliveries',
    'settings_data_requests'
  ]
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
    'GRANT SELECT, INSERT, UPDATE, DELETE ON
       settings_documents,
       settings_secrets,
       settings_invitations,
       settings_api_keys,
       settings_webhook_endpoints,
       settings_webhook_deliveries,
       settings_data_requests
     TO %I',
    app_role
  );

  -- The delivery log is evidence, like the audit log: append-only for the app.
  EXECUTE format('REVOKE UPDATE, DELETE ON settings_webhook_deliveries FROM %I', app_role);
END
$$;
