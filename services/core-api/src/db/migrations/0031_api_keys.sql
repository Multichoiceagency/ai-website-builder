-- ===========================================================================
-- 0031 — API keys: machine access to a tenant.
--
-- Sessions authenticate people; nothing authenticated a system. The agency
-- site, Contently and the CRM all need to call in without a browser, and
-- handing them a session cookie would give them a person's full rights forever.
--
-- A key belongs to one tenant and names the member who issued it. Its rights
-- are the intersection of that member's role and the key's own scopes, so a key
-- can never outlive or outrank the person behind it.
-- ===========================================================================

CREATE TABLE api_keys (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- The member whose rights bound this key. Deleting them revokes it.
  issued_by      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  -- Only the digest is stored, so a database read yields no usable key.
  token_hash     text NOT NULL UNIQUE,
  -- Leading characters, kept so a person can recognise a key in a list.
  token_prefix   text NOT NULL,
  scopes         jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_used_at   timestamptz,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_tenant_idx ON api_keys (tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX api_keys_hash_idx ON api_keys (token_hash);

CREATE TRIGGER api_keys_set_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
