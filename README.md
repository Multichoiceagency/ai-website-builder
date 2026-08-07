# AI Website, Commerce & Growth Platform

A multi-tenant business operating system: website builder, headless CMS,
commerce, SEO, ads, analytics, server-side tracking, CRM, email, automations
and an app marketplace — behind one dashboard.

> **Status: Phase 1 complete and running locally.**
> A tenant can sign in, own a site, compose pages from a universal block
> registry, publish them, and have them served by the storefront renderer.
> Phases 2–9 (AI generation, SEO, tracking, commerce, growth, apps) are
> designed and scoped, not built. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Quick start

```bash
cp .env.example .env     # fill in passwords + secrets (openssl rand -base64 32)
pnpm setup               # install → containers → build → migrate → seed
pnpm dev
```

| Surface    | URL                     |
| ---------- | ----------------------- |
| Dashboard  | http://localhost:3000   |
| Storefront | http://localhost:3001   |
| Core API   | http://localhost:4000   |

Full instructions, including running against a Postgres you already have:
[`docs/LOCAL-DEVELOPMENT.md`](docs/LOCAL-DEVELOPMENT.md).

---

## The three ideas the codebase is built on

**1. Content is data, not code.** A page is a list of `{ block, props }`. The
CMS never stores generated component source, so content survives framework
changes, AI edits are small and reviewable, and every block's performance cost
is known in advance. → [ADR-0003](docs/adr/0003-universal-block-registry.md)

**2. Tenant isolation is enforced twice.** Once in the application, once in
PostgreSQL row-level security with the services connected as a non-owner role.
A forgotten `WHERE tenant_id` returns zero rows instead of another customer's
data — and a test suite proves the database actually refuses.
→ [ADR-0004](docs/adr/0004-tenant-isolation.md)

**3. Every vendor sits behind an adapter.** Medusa, Google, Meta, Stripe,
Anthropic, the OAuth broker. A vendor's package name may appear in exactly one
place. That is what keeps "replace the commerce engine" a project rather than a
rewrite. → [ADR-0006](docs/adr/0006-adapters-for-vendors.md)

---

## Repository layout

```
apps/
  dashboard/        admin UI — Nuxt SPA
  storefront/       public renderer — Nuxt SSR
services/
  core-api/         Fastify: auth, tenants, sites, pages, publish, public read
packages/
  schemas/          every cross-boundary contract, in Zod
  blocks/           block definitions + registry (framework-agnostic)
  blocks-nuxt/      one Nuxt renderer per block id
  ui/               design tokens, primitives, app shell (Nuxt layer)
  motion/           motion presets, reduced-motion aware (Nuxt layer)
  permissions/      roles, plan limits, permission engine
infrastructure/
  docker/           local Postgres, Redis, MinIO
docs/
  ARCHITECTURE.md   the map
  adr/              decisions and what they cost
  ROADMAP.md        what is built and what comes next
```

---

## What Phase 1 actually delivers

- **Auth** — registration, sign-in, opaque server-side sessions in httpOnly
  cookies, scrypt password hashing with no native dependency
- **Tenancy** — organizations, tenants, memberships, nine built-in roles
  resolving to ~45 granular permissions, plan limits enforced server-side
- **CMS** — sites, themes, pages, draft/publish separation, revisions with
  restore, navigation, per-breakpoint section visibility
- **Block registry** — 13 blocks with Zod prop schemas, editor field
  descriptors, and measured performance/accessibility/mobile scores
- **Dashboard** — command centre, website and page management, a section editor
  whose forms are generated from block metadata, live theme editing
- **Storefront** — SSR rendering by hostname, theme as CSS custom properties,
  SEO metadata, `FAQPage` and `LocalBusiness` structured data
- **Platform plumbing** — typed domain events, append-only audit log,
  forward-only SQL migrations, one response envelope, one error handler

**45 tests** — 31 against the live API and database, 14 against the block
registry — including ten that attack the tenant boundary directly.

---

## Commands

```bash
pnpm dev            # all services
pnpm build          # build workspace packages
pnpm typecheck      # types across the monorepo
pnpm test           # full suite
pnpm db:migrate     # apply pending migrations
pnpm db:seed        # demo workspace + published site
pnpm db:reset       # drop → migrate → seed (destroys local data)
pnpm infra:up       # Postgres, Redis, MinIO
```

---

## Security posture

Secrets live in the environment and nowhere else; `.env` is gitignored and CI
fails if one is ever committed. Sessions are opaque and revocable. OAuth tokens
are stored server-side and never reach the browser. The audit log is
append-only — the application role has no `UPDATE` or `DELETE` on it. Agents
act through a permission-checked tool layer, never against the database, and
mutations are classified by risk with previews and confirmation gates
([ADR-0007](docs/adr/0007-ai-mutation-safety.md)).
