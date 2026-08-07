# ADR-0001 — pnpm monorepo with Turborepo

**Status:** accepted

## Context

The platform spans frontends (dashboard, storefront, developer portal), Node
services, Python services, workers and a large body of shared contracts. Those
contracts change constantly in early phases. Splitting them across repositories
would mean versioning and publishing a package for every schema change, which
kills the iteration speed we need through Phase 1–4.

## Decision

One repository. `pnpm` workspaces for linking, `turbo` for task graph and
caching.

```
apps/ packages/ services/ workers/ infrastructure/ docs/
```

Workspace packages are consumed by name (`@platform/schemas`), never by relative
path across package boundaries. Cross-package relative imports are the main way
monorepos rot; the package name is the enforcement point.

TypeScript libraries compile with `tsc` to `dist/` and are consumed as built ESM.
This keeps every consumer — Node services, Nuxt, Vitest — on one resolution
story with no bundler-specific configuration.

## Consequences

- A schema change and its consumers land in one commit and one review.
- `turbo` gives us correct build ordering for free via `dependsOn: ["^build"]`.
- Cost: the repo will get large. Mitigated by strict package boundaries and by
  services being independently deployable (each has its own Dockerfile).
- Python services (`services/*-api` written in FastAPI) live in the same repo but
  are managed by their own tooling; `turbo` shells out to them.
