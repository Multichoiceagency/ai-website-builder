-- ===========================================================================
-- 0003 — Server-side tracking: collection, consent, dedup, attribution,
--        delivery reporting (§22–§28).
--
-- Four tables, one job each:
--
--   tracking_events      the platform's own first-party store, and the dedup key
--   tracking_sessions    one visit, carrying the touch that started it
--   tracking_identities  one visitor, carrying first-touch and last-touch
--   tracking_deliveries  what every destination did with every event
--
-- Runs as the table owner; services connect as the app role, so every table
-- below gets row-level security (ADR-0004).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Events
--
-- `UNIQUE (tenant_id, event_id)` is the whole of event deduplication. The
-- browser generates the id once and both the client-side hit and its
-- server-side twin carry it, so whichever arrives second is rejected by the
-- database rather than counted twice (§25). The spec asks for a 24-hour
-- window; a permanent key is strictly stronger and has no window in which the
-- same id can be counted again.
-- ---------------------------------------------------------------------------

CREATE TABLE tracking_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id       uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  event_id      text NOT NULL,
  name          text NOT NULL,
  occurred_at   timestamptz NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  session_id    text NOT NULL,
  anonymous_id  text NOT NULL,
  user_id       text,
  -- The consent state at the moment of collection, stored with the event.
  -- A consent decision that is only in a log cannot be re-checked later.
  consent       jsonb NOT NULL DEFAULT '{}'::jsonb,
  context       jsonb NOT NULL DEFAULT '{}'::jsonb,
  value         numeric(16, 4),
  currency      text,
  properties    jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, event_id)
);

CREATE INDEX tracking_events_tenant_received_idx ON tracking_events (tenant_id, received_at DESC);
CREATE INDEX tracking_events_site_name_idx ON tracking_events (tenant_id, site_id, name, occurred_at DESC);
-- The attribution join: every conversion looks up its visitor's sessions.
CREATE INDEX tracking_events_visitor_idx ON tracking_events (tenant_id, anonymous_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Sessions
--
-- A session's attribution is fixed at the touch that started it. A later
-- pageview inside the same session arrives without UTMs and must not blank the
-- campaign that brought the visitor in — hence the "only fill what is empty"
-- upsert in the repository.
-- ---------------------------------------------------------------------------

CREATE TABLE tracking_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id        uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  session_id     text NOT NULL,
  anonymous_id   text NOT NULL,
  source         text NOT NULL DEFAULT '',
  medium         text NOT NULL DEFAULT '',
  campaign       text NOT NULL DEFAULT '',
  term           text NOT NULL DEFAULT '',
  content        text NOT NULL DEFAULT '',
  click_ids      jsonb NOT NULL DEFAULT '{}'::jsonb,
  landing_url    text NOT NULL DEFAULT '',
  referrer       text NOT NULL DEFAULT '',
  started_at     timestamptz NOT NULL,
  last_event_at  timestamptz NOT NULL,
  event_count    integer NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, session_id)
);

CREATE INDEX tracking_sessions_visitor_idx ON tracking_sessions (tenant_id, anonymous_id, started_at);

-- ---------------------------------------------------------------------------
-- Identities
--
-- Keyed on the tenant's anonymous id, not on (site, anonymous id): the
-- first-party cookie is already scoped to a hostname, and a visitor who
-- arrives on a campaign landing page and converts on the main site is one
-- visitor, not two. `first_*` is written once and never updated — that is what
-- makes first-touch attribution honest.
-- ---------------------------------------------------------------------------

CREATE TABLE tracking_identities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id            uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  anonymous_id       text NOT NULL,
  user_id            text,
  first_source       text NOT NULL DEFAULT '',
  first_medium       text NOT NULL DEFAULT '',
  first_campaign     text NOT NULL DEFAULT '',
  first_term         text NOT NULL DEFAULT '',
  first_content      text NOT NULL DEFAULT '',
  first_click_ids    jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_landing_url  text NOT NULL DEFAULT '',
  first_referrer     text NOT NULL DEFAULT '',
  first_seen_at      timestamptz NOT NULL,
  last_source        text NOT NULL DEFAULT '',
  last_medium        text NOT NULL DEFAULT '',
  last_campaign      text NOT NULL DEFAULT '',
  last_term          text NOT NULL DEFAULT '',
  last_content       text NOT NULL DEFAULT '',
  last_click_ids     jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_landing_url   text NOT NULL DEFAULT '',
  last_referrer      text NOT NULL DEFAULT '',
  last_seen_at       timestamptz NOT NULL,
  session_count      integer NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, anonymous_id)
);

CREATE INDEX tracking_identities_user_idx ON tracking_identities (tenant_id, user_id);

-- ---------------------------------------------------------------------------
-- Deliveries
--
-- One row per (event, destination). This is also the consent ledger: an event
-- that was withheld from Meta lands here as `skipped` with the reason, so
-- "why is this conversion missing" has an answer that is not a guess (§26,
-- §27).
-- ---------------------------------------------------------------------------

CREATE TABLE tracking_deliveries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tracking_event_id  uuid NOT NULL REFERENCES tracking_events(id) ON DELETE CASCADE,
  destination        text NOT NULL,
  status             text NOT NULL
                       CHECK (status IN ('delivered', 'failed', 'skipped', 'not_configured')),
  reason             text,
  latency_ms         integer,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tracking_deliveries_event_idx ON tracking_deliveries (tracking_event_id);
CREATE INDEX tracking_deliveries_report_idx ON tracking_deliveries (tenant_id, destination, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['tracking_events', 'tracking_sessions', 'tracking_identities', 'tracking_deliveries']
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
-- Events and deliveries are facts about the past: the application may insert
-- and (for retention) delete them, but never rewrite one. Sessions and
-- identities are running aggregates and are updated in place.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT, DELETE ON tracking_events, tracking_deliveries TO %I',
    app_role
  );
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON tracking_sessions, tracking_identities TO %I',
    app_role
  );
END
$$;
