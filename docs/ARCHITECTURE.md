# Platform Architecture

> One intelligent operating system for a business's online presence:
> website, store, SEO, ads, CRM, email, analytics, tracking, automations, apps.

This document is the map. Decisions live in [`docs/adr/`](./adr/README.md).
The Phase-1 delivery status lives in [`ROADMAP.md`](./ROADMAP.md).

---

## 1. Layering

The platform core owns identity, tenancy, content, permissions, AI orchestration,
tracking, analytics, apps, integrations and billing. Everything else — commerce
engines, ad networks, payment providers, AI models, OAuth brokers — sits **behind
an adapter** and must be replaceable without touching callers.

```
┌──────────────────────────────────────────────────────────────┐
│ apps/            dashboard · storefront · developer-portal   │
├──────────────────────────────────────────────────────────────┤
│ services/        core-api (gateway + core domains)           │
│                  ai-api · seo-api · ads-api · tracking-api   │
├──────────────────────────────────────────────────────────────┤
│ packages/        schemas · permissions · blocks · ui · motion │
│                  (shared contracts — the single source of    │
│                   truth for API, workers, frontends and AI)  │
├──────────────────────────────────────────────────────────────┤
│ adapters/        commerce · ads · payments · ai · integrations│
├──────────────────────────────────────────────────────────────┤
│ infrastructure/  postgres · redis · s3 · docker · ci          │
└──────────────────────────────────────────────────────────────┘
```

**Rule:** a vendor name (`medusa`, `google`, `stripe`, `anthropic`, `nango`) may
appear inside exactly one adapter package. If it leaks into a route handler, a
Vue component or a worker, the abstraction is wrong.

---

## 2. Schema-first

`packages/schemas` defines every cross-boundary object once, in Zod. It produces:

- runtime validation at every system boundary (HTTP in, HTTP out, queue, AI output)
- TypeScript types for services, workers and frontends
- JSON Schema for AI structured outputs and for the public API docs

No service re-declares a shape that already exists there.

```
packages/schemas
      │
      ├──▶ services/*      (validate requests, responses, events)
      ├──▶ apps/*          (typed API client, form validation)
      ├──▶ workers/*       (typed job payloads)
      └──▶ AI Gateway      (structured-output contracts)
```

---

## 3. Content model: block IDs, never generated code

The CMS stores **block references and props** — never generated component source.
That is what keeps content portable across renderers (Nuxt today, React/Astro
later) and what makes AI edits safe, diffable and reversible.

```jsonc
{
  "path": "/",
  "sections": [
    {
      "id": "sec_01",
      "block": "hero-split-01",     // → packages/blocks registry
      "props": { "headline": "…" }, // → validated by the block's Zod schema
      "motion": { "preset": "fade-up", "trigger": "viewport" }
    }
  ]
}
```

A block definition is framework-agnostic metadata + schema
(`packages/blocks`). Renderers are separate, per framework
(`packages/blocks-nuxt` today). Adding React later means adding renderers, not
migrating content.

Every block carries performance/accessibility/mobile scores and a performance
class (A–D). AI block selection is **budget-aware**: generated sites prefer
class A/B and only reach for C/D when the brand and the budget allow it.

---

## 4. Tenancy and isolation

Isolation is enforced in **two independent layers**, because one is never enough:

1. **Application layer** — every tenant-scoped repository takes a tenant id and
   filters on it. Tenant context is resolved server-side from the session; a
   tenant id supplied by the browser is only ever *validated against membership*,
   never trusted.
2. **Database layer** — PostgreSQL row-level security. Services connect as
   `app_user`, a non-owner role for which RLS is enforced. Each request opens a
   transaction and sets `app.current_tenant`; policies restrict every
   tenant-scoped table to that value. A missing/incorrect `WHERE tenant_id`
   returns zero rows instead of another tenant's data.

See [ADR-0004](./adr/0004-tenant-isolation.md). Tests in
`services/core-api/test/tenant-isolation.test.ts` assert the DB layer actually
blocks cross-tenant reads and writes.

---

## 5. Request path

```
browser ──▶ core-api
              │ 1. cookie → session → user            (packages/auth)
              │ 2. tenant slug/header → membership    (never trusted raw)
              │ 3. role → permission check            (packages/permissions)
              │ 4. BEGIN; set_config('app.current_tenant', …)
              │ 5. repository call (tenant-scoped SQL)
              │ 6. zod-validated response envelope
              ▼
           postgres (RLS enforced)
```

---

## 6. Editing modes

The same page document backs all three modes described in the product spec:

| Mode     | Writes                                        | Audience   |
| -------- | --------------------------------------------- | ---------- |
| Visual   | section props via the editor UI               | everyone   |
| AI       | a **proposed mutation** the user accepts       | everyone   |
| Advanced | tokens, custom props, custom blocks           | developers |

AI never writes straight to a published page. It produces a mutation against the
draft, which is previewed and confirmed. Publishing is an explicit, audited act
(`docs/adr/0007-ai-mutation-safety.md`).

---

## 7. Draft / publish

Pages carry two documents: `sections` (draft) and `published_sections` (live).

```
edit ──▶ draft ──▶ preview ──▶ publish ──▶ published_sections + revision + audit event
                                   │
                                   └─▶ page.published event ─▶ revalidate ─▶ CDN purge
```

Every publish snapshots a revision, so rollback is a copy, not a reconstruction.

---

## 8. Events

Domain events are the integration seam between modules. Analytics, tracking,
CRM, SEO, automations, email and apps all consume the same typed stream
(`packages/schemas/src/events.ts`) rather than calling each other directly.

Phase 1 records events into `audit_events` and dispatches in-process. The
transport is deliberately swappable (Redis Streams / NATS) — see
[ADR-0008](./adr/0008-event-transport.md). Kafka is explicitly out of scope
until real scale demands it.

---

## 9. What Phase 1 deliberately does not build

Kubernetes, a custom commerce engine, multiple payment providers, an app
marketplace, autonomous ads, or a data warehouse. The seams for all of them
exist (adapters, event bus, permission scopes, plan gating); the implementations
wait for the phase that needs them.
