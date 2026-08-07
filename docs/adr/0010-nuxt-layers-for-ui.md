# ADR-0010 — UI primitives and block renderers ship as Nuxt layers

**Status:** accepted

## Context

`packages/ui`, `packages/motion` and `packages/blocks-nuxt` contain Vue SFCs,
CSS tokens and composables shared by the dashboard, the storefront and the
developer portal. Publishing Vue components as a compiled library means a build
step, a bundler config, and broken HMR across package boundaries — a permanent
tax on the fastest-moving part of the codebase.

## Decision

Vue-facing packages are **Nuxt layers**: plain source directories with a
`nuxt.config.ts`, consumed via `extends`.

```ts
// apps/dashboard/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['../../packages/ui', '../../packages/blocks-nuxt'],
})
```

Nuxt auto-imports the layer's `components/`, `composables/` and `utils/`, applies
its CSS, and gives full HMR into the layer. No build step, no `dist/`.

Split of responsibility:

| Package                 | Contains                                              |
| ----------------------- | ----------------------------------------------------- |
| `packages/ui`           | design tokens, primitives (`Ui*`), app shell, motion CSS |
| `packages/blocks-nuxt`  | one renderer per block id (`Block*`) + `<BlockRenderer>` |
| `packages/blocks`       | framework-agnostic definitions and Zod schemas (TS, built) |

Framework-agnostic packages (`schemas`, `permissions`, `blocks`) stay plain TS
compiled with `tsc`, because Node services consume them too.

Primitives follow Radix's architecture — keyboard handling, focus management,
ARIA, escape and focus-trapping live in the primitive, so no feature ever
hand-rolls a dialog or a menu.

## Consequences

- Editing a primitive hot-reloads in the dashboard instantly.
- One component library serves dashboard and storefront without duplication.
- Cost: layers are a Nuxt concept, so a future React renderer needs its own
  distribution mechanism. That is fine — ADR-0003 already separates renderers
  from definitions, and the definitions are the portable part.
