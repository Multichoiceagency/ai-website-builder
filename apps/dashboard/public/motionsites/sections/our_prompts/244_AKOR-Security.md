# AKOR Security — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een landing-hero voor "AKOR Security", een cyber-/fysieke-beveiligingsdienst. De sectie straalt betrouwbaarheid uit met een sterke claim, een live-status/threat-shield-visual, social-proof (certificeringen, metrics, logo's) en een offerte-CTA.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, success-metrics, credibility-markers (perfect voor security-vertrouwen). Patroon: *Pricing/CTA-georiënteerd* met sticky nav-CTA.
- **Kleurenpalet (hex tokens):**
  - Primary `#0EA5E9` (sky blue / trust)
  - Secondary `#38BDF8` (licht sky)
  - CTA `#F97316` (warm oranje)
  - Background `#F0F9FF` (zacht ijsblauw)
  - Text `#0C4A6E` (diep blauw)
  - Safe `#10B981` (status-groen voor "beschermd")
- **Typografie (Google Fonts):** Outfit (headings) + Work Sans (body). Mood: geometric, modern, clean, contemporary.
- **Key effects:** stat-counter count-up, logo/cert-grid fade-in, pulserende shield-status, subtiele hover, review-markers.
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
    safe: "#10B981",
  },
  fontFamily: { display: ["Outfit", "sans-serif"], body: ['"Work Sans"', "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
```

## Helpers

```tsx
// Scoped entrance + count-up + shield-pulse. matchMedia voor reduced-motion.
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
import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AkorSecurityHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-body text-ink">
      <nav data-anim className="sticky top-0 z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 backdrop-blur-sm">
        <span className="flex items-center gap-2 font-display text-xl font-700">
          <ShieldCheck className="h-5 w-5 text-primary" /> AKOR
        </span>
        <div className="hidden gap-8 text-sm font-500 md:flex">
          <a className="cursor-pointer transition-colors hover:text-primary">Diensten</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Sectoren</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Contact</a>
        </div>
        <button className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-600 text-white transition-transform hover:scale-105">
          Vraag offerte
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-16 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-flex items-center gap-2 rounded-full bg-safe/10 px-4 py-1.5 text-sm font-600 text-safe">
            <Lock className="h-3.5 w-3.5" /> ISO 27001 gecertificeerd
          </span>
          <h1 data-anim className="mt-6 font-display text-5xl font-700 leading-[1.02] tracking-tight md:text-6xl">
            Beveiliging die <span className="text-primary">nooit slaapt</span>
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg text-ink/70">
            AKOR bewaakt je digitale én fysieke assets 24/7. Detectie, respons en preventie — door één team.
          </p>
          <div data-anim className="mt-8 flex flex-wrap gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-6 py-3.5 font-600 text-white transition-transform hover:scale-105">
              Plan een audit
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-xl border border-ink/15 px-6 py-3.5 font-600 transition-colors hover:border-primary">
              Onze aanpak
            </button>
          </div>
          <div data-anim className="mt-10 flex gap-10">
            <div>
              <span data-stat data-end="500" data-suffix="+" className="block font-display text-3xl font-700 tabular-nums">0</span>
              <span className="text-sm text-ink/60">beveiligde sites</span>
            </div>
            <div>
              <span data-stat data-end="99" data-suffix="%" className="block font-display text-3xl font-700 tabular-nums">0</span>
              <span className="text-sm text-ink/60">dreigingen geblokt</span>
            </div>
          </div>
        </div>

        <div data-visual className="relative flex items-center justify-center">
          <div data-ring className="absolute h-72 w-72 rounded-full border-2 border-primary/20" />
          <div data-ring className="absolute h-56 w-56 rounded-full border-2 border-primary/30" />
          <div data-shield className="relative flex h-40 w-40 items-center justify-center rounded-3xl bg-white shadow-xl">
            <ShieldCheck className="h-20 w-20 text-safe" />
          </div>
        </div>
      </div>

      <div data-logos className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-12 opacity-70">
        {["GOV-NL", "BANKSEC", "PORT", "MEDIQ"].map((l) => (
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

    tl.from("[data-anim]", { y: 28, autoAlpha: 0, stagger: 0.12 })
      .from("[data-shield]", { scale: 0.7, autoAlpha: 0, duration: 0.9, ease: "back.out(1.7)" }, "-=0.5")
      .from("[data-ring]", { scale: 0.6, autoAlpha: 0, stagger: 0.12 }, "-=0.6")
      .from("[data-logo]", { y: 14, autoAlpha: 0, stagger: 0.1 }, "-=0.3");

    // Stat count-ups na de reveal.
    root.current?.querySelectorAll<HTMLElement>("[data-stat]").forEach((el) =>
      countUp(el, Number(el.dataset.end), el.dataset.suffix)
    );

    // Pulserende ringen — scale + autoAlpha loop (transforms only).
    gsap.to("[data-ring]", { scale: 1.08, autoAlpha: 0.3, duration: 2.2, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 0.3 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-shield], [data-ring], [data-logo]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    root.current?.querySelectorAll<HTMLElement>("[data-stat]").forEach((el) => {
      el.textContent = Number(el.dataset.end).toLocaleString() + (el.dataset.suffix ?? "");
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero gebruikt Outfit + Work Sans, sky-blue trust-tokens + groene "safe"-status.
- [ ] Eén `gsap.timeline()` staggert kopij → shield → ringen → logo's.
- [ ] Shield onthult met `back.out(1.7)`; ringen pulseren via `scale` + `autoAlpha` (geen width/height).
- [ ] Stat-counters tellen op via proxy + `onUpdate`, tabular-nums, na de entrance.
- [ ] `gsap.matchMedia()` zet alles statisch + eindwaarden bij `prefers-reduced-motion: reduce`.
- [ ] Eases zijn `power3.out`, `back.out(1.7)`, `power2.out`, `sine.inOut` (built-in).
- [ ] `cursor-pointer`, hover-transitions, cert/logo social-proof, sticky nav-CTA.
- [ ] `useGSAP` `{ scope: root }`; responsive 375 → 1440px, contrast ≥ 4.5:1.
