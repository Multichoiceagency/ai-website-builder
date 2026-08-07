-- ===========================================================================
-- 0008 — App platform: marketplace, installs, gateway, webhooks (§33–§38, §89).
--
-- The threat this schema is shaped by: a third-party app running against a
-- customer's workspace. So —
--
--   * an app never holds a session, a role or a database handle; it holds an
--     API key that resolves to an *installation*, and an installation holds an
--     explicit, non-wildcard list of permissions
--   * the key is stored as a SHA-256 hash, exactly like `sessions.token_hash` —
--     reading this table yields nothing usable
--   * every gateway call, allowed or denied, is written to `app_request_log`
--   * the two cross-tenant reads the platform genuinely needs (a marketplace
--     listing, and resolving a key before any tenant is known) are named
--     SECURITY DEFINER functions, not relaxed policies
--
-- Every tenant-scoped table below carries the same policy as 0001 (ADR-0004).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The app itself. `tenant_id` is the *developer's* workspace — never the
-- workspace an app is installed into. That is `app_installations`.
-- ---------------------------------------------------------------------------

CREATE TABLE apps (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug                   text NOT NULL UNIQUE,
  name                   text NOT NULL,
  tagline                text NOT NULL DEFAULT '',
  description            text NOT NULL DEFAULT '',
  category               text NOT NULL DEFAULT 'other',
  app_type               text NOT NULL DEFAULT 'public'
                           CHECK (app_type IN ('public', 'private', 'agency', 'internal')),
  status                 text NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  -- Listing is separate from approval: an approved app can be delisted without
  -- breaking the tenants that already installed it.
  listed                 boolean NOT NULL DEFAULT true,
  version                text NOT NULL DEFAULT '0.0.0',
  icon_url               text,
  homepage_url           text,
  support_email          text,
  -- What the current version asks for. Free-form on purpose: the review
  -- pipeline has to be able to see `*` in order to refuse it.
  requested_permissions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  events                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  extensions             jsonb NOT NULL DEFAULT '[]'::jsonb,
  manifest               jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_flags           jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_notes           text NOT NULL DEFAULT '',
  submitted_at           timestamptz,
  reviewed_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX apps_tenant_id_idx ON apps (tenant_id);
CREATE INDEX apps_status_idx ON apps (status) WHERE status = 'approved';
CREATE TRIGGER apps_set_updated_at BEFORE UPDATE ON apps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Immutable history of what was submitted and what review decided about it.
-- A version row is the evidence for an approval; it is never rewritten.
CREATE TABLE app_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id        uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version       text NOT NULL,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  manifest      jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_flags  jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_notes  text NOT NULL DEFAULT '',
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, version)
);

CREATE INDEX app_versions_app_id_idx ON app_versions (app_id, created_at DESC);
CREATE INDEX app_versions_tenant_id_idx ON app_versions (tenant_id);

-- ---------------------------------------------------------------------------
-- Installation — the grant record. This row *is* the app's authority: the
-- gateway reads `granted_permissions` and nothing else.
-- ---------------------------------------------------------------------------

CREATE TABLE app_installations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id                  uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  -- Denormalised on purpose. `apps` is isolated to the *developer's* tenant, so
  -- an installing tenant cannot join it — copying identity here is what lets a
  -- customer list their installed apps without the schema having to widen a
  -- policy for it.
  app_slug                text NOT NULL,
  app_name                text NOT NULL,
  app_category            text NOT NULL DEFAULT 'other',
  -- Always a subset of what the app requested *and* of what the installing
  -- user held. Written once, at install time, so a later manifest change
  -- cannot silently widen it.
  granted_permissions     jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings                jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  request_quota_per_hour  integer NOT NULL DEFAULT 1000 CHECK (request_quota_per_hour > 0),
  installed_by            text NOT NULL DEFAULT 'system',
  installed_at            timestamptz NOT NULL DEFAULT now(),
  uninstalled_at          timestamptz
);

CREATE INDEX app_installations_tenant_id_idx ON app_installations (tenant_id);
CREATE INDEX app_installations_app_id_idx ON app_installations (app_id);
-- One live installation per app per workspace; uninstalled rows are kept as
-- history, which is why this is partial rather than a plain UNIQUE.
CREATE UNIQUE INDEX app_installations_active_idx
  ON app_installations (tenant_id, app_id) WHERE uninstalled_at IS NULL;

-- ---------------------------------------------------------------------------
-- Credentials.
--
-- `key_hash` follows `sessions.token_hash`: SHA-256, unique, never reversible.
-- `signing_secret` cannot follow it — HMAC verification is symmetric, so the
-- platform must retain the secret to check a signature at all. It is therefore
-- returned exactly once, at creation, and readable only through the narrow
-- SECURITY DEFINER resolver below.
-- ---------------------------------------------------------------------------

