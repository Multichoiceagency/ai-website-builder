-- ===========================================================================
-- 0009 — Experiments (Phase 8) and Agency / Enterprise (Phase 9).
--
-- Runs as the table owner. Services connect as the app role, so every
-- tenant-scoped table below gets row-level security (ADR-0004).
--
-- Two tables here are deliberately *not* tenant-scoped, for the same reason
-- `memberships` is not: they are what establishes cross-tenant context, so
-- they cannot themselves depend on it. Both are guarded in the application and
-- both are documented where they are defined.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Phase 8 — Experiments
-- ---------------------------------------------------------------------------

-- An experiment targets exactly one page. A variant is an alternate section
-- *document*, never alternate code (ADR-0003) — which is what keeps it
-- diffable, validatable against the block registry, and reversible.
CREATE TABLE experiments (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id                      uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id                      uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  name                         text NOT NULL,
  hypothesis                   text NOT NULL DEFAULT '',
  status                       text NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  target_metric                text NOT NULL DEFAULT 'conversion'
                                 CHECK (target_metric IN ('conversion', 'revenue')),
  -- Confidence and the sample gate are configuration, not constants: a
  -- pricing test and a headline test do not deserve the same bar.
  confidence_level             numeric(5, 4) NOT NULL DEFAULT 0.95
                                 CHECK (confidence_level >= 0.8 AND confidence_level <= 0.999),
  minimum_sample_per_variant   integer NOT NULL DEFAULT 200
                                 CHECK (minimum_sample_per_variant >= 1),
  traffic_allocation           integer NOT NULL DEFAULT 100
                                 CHECK (traffic_allocation BETWEEN 1 AND 100),
  currency                     char(3) NOT NULL DEFAULT 'EUR',

  -- Autonomous mode is a per-experiment flag, never a global default
  -- (ADR-0007). Guardrails are NOT NULL whenever it is on — enforced below.
  autonomous                   boolean NOT NULL DEFAULT false,
  guardrails                   jsonb,

  winning_variant_id           uuid,
  deployed_variant_id          uuid,
  -- The page revision captured immediately before a winner was deployed.
  -- Rollback is a copy of this, not a reconstruction.
  rollback_revision_id         uuid REFERENCES page_revisions(id) ON DELETE SET NULL,

  started_at                   timestamptz,
  ended_at                     timestamptz,
  deployed_at                  timestamptz,
  created_by                   text NOT NULL DEFAULT 'system',
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT experiments_autonomous_needs_guardrails
    CHECK (autonomous = false OR guardrails IS NOT NULL)
);

CREATE INDEX experiments_tenant_id_idx ON experiments (tenant_id);
CREATE INDEX experiments_page_id_idx ON experiments (page_id);
-- The visitor path filters on exactly this.
CREATE INDEX experiments_running_idx ON experiments (site_id, page_id) WHERE status = 'running';

CREATE TRIGGER experiments_set_updated_at BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE experiment_variants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  experiment_id  uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  key            text NOT NULL,
  name           text NOT NULL,
  is_control     boolean NOT NULL DEFAULT false,
  weight         integer NOT NULL DEFAULT 50 CHECK (weight BETWEEN 1 AND 1000),
  -- NULL on the control: the control *is* the live document.
  document       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, key)
);

CREATE INDEX experiment_variants_tenant_id_idx ON experiment_variants (tenant_id);
CREATE INDEX experiment_variants_experiment_id_idx ON experiment_variants (experiment_id);
-- Exactly one control per experiment. A test with two baselines has none.
CREATE UNIQUE INDEX experiment_variants_one_control_idx
  ON experiment_variants (experiment_id) WHERE is_control;

-- One row per visitor per experiment.
--
-- Assignment itself is a pure function of (experiment id, anonymous id), so
-- this table is not what decides which variant somebody sees — it is the
-- deduplicated exposure and conversion record the statistics are computed
-- from. Storing per-visitor revenue rather than a running total is what makes
-- an honest variance (and therefore an honest revenue test) possible at all.
CREATE TABLE experiment_assignments (
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  experiment_id  uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id     uuid NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  anonymous_id   text NOT NULL,
  revenue_cents  bigint NOT NULL DEFAULT 0 CHECK (revenue_cents >= 0),
  conversions    integer NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  converted_at   timestamptz,
  PRIMARY KEY (experiment_id, anonymous_id)
);

