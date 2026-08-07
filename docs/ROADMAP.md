# MVP Roadmap

Phases follow the product spec. Each phase is delivered as **vertical slices** —
database, API, permissions, UI, tests and observability for one capability —
rather than "all models, then all APIs, then all UI".

Legend: ✅ done · 🚧 in progress · ⬜ not started

---

## Phase 1 — Foundation ✅

The runnable core: a tenant can sign in, own a site, edit a page out of the block
registry, publish it, and see it served by the storefront renderer.

| Item                                         | Status |
| -------------------------------------------- | ------ |
| Monorepo, workspaces, task graph              | ✅ |
| Architecture decision records                 | ✅ |
| Shared Zod contracts (`packages/schemas`)     | ✅ |
| RBAC model + permission engine                | ✅ |
| Universal block registry + 10 blocks          | ✅ |
| Motion system (presets, reduced-motion)       | ✅ |
| Design system: tokens + primitives + shell    | ✅ |
| PostgreSQL schema + RLS + migration runner    | ✅ |
| Sessions, password auth, membership resolution| ✅ |
| Core API: auth, tenants, sites, pages, publish, public read | ✅ |
| Typed event bus + audit log                   | ✅ |
| Nuxt dashboard (simple, task-first)           | ✅ |
| Nuxt storefront renderer (host → page → blocks)| ✅ |
| Docker Compose dev environment                | ✅ |
| Seed data                                     | ✅ |
| Tenant-isolation + API + registry tests       | ✅ |
| CI pipeline                                   | ✅ |

**Deliberately excluded from Phase 1:** AI generation, commerce, ads, tracking
destinations, apps, experiments. Their seams exist (adapters, tool registry,
event contracts, plan gating) but no implementation ships.

---

## Phase 2 — AI Website Builder ⬜

The first wow moment: *connect Google → choose business → generate site → publish.*

- Google OAuth via the Integration Gateway (platform-owned Cloud project)
- Business Profile import → normalized `BusinessProfile`
- Controlled crawler + content/brand extraction (`services/scraper-api`)
- Brand DNA extraction, stored separately from pages
- AI Gateway: model router, prompt registry, structured outputs, cost metering
- Site planner → page planner → block selection (budget-aware) → content
- Generation progress UI, preview, publish
- AI editor mode operating on proposals (ADR-0007)

## Phase 3 — SEO + Analytics ⬜

Search Console, GA4 connection, sitemap/robots/schema generation, technical
audit, keyword tracking, internal linking, SEO agent.

## Phase 4 — Tracking ⬜

`@platform/tracking` client SDK, server SDK, Nuxt plugin, first-party endpoint,
tracking gateway, consent engine, identity/attribution, GA4 + Google Ads
destinations, event debugger.

## Phase 5 — Commerce ⬜

Medusa behind the commerce adapter, products, checkout, orders, payments,
inventory, commerce dashboard, purchase server-side tracking.

## Phase 6 — Growth ⬜

Google Ads, Meta Ads, campaign drafts with preview-before-publish, attribution,
CRM, email, automations.

## Phase 7 — App Platform ⬜

App SDK, permission scopes, isolated runtime, webhooks, developer portal, private
apps, marketplace, review pipeline.

## Phase 8 — Optimization ⬜

Experiments, A/B/n, autonomous experimentation with guardrails, cohorts,
advanced attribution.

## Phase 9 — Agency / Enterprise ⬜

White label, agency hierarchy, dedicated deployments, SSO, SCIM, audit exports,
B2B.
