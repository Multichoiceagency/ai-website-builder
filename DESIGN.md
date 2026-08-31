# Design

Durable visual decisions for MultichoiceCMS. Product truth lives in
[PRODUCT.md](PRODUCT.md).

This records the world that is **already built** in
`packages/ui/assets/css/tokens.css` and shared by dashboard, admin and
storefront. It was not invented here. The canon commitment in PRODUCT.md —
play the category standard straight, at Shopify admin's bar — confirms this
system rather than replacing it: it is already a careful Swiss/International
admin canon, and repainting it would have thrown away work that is right.

What needed changing was never the surface. It was the structure: an agent
docked in a side panel, 71 flat routes, and no shape for an owner who visits
once a month with one thing to fix.

## Ground and light

Light by default, and the reason is written into the tokens: an admin tool is
read in daylight, often on a phone in a van or a shop. Dark is offered, never
assumed.

The ground is warm paper, not white — `--paper` at `oklch(99% 0.003 95)`, with
`--paper-raised` for cards that lift and `--paper-sunken` for wells that recede.
`--editor-canvas` sits deliberately darker than sunken paper: a device frame
only reads as a frame when the surface behind it clearly recedes.

## Colour strategy

**Restrained**: neutrals plus one accent. The visitor came to operate, and the
default earns itself here rather than being taken by habit.

- One ink in three weights: `--ink`, `--ink-soft`, `--ink-faint`.
- One accent, `--brand` at `oklch(55% 0.16 48)` — a terracotta orange. It marks
  the primary action and the current place, nothing else.
- Status colours exist and stay literal: `--positive`, `--warning`, `--danger`,
  each with a `-soft` ground for banners. They report state; they never
  decorate.
- Every colour is declared on bare `:root` first and re-declared for dark.
  Nothing gets its only definition inside a media query.

## Type

- Sans: **Figtree** (`--font-sans`), the workhorse for everything an owner
  reads to get a job done.
- Serif: **Instrument Serif** (`--font-serif`), for display only.
- Mono: system stack, for values and identifiers.

The scale is named by role, not by size: `--text-display`, `--text-title`,
`--text-heading`, `--text-label`. Labels carry `0.06em` tracking; display and
title carry negative tracking. Use the role, never a raw step.

## Density and rhythm

Density inside tables and cards, air between sections. `--radius-card` is
`0.625rem`. Three elevations only — `--shadow-sm`, `-md`, `-lg` — and a card
picks one, not a custom blur.

More space above a heading than below it.

## Layering

`--z-*` is one ordered scale with each rung named for what lives there
(`--z-canvas-chrome`, `--z-canvas-drag`, and the rest). A z-index chosen to beat
whatever is tallest today loses to whatever is added tomorrow. If a new surface
does not fit a rung, add one to the scale rather than inventing a number at the
call site.

## The agent surface

The one place this world extends rather than inherits, because nothing in it
existed before.

- **The agent is a place, not a panel.** It gets the primary route, in the
  ordinary card language of the rest of the product. No dark chat canvas, no
  glow, no separate visual register — an owner must not feel they have left the
  admin to talk to it.
- **A change is a card.** Every action the agent takes renders as one card in
  the same family as the rest of the interface: what changed, where, and the way
  back. Cards read in plain business language, never system language.
- **The way back is on the card, not in a history page.** Undo lives where the
  change is reported. Where an action has no revision behind it (PRODUCT.md
  lists which), the agent asks first and the card says so plainly rather than
  offering an undo that cannot work.
- **Two modes, one skin.** Agent mode and classic mode share every token,
  component and label. Switching changes what leads, never what things look
  like — the owner is in the same product either way.

## Accessibility

Touch targets at least 44px, body text no smaller than 16px on phones, and
contrast checked against the paper ground rather than pure white. The audience
is non-technical, often on a phone, usually in a hurry; these are load-bearing,
not a checklist.

Motion respects `prefers-reduced-motion`, and content is visible by default —
never revealed by script. This has already bitten twice in sibling work.