CREATE INDEX experiment_assignments_tenant_id_idx ON experiment_assignments (tenant_id);
CREATE INDEX experiment_assignments_variant_idx ON experiment_assignments (experiment_id, variant_id);

-- Kept after the experiment is archived. A result nobody can look up later was
-- an expensive way to change nothing.
CREATE TABLE experiment_learnings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  experiment_id  uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  hypothesis     text NOT NULL DEFAULT '',
  outcome        text NOT NULL CHECK (outcome IN ('winner', 'no_difference', 'inconclusive')),
  summary        text NOT NULL DEFAULT '',
  metrics        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX experiment_learnings_tenant_id_idx ON experiment_learnings (tenant_id);
CREATE INDEX experiment_learnings_experiment_idx ON experiment_learnings (experiment_id, created_at DESC);

-- Declared after `experiment_variants` exists so both directions can be
-- enforced without an ordering problem.
ALTER TABLE experiments
  ADD CONSTRAINT experiments_winning_variant_fk
    FOREIGN KEY (winning_variant_id) REFERENCES experiment_variants(id) ON DELETE SET NULL,
  ADD CONSTRAINT experiments_deployed_variant_fk
    FOREIGN KEY (deployed_variant_id) REFERENCES experiment_variants(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Phase 9 — Agency hierarchy
-- ---------------------------------------------------------------------------

-- `tenants` is a global table with no RLS (0001): resolving it is what
-- establishes tenant context. The hierarchy lives here for the same reason.
ALTER TABLE tenants
  ADD COLUMN is_agency         boolean NOT NULL DEFAULT false,
  ADD COLUMN parent_tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX tenants_parent_tenant_id_idx ON tenants (parent_tenant_id);

-- A tenant cannot own itself, and ownership is one level deep: an agency owns
-- clients, a client owns nobody. Deeper trees make "who can see this row?"
-- unanswerable at a glance, which is the same as unanswerable.
ALTER TABLE tenants
  ADD CONSTRAINT tenants_not_own_parent CHECK (parent_tenant_id IS DISTINCT FROM id);

-- One person's bounded right to act inside one client workspace.
--
-- Global and RLS-free, exactly like `memberships` and for exactly the same
-- reason: this table is consulted *before* any tenant context exists, so it
-- cannot be filtered by one. Owning a client grants nothing by itself — only
-- a live row here does, and every use of one is written to the client's own
-- audit log.
CREATE TABLE agency_memberships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              text NOT NULL DEFAULT 'marketer'
                      CHECK (role IN ('owner', 'admin', 'developer', 'marketer', 'seo_manager',
                                      'sales', 'content_editor', 'support', 'viewer')),
  reason            text NOT NULL DEFAULT '',
  granted_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Required. A grant that never ends is a membership nobody remembers making.
  expires_at        timestamptz NOT NULL,
  revoked_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_memberships_not_self CHECK (agency_tenant_id <> client_tenant_id)
);

