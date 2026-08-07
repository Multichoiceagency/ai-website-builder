# MASTER — handoff

Multi-tenant SaaS platform: AI website builder + headless CMS + commerce + CRM + ads + analytics.
Built from an empty repo. Everything runs locally with no cloud dependency.

**Read this first if you are picking the project up.** It is written to save you the
hours the mistakes below already cost. Section 6 (Gotchas) is the highest-value part.

---

## 1. Status at handoff

| | |
|---|---|
| Tests | **675 passing** — core-api 478 (16 suites), theming 117, blocks 34, assets 29, templates 17 |
| Migrations | 14, all with row-level security |
| ADRs | 10, in `docs/adr/` |
| Builds | all packages build clean |
| Committed to git | **nothing** — see §8 |

**Working end to end:** Google Business Profile → social scrape → industry classification →
theme derivation (WCAG-gated) → block selection → AI copy → published site.
Canvas editor with layers, drag-and-drop, per-section AI, insert panel with live previews,
media library, settings, admin console.

---

## 2. Quick start

```bash
pnpm install
# Postgres 16 + Redis must be running (see below)
pnpm db:migrate && pnpm db:seed
pnpm dev
```

| Surface | Port |
|---|---|
| Core API | 3001 |
| Dashboard | 3000 |
| Storefront | 3003 |
| Admin console | 3002 |

**Postgres/Redis: use local Homebrew, not Docker.** `pnpm infra:up` and the
`docker-compose.yml` exist and are *unverified* — the Docker daemon never started on
this machine (`Error reading remote info: EOF`), so the compose path has never run
end to end. Do not assume it works.

```bash
brew services start postgresql@16 redis
```

Two DB roles matter: the owner runs migrations, and services connect as the
**non-owner `app_user`** so RLS is actually enforced. Connecting as owner silently
disables every tenant policy — see ADR-0004.

---

## 3. Repo map

```
apps/
  dashboard/     Nuxt 4 — the customer product (editor, CMS, commerce, CRM…)
  storefront/    Nuxt 4 — renders published sites
  admin/         Nuxt 4 — internal staff console
packages/
  schemas/       Zod contracts — the single cross-boundary source of truth
  blocks/        Block registry: metadata, fields, Zod prop schemas (no markup)
  blocks-nuxt/   Nuxt layer — the Vue components that render blocks
  ui/            Nuxt layer — design system, tokens, Tailwind v4 entrypoint
  motion/        Nuxt layer — motion presets
  theming/       Palette generation, OKLCH maths, WCAG contrast gates
  templates/     MotionSites catalogue → block recipes
  assets/        Asset presets + the licence registry
  registry/ permissions/ tracking/ app-sdk/
services/
  core-api/      Fastify 5 — every route, every migration
reference/       Cloned MIT UI libraries. GITIGNORED, 201 MB. Never imported.
```

Vue packages are **Nuxt layers**, not built libraries — no build step, full HMR.
TS-only packages build with `tsc` to `dist/`. See ADR-0010.

---

## 4. Architecture — the decisions that constrain everything

Full text in `docs/adr/`. The ones you will trip over:

- **ADR-0002 — Zod is the contract.** Types are inferred from schemas, never
  hand-written alongside them.
- **ADR-0003 — The CMS stores block ids + props, never generated code.** This is
  why a template can only ever produce what our registry renders. A picker
  showing a third-party screenshot promises something the system cannot deliver.
- **ADR-0004 — Two-layer tenant isolation.** RLS in Postgres *plus* application
  scoping. `set_config('app.current_tenant', …, true)` per transaction.
- **ADR-0006 — Every vendor behind an adapter.** A vendor SDK may be imported in
  exactly one package.
- **ADR-0007 — AI mutations are proposals.** Classified low/medium/high risk, with
  preview and confirm. A model can never name a prop the caller did not declare
  editable, and output is validated against the block's own schema before it lands.
- **ADR-0009 — Opaque server-side sessions.** SHA-256 token hash, scrypt passwords
  via `node:crypto`. No native dependency, no JWT.

---

## 5. AI

`services/core-api/src/lib/ai/` — gateway, providers, shared copy contract.

Gateway order: **Anthropic → Gemini → deterministic composer.** The composer is
always available and always last: the platform generates a full site with **zero
credentials**, and improves rather than starts working when a key is added.

Currently live: **Gemini** (`GEMINI_API_KEY` set, `gemini-3.6-flash`).
`ANTHROPIC_API_KEY` is unset.

- `copy-contract.ts` holds the system prompt, Zod schemas and `distillFacts` —
  **shared by both LLM providers on purpose.** Two divergent copies of the safety
  rules is how one of them silently rots.
- The prompt's hard rule: use only facts present in the business profile. A model
  inventing "20 years of experience" for a real plumber is a legal problem, not a
  style one.
- `GEMINI_API_KEY` is **not** `GOOGLE_API_KEY`. The latter is scoped to Places and
  the Business Profile API. Keep them separate.

**Unverified:** the model has never been called against the live API. All 23 provider
tests mock `fetch`. A wrong model id, a disabled API, or unenabled billing all fail at
runtime in ways no mocked test catches. Insert a template in the editor to find out.

