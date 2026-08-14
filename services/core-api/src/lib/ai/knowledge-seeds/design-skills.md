# Design skills (layout canvas)

Freeform pages are **layout-canvas trees only**. Node types: `container` | `text` | `image` | `button`.
Never emit Motionsites, registry block ids, React, or HTML as nodes.

## Hierarchy and typography

- One clear H1 per viewport. Subheads smaller. Body 16–18px, line-height 1.5–1.7.
- Letter-spacing slightly tight on large headlines (`-0.02em` to `-0.04em`).
- Strong contrast: dark text on light (or reverse). Avoid grey-on-grey.

## Spacing and layout

- 8px rhythm: 8 / 16 / 24 / 32 / 48 / 64. Generous whitespace. Group related items.
- Artboard children: `position: absolute` with `left` / `top` / `width` / `height`.
- Nested groups: flex or grid with `gap`.
- Buttons: min height 44px, padding 12–20px, `cursor: pointer`.

## Interaction and a11y

- Every button needs `stylesHover` (background, color, shadow, `translateY`).
- Images need meaningful `alt`. Decorative images may use empty alt.
- Hit targets at least 44×44px.

## Motion

- Host pages already use **Lenis** smooth scroll and **GSAP ScrollTrigger**.
- On freeform artboards prefer CSS hover (`stylesHover`) and modest transform.
- Do **not** invent Motionsites islands, Vanta, or `hero-vanta-01` on layout-canvas pages.

## Composition

- Default: header strip (brand + nav + CTA), hero (headline + sub + CTA + optional image), optional three feature cards.
- Single-viewport marketing composition unless the prompt asks for a long page.
