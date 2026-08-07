# ADR-0003 — CMS stores block IDs + props, never generated code

**Status:** accepted

## Context

The obvious way to build an "AI website builder" is to have the model emit
component source and save it. It demos well and then fails permanently:

- content is welded to one framework and one version of it
- nothing can be re-rendered, re-themed or migrated
- every AI edit is an unbounded diff nobody can review
- generated code is arbitrary code executing on our infrastructure
- performance is unknowable, because nobody knows what the model wrote

## Decision

Pages are documents of `{ block: string, props: object, motion?: object }`.
`packages/blocks` holds framework-agnostic **definitions**: id, version,
category, Zod props schema, defaults, capabilities, industry/style metadata, and
measured performance / accessibility / mobile scores plus a performance class
(A–D).

Renderers are separate and per-framework — `packages/blocks-nuxt` today, a React
package later. A block id resolves to a renderer at render time.

AI selects from the registry and fills props. It cannot invent markup. The same
registry powers the visual editor's block picker, so AI and humans work from one
source of truth.

Escape hatch: curated **MotionSites React islands** via `motion-section-01`.
The page still stores only `{ block, props: { sectionId } }`. The renderer loads a
first-party Vite+React build from `/motionsites/islands/{sectionId}/` inside a
sandbox iframe (Tailwind, framer-motion, lucide-react, local video). Islands are
built and reviewed in `@platform/motionsites-islands` — models never write island
source into the CMS document. Class D + category `gallery` keeps them out of
`planSite` AI selection. A separate `custom-html` sanitised block remains a future
Advanced-tier option for free-form markup.

## Consequences

- Content survives framework changes; adding React means adding renderers.
- AI edits are small, diffable, previewable and reversible.
- Performance is a property of the registry, so "AI picked a heavy hero" is a
  scoring bug we can fix globally rather than a per-site accident.
- Cost: expressiveness is bounded by the registry. That is the trade we want —
  the registry grows deliberately, with budgets attached.
