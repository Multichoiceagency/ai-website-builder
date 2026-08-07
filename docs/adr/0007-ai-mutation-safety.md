# ADR-0007 — AI mutations are proposals, classified by risk

**Status:** accepted

## Context

Agents will be able to edit pages, publish sites, create campaigns, change
budgets, delete products and alter permissions. An agent that can spend money or
destroy content without a gate is a liability, and "the model is usually right"
is not a control.

## Decision

Every AI-invocable capability is a **tool** with a declared schema, required
permission, and risk class. Agents never touch the database directly.

| Risk       | Examples                                              | Gate                                        |
| ---------- | ----------------------------------------------------- | ------------------------------------------- |
| **low**    | draft copy, rewrite text, suggest SEO, build a preview | runs automatically                          |
| **medium** | publish a page, create an email campaign, draft an ad  | explicit user confirmation                  |
| **high**   | raise ad spend, delete products, delete customer data, change billing or permissions | explicit confirmation + audit + rate limit |

Mutations are produced as a **proposal** — a typed diff against the draft
document — which the UI renders as before/after. Applying a proposal is a normal
authenticated write by the *user*, attributed to the agent in the audit log.

Autonomous mode (Advanced/Enterprise) narrows the gates for specific capabilities
only, and only within guardrails: budget ceilings, change-count limits, an
approval threshold, and automatic rollback. It is a per-tenant, per-capability
feature flag — never a global default.

Every mutating tool call writes an `audit_events` row: actor (user or agent),
tool, input digest, affected resource, outcome.

## Consequences

- The dangerous surface is enumerable: it is the tool registry, not "anything the
  model can type".
- Preview-before-apply is a product feature, not just a safety control.
- Cost: agents cannot take multi-step destructive shortcuts. Intended.