---

## 6. Gotchas — each of these cost real hours

**JSONB double-encoding.** Never `${JSON.stringify(x)}::jsonb` with postgres.js — it
infers jsonb from the cast and encodes *again*, storing a JSON string. `jsonb_array_length`
then fails with "cannot get array length of a scalar". Use `jsonParam()` / `readJson()`
from `src/db/json.ts`.

**Tailwind v4 emits real cascade layers.** Anything in `@layer components` loses to any
utility regardless of specificity. Editor chrome typography lives in
`packages/ui/assets/css/editor-type.css` **unlayered on purpose** — do not "tidy" it into
a layer.

**Tailwind only sees what it scans.** Layer packages live outside the app directory, so
their classes are declared via `@source` in `packages/ui/assets/css/index.css`. A class
constructed at runtime (e.g. returned by a model into props) exists in no source file and
will render unstyled **in production only**. Block schemas constrain props to content and
enumerated variants specifically to prevent this.

**`zoom`, not `transform: scale()`** for scaled previews. Transform leaves the layout box
at full size — that is what put the canvas frame off-centre with a gap beneath it.

**z-index is a scale, not a number.** `packages/ui/assets/css/tokens.css` defines
`--z-canvas-chrome: 20` → `--z-modal: 100`. Use the tokens. A number picked to beat
today's tallest element loses to tomorrow's.

**Test env deletes every model key.** `services/core-api/test/setup-env.ts` loads the real
`.env`, then explicitly `delete`s `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`.
Without this, `pnpm test` makes **real billed calls**. Do not remove it. A test that wants a
provider configured sets the variable in its own scope and restores it.

**`hostnameSchema` allows single-label hosts** so `localhost` parses.

**Nuxt 4, not 3.** On 3 the `app/` convention is inactive and you get the welcome page.
Each Nuxt app needs `tsconfig.json` extending `./.nuxt/tsconfig.json`.

**Layer packages must declare `vue`** in package.json — Vite resolves it without,
`vue-tsc` does not.

---

## 7. Open items

- **Eval harness** comparing four model arms (deterministic baseline / Gemini Flash /
  Gemini Pro / orchestrated Pro-hero + Flash-body + Pro-critic) — in progress at handoff.
  Runs offline, requires an explicit `--yes`, prints spend. Never wired into `pnpm test`.
- **Model orchestration** is designed but not built. The intended split: hero and
  positioning on the strong model (~15% of tokens, most of the perceived quality),
  everything else on the cheap one, then one critic pass over the assembled page.
- Cross-vendor orchestration needs an `ANTHROPIC_API_KEY` — only Gemini is configured.
- `docker-compose.yml` never verified.
- Storefront/dashboard have not been load-tested or run against a real browser matrix.

---

## 8. Do these before shipping anything

**Rotate `GOOGLE_API_KEY`.** During this build I printed it in full to stdout from a
check script — a masking branch covered `SECRET`/`CLIENT_ID` and fell through to a plain
print for everything else. It is in the session transcript. Rotate it in Google Cloud
Console. *(A new key was created mid-session; confirm the old one is revoked, not just
replaced.)*

**Nothing is committed.** `git status` shows every directory untracked against a single
`Initial commit`. All of the above exists only in the working tree. Before `git add`:
verify `.gitignore` covers `.env*` and that no `.env` appears in `git status` — the
working tree contains live Google and Gemini keys.

**Licence position.** `packages/assets/src/catalog.generated.ts` holds a machine-readable
registry: per library, the licence, the **verbatim copyright notice**, and the file it was
read from.

- Cleared MIT: shadcn/ui, Magic UI, Vengeance UI, HyperUI, Flowbite, flowbite-vue, shadcn-vue
- **Refused:** Aceternity UI (proprietary — bans derivative products sold on any
  marketplace, which is exactly this product; widely and wrongly reported as MIT),
  Skiper UI (no licence; author states components are "recreations of existing designs",
  so title is broken upstream), Preline UI (MIT + Fair Use banning competing products;
  GitHub says NOASSERTION — needs a commercial decision, not an engineering one)
- **Nothing has been derived from any of them yet.** Every preset is our own blocks. The
  entire third-party import surface across all shipped code is `vue`, `zod`, `@nuxt/kit`,
  `@tailwindcss/vite`, `vitest` and node builtins.
- Attribution is generated at port time from the recorded notice. Do not hand-write one:
  that is how Flowbite was credited to "Themesberg" when the licence says
  "Bergside Inc." — different entities, and only the notice is legally operative.
- `docs/UI-LIBRARIES.md` has the tested one-paste removal procedure for when the internal
  library is large enough.

---

## 9. Conventions

- Commits: `<type>: <description>` — feat, fix, refactor, docs, test, chore, perf, ci
- Files under 500 lines; extract rather than grow
- No secrets in source, ever. Env vars only; log `Boolean(key)`, never the value
- Immutable updates — new objects, no mutation
- Validate at every system boundary with Zod
- Blocks are added by writing a definition; the editor form generates itself (ADR-0003)
