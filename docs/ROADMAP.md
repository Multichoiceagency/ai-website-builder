# MVP Roadmap

Phases follow the product master prompt (§100). Each phase is delivered as
**vertical slices** — database, API, permissions, UI, tests and observability for
one capability — rather than "all models, then all APIs, then all UI".

Legend: ✅ done · 🚧 in progress · ⬜ not started · ░ shell only (nav + placeholder)

Source of truth for decisions: [`docs/adr/`](./adr/README.md) · map: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · handoff: [`MASTER.md`](./MASTER.md)

---

## Phase 1 — Foundation ✅

The runnable core: a tenant can sign in, own a site, edit a page out of the block
registry, publish it, and see it served by the storefront renderer.

| Item                                         | Status |
| -------------------------------------------- | ------ |
| Monorepo, workspaces, task graph              | ✅ |
| Architecture decision records (0001–0010)     | ✅ |
| Shared Zod contracts (`packages/schemas`)     | ✅ |
| RBAC model + permission engine                | ✅ |
| Universal block registry + Nuxt renderers     | ✅ |
| Motion system (presets, reduced-motion)       | ✅ |
| Design system: tokens + primitives + shell    | ✅ |
| PostgreSQL schema + RLS + migration runner    | ✅ |
| Sessions, password auth, membership resolution| ✅ |
| Core API: auth, tenants, sites, pages, publish, public read | ✅ |
| Typed event bus + audit log                   | ✅ |
| Nuxt dashboard (task-first)                   | ✅ |
| Nuxt storefront renderer (host → page → blocks)| ✅ |
| Docker Compose / local Postgres+Redis         | ✅ |
| Seed data                                     | ✅ |
| Tenant-isolation + API + registry tests       | ✅ |
| CI pipeline                                   | ✅ |

**Deliberately excluded from Phase 1:** fully autonomous Ads, Kafka, K8s, custom
commerce engine. Seams exist (adapters, event contracts, plan gating).

---

## Phase 2 — AI Website Builder 🚧

Wow moment target: *connect Google → choose business → generate site → publish.*

| Item | Status |
| ---- | ------ |
| Google OAuth + Business Profile import | 🚧 |
| Normalized `BusinessProfile` | ✅ |
| Controlled crawl / social discovery | 🚧 |
| Brand DNA + theme derivation (WCAG) | 🚧 |
| AI Gateway (router, prompts, metering) | 🚧 (`ai_usage` + prompt registry) |
| Site / page planner → budget-aware block selection | 🚧 |
| Onboarding UX (§80–85) | 🚧 (funnel shell + progress API; commerce/ads branches soft) |
| Visual + AI editor (proposals, ADR-0007) | 🚧 (sidebars open by default) |
| Motionsites islands + brief/codegen agents | 🚧 |
| Admin template registry | 🚧 |
| Insert panel fullscreen marketplace UX | ✅ |

---

## Phase 3 — SEO + Analytics 🚧

| Item | Status |
| ---- | ------ |
| SEO dashboard (audit, keywords, sitemap/robots) | 🚧 |
| Launch checklist UI | ✅ |
| Schema / LocalBusiness / FAQ generation | ⬜ |
| Search Console / GA4 connection | ⬜ |
| Keyword tracking + SEO agent | ⬜ |
| Post-publish SEO checklist in onboarding | ✅ |

---

## Phase 4 — Tracking 🚧

| Item | Status |
| ---- | ------ |
| `@platform/tracking` package seam | ✅ |
| Storefront Nuxt plugin (siteId+tenantId via runtimeConfig) | 🚧 |
| First-party gateway + consent + destinations | 🚧 |
| Event debugger UI | ░ |

---

## Phase 5 — Commerce 🚧

| Item | Status |
| ---- | ------ |
| Commerce adapter contract + Postgres provider | ✅ |
| Medusa adapter (behind contract) | 🚧 (gaps documented) |
| Products CRUD + Shopify-style product editor | 🚧 |
| Live product-card preview + card templates | ✅ |
| Product feeds (download + live public URLs + options) | 🚧 |
| **Ecommerce builder (separate module)** | ░ stub `/commerce/builder` — shop layouts / PDP / checkout chrome; not the website page editor |
| Collections / inventory / shipping / payments / taxes | ░ (settings panels real; list routes placeholders) |
| Checkout + orders + purchase tracking | ⬜ |

---

## Phase 6 — Growth 🚧

| Item | Status |
| ---- | ------ |
| Dashboard shells (Ads, Meta, Email, CRM, Automations) | ░ / 🚧 |
| WhatsApp support desk + AI agents (OpenWA adapter) | 🚧 |
| Campaign drafts with preview-before-publish | ⬜ |
| Attribution + CRM pipelines + email flows | ⬜ |

---

## Phase 7 — App Platform ⬜

App SDK package seam exists; marketplace, isolated runtime, review pipeline ⬜.

---

## Phase 8 — Optimization ⬜

Experiments nav shell ░; A/B/n engine ⬜.

---

## Phase 9 — Agency / Enterprise ⬜

Agency route seam; white-label / SSO / SCIM / dedicated infra ⬜.

---

## §107 checklist (first development task)

| # | Deliverable | Location / status |
| - | ----------- | ----------------- |
| 1 | Architecture decision records | `docs/adr/` ✅ |
| 2 | Monorepo structure | root workspaces ✅ |
| 3 | Database / domain model | migrations + `packages/schemas` ✅ |
| 4 | Tenant model | ADR-0004 + RLS ✅ |
| 5 | RBAC model | `packages/permissions` ✅ |
| 6 | Event architecture | ADR-0008 ✅ |
| 7 | Universal CMS block spec | ADR-0003 + `packages/blocks` ✅ |
| 8 | AI Gateway specification | in progress in `services/core-api` AI libs 🚧 |
| 9 | Integration Gateway specification | ADR-0006 + integrations routes 🚧 |
| 10 | Tracking event specification | `packages/tracking` + schemas 🚧 |
| 11 | Medusa adapter specification | `adapters/commerce/medusa.ts` 🚧 |
| 12 | App SDK specification | `packages/app-sdk` 🚧 |
| 13 | Infrastructure design | `infrastructure/` + LOCAL-DEVELOPMENT ✅ |
| 14 | MVP implementation roadmap | this file ✅ |
| 15 | API contracts Phase 1 | Zod + `/api/v1/*` ✅ |
| 16 | Initial Nuxt dashboard shell | `apps/dashboard` ✅ |
| 17 | Initial PostgreSQL migrations | `services/core-api` migrations ✅ |
| 18 | Docker Compose / local env | compose + Homebrew path ✅ |
| 19 | CI pipeline | repo CI ✅ |
| 20 | Local development documentation | `docs/LOCAL-DEVELOPMENT.md` ✅ |

**Verdict:** do **not** restart Phase 1. Continue vertical slices in Phases 2–5.
