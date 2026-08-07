# Datacore SaaS Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een energieke SaaS-hero voor "Datacore", een data-/analytics-platform. De sectie combineert een bold, block-based layout met een live dashboard-visual (KPI-tiles, grafiek), een krachtige headline en een trial-CTA om snel waarde te tonen.

## Design system (ui-ux-pro-max)

- **Stijl:** Vibrant & Block-based — bold, energetic, block-layout, geometrische vormen, hoog kleurcontrast, modern. Patroon: *Video-First Hero* (key features als overlay, brand-accent CTA).
- **Kleurenpalet (hex tokens):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8` (zacht indigo)
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF` (lavendelwit)
  - Text `#1E1B4B` (diep indigo)
- **Typografie (Google Fonts):** Plus Jakarta Sans voor headings en body (`wght 300;400;500;600;700`). Mood: friendly, modern, saas, clean, professional.
- **Key effects:** grote secties (48px+ gaps), animated block-patterns, bold hover (kleur-shift), scroll-snap, large type (32px+), 200–300ms transitions, count-up KPI's.
- **Anti-patterns vermijden:** complexe onboarding-flow, rommelige layout.

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
    primary: "#6366F1",
    secondary: "#818CF8",
    cta: "#10B981",
    bg: "#F5F3FF",
    ink: "#1E1B4B",
  },
  fontFamily: { sans: ['"Plus Jakarta Sans"', "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

## Helpers

```tsx
// KPI count-up + scoped entrance. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const countUp = (el: HTMLElement | null, end: number, prefix = "", suffix = "") => {
  const o = { v: 0 };
  return gsap.to(o, {
    v: end,
    duration: 1.6,
    ease: "power2.out",
    onUpdate: () => { if (el) el.textContent = prefix + Math.round(o.v).toLocaleString() + suffix; },
  });
};
```

## Structure

```tsx
import { useRef } from "react";
import { Database, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DatacoreHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-sans text-ink">
      <nav data-anim className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 text-xl font-700">
          <Database className="h-5 w-5 text-primary" /> Datacore
        </span>
        <div className="hidden gap-8 text-sm font-500 md:flex">
          <a className="cursor-pointer transition-colors duration-200 hover:text-primary">Product</a>
          <a className="cursor-pointer transition-colors duration-200 hover:text-primary">Integraties</a>
          <a className="cursor-pointer transition-colors duration-200 hover:text-primary">Prijzen</a>
        </div>
        <button className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-600 text-white transition-colors duration-200 hover:bg-emerald-600">
          Start gratis
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-20 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-600 text-primary">
            Realtime data-analytics
          </span>
          <h1 data-anim className="mt-6 text-5xl font-700 leading-[1.02] tracking-tight md:text-6xl">
            Al je data, <span className="text-primary">één bron</span> van waarheid
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg font-400 text-ink/70">
            Datacore brengt je dashboards, pipelines en metrics samen — zodat je team beslist op feiten, niet op gevoel.
          </p>
          <div data-anim className="mt-8 flex flex-wrap gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-6 py-3.5 font-600 text-white transition-colors duration-200 hover:bg-emerald-600">
              Probeer 14 dagen
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-xl border border-ink/15 px-6 py-3.5 font-600 transition-colors duration-200 hover:border-primary hover:text-primary">
              Bekijk demo
            </button>
          </div>
        </div>

        <div data-dash className="relative">
          <div className="rounded-2xl border border-primary/15 bg-white p-6 shadow-xl">
            <div className="mb-5 grid grid-cols-3 gap-4">
              {[["€","482","K"], ["","12.4","%"], ["","98","%"]].map(([p, n, s], i) => (
                <div data-kpi key={i} className="rounded-xl bg-bg p-4">
                  <span data-stat data-prefix={p} data-end={n} data-suffix={s} className="block text-2xl font-700 tabular-nums">{p}0{s}</span>
                  <span className="text-xs text-ink/50">{["omzet", "groei", "uptime"][i]}</span>
                </div>
              ))}
            </div>
            <div className="flex h-40 items-end gap-2">
              {[40, 65, 50, 80, 60, 92, 75].map((h, i) => (
                <div data-bar key={i} className="flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-primary to-secondary" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-500 text-cta">
              <TrendingUp className="h-4 w-4" /> +18% deze maand
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
      .from("[data-dash]", { x: 60, autoAlpha: 0, scale: 0.95, duration: 1 }, "-=0.5")
      .from("[data-kpi]", { y: 20, autoAlpha: 0, scale: 0.94, stagger: 0.1, ease: "back.out(1.6)" }, "-=0.5")
      .from("[data-bar]", { scaleY: 0, autoAlpha: 0, stagger: 0.06, ease: "power2.out", duration: 0.6 }, "-=0.3");

    // KPI count-ups na de reveal.
    root.current?.querySelectorAll<HTMLElement>("[data-stat]").forEach((el) =>
      countUp(el, Number(el.dataset.end), el.dataset.prefix, el.dataset.suffix)
    );
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-dash], [data-kpi]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.set("[data-bar]", { scaleY: 1, autoAlpha: 1 });
    root.current?.querySelectorAll<HTMLElement>("[data-stat]").forEach((el) => {
      el.textContent = (el.dataset.prefix ?? "") + Number(el.dataset.end).toLocaleString() + (el.dataset.suffix ?? "");
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero gebruikt Plus Jakarta Sans en de indigo/emerald SaaS-tokens.
- [ ] Eén `gsap.timeline()` staggert kopij → dashboard → KPI's → grafiek-bars.
- [ ] Grafiek-bars groeien via `scaleY` (origin-bottom), nooit via `height`.
- [ ] KPI count-ups via proxy + `onUpdate`, tabular-nums, na de entrance.
- [ ] Eases zijn `power3.out`, `back.out(1.6)`, `power2.out` (built-in).
- [ ] `gsap.matchMedia()` zet alles statisch + toont eindwaarden bij `prefers-reduced-motion: reduce`.
- [ ] `cursor-pointer`, hover-transitions 200ms; SVG-iconen (Lucide).
- [ ] `useGSAP` `{ scope: root }`; responsive 375 / 768 / 1024 / 1440px, contrast ≥ 4.5:1.
