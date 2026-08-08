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
| ffmpeg         | any     | `brew install ffmpeg` — required for media-library video → scroll-frame packs (`ffprobe` included) |

Video uploads auto-extract a capped PNG frame pack (~24 fps, max 120 frames from the first 5s, max 1080px wide) for `scroll-video-scrub-01` — the usual Apple-style scrub range (~90–150 frames). Without ffmpeg, the video still uploads but `frameStatus` becomes `failed` until you install it and hit **Retry frames** in Media.

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

Both dashboard and storefront are Progressive Web Apps (`@vite-pwa/nuxt`). In
Chrome/Edge on `localhost` (or HTTPS in prod): open DevTools → Application →
Manifest / Service Workers, then use **Install** from the address bar or the
in-app banner. Offline: the app shell and previously visited pages stay
available; live API writes still need a network. Regenerate icons with
`node scripts/generate-pwa-icons.mjs`.

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
registers `localhost` and `demo.localhost`; open **http://localhost:3001** (not
`127.0.0.1`, which used to miss the domain — both now alias to `localhost`).
Add other hosts in the `domains` table with `verified_at` set, or use
`http://{siteSlug}.localhost:3001` after mapping in `/etc/hosts`.

**Port already in use** — the compose file uses 5433/6380/9100 precisely to stay
out of the way of a local Postgres, Redis or MinIO. Change the `*_PORT`
variables in `.env` if they still clash.

**Google OAuth redirect URIs** — register both on the Google Cloud OAuth client
(Web application):

- `http://localhost:4000/api/v1/auth/google/callback` — dashboard Sign-In / Sign-Up
- `http://localhost:4000/api/v1/integrations/google/callback` — Business Profile /
  Search Console / Analytics connect

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally
`GOOGLE_AUTH_REDIRECT_URI` in `.env` (see `.env.example`).

**Nango (integrations OAuth broker)** — optional self-host for **Connectors**
(Google, Slack, Stripe, Shopify, HubSpot, Meta, …). Dashboard Sign-In still uses
direct Google OAuth. Generate an encryption key, then start:

```bash
openssl rand -base64 32   # NANGO_ENCRYPTION_KEY
pnpm infra:nango
# Dashboard: http://localhost:3003  · Connect UI: http://localhost:3009
```

In the Nango UI, create integrations whose unique keys match the catalog
(`google`, `slack`, `stripe`, … — see `.env.example`). Use the same Google OAuth
client for `google`. Set the environment webhook to
`http://localhost:4000/api/v1/integrations/nango/webhook`, copy the secret key
into `NANGO_SECRET_KEY`, and restart core-api. Connectors then open Nango Connect
links. Without `NANGO_SECRET_KEY` only legacy Google PKCE remains.

**Custom domains / DNS** — customers keep DNS at their registrar (or Cloudflare /
Google Cloud DNS). Settings → Domains shows A/CNAME + TXT records that point at
`PLATFORM_EDGE_HOSTNAME` / `PLATFORM_EDGE_IPV4`. The platform does not become
their nameserver in local/dev.

**WhatsApp / OpenWA** — optional gateway for CRM Support desk + AI agents
([OpenWA](https://github.com/rmyndharis/OpenWA)). First build is slow (clones
GitHub). Then set `OPENWA_BASE_URL=http://localhost:2785` and `OPENWA_API_KEY`
in `.env` and restart core-api.

```bash
pnpm infra:openwa
# Dashboard / Swagger: http://localhost:2785
# Webhook URL (per tenant):
#   http://localhost:4000/api/v1/crm/whatsapp/webhook?tenantId=<tenant-uuid>
```

Use a **dedicated** WhatsApp number only — unofficial clients can be banned.

---

## 9. CI

`.github/workflows/ci.yml` runs build, typecheck, migrations and the full test
suite against a throwaway Postgres, plus two guardrails: no committed `.env`,
and no vendor SDK imported outside its adapter (ADR-0006).

It expects three repository secrets — `CI_POSTGRES_PASSWORD`,
`CI_APP_DB_PASSWORD` and `CI_SESSION_SECRET`. They are throwaway values for an
ephemeral container, but they are secrets rather than literals in the workflow
so that no credential-shaped string is ever committed.
