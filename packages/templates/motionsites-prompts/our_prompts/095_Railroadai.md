# Railroad.ai — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een hero voor "Railroad.ai", een AI-platform dat spoorweg- en logistieke operaties voorspelt en optimaliseert. De sectie leidt met een vertrouwen-wekkende headline, een live-ops/route-visual met bewegende treindata, social-proof-metrics en een demo-CTA.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, success-metrics, credibility-markers. Patroon: *Video-First Hero* (brand-accent CTA, dark-overlay-uitstraling op de visual).
- **Kleurenpalet (hex tokens):**
  - Primary `#2563EB` (blauw)
  - Secondary `#3B82F6` (helder blauw)
  - CTA `#F97316` (oranje)
  - Background `#F8FAFC` (slate-wit)
  - Text `#1E293B` (slate)
- **Typografie (Google Fonts):** Inter voor headings en body (professional + clear). Tabular-nums voor metrics.
- **Key effects:** stat-counter count-up, logo-grid fade-in, bewegende route/track-lijn, subtiele hover, review-markers.
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
    primary: "#2563EB",
    secondary: "#3B82F6",
    cta: "#F97316",
    bg: "#F8FAFC",
    ink: "#1E293B",
  },
  fontFamily: { sans: ["Inter", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

## Helpers

```tsx
// Stat count-up + scoped entrance. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const countUp = (el: HTMLElement | null, end: number, suffix = "") => {
  const o = { v: 0 };
  return gsap.to(o, {
    v: end,
    duration: 1.6,
    ease: "power2.out",
    onUpdate: () => { if (el) el.textContent = Math.round(o.v).toLocaleString() + suffix; },
  });
};
```

## Structure

```tsx
import { useRef } from "react";
import { TrainFront, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RailroadAiHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-sans text-ink">
      <nav data-anim className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-xl font-700">
          <TrainFront className="h-5 w-5 text-primary" /> Railroad<span className="text-primary">.ai</span>
        </span>
        <div className="hidden gap-8 text-sm font-500 md:flex">
          <a className="cursor-pointer transition-colors hover:text-primary">Platform</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Operaties</a>
          <a className="cursor-pointer transition-colors hover:text-primary">Contact</a>
        </div>
        <button className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-600 text-white transition-transform hover:scale-105">
          Boek demo
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-16 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-600 text-primary">
            Predictive rail operations
          </span>
          <h1 data-anim className="mt-6 text-5xl font-700 leading-[1.02] tracking-tight md:text-6xl">
            Houd elke trein <span className="text-primary">op tijd</span>
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg text-ink/70">
            Railroad.ai voorspelt vertragingen, optimaliseert routes en houdt je hele netwerk in beweging — realtime.
          </p>
          <div data-anim className="mt-8 flex flex-wrap gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-6 py-3.5 font-600 text-white transition-transform hover:scale-105">
              Vraag demo aan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-xl border border-ink/15 px-6 py-3.5 font-600 transition-colors hover:border-primary">
              Lees case study
            </button>
          </div>
          <div data-anim className="mt-10 flex gap-10">
            <div>
              <span data-stat data-end="99" data-suffix="%" className="block text-3xl font-700 tabular-nums">0</span>
              <span className="text-sm text-ink/60">punctualiteit</span>
            </div>
            <div>
              <span data-stat data-end="1200" data-suffix="+" className="block text-3xl font-700 tabular-nums">0</span>
              <span className="text-sm text-ink/60">routes live</span>
            </div>
          </div>
        </div>

        <div data-visual className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-white p-6 shadow-xl">
            <div className="space-y-4">
              {["Lijn A · op tijd", "Lijn B · +2 min", "Lijn C · op tijd"].map((t, i) => (
                <div data-row key={t} className="flex items-center justify-between rounded-lg bg-bg px-4 py-3 text-sm font-500">
                  {t}
                  <span className={cn("h-2 w-2 rounded-full", i === 1 ? "bg-cta" : "bg-primary")} />
                </div>
              ))}
            </div>
            <div className="relative mt-6 h-1 w-full rounded-full bg-primary/10">
              <div data-track className="absolute left-0 top-0 h-1 w-12 origin-left rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>

      <div data-logos className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-12 opacity-70">
        {["NS", "DB", "SNCF", "RAILTEC"].map((l) => (
          <span data-logo key={l} className="text-lg font-700 tracking-widest text-ink/50">{l}</span>
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
      .from("[data-visual]", { x: 60, autoAlpha: 0, scale: 0.95, duration: 1 }, "-=0.5")
      .from("[data-row]", { y: 16, autoAlpha: 0, stagger: 0.12, ease: "back.out(1.5)" }, "-=0.5")
      .from("[data-logo]", { y: 14, autoAlpha: 0, stagger: 0.1 }, "-=0.3");

    // Stat count-ups starten na de hero-reveal.
    root.current?.querySelectorAll<HTMLElement>("[data-stat]").forEach((el) =>
      countUp(el, Number(el.dataset.end), el.dataset.suffix)
    );

    // Track-marker rijdt door via xPercent (transform only).
    gsap.to("[data-track]", { xPercent: 900, duration: 3, ease: "power1.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-visual], [data-row], [data-logo]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    root.current?.querySelectorAll<HTMLElement>("[data-stat]").forEach((el) => {
      el.textContent = Number(el.dataset.end).toLocaleString() + (el.dataset.suffix ?? "");
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero gebruikt Inter en de blauw/oranje slate-tokens.
- [ ] Eén `gsap.timeline()` staggert kopij → visual → rows → logo's.
- [ ] Stat-counters tellen op via proxy + `onUpdate`, tabular-nums, na de entrance.
- [ ] Track-marker rijdt via `xPercent` (transform) — geen left/width.
- [ ] Eases zijn `power3.out`, `back.out(1.5)`, `power2.out`, `power1.inOut` (built-in).
- [ ] `gsap.matchMedia()` zet alles statisch + eindwaarden bij `prefers-reduced-motion: reduce`.
- [ ] `cursor-pointer`, hover-transitions, logo-grid social-proof.
- [ ] `useGSAP` `{ scope: root }`; responsive 375 → 1440px, contrast ≥ 4.5:1.
