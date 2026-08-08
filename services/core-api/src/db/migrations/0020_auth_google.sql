-- ===========================================================================
-- 0020 — Google Sign-In for dashboard auth (login + signup).
--
-- Separate from integration OAuth (Business Profile / Search Console). Auth
-- only needs openid/email/profile. password_hash becomes nullable so a Google
-- account can exist without a local password.
-- ===========================================================================

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_sub text;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;

-- In-flight Sign-In with Google (no tenant yet — user may be registering).
CREATE TABLE IF NOT EXISTS auth_oauth_states (
  state          text PRIMARY KEY,
  -- login | register
  mode           text NOT NULL CHECK (mode IN ('login', 'register')),
  code_verifier  text NOT NULL,
  redirect_to    text NOT NULL DEFAULT '/',
  -- Optional signup fields collected before redirect.
  organization_name text,
  display_name   text,
  consumed_at    timestamptz,
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_oauth_states_expires_idx
  ON auth_oauth_states (expires_at);

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON auth_oauth_states TO %I',
    app_role
  );
  -- users already granted; ensure UPDATE covers google_sub / nullable password.
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON users TO %I', app_role);
END
$$;
