# Nike Premium Landing — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een premium sportswear-landing-hero (generiek, merk-neutraal "Premium Athletic") met een grote sneaker-presentatie, krachtige statement-headline, social-proof (reviews, sterren, atletenlogo's) en een prominente koop-CTA. Bedoeld om premium en conversie uit te stralen via social-proof-gerichte opbouw.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials prominent, klantlogo's, reviews/ratings, user-avatars, success-metrics, credibility-markers. Patroon: *Pricing/CTA-georiënteerd* met sticky nav-CTA.
- **Kleurenpalet (hex tokens):**
  - Primary `#0EA5E9` (sky blue / trust)
  - Secondary `#38BDF8` (licht sky)
  - CTA `#F97316` (warm oranje)
  - Background `#F0F9FF` (zacht ijsblauw)
  - Text `#0C4A6E` (diep blauw)
- **Typografie (Google Fonts):** Outfit (headings, geometric/modern) + Work Sans (body). Mood: geometric, modern, clean, contemporary.
- **Key effects:** stat-counter count-up, logo-grid fade-in, review-sterren, testimonial-carousel-achtige reveals, subtiele hover (scale/kleur).
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
// Stat count-up + scoped entrance. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const countTo = (el: HTMLElement | null, end: number, suffix = "") => {
  const obj = { v: 0 };
  return gsap.to(obj, {
    v: end,
    duration: 1.4,
    ease: "power2.out",
    onUpdate: () => { if (el) el.textContent = Math.round(obj.v).toLocaleString() + suffix; },
  });
};
```

## Structure

```tsx
import { useRef } from "react";
import { Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PremiumAthleticHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-body text-ink">
      <nav data-anim className="sticky top-0 z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 backdrop-blur-sm">
        <span className="font-display text-2xl font-700 tracking-tight">AERO</span>
        <div className="hidden gap-8 text-sm font-500 md:flex">
          <a className="cursor-pointer transition-colors hover:text-primary">Heren</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Dames</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Nieuw</a>
        </div>
        <button className="cursor-pointer rounded-full bg-cta px-5 py-2.5 text-sm font-600 text-white transition-transform hover:scale-105">
          Shop nu
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-600 text-primary">
            Premium · Limited drop
          </span>
          <h1 data-anim className="mt-6 font-display text-6xl font-700 leading-[0.95] tracking-tight md:text-7xl">
            Just<br />move<span className="text-cta">.</span>
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg text-ink/70">
            Engineered foam, responsive grip en een silhouet dat opvalt. Gemaakt voor wie nooit stilstaat.
          </p>
          <div data-anim className="mt-8 flex flex-wrap items-center gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-600 text-white transition-transform hover:scale-105">
              Koop — €189
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-full border border-ink/15 px-7 py-3.5 font-600 transition-colors hover:border-primary">
              Bekijk collectie
            </button>
          </div>
          <div data-anim className="mt-10 flex gap-8">
            <div>
              <span data-stat data-end="2400000" data-suffix="+" className="block font-display text-3xl font-700">0</span>
              <span className="text-sm text-ink/60">paar verkocht</span>
            </div>
            <div>
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-cta text-cta" />)}</div>
              <span className="text-sm text-ink/60">4.8 · 12k reviews</span>
            </div>
          </div>
        </div>

        <div data-product className="relative flex items-center justify-center">
          <div className="absolute h-72 w-72 rounded-full bg-secondary/40 blur-3xl" data-glow />
          <div className="relative aspect-square w-full max-w-md rotate-[-12deg] rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/10" />
        </div>
      </div>

      <div data-logos className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-12 opacity-70">
        {["RUNNERS", "ATHLETIX", "PACE", "STRIDE"].map((l) => (
          <span data-logo key={l} className="font-display text-lg font-600 tracking-widest text-ink/50">{l}</span>
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

    tl.from("[data-anim]", { y: 30, autoAlpha: 0, stagger: 0.12 })
      .from("[data-glow]", { scale: 0.6, autoAlpha: 0, duration: 1.2 }, "-=0.6")
      .from("[data-product] > .relative", { x: 70, rotation: 0, autoAlpha: 0, scale: 0.9, duration: 1, ease: "back.out(1.5)" }, "-=0.8")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.1 }, "-=0.4");

    // Stat count-up start na de hero-reveal.
    const stat = root.current?.querySelector<HTMLElement>("[data-stat]");
    if (stat) countTo(stat, Number(stat.dataset.end), stat.dataset.suffix);
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-glow], [data-product] > .relative, [data-logo]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    const stat = root.current?.querySelector<HTMLElement>("[data-stat]");
    if (stat) stat.textContent = Number(stat.dataset.end).toLocaleString() + (stat.dataset.suffix ?? "");
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero gebruikt Outfit (display) + Work Sans (body) en de sky-blue/oranje tokens.
- [ ] Eén `gsap.timeline()` staggert nav/kopij, glow, product en logo-grid.
- [ ] Product onthult met `x`, `scale`, `rotation`, `autoAlpha` — geen layout-properties.
- [ ] Stat count-up via proxy-object + `onUpdate`, start na de entrance.
- [ ] Eases zijn `power3.out`, `back.out(1.5)`, `power2.out` (built-in).
- [ ] `gsap.matchMedia()` zet alles statisch + toont eindwaarde bij `prefers-reduced-motion: reduce`.
- [ ] Sticky nav-CTA, `cursor-pointer` overal, hover-transitions.
- [ ] `useGSAP` `{ scope: root }`; responsive 375 / 768 / 1024 / 1440px, contrast ≥ 4.5:1.
