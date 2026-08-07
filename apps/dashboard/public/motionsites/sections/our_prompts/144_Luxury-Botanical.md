# Luxury Botanical — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Minimalistische, luxe parfum-showcase op wit: één faceted glazen flacon ("Beyond — Magnetic Amber") links, met serif-productnaam + korte note rechts, en een tweede flacon die onderaan-links het frame binnenkomt (verticale scroll-galerij).

Build a clean, airy **`LuxuryBotanical`** product showcase on white: a single faceted perfume
bottle sits upper-left, a serif product name + short olfactory note sits to its right, and the next
bottle peeks in from the bottom-left edge — implying a vertical scroll-through gallery of fragrances.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = pure white `#FFFFFF`; lots of negative space.
- Key colors: charcoal serif headings `#1A1A1A`, muted grey body `#8A8A8A`, warm amber liquid in the bottle `#C8923A`.
- Font: elegant serif for product names (e.g. `font-["Cormorant_Garamond"]` / `font-serif`), small sans for the note.
- Max content width `max-w-6xl`; tall section (each product roughly one viewport in the full gallery).

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `Bottle` — image with a slow float/parallax (`animate y:[0,-8,0]`, ~8s) and a faint soft shadow on the white.
- `ProductRow` — `{name, note, image}` layout: bottle column + text column.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-white">
  <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-8 pt-16 md:grid-cols-2">
    {/* bottle column */}
    <FadeUp>
      <div className="relative flex justify-center md:justify-start">
        <Bottle src="/assets/bottle-amber.png" alt="Magnetic Amber" className="h-72 w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.08)]" />
      </div>
    </FadeUp>

    {/* text column */}
    <FadeUp delay={0.15}>
      <div className="pt-4">
        <h2 className="font-serif text-3xl tracking-tight text-[#1A1A1A]">Magnetic Amber</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8A8A8A]">
          Resinous amber, oud and rich woods. The collection's deepest note.
        </p>
      </div>
    </FadeUp>
  </div>

  {/* next product peeking in from bottom-left */}
  <div className="pointer-events-none absolute bottom-0 left-8 translate-y-1/2">
    <img src="/assets/bottle-plum.png" alt="" className="h-40 w-auto opacity-90 drop-shadow-[0_20px_30px_rgba(0,0,0,0.08)]" />
  </div>
</section>
```

## Products data (example, from the preview)
```ts
const products = [
  { name:"Magnetic Amber", note:"Resinous amber, oud and rich woods. The collection's deepest note.", image:"/assets/bottle-amber.png" },
  { name:"Velvet Plum",    note:"Dark plum, iris and soft musk. A quiet, magnetic close.",            image:"/assets/bottle-plum.png" },
  { name:"White Neroli",   note:"Bright neroli, petitgrain and clean cedar. The collection's opening.", image:"/assets/bottle-neroli.png" },
];
```

## Motion & acceptance
- Bottle floats subtly; name + note fade-up (delays 0 / .15) as each product enters the viewport.
- In the full gallery, scrolling advances one product per viewport; the peeking bottle becomes the next centered product (optional scroll-snap `snap-y snap-mandatory`).
- Acceptance checklist:
  - Pure-white, high-negative-space layout; a single faceted glass bottle upper-left with warm amber liquid.
  - Serif product name "Magnetic Amber" + short grey olfactory note to the right of the bottle.
  - A second (plum-tinted) bottle peeking in from the bottom-left edge, implying a vertical product gallery.
  - Soft, low-contrast drop shadows under the bottles; no color blocks — the products carry the design.
  - Responsive: bottle + text stack on mobile. Reduced-motion safe (disable float/parallax, keep fades).
