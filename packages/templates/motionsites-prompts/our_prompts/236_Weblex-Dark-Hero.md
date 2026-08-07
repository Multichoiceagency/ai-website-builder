# Weblex Dark Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een donkere landing-hero voor "Weblex", een legal-tech/SaaS-platform. De sectie zet een premium dark-mode-uitstraling neer met een sterke headline, social-proof (logo's, ratings, metrics) en een duidelijke trial-CTA. De social-proof-palette wordt naar een dark-canvas vertaald.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, reviews/ratings, success-metrics, credibility-markers. Patroon: *Pricing/CTA-georiënteerd* met sticky nav-CTA. Dark-mode-toepassing.
- **Kleurenpalet (hex tokens):**
  - Primary `#0EA5E9` (sky blue / trust accent)
  - Secondary `#38BDF8` (licht sky)
  - CTA `#F97316` (warm oranje)
  - Surface `#0B1220` (donkere achtergrond, afgeleid van diep `#0C4A6E`)
  - Card `#111A2B`
  - Text `#E2E8F0` (licht), muted `#94A3B8`
- **Typografie (Google Fonts):** Outfit (headings) + Work Sans (body). Mood: geometric, modern, clean.
- **Key effects:** logo-grid fade-in, stat-counter count-up, subtiele glow achter de visual, glas-achtige cards, review-sterren.
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
    surface: "#0B1220",
    card: "#111A2B",
    ink: "#E2E8F0",
    muted: "#94A3B8",
  },
  fontFamily: { display: ["Outfit", "sans-serif"], body: ['"Work Sans"', "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
```

## Helpers

```tsx
// Scoped entrance + count-up. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const countUp = (el: HTMLElement | null, end: number, suffix = "") => {
  const o = { v: 0 };
  return gsap.to(o, {
    v: end,
    duration: 1.5,
    ease: "power2.out",
    onUpdate: () => { if (el) el.textContent = Math.round(o.v).toLocaleString() + suffix; },
  });
};
```

## Structure

```tsx
import { useRef } from "react";
import { Scale, ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WeblexDarkHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-surface font-body text-ink">
      {/* Glow */}
      <div data-glow className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <nav data-anim className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-display text-xl font-700">
          <Scale className="h-5 w-5 text-primary" /> Weblex
        </span>
        <div className="hidden gap-8 text-sm font-500 text-muted md:flex">
          <a className="cursor-pointer transition-colors hover:text-ink">Product</a>
          <a className="cursor-pointer transition-colors hover:text-ink">Prijzen</a>
          <a className="cursor-pointer transition-colors hover:text-ink">Resources</a>
        </div>
        <button className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-600 text-white transition-transform hover:scale-105">
          Start gratis
        </button>
      </nav>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
        <span data-anim className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-600 text-secondary">
          Legal-tech · vertrouwd door 4.000+ kantoren
        </span>
        <h1 data-anim className="mt-6 font-display text-5xl font-700 leading-[1.02] tracking-tight md:text-7xl">
          Juridisch werk, <span className="text-primary">geautomatiseerd</span>
        </h1>
        <p data-anim className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Contracten, compliance en dossiers in één donker, snel platform. Minder klikken, meer zekerheid.
        </p>
        <div data-anim className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-7 py-3.5 font-600 text-white transition-transform hover:scale-105">
            Probeer 14 dagen
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button className="cursor-pointer rounded-xl border border-white/15 px-7 py-3.5 font-600 transition-colors hover:border-primary">
            Bekijk demo
          </button>
        </div>
        <div data-anim className="mt-8 flex items-center justify-center gap-3">
          <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-cta text-cta" />)}</div>
          <span className="text-sm text-muted">4.9 · 980 reviews</span>
        </div>
      </div>

      <div data-cards className="relative z-10 mx-auto grid max-w-5xl gap-5 px-6 pb-16 sm:grid-cols-3">
        {[["99%", "minder fouten"], ["3x", "sneller afhandelen"], ["24/7", "compliance check"]].map(([n, l]) => (
          <div data-card key={l} className="rounded-2xl border border-white/10 bg-card/80 p-6 backdrop-blur-sm">
            <span data-stat data-raw={n} className="block font-display text-3xl font-700 text-primary">{n}</span>
            <span className="mt-1 block text-sm text-muted">{l}</span>
          </div>
        ))}
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-12 opacity-60">
        {["LEXFIRM", "JURIS", "ADVOCO", "DELEX"].map((l) => (
          <span data-logo key={l} className="font-display text-lg font-600 tracking-widest text-muted">{l}</span>
        ))}
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    tl.from("[data-glow]", { scale: 0.7, autoAlpha: 0, duration: 1.4 })
      .from("[data-anim]", { y: 28, autoAlpha: 0, stagger: 0.12 }, "-=1")
      .from("[data-card]", { y: 30, autoAlpha: 0, scale: 0.94, stagger: 0.12, ease: "back.out(1.6)" }, "-=0.4")
      .from("[data-logo]", { y: 14, autoAlpha: 0, stagger: 0.1 }, "-=0.3");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-glow], [data-anim], [data-card], [data-logo]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Dark-mode hero op `#0B1220` met sky-blue accent en oranje CTA; Outfit + Work Sans.
- [ ] Glow onthult via `scale` + `autoAlpha` (geen blur-animatie van width/height).
- [ ] Eén `gsap.timeline()` staggert glow → kopij → metric-cards → logo's.
- [ ] Metric-cards onthullen met `back.out(1.6)`; hoofdtimeline `power3.out`.
- [ ] `gsap.matchMedia()` zet alles statisch bij `prefers-reduced-motion: reduce`.
- [ ] Alleen transform-aliases (`x`, `y`, `scale`, `autoAlpha`); `cursor-pointer` + hover-transitions.
- [ ] Social-proof (sterren, metrics, logo-grid) aanwezig; sticky nav-CTA.
- [ ] `useGSAP` `{ scope: root }`; responsive 375 → 1440px, tekstcontrast op donker ≥ 4.5:1.
