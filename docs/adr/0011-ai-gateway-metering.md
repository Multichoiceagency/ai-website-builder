# ADR-0011 — AI gateway metering

**Status:** accepted

## Context

Every successful language-model call has a cost. Without a durable per-tenant
record of tokens and USD, plan limits and support investigations have nothing
to inspect. The gateway already returns `usage` on copy and revise results; that
value was not yet persisted.

## Decision

1. Persist usage in `ai_usage` (migration `0017_ai_usage.sql`) under the same
   RLS tenant isolation as every other tenant-scoped table (ADR-0004).
2. Call `recordAiUsage(tx, …)` **after** a successful `generateCopy` /
   `reviseCopy` (or equivalent) — never before the provider returns, and never
   when the call failed.
3. Keep prompt text behind `getPrompt` / `registerPrompt` so evals and metering
   share stable prompt ids rather than duplicated strings.

## Consequences

- Cost dashboards and plan enforcement can read one table.
- Append-only grants: the app role cannot update or delete metering rows.
- Call sites that forget to record usage under-count; wiring starts on the
  section revise path and expands as other features adopt the helper.
