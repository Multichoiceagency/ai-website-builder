# `@platform/registry`

The component registry: a generated manifest of every installable component, and
the CLI that installs one.

## Install time is not runtime

This is the single most important thing about this package.

"Download a component directly into the builder" is implemented on the **shadcn
model**, and deliberately not on the model the phrase suggests:

| | What happens | When | What moves |
| --- | --- | --- | --- |
| **Install** | `pnpm registry:add <id>` copies a component's **source** into this repository | build time, by a developer | files, into git |
| **Enable** | a tenant switches on an entry that is already installed | runtime, by a user | one id, into a table |

Installing produces a diff. The vendored component is reviewed, type-checked,
committed and versioned like any other code in the repo, and `pnpm --filter
@platform/blocks test` proves it satisfies the block contract before it can ship.

Enabling moves no code at all.

**What this package deliberately does not do** is fetch component source over the
network at runtime and execute it. That would mean running arbitrary code on our
infrastructure and inside customer sites, it would make performance and
accessibility unknowable, and it would break ADR-0003 (the CMS stores block ids
and props, never generated code) and §35 of the product spec. If a requirement
arrives that sounds like "let users download components into the live builder",
this is that requirement, already satisfied — do not build the other one.

## Commands

```bash
pnpm registry:list                       # every collection and entry
pnpm registry:list --collection=motion   # one collection
pnpm registry:list --tag=scroll          # one tag
pnpm registry:list --json                # the manifest itself

pnpm registry:info hero-aurora-01        # description, scores, licence, files
pnpm registry:add  blog-card-grid-01     # vendor the source into the repo
pnpm registry:add  blog-card-grid-01 --dry-run
pnpm registry:verify                     # manifest ↔ renderers ↔ files agree
```

`list`, `info` and `verify` need `packages/blocks` built:

```bash
pnpm --filter @platform/blocks build
```

The CLI is plain Node with **no dependencies** and no build step of its own.

## What `add` does

For `pnpm registry:add blog-card-grid-01`:

1. writes `packages/blocks/src/collections/vendor/blog-card-grid-01.ts`
   — the framework-agnostic definition
2. writes `packages/blocks-nuxt/components/Block/BlogCardGrid01.vue`
   — the Nuxt renderer
3. registers the definition in `packages/blocks/src/collections/vendor/index.ts`
4. registers the renderer in `packages/blocks-nuxt/components/Block/Renderer.vue`

Steps 3 and 4 are done by inserting a line at an anchor comment
(`// registry:imports:end`, `// registry:blocks:end`,
`// registry:renderers:end`). **Those comments are load-bearing** — the CLI fails
loudly rather than guessing if one is missing.

Then:

```bash
pnpm --filter @platform/blocks build
pnpm --filter @platform/blocks test
git diff
```

`add` refuses to overwrite an installed component unless you pass `--force`.

## The manifest is generated

`src/manifest.mjs` builds the manifest from three live sources:

- the registered block definitions (`@platform/blocks` → `listBlockMetadata()`)
- the Nuxt renderer map, parsed out of `Renderer.vue`
- the definition file each block id is actually declared in, found by search

Nothing is hand-maintained, so the manifest cannot claim a component that is not
registered, or a file that does not exist. `pnpm registry:verify` asserts exactly
that, and `packages/blocks/src/collections.test.ts` asserts the same invariants
in CI.

Shapes live in `@platform/schemas` (`registryManifestSchema`,
`registryEntrySchema`, `registryCollectionSchema`, `tenantRegistryEntrySchema`).
The manifest is validated against them when `@platform/schemas` has been built.

## Collections

| Collection | Direction | Design vocabulary |
| --- | --- | --- |
| `core` | Clean, trustworthy, unfashionable on purpose | written here from scratch |
| `motion` | Cinematic, deliberate, editorial pacing | Scrollytelling tradition |
| `showcase` | Modern SaaS marketing | Marketing-primitive vocabulary |
| `editorial` | Loud, typographic, high contrast | Brutalist-editorial tradition |
| `spotlight` | Dark, luminous, expensive-feeling | Pointer-lit gradient effects |

"Design vocabulary" means the vocabulary of effects, not the code. Collections
are deliberately named for what they *are*, never after a third-party product —
borrowing a product's name implies derivation or endorsement even when the code
is entirely ours. Every block is an original implementation written against our
own block contract, our own motion layer and our own design tokens; no
third-party component source is vendored or redistributed. Each collection
carries a `licence` string that says so, and it travels with the entry into the
dashboard.

## Performance classes

| Class | Means | Score envelope |
| --- | --- | --- |
| A | static markup, entrance motion only | performance 95–100 |
| B | hover effects, small JS, CSS loops | 88–96 |
| C | scroll-linked, pinned, per-frame measurement | 78–90 |
| D | WebGL / cinematic | ≤ 85 |

Generated sites are capped by `ceilingForStyle()` in the generation module, so a
class C block cannot appear on a site whose chosen style did not pay for it.
`collections.test.ts` enforces the envelope: a block cannot be class C and claim
99 for performance.

No block currently ships as class D — nothing in the registry uses WebGL or a
canvas, on purpose.
