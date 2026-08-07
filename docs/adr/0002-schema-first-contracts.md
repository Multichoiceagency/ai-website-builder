# ADR-0002 — Zod schemas as the single cross-boundary contract

**Status:** accepted

## Context

The same object (a page, a lead, a purchase event, a business profile) is touched
by an API, a worker, a Vue form, an AI structured output and eventually a public
API consumer. Declaring that shape five times guarantees drift, and drift in a
multi-tenant platform means data corruption rather than a type error.

We also need *runtime* validation, not just compile-time types: AI output,
webhook payloads, tracking events and third-party API responses are all
untrusted.

## Decision

`packages/schemas` owns every cross-boundary shape as a Zod schema. Types are
derived (`z.infer`), never hand-written.

Boundaries that must validate:

| Boundary                      | Validates            |
| ----------------------------- | -------------------- |
| HTTP request body/query/params| yes, before handler  |
| HTTP response                 | yes, in non-production; typed in production |
| Block props                   | yes, on save and on render |
| Tracking events               | yes, at the gateway  |
| AI structured output          | yes, with retry on mismatch |
| Webhooks in                   | yes, after signature check |

Zod (not JSON Schema by hand, not TypeBox) because we need the same object to
produce a validator, a TS type, a JSON Schema for AI tool contracts, and
human-readable error messages for form UIs.

## Consequences

- One place to change a shape; consumers fail to compile if they disagree.
- AI structured outputs get validated retries for free instead of `JSON.parse`
  and hope.
- Cost: schemas package is a hot spot for merge conflicts. Mitigated by splitting
  it per domain file (`cms.ts`, `events.ts`, `rbac.ts`, …) rather than one blob.
