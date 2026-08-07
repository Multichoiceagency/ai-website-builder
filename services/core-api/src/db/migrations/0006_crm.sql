-- ===========================================================================
-- 0006 — CRM, e-mail and automations (Phase 6a).
--
-- Three modules, one migration, because they share a spine: a contact is what
-- a lead becomes, what a deal belongs to, what a campaign sends to and what an
-- automation acts on. Splitting them would mean three migrations that cannot
-- be applied independently anyway.
--
-- Runs as the table owner. Every table here is tenant-scoped and therefore
-- gets row-level security plus an explicit grant to the runtime role
-- (ADR-0004) — `GRANT … ON ALL TABLES` in 0001 only covered the tables that
-- existed then.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Companies and contacts
-- ---------------------------------------------------------------------------

CREATE TABLE crm_companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  domain      text NOT NULL DEFAULT '',
  industry    text NOT NULL DEFAULT '',
  size        text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  website     text NOT NULL DEFAULT '',
  city        text NOT NULL DEFAULT '',
  country     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_companies_tenant_idx ON crm_companies (tenant_id, name);
CREATE TRIGGER crm_companies_set_updated_at BEFORE UPDATE ON crm_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A person. Deliberately few columns: every one of them is personal data we
-- have to be able to export and erase on request (§97), so the schema is the
-- first place data minimisation is either honoured or lost.
CREATE TABLE crm_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id   uuid REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name   text NOT NULL DEFAULT '',
  last_name    text NOT NULL DEFAULT '',
  email        text NOT NULL DEFAULT '',
  phone        text NOT NULL DEFAULT '',
  job_title    text NOT NULL DEFAULT '',
  source       text NOT NULL DEFAULT 'manual'
                 CHECK (source IN ('form', 'manual', 'import', 'checkout', 'chat', 'phone', 'campaign', 'api')),
  tags         text[] NOT NULL DEFAULT '{}',
  consent      jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_contacts_tenant_idx ON crm_contacts (tenant_id, created_at DESC);
CREATE INDEX crm_contacts_company_idx ON crm_contacts (company_id);
-- One row per person per workspace. Partial, because a contact captured from a
-- phone click legitimately has no e-mail address at all.
CREATE UNIQUE INDEX crm_contacts_tenant_email_idx
  ON crm_contacts (tenant_id, lower(email)) WHERE email <> '';
CREATE TRIGGER crm_contacts_set_updated_at BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Pipelines and stages
-- ---------------------------------------------------------------------------

CREATE TABLE crm_pipelines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_pipelines_tenant_idx ON crm_pipelines (tenant_id);
-- Exactly one default per workspace, enforced by the database rather than by
-- whichever code path happened to write last.
CREATE UNIQUE INDEX crm_pipelines_one_default_idx
  ON crm_pipelines (tenant_id) WHERE is_default;
CREATE TRIGGER crm_pipelines_set_updated_at BEFORE UPDATE ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE crm_pipeline_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id  uuid NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  key          text NOT NULL,
  name         text NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  -- Drives the weighted forecast. A won stage is 1, a lost stage is 0.
  probability  numeric(4, 3) NOT NULL DEFAULT 0.100 CHECK (probability >= 0 AND probability <= 1),
  is_won       boolean NOT NULL DEFAULT false,
  is_lost      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, key)
);

CREATE INDEX crm_pipeline_stages_pipeline_idx ON crm_pipeline_stages (pipeline_id, position);
CREATE INDEX crm_pipeline_stages_tenant_idx ON crm_pipeline_stages (tenant_id);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------

CREATE TABLE crm_leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id     uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id     uuid REFERENCES crm_companies(id) ON DELETE SET NULL,
  site_id        uuid REFERENCES sites(id) ON DELETE SET NULL,
  name           text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  phone          text NOT NULL DEFAULT '',
  message        text NOT NULL DEFAULT '',
  source         text NOT NULL DEFAULT 'form'
                   CHECK (source IN ('form', 'manual', 'import', 'checkout', 'chat', 'phone', 'campaign', 'api')),
  source_detail  text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'working', 'qualified', 'disqualified', 'converted')),
  score          integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  attribution    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Whatever else the form collected, stored as submitted. Never interpreted,
  -- so a tenant adding a field to their form cannot break ingestion.
  fields         jsonb NOT NULL DEFAULT '{}'::jsonb,
  qualified_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_leads_tenant_created_idx ON crm_leads (tenant_id, created_at DESC);
CREATE INDEX crm_leads_tenant_status_idx ON crm_leads (tenant_id, status);
CREATE INDEX crm_leads_contact_idx ON crm_leads (contact_id);
CREATE TRIGGER crm_leads_set_updated_at BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------

