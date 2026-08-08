-- ===========================================================================
-- 0021 — Nango broker metadata on integration connections.
--
-- When broker = 'nango', tokens are fetched via Nango Auth/Proxy using
-- broker_connection_id. Native OAuth rows keep broker = 'native'.
-- ===========================================================================

ALTER TABLE integration_connections
  ADD COLUMN IF NOT EXISTS broker text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS broker_connection_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'integration_connections_broker_check'
  ) THEN
    ALTER TABLE integration_connections
      ADD CONSTRAINT integration_connections_broker_check
      CHECK (broker IN ('native', 'nango'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS integration_connections_broker_idx
  ON integration_connections (tenant_id, broker)
  WHERE broker_connection_id IS NOT NULL;
