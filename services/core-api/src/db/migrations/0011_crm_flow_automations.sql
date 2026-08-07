-- ===========================================================================
-- 0011 — Link a compiled automation back to the e-mail flow it came from.
--
-- An e-mail flow (§30) is a stored definition; an automation (§31) is a stored
-- graph. There is one executor in this service and there should be, so
-- enabling a flow compiles it into an automation rather than a second runner
-- being written to the same specification. This column is that link.
--
-- It arrives as its own migration because 0006 had already been applied when
-- the flow compiler landed. Migrations are forward-only (ADR-0005): editing an
-- applied file changes what a *fresh* database gets and nothing else, which is
-- how a schema quietly diverges between development and production.
-- ===========================================================================

ALTER TABLE automations
  ADD COLUMN source_flow_id uuid REFERENCES email_flows(id) ON DELETE CASCADE;

COMMENT ON COLUMN automations.source_flow_id IS
  'Set when this automation is the compiled form of an e-mail flow. The flow stays the definition a user edits; this row is regenerated whenever the flow is enabled. Hand-built automations are NULL.';

-- One compiled automation per flow, so re-enabling replaces the graph rather
-- than leaving two automations firing on the same event.
CREATE UNIQUE INDEX automations_source_flow_idx
  ON automations (tenant_id, source_flow_id) WHERE source_flow_id IS NOT NULL;

-- No grants or policies needed: `automations` already carries both from 0006,
-- and neither is per-column.
