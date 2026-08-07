# Local development

Everything runs on your machine. No cloud account, no API key, no external
service is required for Phase 1.

---

## 1. Prerequisites

| Tool           | Version | Notes                                          |
| -------------- | ------- | ---------------------------------------------- |
| Node           | ≥ 22    | `node -v`                                      |
| pnpm           | ≥ 10    | `corepack enable pnpm`                         |
| Docker         | any     | For Postgres, Redis and MinIO — see the alternative below if you already run Postgres locally |

---

## 2. First run

```bash
cp .env.example .env          # then fill in the passwords and secrets
pnpm setup                    # install → infra up → build → migrate → seed
```

`pnpm setup` is the whole thing: dependencies, containers, workspace build,
database migrations and demo data.

Generate the secrets rather than inventing them:

```bash
openssl rand -base64 32       # SESSION_SECRET
openssl rand -hex 16          # POSTGRES_PASSWORD, APP_DB_PASSWORD, S3_SECRET_KEY
```

`.env` is gitignored and must stay that way. Only `.env.example`, with
placeholder values, is ever committed.

---

## 3. Running

```bash
pnpm dev                      # everything, in parallel
```

Or one at a time:

```bash
pnpm --filter @platform/core-api dev      # http://localhost:4000
pnpm --filter @platform/dashboard dev     # http://localhost:3000
pnpm --filter @platform/storefront dev    # http://localhost:3001
```

| Surface     | URL                     | What it is                                   |
| ----------- | ----------------------- | -------------------------------------------- |
| Dashboard   | http://localhost:3000   | Admin. Sign in with the seeded account.      |
| Storefront  | http://localhost:3001   | The published site, rendered from block ids. |
| Core API    | http://localhost:4000   | `GET /health` to check it is up.             |
| MinIO       | http://localhost:9101   | Object storage console.                      |

The seed prints its demo credentials when it runs. Re-print them with
`pnpm db:seed` (it is idempotent) or read them at the top of
`services/core-api/src/seed.ts`.

---

## 4. Using a Postgres you already have

Docker is the documented default, but nothing depends on it. To use an existing
local Postgres instead:

1. Point `.env` at it — typically `POSTGRES_PORT=5432` and `POSTGRES_USER=<your
   superuser>`.
2. Create the database and the RLS-constrained runtime role:

```bash
createdb platform

psql -d platform -v ON_ERROR_STOP=1 \
  -v app_user="$APP_DB_USER" -v app_password="$APP_DB_PASSWORD" -v db_name=platform <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
SQL
```

3. `pnpm db:migrate && pnpm db:seed`.

**`app_user` must not be a superuser and must not own the tables.** Row-level
security is not enforced against an owner, so running the services as the owner
would silently disable half of the tenant isolation (ADR-0004). The test suite
asserts this — `tenant-isolation.test.ts` fails loudly if it is wrong.

---

## 5. Database commands

```bash
pnpm db:migrate     # apply pending migrations (forward-only)
pnpm db:seed        # demo workspace, site and three published pages
pnpm db:reset       # drop schema → migrate → seed  (destroys local data)
```

Migrations are numbered `.sql` files in
`services/core-api/src/db/migrations/`. To add one, create the next number and
run `pnpm db:migrate` — the runner records each file in `schema_migrations`
inside the same transaction as the migration itself.

---

## 6. Tests

```bash
pnpm test                                  # everything
pnpm --filter @platform/core-api test      # API + tenant isolation (needs the database)
pnpm --filter @platform/blocks test        # block registry (no database)
```

The API tests run against the real database and the real permission engine.
They create their own tenants with a random suffix and clean up after
themselves, so they are safe to run alongside your seeded data.

---

## 7. Where things live

```
apps/dashboard        admin UI (Nuxt, SPA — every page is behind auth)
apps/storefront       public renderer (Nuxt, SSR)
services/core-api     Fastify API: auth, tenants, sites, pages, publish
packages/schemas      every cross-boundary contract, in Zod
packages/blocks       block definitions + registry (framework-agnostic)
packages/blocks-nuxt  Nuxt renderer per block id
packages/ui           design tokens and primitives (Nuxt layer)
packages/motion       motion presets (Nuxt layer)
packages/permissions  roles, plan limits, the permission engine
infrastructure/       docker compose, CI
```

---

## 8. Common problems

**`Invalid environment configuration`** — a required variable is missing from
`.env`. The message names the variable; it never prints values.

**`password authentication failed for user "app_user"`** — `.env` and the
database disagree. Recreate the role with the password from `.env`, or
`pnpm infra:reset` to rebuild the container from scratch.

**Tenant isolation tests fail** — the service is connecting as the table owner.
Check `APP_DB_USER` in `.env` and confirm with:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_user';
--  expect: app_user | f | f
```

**Storefront returns 404** — no verified domain matches the hostname. The seed
registers `localhost` and `demo.localhost`; add others in the `domains` table
with `verified_at` set.

**Port already in use** — the compose file uses 5433/6380/9100 precisely to stay
out of the way of a local Postgres, Redis or MinIO. Change the `*_PORT`
variables in `.env` if they still clash.

---

## 9. CI

`.github/workflows/ci.yml` runs build, typecheck, migrations and the full test
suite against a throwaway Postgres, plus two guardrails: no committed `.env`,
and no vendor SDK imported outside its adapter (ADR-0006).

It expects three repository secrets — `CI_POSTGRES_PASSWORD`,
`CI_APP_DB_PASSWORD` and `CI_SESSION_SECRET`. They are throwaway values for an
ephemeral container, but they are secrets rather than literals in the workflow
so that no credential-shaped string is ever committed.
