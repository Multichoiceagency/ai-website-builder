# Architecture Decision Records

Each ADR captures one decision, the forces behind it, and what it costs us.
Status is one of `accepted`, `superseded by NNNN`, `deprecated`.

| #                                              | Decision                                        | Status   |
| ---------------------------------------------- | ----------------------------------------------- | -------- |
| [0001](./0001-monorepo-and-workspaces.md)      | pnpm monorepo with Turborepo                     | accepted |
| [0002](./0002-schema-first-contracts.md)       | Zod schemas as the single cross-boundary contract| accepted |
| [0003](./0003-universal-block-registry.md)     | CMS stores block IDs + props, never code         | accepted |
| [0004](./0004-tenant-isolation.md)             | Two-layer tenant isolation (app + Postgres RLS)  | accepted |
| [0005](./0005-persistence-without-orm.md)      | postgres.js + repositories + SQL migrations      | accepted |
| [0006](./0006-adapters-for-vendors.md)         | Every vendor lives behind an adapter             | accepted |
| [0007](./0007-ai-mutation-safety.md)           | AI mutations are proposals, classified by risk   | accepted |
| [0008](./0008-event-transport.md)              | In-process typed event bus, swappable transport  | accepted |
| [0009](./0009-auth-sessions.md)                | Opaque server-side sessions in httpOnly cookies  | accepted |
| [0010](./0010-nuxt-layers-for-ui.md)           | UI and block renderers ship as Nuxt layers       | accepted |
| [0011](./0011-ai-gateway-metering.md)          | Persist AI gateway token/cost usage per tenant   | accepted |
