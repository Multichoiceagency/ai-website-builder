-- ===========================================================================
-- 0019 — WhatsApp support desk + AI agents (OpenWA adapter behind the API).
-- ===========================================================================

CREATE TABLE whatsapp_agents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text NOT NULL DEFAULT '',
  system_prompt       text NOT NULL,
  welcome_message     text NOT NULL DEFAULT '',
  enabled             boolean NOT NULL DEFAULT true,
  auto_reply          boolean NOT NULL DEFAULT true,
  handoff_keywords    text[] NOT NULL DEFAULT '{}',
  openwa_session_id   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_agents_tenant_idx ON whatsapp_agents (tenant_id);

CREATE TRIGGER whatsapp_agents_set_updated_at BEFORE UPDATE ON whatsapp_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE whatsapp_tickets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id         uuid REFERENCES whatsapp_agents(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  contact_phone    text NOT NULL,
  contact_name     text NOT NULL DEFAULT '',
  chat_id          text NOT NULL,
  subject          text NOT NULL DEFAULT '',
  assigned_to      uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at  timestamptz,
  unread_count     integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chat_id)
);

CREATE INDEX whatsapp_tickets_tenant_status_idx ON whatsapp_tickets (tenant_id, status, last_message_at DESC);

CREATE TRIGGER whatsapp_tickets_set_updated_at BEFORE UPDATE ON whatsapp_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE whatsapp_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id     uuid NOT NULL REFERENCES whatsapp_tickets(id) ON DELETE CASCADE,
  direction     text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  author        text NOT NULL CHECK (author IN ('customer', 'agent', 'ai', 'system')),
  body          text NOT NULL,
  external_id   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_messages_ticket_idx ON whatsapp_messages (ticket_id, created_at);
CREATE INDEX whatsapp_messages_tenant_idx ON whatsapp_messages (tenant_id, created_at DESC);

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['whatsapp_agents', 'whatsapp_tickets', 'whatsapp_messages']
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

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_agents, whatsapp_tickets, whatsapp_messages TO %I',
    app_role
  );
END
$$;
