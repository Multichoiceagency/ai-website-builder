-- ===========================================================================
-- 0007 — Ads: account connections, campaigns, conversion mapping, guardrails.
--
-- Runs as the table owner. Every table here is tenant-scoped and therefore
-- gets row-level security, because the service connects as a non-owner role
-- for which RLS is actually enforced (ADR-0004).
--
-- Campaign rows are deliberately *local* first: a campaign exists here with
-- status 'draft' and no external id until somebody explicitly publishes it.
-- Nothing in this schema can represent "an agent created a live campaign"
-- without a publish having happened (ADR-0007).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Account connections — one per tenant per network
-- ---------------------------------------------------------------------------

CREATE TABLE ads_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider              text NOT NULL CHECK (provider IN ('google_ads', 'meta_ads', 'google_business')),
  external_account_id   text,
  display_name          text,
  -- AES-256-GCM, keyed by a derivation of SESSION_SECRET. A database read
  -- yields no usable credential, and these columns are never selected into an
  -- API response (ADR-0009).
  access_token_enc      text,
  refresh_token_enc     text,
  token_expires_at      timestamptz,
  scopes                jsonb NOT NULL DEFAULT '[]'::jsonb,
  connected_by          text NOT NULL DEFAULT 'system',
  connected_at          timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

CREATE INDEX ads_connections_tenant_id_idx ON ads_connections (tenant_id);
CREATE TRIGGER ads_connections_set_updated_at BEFORE UPDATE ON ads_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

CREATE TABLE ad_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('google_ads', 'meta_ads')),
  account_id          text,
  -- Null until published. The presence of an external id is the single source
  -- of truth for "this exists on the network".
  external_id         text,
  name                text NOT NULL,
  objective           text NOT NULL DEFAULT 'leads'
                        CHECK (objective IN ('leads', 'calls', 'sales', 'traffic', 'awareness', 'app_installs')),
  channel             text NOT NULL DEFAULT 'search'
                        CHECK (channel IN ('search', 'performance_max', 'display', 'video', 'social', 'shopping')),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'ended', 'archived')),
  -- Documents rather than columns: an ad network's targeting model changes
  -- shape far more often than our table does, and every read is validated
  -- through a Zod schema anyway (ADR-0005).
  budget              jsonb NOT NULL DEFAULT '{}'::jsonb,
  bidding             jsonb NOT NULL DEFAULT '{}'::jsonb,
  geo_targets         jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ad_groups           jsonb NOT NULL DEFAULT '[]'::jsonb,
  extensions          jsonb NOT NULL DEFAULT '[]'::jsonb,
  conversion_events   jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions         jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings            jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date          date,
  end_date            date,
  landing_page_url    text NOT NULL DEFAULT '',
  -- 'ai' is permanent. A campaign an agent drafted stays identifiable as one
  -- for the rest of its life, which is what makes the audit log answerable.
  source              text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'imported')),
  created_by          text NOT NULL DEFAULT 'system',
  published_at        timestamptz,
  published_by        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- A published campaign must know where it lives, and a draft must not
  -- pretend to. Enforced by the database so no code path can produce a row
  -- that claims to be live on a network it was never sent to.
  CONSTRAINT ad_campaigns_draft_has_no_external_id
    CHECK (status <> 'draft' OR external_id IS NULL),
  CONSTRAINT ad_campaigns_external_id_implies_published_at
    CHECK (external_id IS NULL OR published_at IS NOT NULL)
);

CREATE INDEX ad_campaigns_tenant_id_idx ON ad_campaigns (tenant_id);
CREATE INDEX ad_campaigns_tenant_provider_status_idx ON ad_campaigns (tenant_id, provider, status);
CREATE UNIQUE INDEX ad_campaigns_external_id_idx
  ON ad_campaigns (tenant_id, provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE TRIGGER ad_campaigns_set_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Conversion tracking mapping
--
-- Our tracking event vocabulary (§18) on one side, the network's conversion
-- action on the other. This table is the reason tracking and ads are one
-- platform rather than two products.
-- ---------------------------------------------------------------------------

CREATE TABLE ads_conversion_mappings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider                 text NOT NULL CHECK (provider IN ('google_ads', 'meta_ads')),
  tracking_event           text NOT NULL,
  conversion_action_name   text NOT NULL,
  external_id              text,
  counting_mode            text NOT NULL DEFAULT 'every' CHECK (counting_mode IN ('every', 'one')),
  value_mode               text NOT NULL DEFAULT 'event_value'
                             CHECK (value_mode IN ('event_value', 'fixed', 'none')),
  fixed_value_minor        integer,
  currency                 text NOT NULL DEFAULT 'EUR',
  attribution_window_days  integer NOT NULL DEFAULT 30
                             CHECK (attribution_window_days BETWEEN 1 AND 90),
  is_primary               boolean NOT NULL DEFAULT true,
  enabled                  boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- One mapping per event per network. Two conversion actions fed by the same
  -- event is how a network ends up double-counting revenue.
  UNIQUE (tenant_id, provider, tracking_event)
);

CREATE INDEX ads_conversion_mappings_tenant_id_idx ON ads_conversion_mappings (tenant_id);
CREATE TRIGGER ads_conversion_mappings_set_updated_at BEFORE UPDATE ON ads_conversion_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Spend guardrails
--
-- The ceiling that applies to every budget change, whoever asks — user, agent
-- or installed app. Autonomous mode narrows gates; it never removes this one
-- (ADR-0007).
-- ---------------------------------------------------------------------------

CREATE TABLE ads_guardrails (
  tenant_id                    uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  currency                     text NOT NULL DEFAULT 'EUR',
  -- Minor units. Defaults are deliberately conservative: a new workspace should
  -- have to raise its own ceiling before it can spend serious money.
  max_daily_budget_minor       integer NOT NULL DEFAULT 500000,
  max_total_daily_budget_minor integer NOT NULL DEFAULT 2000000,
  max_increase_percent         integer NOT NULL DEFAULT 50 CHECK (max_increase_percent BETWEEN 0 AND 1000),
  autonomous_budget_changes    boolean NOT NULL DEFAULT false,
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER ads_guardrails_set_updated_at BEFORE UPDATE ON ads_guardrails
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['ads_connections', 'ad_campaigns', 'ads_conversion_mappings', 'ads_guardrails']
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
--
-- 0001's blanket grant only covered the tables that existed then, so every new
-- table has to grant explicitly. Forgetting this fails loudly at first use,
-- which is the right direction to fail in.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ads_connections, ad_campaigns, ads_conversion_mappings, ads_guardrails TO %I',
    app_role
  );
END
$$;