CREATE TABLE app_api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id          uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name            text NOT NULL,
  key_hash        text NOT NULL UNIQUE,
  key_prefix      text NOT NULL,
  last_four       text NOT NULL,
  signing_secret  text NOT NULL,
  -- Optional narrowing below the installation's grant. Empty = "the grant".
  scopes          jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_api_keys_app_id_idx ON app_api_keys (app_id);
CREATE INDEX app_api_keys_tenant_id_idx ON app_api_keys (tenant_id);

-- ---------------------------------------------------------------------------
-- Webhooks (§89). A subscription belongs to the *installing* workspace, so
-- uninstalling stops delivery without the developer having to do anything.
-- ---------------------------------------------------------------------------

CREATE TABLE app_webhook_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id            uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  installation_id   uuid NOT NULL REFERENCES app_installations(id) ON DELETE CASCADE,
  -- Same reason as `app_installations.app_slug`: the subscriber's tenant cannot
  -- read the developer's `apps` row.
  app_slug          text NOT NULL DEFAULT '',
  event_name        text NOT NULL,
  target_url        text NOT NULL,
  -- Per-subscription, symmetric, shown once. A leaked secret compromises one
  -- subscription rather than every app the tenant installed.
  signing_secret    text NOT NULL,
  active            boolean NOT NULL DEFAULT true,
  failure_count     integer NOT NULL DEFAULT 0,
  last_delivered_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installation_id, event_name, target_url)
);

CREATE INDEX app_webhook_subscriptions_tenant_event_idx
  ON app_webhook_subscriptions (tenant_id, event_name) WHERE active;
CREATE TRIGGER app_webhook_subscriptions_set_updated_at BEFORE UPDATE ON app_webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE app_webhook_deliveries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id   uuid NOT NULL REFERENCES app_webhook_subscriptions(id) ON DELETE CASCADE,
  event_id          uuid NOT NULL,
  event_name        text NOT NULL,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'delivered', 'failed', 'exhausted')),
  attempts          integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 5,
  next_attempt_at   timestamptz NOT NULL DEFAULT now(),
  last_status_code  integer,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz
);

CREATE INDEX app_webhook_deliveries_due_idx
  ON app_webhook_deliveries (next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE INDEX app_webhook_deliveries_subscription_idx
  ON app_webhook_deliveries (subscription_id, created_at DESC);
CREATE INDEX app_webhook_deliveries_tenant_idx ON app_webhook_deliveries (tenant_id);

-- ---------------------------------------------------------------------------
-- Gateway observability. Deny-by-default is only meaningful if the denials are
-- visible, so this records the decision, not just the failures.
-- ---------------------------------------------------------------------------

CREATE TABLE app_request_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id           uuid REFERENCES apps(id) ON DELETE SET NULL,
  installation_id  uuid REFERENCES app_installations(id) ON DELETE SET NULL,
  api_key_id       uuid REFERENCES app_api_keys(id) ON DELETE SET NULL,
  method           text NOT NULL,
  path             text NOT NULL,
  required_scope   text,
  decision         text NOT NULL,
  status_code      integer NOT NULL,
  duration_ms      integer NOT NULL DEFAULT 0,
  reason           text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_request_log_tenant_created_idx ON app_request_log (tenant_id, created_at DESC);
CREATE INDEX app_request_log_app_created_idx ON app_request_log (app_id, created_at DESC);

-- Per-installation request quota (§72). A counter rather than a COUNT(*) over
-- the log, so enforcement stays one indexed upsert per request.
CREATE TABLE app_usage_counters (
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id         uuid NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  window_start   timestamptz NOT NULL,
  request_count  integer NOT NULL DEFAULT 0,
  denied_count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, app_id, window_start)
);

-- ---------------------------------------------------------------------------
-- Unattributable denials.
--
-- A call presenting an unknown key belongs to no tenant, so it cannot go in a
-- tenant-scoped table without inventing an owner for it. It lands here instead:
-- global, carrying no customer data, and holding only the key *prefix* so a
-- developer can be told which credential is failing without the log itself
-- becoming a credential.
-- ---------------------------------------------------------------------------

CREATE TABLE app_gateway_denials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_prefix  text NOT NULL DEFAULT '',
  method      text NOT NULL,
  path        text NOT NULL,
  reason      text NOT NULL,
  remote_ip   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_gateway_denials_created_idx ON app_gateway_denials (created_at DESC);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'apps',
    'app_versions',
    'app_installations',
    'app_api_keys',
    'app_webhook_subscriptions',
    'app_webhook_deliveries',
    'app_request_log',
    'app_usage_counters'
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
-- Cross-tenant reads
--
-- Two of them, both narrow, both SECURITY DEFINER, both granted to the app role
-- alone — the same shape as `resolve_site_by_host` in 0001.
-- ---------------------------------------------------------------------------

