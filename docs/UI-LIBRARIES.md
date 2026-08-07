# Third-party UI libraries — local reference only

**Status: temporary.** These libraries exist so we can *read and port from* them while we
build out our own block library. They are scaffolding, not a dependency of the product.
When our own library is big enough, run [Removal](#removal) — it is one paste, by design.

The authority on what is allowed is the licence registry in
`packages/assets/src/catalog.generated.ts` (search for `"library"`). That file is
generated — do not hand-edit it. This document records what was *done* with the
clearances; it does not grant any.

## The rule that matters

**Nothing third-party may reach shipped code.** Before this work the entire non-relative
import surface across `apps/`, `packages/` and `services/` was:

```
@nuxt/kit   @tailwindcss/vite   #components   vitest   vue   zod   node:{crypto,fs,path,url}
```

It is byte-for-byte unchanged after this work, and it must stay that way. The audit:

```bash
grep -rhoE "from '[^.'][^']*'" --include='*.vue' --include='*.ts' packages apps \
  --exclude-dir=node_modules --exclude-dir=.nuxt --exclude-dir=.output --exclude-dir=dist \
  | sed "s/from '//;s/'//" | grep -v "^@platform/" | sort -u
```

Concretely:

- Nothing in `apps/`, `packages/` or `services/` may import from `reference/`.
- Nothing here may be added to the `dependencies` of any shipped package. The root
  package (`@platform/root`, private) has **no** `dependencies` — only `devDependencies`.
- These installs are tooling. They are never bundled.

## A. Cloned for reading — `reference/`

Shallow clones (`--depth 1`), **gitignored**, never redistributed through this repo.
All five are plain 21-line MIT with no Fair Use, marketplace, or non-compete clause —
verified by reading the LICENSE in each clone, not by trusting a badge.

| Directory | Repository | Licence | Pinned | Size |
|---|---|---|---|---|
| `reference/shadcn-ui` | `shadcn-ui/ui` | MIT — © 2023 shadcn | `6261bd8` | 75 MB |
| `reference/magicui` | `magicuidesign/magicui` | MIT — © Magic UI | `0bd8b9f` | 20 MB |
| `reference/vengeance-ui` | `Ashutoshx7/VengeanceUI` | MIT — © 2025-2026 Ashutoshx7 | `75fccdc` | 68 MB |
| `reference/hyperui` | `markmead/hyperui` | MIT — © Mark Mead | `67bab31` | 6.3 MB |
| `reference/flowbite` | `themesberg/flowbite` | MIT — © 2023 Bergside Inc. | `232ebdb` | 31 MB |
| `reference/nuxt-ui` | `nuxt/ui` | MIT — © 2023 Nuxt | shallow | — |

**Total: ~200 MB+** (including `.git`; the shallow history is a large share of that).

Scope limits carried over from the registry:

- **Magic UI** — free repo only. *Magic UI Pro* is a separate paid product, is not in the
  MIT repository, and is out of scope. Never derive from a Pro component.
- **Flowbite** — free repo only. *Flowbite Pro* and *Flowbite Blocks* are sold separately,
  are not covered by that MIT licence, and are out of scope.
- **Vengeance UI** — pinned to `Ashutoshx7/VengeanceUI` specifically. The name is
  duplicated across mirrors and several domains claim it, so a lookup by name is not
  sufficient identification.
- **HyperUI** — `markmead/hyperui` is the real repository; the widely-cited
  `hyperui-dev/hyperui` is a 404.
- **Nuxt UI** — MIT, cleared for layout recipes and first-party ports. Do **not** add
  `@nuxt/ui` as a shipped dependency of customer pages (ADR-0003).

## B. Installed — root `devDependencies`

Our stack is Vue 3 / Nuxt 4. shadcn/ui, Magic UI and Vengeance UI are **React** — installing
them would drag React into the lockfile and still render nothing. Only these are genuinely
Vue-compatible. Licences verified on the npm registry before installing:

| Package | Version | npm licence | Notes |
|---|---|---|---|
| `shadcn-vue` | 2.8.1 | MIT | `unovue/shadcn-vue`, the Vue port. This is the **CLI**; it fetches components on demand rather than shipping them. |
| `flowbite` | 4.0.2 | MIT | `themesberg/flowbite` |
| `flowbite-vue` | 0.4.0 | MIT | `themesberg/flowbite-vue` — a *separate repo* from the registry's `themesberg/flowbite` entry; its MIT was verified independently on npm. |

HyperUI needs no install — it is plain HTML/Tailwind. Read it from the clone.

### The `vue-demi` build script

`shadcn-vue → reka-ui → @floating-ui/vue → vue-demi` carries a postinstall that rewrites
vue-demi to match the installed Vue major. It is switched **off** in `pnpm-workspace.yaml`
(`allowBuilds: vue-demi: false`): we never import or execute vue-demi, so there is no
reason to run a transitive dependency's install script. Leaving it unset makes
`pnpm install` exit non-zero, which breaks every `turbo` build.

## Forbidden — do not clone, install, vendor, or proxy

| Library | Why |
|---|---|
| **Aceternity UI** | **Proprietary, not MIT** — the claim that it is MIT is widely repeated and false. Its licence prohibits creating "themes, templates, or derivative products to sell on any marketplace". We are a website builder shipping layouts to paying customers, which lands squarely in that clause. |
| **Skiper UI** | **No licence at all.** No LICENSE file, no named licence, no official repository. Worse, the author states most components are "recreations of existing designs" — the chain of title is broken upstream, so even their permission would not settle whose design it is. |
| **Preline UI** | **Pending a commercial decision, not an engineering one.** Dual-licensed MIT + a "Fair Use" clause forbidding use in "any product or service that directly competes with Preline UI". Ours plausibly does. GitHub classifies the repo NOASSERTION, not plain MIT. |

If you think one of these is needed, **stop and escalate** — this is not a call to make
inside a feature branch.

## Porting rules

Patterns are not copyrightable; code is. **Porting a layout idea is fine; transliterating
their file is not.**

Any block derived from one of the cleared five must:

1. Carry attribution in its source, using the exact `attribution` string from that
   library's entry in the registry.
2. Record its source in the block definition.

Attribution strings live in `packages/assets/src/catalog.generated.ts`. As of this writing
every cleared source is marked *CLEARED BUT UNUSED* — the clearance stands for future work
and is not a record that anything was taken. Keep it accurate.

> **Known registry inaccuracy:** the Flowbite entry's attribution reads
> "Copyright (c) Themesberg", but the actual LICENSE.md in `themesberg/flowbite` says
> **"Copyright (c) 2023 Bergside Inc."** — and the string "Themesberg" appears nowhere in
> it. MIT requires the copyright notice be reproduced, so the registry string should be
> corrected at the generator before anything is ported from Flowbite.

## Removal

When our own library is big enough. One paste, from the repo root:

```bash
rm -rf reference/
pnpm remove -w shadcn-vue flowbite flowbite-vue
# drop the `reference/` block from .gitignore and the `vue-demi` block from pnpm-workspace.yaml
sed -i '' '/third-party UI libraries, cloned locally/,/^reference\/$/d' .gitignore
sed -i '' '/Transitive of the shadcn-vue CLI/,/vue-demi: false/d' pnpm-workspace.yaml
rm docs/UI-LIBRARIES.md
pnpm install && pnpm build
```

That is the whole footprint. It is deliberately this small: four files touched
(`.gitignore`, `package.json`, `pnpm-workspace.yaml`, this doc) plus one ignored
directory. Nothing else in the repo knows these libraries exist — which is why removal is
a delete and not an excavation.
