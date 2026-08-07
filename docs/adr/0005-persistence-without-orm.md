# ADR-0005 — postgres.js + repositories + plain SQL migrations

**Status:** accepted

## Context

We need row-level security, transaction-scoped session settings, JSONB documents,
and full control of indexes. Heavy ORMs abstract exactly those things away, and
their migration generators fight hand-written policy SQL.

We also have a rule from `common/patterns.md`: data access behind a repository
interface, and no raw SQL scattered through the codebase.

## Decision

- **Driver:** `postgres` (postgres.js) — tagged-template SQL with real parameter
  binding, first-class transactions, no query builder to learn.
- **Access:** repository modules under `src/db/repositories/`. SQL exists only
  there. Routes and services call repository functions, never `sql` directly.
- **Types:** repositories return values parsed through `packages/schemas`, so the
  database boundary is validated like any other boundary.
- **Migrations:** numbered `.sql` files in `src/db/migrations/`, applied in order
  by a small runner that records them in `schema_migrations` inside the same
  transaction as the migration itself. Forward-only.

`sql` from postgres.js escapes interpolated values as bind parameters, so
`sql\`select … where id = ${id}\`` is parameterised, not concatenated.

## Consequences

- RLS policies, partial indexes, generated columns and JSONB operators are all
  directly expressible.
- No generated-migration surprises; a migration is reviewable SQL.
- Cost: no automatic type generation from the schema. Mitigated by parsing every
  row through a Zod schema, which is stricter than generated types anyway.
- Repositories are the seam we would swap if we ever move a domain to another
  store.