-- At most one live grant per (client, user). Re-granting updates that row.
CREATE UNIQUE INDEX agency_memberships_live_idx
  ON agency_memberships (client_tenant_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX agency_memberships_agency_idx ON agency_memberships (agency_tenant_id);
CREATE INDEX agency_memberships_user_idx ON agency_memberships (user_id);

-- ---------------------------------------------------------------------------
-- Phase 9 — White label, SSO, SCIM (all tenant-scoped)
-- ---------------------------------------------------------------------------

CREATE TABLE white_label_settings (
  tenant_id               uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  brand_name              text,
  logo_url                text,
  favicon_url             text,
  color_primary           text NOT NULL DEFAULT '#1d4ed8',
  color_accent            text NOT NULL DEFAULT '#0f766e',
  custom_domain           text UNIQUE,
  hide_platform_branding  boolean NOT NULL DEFAULT false,
  support_email           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER white_label_settings_set_updated_at BEFORE UPDATE ON white_label_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One configuration per tenant. `config` holds only what the IdP publishes;
-- the OIDC client secret is a separate column that is never selected into a
-- response shape.
CREATE TABLE sso_configurations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  protocol       text NOT NULL CHECK (protocol IN ('saml', 'oidc')),
  enabled        boolean NOT NULL DEFAULT false,
  default_role   text NOT NULL DEFAULT 'viewer'
                   CHECK (default_role IN ('owner', 'admin', 'developer', 'marketer', 'seo_manager',
                                           'sales', 'content_editor', 'support', 'viewer')),
  config         jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_secret  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sso_configurations_tenant_id_idx ON sso_configurations (tenant_id);
CREATE TRIGGER sso_configurations_set_updated_at BEFORE UPDATE ON sso_configurations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- SHA-256 of the bearer token, exactly like `sessions.token_hash`. Reading
-- this table yields nothing that can provision a user.
CREATE TABLE scim_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'SCIM provisioning',
  token_hash    text NOT NULL UNIQUE,
  last_four     char(4) NOT NULL,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX scim_tokens_tenant_id_idx ON scim_tokens (tenant_id);

CREATE TABLE scim_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id   text NOT NULL,
  user_name     text NOT NULL,
  display_name  text,
  email         text NOT NULL,
  role          text NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('owner', 'admin', 'developer', 'marketer', 'seo_manager',
                                  'sales', 'content_editor', 'support', 'viewer')),
  active        boolean NOT NULL DEFAULT true,
  raw           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_id)
);

CREATE INDEX scim_users_tenant_id_idx ON scim_users (tenant_id);
CREATE INDEX scim_users_email_idx ON scim_users (tenant_id, email);
CREATE TRIGGER scim_users_set_updated_at BEFORE UPDATE ON scim_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'experiments',
    'experiment_variants',
    'experiment_assignments',
    'experiment_learnings',
    'white_label_settings',
    'sso_configurations',
    'scim_tokens',
    'scim_users'
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

  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', app_role);

  -- The blanket grant above re-grants everything, so the append-only guarantee
  -- from 0001 has to be re-asserted here or this migration would quietly undo it.
  EXECUTE format('REVOKE UPDATE, DELETE ON audit_events FROM %I', app_role);
END
$$;

-- ---------------------------------------------------------------------------
-- The two narrow cross-tenant reads this phase needs
--
-- Both follow the shape 0001 established for `resolve_site_by_host` and 0002
-- for the staff console: SECURITY DEFINER, ids and aggregates only, never
-- customer content, revoked from PUBLIC and granted to the app role alone. The
-- application checks authorization *before* calling either one.
-- ---------------------------------------------------------------------------

-- An agency listing its own clients needs counts from inside tenants it is not
-- bound to. Scoped by `parent_tenant_id`, so it can only ever describe tenants
-- this agency already owns, and returns no page, lead or customer data.
CREATE OR REPLACE FUNCTION agency_client_overview(p_agency uuid)
RETURNS TABLE (
  tenant_id     uuid,
  name          text,
  slug          text,
  plan          text,
  created_at    timestamptz,
  site_count    bigint,
  member_count  bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id, t.name, t.slug, t.plan, t.created_at,
    (SELECT count(*) FROM sites s WHERE s.tenant_id = t.id),
    (SELECT count(*) FROM memberships m WHERE m.tenant_id = t.id)
  FROM tenants t
  WHERE t.parent_tenant_id = p_agency
  ORDER BY t.created_at DESC
$$;

REVOKE ALL ON FUNCTION agency_client_overview(uuid) FROM PUBLIC;

-- A SCIM request arrives from an identity provider carrying a bearer token and
-- nothing else — no session, no tenant header — so resolving it is the same
-- chicken-and-egg problem as host → site. Returns a tenant id for a live token
-- only, and stamps `last_used_at` while it is there.
CREATE OR REPLACE FUNCTION resolve_scim_token(p_token_hash text)
RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE scim_tokens
  SET last_used_at = now()
  WHERE token_hash = p_token_hash AND revoked_at IS NULL
  RETURNING tenant_id
$$;

REVOKE ALL ON FUNCTION resolve_scim_token(text) FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  EXECUTE format('GRANT EXECUTE ON FUNCTION agency_client_overview(uuid) TO %I', app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION resolve_scim_token(text) TO %I', app_role);
END
$$;