CREATE TABLE crm_deals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id        uuid NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  stage_id           uuid NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE RESTRICT,
  contact_id         uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id         uuid REFERENCES crm_companies(id) ON DELETE SET NULL,
  lead_id            uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  title              text NOT NULL,
  -- Minor units. A float euro amount multiplied by a stage probability is no
  -- longer the amount anyone typed.
  value_cents        bigint NOT NULL DEFAULT 0 CHECK (value_cents >= 0),
  currency           char(3) NOT NULL DEFAULT 'EUR',
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  expected_close_on  date,
  -- Time-in-stage is derived from this, so a move must always set it.
  stage_entered_at   timestamptz NOT NULL DEFAULT now(),
  closed_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_deals_tenant_status_idx ON crm_deals (tenant_id, status);
CREATE INDEX crm_deals_stage_idx ON crm_deals (stage_id);
CREATE INDEX crm_deals_contact_idx ON crm_deals (contact_id);
CREATE TRIGGER crm_deals_set_updated_at BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only stage history. The current time-in-stage lives on the deal; this
-- is what makes "how long does Proposal actually take?" answerable later.
CREATE TABLE crm_deal_stage_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id        uuid NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  from_stage_id  uuid REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id    uuid NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE CASCADE,
  -- Seconds spent in `from_stage_id`. NULL for the first entry.
  duration_seconds  integer,
  reason         text NOT NULL DEFAULT '',
  created_by     text NOT NULL DEFAULT 'system',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_deal_stage_events_deal_idx ON crm_deal_stage_events (deal_id, created_at DESC);
CREATE INDEX crm_deal_stage_events_tenant_idx ON crm_deal_stage_events (tenant_id);

-- ---------------------------------------------------------------------------
-- Activities, notes, tasks
-- ---------------------------------------------------------------------------

CREATE TABLE crm_activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id   uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id      uuid REFERENCES crm_deals(id) ON DELETE CASCADE,
  lead_id      uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  type         text NOT NULL DEFAULT 'note'
                 CHECK (type IN ('note', 'call', 'email', 'meeting', 'form', 'stage_change', 'system')),
  subject      text NOT NULL DEFAULT '',
  body         text NOT NULL DEFAULT '',
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by   text NOT NULL DEFAULT 'system',
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_activities_contact_idx ON crm_activities (contact_id, occurred_at DESC);
CREATE INDEX crm_activities_deal_idx ON crm_activities (deal_id, occurred_at DESC);
CREATE INDEX crm_activities_tenant_idx ON crm_activities (tenant_id, occurred_at DESC);

CREATE TABLE crm_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id  uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id     uuid REFERENCES crm_deals(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_by  text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_notes_contact_idx ON crm_notes (contact_id, created_at DESC);
CREATE INDEX crm_notes_deal_idx ON crm_notes (deal_id, created_at DESC);
CREATE INDEX crm_notes_tenant_idx ON crm_notes (tenant_id);
CREATE TRIGGER crm_notes_set_updated_at BEFORE UPDATE ON crm_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE crm_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id        uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id           uuid REFERENCES crm_deals(id) ON DELETE CASCADE,
  assignee_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  priority          text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  due_at            timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_tasks_tenant_status_idx ON crm_tasks (tenant_id, status, due_at);
CREATE INDEX crm_tasks_contact_idx ON crm_tasks (contact_id);
CREATE TRIGGER crm_tasks_set_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- E-mail
-- ---------------------------------------------------------------------------

CREATE TABLE email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key         text NOT NULL,
  name        text NOT NULL,
  subject     text NOT NULL,
  preheader   text NOT NULL DEFAULT '',
  body_html   text NOT NULL DEFAULT '',
  body_text   text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TRIGGER email_templates_set_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A segment stores its *definition*, never its members: a stored member list
-- is a snapshot, and a snapshot is the one thing a segment must not be.
CREATE TABLE email_segments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  definition   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_segments_tenant_idx ON email_segments (tenant_id, name);
CREATE TRIGGER email_segments_set_updated_at BEFORE UPDATE ON email_segments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE email_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id   uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  segment_id    uuid REFERENCES email_segments(id) ON DELETE SET NULL,
  name          text NOT NULL,
  subject       text NOT NULL,
  from_name     text NOT NULL DEFAULT '',
  from_email    text NOT NULL DEFAULT '',
  body_html     text NOT NULL DEFAULT '',
  body_text     text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  stats         jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_campaigns_tenant_idx ON email_campaigns (tenant_id, created_at DESC);
CREATE TRIGGER email_campaigns_set_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A flow is a stored definition, not code (§30): the steps live in `steps`, so
-- adding a win-back flow is a row, not a deploy.
CREATE TABLE email_flows (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key            text NOT NULL,
  kind           text NOT NULL
                   CHECK (kind IN ('abandoned_cart', 'post_purchase', 'win_back', 'review_request', 'lead_nurture')),
  name           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  enabled        boolean NOT NULL DEFAULT false,
  trigger_event  text NOT NULL DEFAULT '',
  steps          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TRIGGER email_flows_set_updated_at BEFORE UPDATE ON email_flows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Every send the platform attempted, successful or not. `idempotency_key` is
-- what stops a retry — of a campaign, of a flow step, of an automation node —
-- from being a second e-mail in someone's inbox.
CREATE TABLE email_messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id          uuid REFERENCES email_campaigns(id) ON DELETE SET NULL,
  flow_id              uuid REFERENCES email_flows(id) ON DELETE SET NULL,
  contact_id           uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  kind                 text NOT NULL DEFAULT 'transactional'
                         CHECK (kind IN ('campaign', 'transactional', 'flow', 'automation')),
  to_email             text NOT NULL,
  subject              text NOT NULL DEFAULT '',
  status               text NOT NULL DEFAULT 'queued'
                         CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider             text NOT NULL DEFAULT '',
  provider_message_id  text NOT NULL DEFAULT '',
  error                text NOT NULL DEFAULT '',
  idempotency_key      text NOT NULL DEFAULT '',
  sent_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_messages_tenant_created_idx ON email_messages (tenant_id, created_at DESC);
CREATE INDEX email_messages_campaign_idx ON email_messages (campaign_id);
CREATE INDEX email_messages_contact_idx ON email_messages (contact_id);
CREATE UNIQUE INDEX email_messages_idempotency_idx
  ON email_messages (tenant_id, idempotency_key) WHERE idempotency_key <> '';

-- ---------------------------------------------------------------------------
-- Automations
-- ---------------------------------------------------------------------------

CREATE TABLE automations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  trigger_event  text NOT NULL DEFAULT '',
  -- The whole node graph: trigger, condition, delay, branch, action. Validated
  -- against `automationGraphSchema` before it can be written.
  graph          jsonb NOT NULL DEFAULT '{}'::jsonb,
  version        integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX automations_tenant_idx ON automations (tenant_id, created_at DESC);
CREATE INDEX automations_trigger_idx ON automations (tenant_id, trigger_event) WHERE status = 'active';
CREATE TRIGGER automations_set_updated_at BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE automation_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  automation_id   uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'cancelled')),
  -- The de-duplication key. See the unique index below.
  trigger_key     text NOT NULL,
  trigger_event   text NOT NULL DEFAULT '',
  context         jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_node_id text,
  resume_at       timestamptz,
  error           text NOT NULL DEFAULT '',
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Idempotency, enforced by the database. The same trigger delivered twice —
-- a retried webhook, a redelivered event, a restarted process — finds the
-- existing run and resumes it instead of starting a second one and sending a
-- second e-mail.
CREATE UNIQUE INDEX automation_runs_trigger_idx
  ON automation_runs (tenant_id, automation_id, trigger_key);
