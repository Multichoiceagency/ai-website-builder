# ADR-0012 — Model-authored code sections, sandboxed

**Status:** accepted
**Supersedes:** [ADR-0003](./0003-universal-block-registry.md) in part

## Context

ADR-0003 refused to let the model emit component source, and listed five reasons
it fails permanently. Those reasons have not become wrong. What changed is what
the product is being measured against.

The registry cannot reach a brief it has no block for. A brief naming a
video-background hero, a scroll-driven word-by-word reveal, an HLS-streamed CTA
band and a specific glass treatment needs four blocks that do not exist, and
growing the registry to cover every brief is unbounded work that lands after the
customer has gone elsewhere. Writing that page as code is genuinely easier, and
the products this is compared to do exactly that.

Decided 2026-08-31 by the product owner, over the objection recorded here.

## Decision

A page may contain **code sections** alongside registry blocks. A code section
is model-authored source, stored as source, rendered in isolation.

Registry blocks remain the default and the majority. A code section is what the
registry could not express, not the first thing reached for.

Every code section runs in the **MotionSites island mechanism that already
exists**: a first-party Vite build served from `/motionsites/islands/{id}/` and
rendered inside a sandboxed iframe. It does not execute in the tenant site's
document, and it cannot reach the tenant's session, DOM or cookies.

The page document still stores `{ block, props }`. For a code section the props
name the island; the source lives with the island, not in the page. A page
therefore remains a document that can be re-rendered, diffed and migrated, which
is the property ADR-0003 was protecting.

## Consequences accepted

ADR-0003's five failures, and what is true about each now:

1. **Content welded to one framework.** True for the code section itself. The
   page around it survives; the section does not. A framework change means
   re-authoring those sections, and the brief that produced them is what makes
   that possible — so the brief is stored with the section.
2. **Nothing re-renderable or migratable.** Contained to the section. The
   document is still blocks and props.
3. **Every AI edit an unbounded diff.** Real and unmitigated. A code section is
   reviewed as source or not at all. This is the cost that has no answer.
4. **Arbitrary code on our infrastructure.** Answered by the sandbox, and only
   by it. A code section that runs anywhere other than the island iframe
   reintroduces the risk this ADR claims to have handled. No exceptions —
   including "just this once for the header".
5. **Unknowable performance.** A code section carries no measured performance
   class, so it cannot be selected by budget the way a registry block can. It is
   excluded from `planSite`'s automatic selection and must be chosen
   deliberately.

## What this does not authorise

- Code in the tenant document or the tenant's own execution context.
- A code section replacing a registry block that already fits. The registry is
  still the first answer.
- Skipping review because a model wrote it. Consequence 3 stands: unreviewed
  model-authored source ships at the owner's risk, and that has to be visible in
  the product rather than implied here.
