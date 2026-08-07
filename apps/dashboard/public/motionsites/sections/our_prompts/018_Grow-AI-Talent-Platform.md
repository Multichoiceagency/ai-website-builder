# Grow AI Talent Platform — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een SaaS-hero voor een AI-gedreven talentplatform dat recruiters helpt kandidaten te vinden, te beoordelen en te laten groeien. De sectie combineert een sterke waardepropositie met een app-store-achtig device-mockup, sterrenratings en duidelijke download/start-CTA's om vertrouwen en conversie te maximaliseren.

## Design system (ui-ux-pro-max)

- **Stijl:** Flat Design — 2D, minimalistisch, bold kleuren, geen zware schaduwen, schone lijnen, typografie-gedreven. Patroon: *App Store Style Landing* (echte screenshots, 4.5+ rating, device-frames, platform-CTA's).
- **Kleurenpalet (hex tokens):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8` (zacht indigo)
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF` (lavendelwit)
  - Text `#1E1B4B` (diep indigo)
  - Gold (sterren) `#F59E0B`
- **Typografie (Google Fonts):** Plus Jakarta Sans voor zowel headings als body (`wght 300;400;500;600;700`). Mood: friendly, modern, saas, clean, professional.
- **Key effects:** geen gradients/zware schaduwen, snelle clean transitions (150–200ms ease), simpele hover (kleur/opacity shift), minimale SVG-iconen (Lucide), star-rating in goud, device-frame mockup.
- **Anti-patterns vermijden:** complexe onboarding-flow, rommelige layout.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge) voor conditionele classes.
- Max content width: `max-w-6xl mx-auto px-6`.

```bash
npm i gsap @gsap/react clsx tailwind-merge lucide-react
```

```ts
// tailwind.config.ts (kleur tokens)
extend: {
  colors: {
    primary: "#6366F1",
    secondary: "#818CF8",
    cta: "#10B981",
    bg: "#F5F3FF",
    ink: "#1E1B4B",
    gold: "#F59E0B",
  },
  fontFamily: { sans: ['"Plus Jakarta Sans"', "sans-serif"] },
}
```

```css
/* index.css */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

## Helpers

```tsx
// useGSAP scoped reveal — alles via één timeline, transform-aliases.
// gsap.matchMedia() schakelt motion uit bij prefers-reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const useHeroReveal = (scope: React.RefObject<HTMLElement>) => {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { reduced } = ctx.conditions as { reduced: boolean };
        if (reduced) {
          gsap.set("[data-anim]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
          return;
        }
        // timeline draait in de Animation-sectie
      }
    );
  }, { scope });
};
```

## Structure

```tsx
import { useRef } from "react";
import { Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GrowAIHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen bg-bg font-sans text-ink">
      <nav data-anim className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-700">Grow<span className="text-primary">AI</span></span>
        <div className="hidden items-center gap-8 text-sm font-500 md:flex">
          <a className="cursor-pointer transition-colors duration-150 hover:text-primary">Product</a>
          <a className="cursor-pointer transition-colors duration-150 hover:text-primary">Talent</a>
          <a className="cursor-pointer transition-colors duration-150 hover:text-primary">Prijzen</a>
        </div>
        <button className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-600 text-white transition-colors duration-150 hover:bg-emerald-600">
          Start gratis
        </button>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-20 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-500 text-primary">
            AI-matching · 2.0
          </span>
          <h1 data-anim className="mt-6 text-5xl font-700 leading-[1.05] tracking-tight md:text-6xl">
            Laat je <span className="text-primary">talent</span> groeien met AI
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg font-400 text-ink/70">
            Vind, beoordeel en ontwikkel kandidaten op één platform. Slimme matching, eerlijke scoring, meetbare groei.
          </p>
          <div data-anim className="mt-8 flex flex-wrap items-center gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-6 py-3.5 font-600 text-white transition-colors duration-150 hover:bg-emerald-600">
              Probeer 14 dagen gratis
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-xl border border-ink/10 px-6 py-3.5 font-600 transition-colors duration-150 hover:border-primary hover:text-primary">
              Bekijk demo
            </button>
          </div>
          <div data-anim className="mt-8 flex items-center gap-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-gold text-gold" />
              ))}
            </div>
            <span className="text-sm font-500 text-ink/70">4.9 · 1.2k recruiters</span>
          </div>
        </div>

        <div data-mockup className="relative">
          <div className="mx-auto w-full max-w-sm rounded-[2.2rem] border-8 border-ink/90 bg-white p-4 shadow-xl">
            <div className="space-y-3">
              {["Sophie de Vries — 96% match", "Daan Bakker — 91% match", "Lina Yıldız — 88% match"].map((t) => (
                <div data-card key={t} className="flex items-center justify-between rounded-xl bg-bg p-3 text-sm font-500">
                  {t}
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-600 text-primary">AI</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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

    tl.from("[data-anim]", { y: 28, autoAlpha: 0, stagger: 0.12 })
      .from("[data-mockup]", { x: 60, autoAlpha: 0, scale: 0.94, duration: 1 }, "-=0.5")
      .from("[data-card]", { y: 18, autoAlpha: 0, scale: 0.96, stagger: 0.12, ease: "back.out(1.7)" }, "-=0.5");
  });

  // Reduced motion: alles direct zichtbaar, geen beweging.
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-mockup], [data-card]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero rendert met Plus Jakarta Sans en de exacte kleur-tokens (indigo primary, emerald CTA, lavendel bg).
- [ ] Entrance-timeline staggert nav → kopij → mockup → cards via één `gsap.timeline()`.
- [ ] Alleen transform-aliases (`x`, `y`, `scale`, `autoAlpha`) — geen width/height/top/left.
- [ ] Eases zijn `power3.out` en `back.out(1.7)` (built-in).
- [ ] `gsap.matchMedia()` zet motion uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }` zorgt voor cleanup.
- [ ] CTA's hebben `cursor-pointer`, hover-transitions 150ms, sterrenratings in goud.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; tekstcontrast ≥ 4.5:1.
