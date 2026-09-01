# Design

Durable visual decisions for MultichoiceCMS. Product truth lives in
[PRODUCT.md](PRODUCT.md).

This replaces the paper-and-terracotta admin world of 2026-08-31. The product
owner chose, on 2026-09-01, the grammar of the tools this product is measured
against — Lovable for the conversation, Framer for the canvas — and asked that
nothing of the old builder remain visible. What survives from before is the
structure the old document already named as the real problem: the agent as a
place, a shape for the owner who visits once a month, and one z-scale.

The system lives in `packages/ui/assets/css/tokens.css` and is shared by
dashboard, admin and storefront chrome. A theme change is a variable change.

## Ground and light

Dark by default. The scene that forces it: a builder is read against a live
canvas, and a canvas only reads as a stage when the chrome around it recedes.
`--paper` is a near-black neutral, `--paper-raised` the panel surface,
`--paper-sunken` the rail, and `--editor-canvas` sits deeper than all three so
a device frame floats.

Light is `data-theme="light"`, chosen per person, never inferred from the OS —
the owner in a shop at noon gets it in one click and keeps it.

## Colour strategy

Restrained: neutrals plus one accent. The visitor came to build.

- One ink in three weights: `--ink`, `--ink-soft`, `--ink-faint`.
- One accent, `--brand`, a signal blue. It marks the primary action, the
  current place, and the selection outline on the canvas — the same blue that
  means "selected" in every tool the audience already uses. Nothing else.
- Hairlines, not fills: `--line` and `--line-strong` are white at low alpha,
  so every border is the same material on every surface.
- Status colours stay literal and translucent on dark: `--positive`,
  `--warning`, `--danger`, each with a `-soft` ground for banners.
- Every colour is declared on bare `:root` first and re-declared for light.
  Nothing gets its only definition inside a media query.

## Type

- Sans: **Figtree** (`--font-sans`), for everything an owner reads to get a
  job done. Panels run one size down from pages; the canvas is the loud thing.
- Serif: **Instrument Serif** (`--font-serif`), display only.
- Mono: system stack, for values, ids and code.

The scale is named by role — `--text-display`, `--text-title`, `--text-heading`,
`--text-label`. Use the role, never a raw step.

## Surfaces

- **Rail:** `--paper-sunken`, one hairline, icon-first, expands on demand.
- **Top bar:** 44px, `--paper`, breadcrumb and site switcher on the left,
  primary action on the right.
- **Panels in the editor float.** They sit inset from the canvas with
  `--radius-card`, one hairline and `--shadow-lg`; the canvas shows around
  them. A panel is never a wall.
- **Cards** in the workspace are flat: `--paper-raised`, one hairline,
  `--shadow-sm`. Three elevations only; a card picks one.

Density inside panels and tables, air between sections. More space above a
heading than below it.

## Layering

`--z-*` is one ordered scale with each rung named for what lives there. If a
new surface does not fit a rung, add one to the scale rather than inventing a
number at the call site.

## The agent surface

- **The agent is a place.** It owns the primary route and the left column of
  the editor, in the same surfaces as everything else — no separate register.
- **A change is a card.** What changed, where, and the way back, in the
  language of the business. Undo lives on the card.
- **Building is the conversation.** A spec typed into the agent becomes a
  section on the canvas, in the undo history like a hand edit; the card says
  it was built as code and what it cost.

## Accessibility

Touch targets at least 44px; body text no smaller than 16px on phones.
Contrast is checked against the dark ground, and secondary text on coloured
surfaces is tinted from that hue, never grey. Motion respects
`prefers-reduced-motion`, and content is visible by default — never revealed
by script.