CREATE INDEX automation_runs_resume_idx
  ON automation_runs (resume_at) WHERE status = 'waiting';
CREATE INDEX automation_runs_automation_idx ON automation_runs (automation_id, started_at DESC);
CREATE TRIGGER automation_runs_set_updated_at BEFORE UPDATE ON automation_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-node state. This is what makes a run resumable: a restart re-reads the
-- completed nodes and continues from the first one that has no row here, so an
-- already-dispatched action is never dispatched twice.
CREATE TABLE automation_node_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id       uuid NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  node_id      text NOT NULL,
  kind         text NOT NULL
                 CHECK (kind IN ('trigger', 'condition', 'delay', 'branch', 'action')),
  status       text NOT NULL CHECK (status IN ('completed', 'failed', 'skipped')),
  output       jsonb NOT NULL DEFAULT '{}'::jsonb,
  error        text NOT NULL DEFAULT '',
  finished_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, node_id)
);

CREATE INDEX automation_node_runs_run_idx ON automation_node_runs (run_id, finished_at);
CREATE INDEX automation_node_runs_tenant_idx ON automation_node_runs (tenant_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'crm_companies', 'crm_contacts', 'crm_pipelines', 'crm_pipeline_stages',
    'crm_leads', 'crm_deals', 'crm_deal_stage_events', 'crm_activities',
    'crm_notes', 'crm_tasks',
    'email_templates', 'email_segments', 'email_campaigns', 'email_flows', 'email_messages',
    'automations', 'automation_runs', 'automation_node_runs'
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
--
-- Granted per table rather than with `ON ALL TABLES`: a blanket re-grant would
-- also restore the UPDATE and DELETE on `audit_events` that 0001 deliberately
-- revoked.
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
    'crm_companies', 'crm_contacts', 'crm_pipelines', 'crm_pipeline_stages',
    'crm_leads', 'crm_deals', 'crm_deal_stage_events', 'crm_activities',
    'crm_notes', 'crm_tasks',
    'email_templates', 'email_segments', 'email_campaigns', 'email_flows', 'email_messages',
    'automations', 'automation_runs', 'automation_node_runs'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO %I', target, app_role);
  END LOOP;

  -- Stage history and per-node run state are evidence. The application appends
  -- and reads; it never rewrites what already happened.
  EXECUTE format('REVOKE UPDATE, DELETE ON crm_deal_stage_events FROM %I', app_role);
  EXECUTE format('REVOKE UPDATE ON automation_node_runs FROM %I', app_role);
END
$$;
