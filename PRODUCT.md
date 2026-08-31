# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user of the dashboard is **the business owner who came in through the
generator on multichoiceagency.nl and now runs one website**. A plumber, a
driving school, a tile wholesaler. Little prior knowledge of CMSes, visits
occasionally rather than daily, and arrives with one thing to get done — change
the prices, add last week's job, fix the opening hours before the holiday.

Multichoice's own staff use the same product across many client workspaces, and
white-label resellers run it under their own name. Both are real, but neither is
who the interface is designed for first. (Confirmed 2026-08-31.)

Roles exist in the system: owner, admin, developer, marketer, seo_manager,
sales, content_editor, support, viewer.

## Product Purpose

MultichoiceCMS turns a business into a running website, shop and growth stack,
and then keeps it running without the owner needing to learn a CMS. Success is a
site that stays current — hours, prices, work, offers — with the owner spending
minutes rather than an afternoon, and never wondering whether they broke
something.

## Positioning

An **agentic CMS**: the agent is the product, not a helper docked beside it. The
owner says what they want in their own words; the agent does the work, reports
what it changed, and can undo it. What a neighbouring CMS cannot truthfully copy
is the pairing underneath it — a curated block registry with measured
performance classes (ADR-0003) means the agent selects and fills blocks and can
never emit markup, so every change it makes is small, diffable, previewable and
reversible by construction.

**No Divi, no WordPress.** Nothing generates into someone else's page builder.

**Registry first, code sections where it cannot reach.** ADR-0003 refused
model-authored source; ADR-0012 allows it for sections the registry has no block
for, sandboxed in the existing MotionSites island mechanism. Reversed 2026-08-31
by the product owner, with the costs recorded in ADR-0012 — one of which,
unreviewable diffs, has no mitigation and is accepted as-is.

**Design stays editable after the fact, through Figma.** The intent is that a
site's design can be reworked in Figma and come back into the registry. Today
this does not exist in either direction: `figma-to-divi` targets Divi, and no
Figma → block-registry path is built. Recorded as intent, not capability.

## Operating Context

- The owner usually arrives from a prompt: an e-mail, a phone call, a season.
- Frequently on a phone, between other work.
- Their business data is already in the system: KvK trade, Google Business
  Profile (rating, reviews, hours, photos), and what was scraped from their
  previous site.
- Google is connected at sign-up with workspace scopes (Business Profile,
  Search Console, Analytics, Ads, Gmail), so the agent can act on real data
  rather than ask for it.
- Sister systems the product connects to: Contently (marketing studio,
  app.optimizly.io) and theagencycrm.

## Capabilities and Constraints

Confirmed today:

- 71 dashboard routes across website, commerce, CRM, analytics, automations,
  experiments, apps and settings.
- Generation pipeline: business profile → brand → plan → block selection →
  content → QA, with block selection budget-aware from the registry and copy via
  Gemini, Anthropic, then a deterministic composer as the guaranteed floor.
- 68 block renderers; MotionSites React islands as the curated escape hatch.
- `audit_events` is append-only and written in the same transaction as the
  change it records, so every action has a trail that cannot drift from it.
- Machine access is scoped API keys bound to a tenant and to the rights of the
  member who issued them.

**The agent acts on its own and reports afterwards, with one-click undo.**
(Confirmed 2026-08-31.)

That promise is currently only keepable in part, and the gap is a product fact,
not a design detail:

- **Reversible today:** pages (`page_revisions`) and blog posts
  (`blog_post_revisions`).
- **Not reversible today:** products and prices, theme, navigation, header and
  footer, domains, commerce settings, CRM records, workspace settings. There is
  no revision table for any of them — only the audit trail, which records what
  happened but cannot restore it.

Until those carry revisions, autonomy has to stop where undo stops. Which side
of that line a given action falls on is a product decision per action, not a
default.

**Two modes run side by side** — an agent mode and a classic mode, switchable.
(Confirmed 2026-08-31.) The known cost was stated and accepted: two interfaces
to maintain, and a user who is never forced to choose. Open decision: which mode
a new owner lands in, and whether the choice is remembered per person or per
workspace.

## Brand Commitments

- Product name: **MultichoiceCMS** (renamed from "Platform", 2026-08-31).
- White-label is a shipped capability: tenants set their own name, logo,
  favicon, colours and fonts, and can hide platform branding.
- **The interface plays the category standard straight.** Chosen deliberately
  on 2026-08-31 over a distinctive visual world. The bar is **Shopify admin**:
  many capabilities that never overwhelm an owner with no prior knowledge. No
  irony, no smuggled quirk — conventions embraced.
- Interface language is multilingual without an i18n framework — no route
  prefixes; the choice is detected, remembered per device and switchable on
  screen. Dutch, English, German, French.

## Evidence on Hand

- Real tenant data: KvK register, Google Business Profile, site scans.
- 24 published case studies in Payload, plus a counted project total of 500+
  held by the agency.
- No usage research, no session recordings, no support-ticket analysis of what
  owners actually struggle with. Future work must not invent these.
- No pricing for the product is settled; competitor figures must not stand in.

## Product Principles

1. **The owner describes the outcome, not the mechanism.** "The summer offer
   ends" is the input; finding the page, the block and the field is the agent's
   job.
2. **Never act further than you can undo.** Autonomy is earned per action by the
   existence of a way back, and where there is none the agent asks.
3. **Say what changed, in their words.** Every action reports in the language of
   the business — "the price on three pages" — not of the system.
4. **Generated changes stay small and reviewable.** The block registry is the
   reason the agent cannot make an unbounded edit; nothing may route around it.
5. **Their data is already here.** Asking an owner for something Google or the
   KvK already told us is a defect.

## Accessibility & Inclusion

No product-specific standard has been established. The audience — non-technical
owners, often on a phone, frequently in a hurry — makes touch target size,
readable body text and legible contrast load-bearing rather than optional.
