# NeoVision — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een landing-hero voor "NeoVision", een AI-vision/analytics-product dat beelddata omzet in inzicht. De sectie leidt met een toekomstgerichte headline, een dashboard/scan-visual, social-proof en duidelijke CTA's, en bouwt vertrouwen op via een social-proof-gerichte opzet.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, reviews/ratings, success-metrics, credibility-markers. Patroon: *Pricing/CTA-georiënteerd* met sticky nav-CTA.
- **Kleurenpalet (hex tokens):**
  - Primary `#0EA5E9` (sky blue / trust)
  - Secondary `#38BDF8` (licht sky)
  - CTA `#F97316` (warm oranje)
  - Background `#F0F9FF` (zacht ijsblauw)
  - Text `#0C4A6E` (diep blauw)
- **Typografie (Google Fonts):** Outfit (headings) + Work Sans (body). Mood: geometric, modern, clean, contemporary.
- **Key effects:** logo-grid fade-in, stat-counter count-up, scan-line/grid-puls op de visual, review-sterren, subtiele hover.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```bash
npm i gsap @gsap/react clsx tailwind-merge lucide-react
```

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#0EA5E9",
    secondary: "#38BDF8",
    cta: "#F97316",
    bg: "#F0F9FF",
    ink: "#0C4A6E",
  },
  fontFamily: { display: ["Outfit", "sans-serif"], body: ['"Work Sans"', "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
```

## Helpers

```tsx
// Scoped Reveal + scan-line loop. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const useReveal = (
  scope: React.RefObject<HTMLElement>,
  build: (mm: gsap.MatchMedia) => void
) => {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    build(mm);
  }, { scope });
};
```

## Structure

```tsx
import { useRef } from "react";
import { ArrowRight, ScanLine, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NeoVisionHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-body text-ink">
      <nav data-anim className="sticky top-0 z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 backdrop-blur-sm">
        <span className="flex items-center gap-2 font-display text-xl font-700">
          <ScanLine className="h-5 w-5 text-primary" /> NeoVision
        </span>
        <div className="hidden gap-8 text-sm font-500 md:flex">
          <a className="cursor-pointer transition-colors hover:text-primary">Platform</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Use cases</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Prijzen</a>
        </div>
        <button className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-600 text-white transition-transform hover:scale-105">
          Demo aanvragen
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-16 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-600 text-primary">
            Computer vision · realtime
          </span>
          <h1 data-anim className="mt-6 font-display text-5xl font-700 leading-[1.02] tracking-tight md:text-6xl">
            Zie wat je data <span className="text-primary">verbergt</span>
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg text-ink/70">
            NeoVision analyseert beeld in milliseconden en zet ruwe pixels om in beslissingen waar je op kunt vertrouwen.
          </p>
          <div data-anim className="mt-8 flex flex-wrap gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-6 py-3.5 font-600 text-white transition-transform hover:scale-105">
              Start nu
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-xl border border-ink/15 px-6 py-3.5 font-600 transition-colors hover:border-primary">
              Live demo
            </button>
          </div>
          <div data-anim className="mt-8 flex items-center gap-3">
            <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-cta text-cta" />)}</div>
            <span className="text-sm text-ink/60">4.9 — door 800+ teams gebruikt</span>
          </div>
        </div>

        <div data-visual className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-white p-5 shadow-xl">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div data-tile key={i} className="aspect-video rounded-lg bg-gradient-to-br from-primary/15 to-secondary/10" />
              ))}
            </div>
            <div data-scan className="pointer-events-none absolute inset-x-5 top-5 h-1 origin-left rounded-full bg-primary/70" />
          </div>
        </div>
      </div>

      <div data-logos className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-12 opacity-70">
        {["NORDIC", "PIXELQ", "VANTA", "LUMEN"].map((l) => (
          <span data-logo key={l} className="font-display text-lg font-600 tracking-widest text-ink/50">{l}</span>
        ))}
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
useReveal(root, (mm) => {
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    tl.from("[data-anim]", { y: 28, autoAlpha: 0, stagger: 0.12 })
      .from("[data-visual]", { x: 60, autoAlpha: 0, scale: 0.95, duration: 1 }, "-=0.5")
      .from("[data-tile]", { y: 18, autoAlpha: 0, scale: 0.9, stagger: 0.08, ease: "back.out(1.6)" }, "-=0.5")
      .from("[data-logo]", { y: 14, autoAlpha: 0, stagger: 0.1 }, "-=0.3");

    // Doorlopende scan-line via scaleX + yPercent (transforms only).
    gsap.to("[data-scan]", {
      scaleX: 1.2,
      yPercent: 1400,
      autoAlpha: 0.2,
      duration: 2.4,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
    });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-visual], [data-tile], [data-logo]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.set("[data-scan]", { autoAlpha: 0 });
  });
});
```

## Acceptance

- [ ] Hero gebruikt Outfit + Work Sans en de sky-blue/oranje tokens.
- [ ] Eén `gsap.timeline()` staggert kopij → visual → tiles → logo's.
- [ ] Scan-line loopt via `scaleX` + `yPercent` (transforms), nooit top/left/width.
- [ ] Tiles onthullen met `back.out(1.6)`; hoofdtimeline met `power3.out`.
- [ ] `gsap.matchMedia()` zet alles statisch en stopt de scan-loop bij `prefers-reduced-motion: reduce`.
- [ ] Sticky nav-CTA, social-proof (sterren + logo's), `cursor-pointer` + hover-transitions.
- [ ] `useGSAP` `{ scope: root }` voor cleanup; responsive 375 → 1440px, contrast ≥ 4.5:1.
