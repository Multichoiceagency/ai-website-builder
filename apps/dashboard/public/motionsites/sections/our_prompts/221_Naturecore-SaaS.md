# Naturecore SaaS — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a clean, nature-themed **`NaturecoreSaaS`** hero: a white top nav with a logo + links and a
black "Clean Energy" pill, a centered status chip, a large dark headline + grey subline, two green
CTAs, and a wide photoreal forest/woodland illustration anchored to the bottom edge with small
flying birds.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background white `#FFFFFF` fading to a faint mist at the base where the forest art
  sits (`from-white to-[#F4F6F3]`).
- KEY COLORS: ink `#1E2A22`, muted grey body `#6A726B`, brand green CTA `#2E5B3A` → `#3C6E47`
  gradient, near-black "Clean Energy" pill `#141414`, forest greens read from the bottom image.
- Font: a clean grotesk (Inter/General Sans); headline large + tight.
- Full-bleed `min-h-screen`; content centered `max-w-[900px]`; forest art full-width at bottom.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, staggered delay, `ease:[0.22,1,0.36,1]`).
- `Bird` — tiny SVG bird that drifts across with a slow path (`animate x/y`, randomized delays).
- `GreenButton` — gradient green pill with a leaf/arrow glyph, hover lighten.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-[#F4F6F3]">
  {/* TOP NAV */}
  <header className="relative z-20 mx-auto flex max-w-[1280px] items-center justify-between px-8 py-5">
    <div className="flex items-center gap-2 text-sm font-semibold text-[#1E2A22]"><span>▦</span> LGPSM</div>
    <nav className="hidden gap-7 text-sm text-black/65 md:flex">
      <a>⊕ En</a><a>Renewables</a><a>Strategies</a><a>Photovoltaic</a><a>Wind Systems</a><a>Packages</a>
    </nav>
    <div className="flex items-center gap-3">
      <a className="rounded-full border border-black/10 px-4 py-2 text-sm">Sign In</a>
      <a className="rounded-full bg-[#141414] px-4 py-2 text-sm text-white">Clean Energy</a>
    </div>
  </header>

  {/* CENTER COPY */}
  <div className="relative z-10 mx-auto mt-10 flex max-w-[900px] flex-col items-center px-6 text-center">
    <FadeUp>
      <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-[12px] text-black/60">
        🌱 → ⚡ Delivering power innovate → 🌿
      </span>
    </FadeUp>
    <FadeUp delay={0.1}>
      <h1 className="mt-6 text-5xl font-medium leading-[1.08] tracking-tight text-[#1E2A22] md:text-6xl">
        Renewable Power For Tomorrow,<br/>Infinite Clean Solutions
      </h1>
    </FadeUp>
    <FadeUp delay={0.18}>
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#6A726B]">
        Sustainable Energy Platform. Engineering, deploying, and servicing solar arrays for homes,
        businesses, and large-scale operations worldwide.
      </p>
    </FadeUp>
    <FadeUp delay={0.26}>
      <div className="mt-7 flex gap-3">
        <GreenButton>🍃 Explore Options →</GreenButton>
        <a className="rounded-full bg-white px-5 py-3 text-sm font-medium text-[#1E2A22] shadow-sm">Start Network →</a>
      </div>
    </FadeUp>
  </div>

  {/* BOTTOM FOREST ART + birds */}
  <img src="/assets/forest-pano.png" alt="" className="pointer-events-none absolute bottom-0 left-0 z-0 w-full object-cover" />
  {birds.map(b => <Bird key={b.id} {...b} />)}
</section>
```

## Nav data (example, from the preview)
```ts
const nav = ["Renewables", "Strategies", "Photovoltaic", "Wind Systems", "Packages"];
const ctas = [
  { label: "Explore Options", variant: "green" },
  { label: "Start Network",   variant: "light" },
];
```

## Motion & acceptance
- Status chip, headline, subline and CTAs stagger in (`FadeUp` 0 / .1 / .18 / .26).
- Birds drift slowly across the sky on randomized paths; forest art sits fixed at the bottom.
- Acceptance checklist:
  - White → faint mist background with a wide photoreal woodland/forest illustration anchored at the bottom edge.
  - Top nav: ▦ "LGPSM" logo, "⊕ En" + Renewables / Strategies / Photovoltaic / Wind Systems / Packages, "Sign In" outline + black "Clean Energy" pill right.
  - Centered status chip "🌱 → ⚡ Delivering power innovate → 🌿".
  - Large dark 2-line headline "Renewable Power For Tomorrow, / Infinite Clean Solutions".
  - Grey subline about the sustainable energy platform.
  - Two CTAs: green gradient "Explore Options →" and white "Start Network →".
  - A few small birds flying over the scene.
  - Responsive: nav collapses, headline scales down; `prefers-reduced-motion` grounds the birds + drops slide.
```
