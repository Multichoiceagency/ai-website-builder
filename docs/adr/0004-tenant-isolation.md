# ADR-0004 — Two-layer tenant isolation (application + Postgres RLS)

**Status:** accepted

## Context

A cross-tenant data leak is the one bug that ends a SaaS platform. Application
level filtering (`WHERE tenant_id = $1`) is necessary but is one forgotten clause
away from disaster, and the forgotten clause is invisible in review.

## Decision

Both layers, always.

**Layer 1 — application.** Tenant context is resolved server-side: session →
user → membership → tenant. A tenant id from a header, body or query is only ever
used to *look up a membership*; it is never used directly as a filter value.
Every tenant-scoped repository function takes a transaction handle that has
already been bound to a tenant.

**Layer 2 — PostgreSQL row-level security.** Migrations run as the table owner
(`postgres`). Services connect as `app_user`, which owns nothing and is not
superuser, so RLS is enforced against it. Every tenant-scoped table has:

```sql
ALTER TABLE x ENABLE ROW LEVEL SECURITY;
CREATE POLICY x_tenant_isolation ON x
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

Each tenant-scoped request runs inside a transaction that begins with
`set_config('app.current_tenant', $1, true)`. `true` scopes it to the
transaction, so a pooled connection cannot carry tenant context into the next
request.

If `app.current_tenant` is unset, `current_setting(…, true)` returns NULL and the
policy matches nothing — the safe default is *zero rows*, not *all rows*.

## Consequences

- A missing `WHERE tenant_id` degrades to an empty result instead of a breach.
- Every tenant-scoped query must run in a transaction. Accepted: it also gives us
  atomic multi-table writes for free.
- Global tables (`users`, `sessions`, `organizations`) are deliberately not
  tenant-scoped and carry no RLS; access to them is guarded in the application.
- Verified by `services/core-api/test/tenant-isolation.test.ts`, which asserts the
  database itself refuses cross-tenant reads, updates and inserts.
