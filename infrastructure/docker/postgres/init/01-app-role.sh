#!/bin/bash
# Creates the runtime database role.
#
# Migrations run as POSTGRES_USER (the table owner, which bypasses RLS).
# Every service connects as APP_DB_USER instead: it owns nothing and is not
# superuser, so row-level security is actually enforced against it. That split
# is the second half of ADR-0004 — without it, RLS policies are decoration.
#
# Runs once, on first initialisation of an empty data directory.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v app_user="$APP_DB_USER" \
  -v app_password="$APP_DB_PASSWORD" \
  -v db_name="$POSTGRES_DB" <<-'EOSQL'
	-- `format` quotes the identifier and the password literal correctly, and
	-- `\gexec` runs the generated statement. A DO block would not work here:
	-- psql does not substitute :variables inside dollar-quoted strings.
	SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
	WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
	\gexec

	-- Connect and read the schema. Table privileges are granted per migration,
	-- so a new table is unreachable until a migration deliberately exposes it.
	GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
	GRANT USAGE ON SCHEMA public TO :"app_user";
EOSQL

echo "app role '$APP_DB_USER' ready"
