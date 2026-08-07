# Liquid Glass Features — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Features · features.
> Donkere features-sectie met een asymmetrische 2×2 layout: twee tekstblokken (serif kop + body + pill-knop) afgewisseld met twee "glass" browser-mockup kaarten die vloeiende blauw/paarse liquid-renders tonen.

Build a dark **`LiquidGlassFeatures`** section: an asymmetric grid alternating between
text feature blocks (italic serif headline + paragraph + outlined pill button) and
rounded browser-window mockups showing fluid blue/purple "liquid glass" artwork.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0A0A0B` (flat, no gradient — let the mockup art glow).
- Mockup cards = rounded `rounded-2xl` browser frames with a thin top chrome bar (3 dots),
  `border border-white/10`, containing a dark hero screenshot with iridescent blue/purple liquid waves.
- Text blocks: italic serif headline (`font-serif italic`), muted grey body, small outlined pill CTA with an arrow.
- Fonts: serif display for headlines, Inter for body/labels.
- Key colors I see: black `#0A0A0B`, off-white `#EDEDED`, muted grey body `#9A9AA0`, electric blue `#3B6FE0`, violet `#7C5CFF`.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` whileInView, `once`, stagger via delay).
- `PillButton` — outlined rounded button `border border-white/20 rounded-full px-4 py-2` with a trailing ↗ arrow, hover fills faintly.
- `BrowserCard` — rounded window: top bar with 3 grey dots + tiny nav links, body = `<img>` of the liquid render.

## Structure
```tsx
<section className="bg-[#0A0A0B] px-6 py-24 text-[#EDEDED]">
  <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-2 md:items-center">

    {/* row 1 — text left, mockup right */}
    <FadeUp>
      <div className="max-w-md">
        <h3 className="font-serif text-3xl italic md:text-4xl">Designed to convert. Built to perform.</h3>
        <p className="mt-4 text-sm leading-relaxed text-[#9A9AA0]">
          Every pixel is intentional. Our AI studies what works across thousands of top sites — then builds yours to outperform them all.
        </p>
        <PillButton className="mt-6">Learn more</PillButton>
      </div>
    </FadeUp>
    <FadeUp delay={0.1}>
      <BrowserCard src="/assets/liquid-grow.jpg" title="Grow" />
    </FadeUp>

    {/* row 2 — mockup left, text right */}
    <FadeUp delay={0.1}>
      <BrowserCard src="/assets/liquid-vision.jpg" title="VisualJoy" />
    </FadeUp>
    <FadeUp>
      <div className="max-w-md">
        <h3 className="font-serif text-3xl italic md:text-4xl">It gets smarter. Automatically.</h3>
        <p className="mt-4 text-sm leading-relaxed text-[#9A9AA0]">
          Your site evolves on its own. AI monitors every click, scroll, and conversion — then optimizes in real time. No manual updates. Ever.
        </p>
        <PillButton className="mt-6">See how it works</PillButton>
      </div>
    </FadeUp>
  </div>
</section>
```

```tsx
function BrowserCard({ src, title }: { src: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E12] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      </div>
      <img src={src} alt={title} className="aspect-[16/10] w-full object-cover" />
    </div>
  );
}
```

## Features data (example, from the preview)
```ts
const features = [
  { layout: "text-left",  title: "Designed to convert. Built to perform.",
    body: "Every pixel is intentional. Our AI studies what works across thousands of top sites — then builds yours to outperform them all.",
    cta: "Learn more", mock: "/assets/liquid-grow.jpg" },
  { layout: "text-right", title: "It gets smarter. Automatically.",
    body: "Your site evolves on its own. AI monitors every click, scroll, and conversion — then optimizes in real time. No manual updates. Ever.",
    cta: "See how it works", mock: "/assets/liquid-vision.jpg" },
];
```

## Motion & acceptance
- Each row fades-up with a small stagger (text 0, mockup .1) as it enters the viewport.
- Optional: the liquid render inside each mockup slowly drifts/scales (`animate scale:[1,1.04,1]` 20s) to feel fluid; cards lift slightly on hover (`whileHover y:-4`).
- Pill buttons fill faintly on hover, arrow nudges right.
- Acceptance checklist:
  - Flat near-black background; off-white italic-serif headlines; muted grey body text.
  - Asymmetric 2-row grid: text-left + mockup-right, then mockup-left + text-right.
  - Two rounded browser-window mockups (3-dot top bar) showing iridescent blue/purple liquid-glass artwork.
  - Outlined rounded pill CTAs with trailing arrow ("Learn more", "See how it works").
  - Responsive: stacks to 1 column on mobile. Respect `prefers-reduced-motion` (disable drift, keep fade).
```