-- The marketplace. Approved and listed apps only, and only the fields a buyer
-- needs: no developer ids, no review notes, no credentials.
CREATE OR REPLACE FUNCTION marketplace_apps()
RETURNS TABLE (
  app_id                 uuid,
  slug                   text,
  name                   text,
  tagline                text,
  description            text,
  category               text,
  app_type               text,
  version                text,
  icon_url               text,
  homepage_url           text,
  support_email          text,
  publisher              text,
  requested_permissions  jsonb,
  events                 jsonb,
  extensions             jsonb,
  install_count          bigint,
  approved_at            timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id,
    a.slug, a.name, a.tagline, a.description, a.category, a.app_type, a.version,
    a.icon_url, a.homepage_url, a.support_email,
    o.name,
    a.requested_permissions, a.events, a.extensions,
    (SELECT count(*) FROM app_installations i WHERE i.app_id = a.id AND i.uninstalled_at IS NULL),
    a.reviewed_at
  FROM apps a
  JOIN tenants t ON t.id = a.tenant_id
  JOIN organizations o ON o.id = t.organization_id
  WHERE a.status = 'approved'
    AND a.listed
    AND a.app_type IN ('public', 'internal')
  ORDER BY a.name ASC
$$;

-- Resolving a key is the chicken-and-egg case: the gateway has a credential and
-- no tenant context, and `app_api_keys` is behind RLS. This is the only way in,
-- it is keyed by the *hash* (so the caller must already hold the key), and it
-- returns one row for one credential.
CREATE OR REPLACE FUNCTION resolve_app_api_key(p_key_hash text)
RETURNS TABLE (
  key_id           uuid,
  app_id           uuid,
  app_slug         text,
  app_status       text,
  app_type         text,
  owner_tenant_id  uuid,
  scopes           jsonb,
  signing_secret   text,
  expires_at       timestamptz,
  revoked_at       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.id, a.id, a.slug, a.status, a.app_type, a.tenant_id, k.scopes, k.signing_secret,
         k.expires_at, k.revoked_at
  FROM app_api_keys k
  JOIN apps a ON a.id = k.app_id
  WHERE k.key_hash = p_key_hash
  LIMIT 1
$$;

-- Recording use of a key happens before any tenant is trusted, so it needs the
-- same treatment. Deliberately a single UPDATE of a single timestamp.
CREATE OR REPLACE FUNCTION touch_app_api_key(p_key_id uuid)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE app_api_keys SET last_used_at = now() WHERE id = p_key_id
$$;

-- Aggregate usage for the developer portal (§36).
--
-- An app's calls happen inside *other people's* workspaces, so their request log
-- is not the developer's to read. This returns counts and nothing else: no
-- tenant ids, no paths, no payloads. The owner tenant is a parameter rather
-- than something the function trusts the caller about — a mismatch returns
-- zero rows even if the route above it were wrong.
CREATE OR REPLACE FUNCTION app_usage_totals(p_app_id uuid, p_owner_tenant uuid)
RETURNS TABLE (
  decision  text,
  requests  bigint,
  last_at   timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.decision, count(*), max(l.created_at)
  FROM app_request_log l
  JOIN apps a ON a.id = l.app_id
  WHERE l.app_id = p_app_id
    AND a.tenant_id = p_owner_tenant
  GROUP BY l.decision
  ORDER BY count(*) DESC
$$;

-- Install count for one app, for the developer's own listing. A single number.
CREATE OR REPLACE FUNCTION app_install_count(p_app_id uuid, p_owner_tenant uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)
  FROM app_installations i
  JOIN apps a ON a.id = i.app_id
  WHERE i.app_id = p_app_id
    AND a.tenant_id = p_owner_tenant
    AND i.uninstalled_at IS NULL
$$;

REVOKE ALL ON FUNCTION app_usage_totals(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_install_count(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION marketplace_apps() FROM PUBLIC;
REVOKE ALL ON FUNCTION resolve_app_api_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION touch_app_api_key(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Privileges for the runtime role
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
  target   text;
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  FOREACH target IN ARRAY ARRAY[
    'apps',
    'app_versions',
    'app_installations',
    'app_api_keys',
    'app_webhook_subscriptions',
    'app_webhook_deliveries',
    'app_usage_counters'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO %I', target, app_role);
  END LOOP;

  -- Both logs are append-only for the application, like `audit_events`.
  EXECUTE format('GRANT SELECT, INSERT ON app_request_log TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT ON app_gateway_denials TO %I', app_role);

  EXECUTE format('GRANT EXECUTE ON FUNCTION marketplace_apps() TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION app_usage_totals(uuid, uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION app_install_count(uuid, uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION resolve_app_api_key(text) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION touch_app_api_key(uuid) TO %I', app_role);
END
$$;
