-- ===========================================================================
-- 0032 — AI builder: provider keys and build runs.
--
-- Phase 2 needs two things the platform did not have: somewhere for a tenant to
-- keep its own LLM provider keys, and a record of what the agent did with them.
--
-- Keys are BYOK: each tenant pays its own provider. They are stored encrypted
-- (AES-256-GCM, same helper as integration tokens) because a database read must
-- not yield a usable key. Unlike api_keys we cannot store a digest only — the
-- agent has to present the real key to the provider — so encryption, not
-- hashing, is the correct tool here.
--
-- Runs are kept for cost visibility and debugging. They hold no key material.
-- ===========================================================================

CREATE TABLE ai_provider_keys (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- The member who added the key, so it can be traced and revoked with them.
  added_by       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Matches PROVIDERS[].id in @platform/agent ('anthropic', 'openai', ...).
  provider_id    text NOT NULL,
  provider_name  text NOT NULL,
  -- AES-256-GCM ciphertext ('v1.<iv>.<tag>.<data>'), never the raw key.
  api_key_enc    text NOT NULL,
  -- Self-hosted or proxy endpoints (Ollama, OpenRouter, custom gateways).
  base_url       text,
  -- Comma-separated model overrides; NULL falls back to the built-in catalogue.
  models         text,
  enabled        boolean NOT NULL DEFAULT true,
  is_custom      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- One key per provider per tenant; adding a second replaces the first.
  UNIQUE (tenant_id, provider_id)
);

CREATE INDEX ai_provider_keys_tenant_enabled_idx
  ON ai_provider_keys (tenant_id, enabled);

-- ---------------------------------------------------------------------------

CREATE TABLE ai_build_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id        uuid REFERENCES sites(id) ON DELETE SET NULL,
  prompt         text NOT NULL,
  status         text NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running', 'done', 'failed', 'aborted')),
  -- Which provider actually served the run; the agent may fail over mid-run.
  provider_id    text,
  model_id       text,
  -- Token counts for cost attribution. The tenant pays its provider directly,
  -- so this is reporting, not billing.
  input_tokens   integer NOT NULL DEFAULT 0,
  output_tokens  integer NOT NULL DEFAULT 0,
  error          text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz
);

CREATE INDEX ai_build_runs_tenant_started_idx
  ON ai_build_runs (tenant_id, started_at DESC);
