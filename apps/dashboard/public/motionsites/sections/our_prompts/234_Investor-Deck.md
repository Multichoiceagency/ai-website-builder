# Investor Deck — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Investor Presentations · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een strakke openings-hero voor een investor deck / pitch: een krachtige one-liner over de missie, traction-stats die opvallen (ARR, groei, klanten), logo's van bestaande investeerders, en CTA's om de volledige deck te bekijken of een gesprek te plannen. Vertrouwen en momentum staan centraal.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — credibility markers, investor-/klantlogo's, succes-metrics, ratings (WCAG AA).
- **Pattern:** Video-First Hero → hier subtiel: optionele achtergrond-loop achter een lichte sectie, maar tractie-stats voeren de boventoon.
- **Color palette (hex tokens):**
  - `--primary: #2563EB` (royal blue, trust)
  - `--secondary: #3B82F6` (bright blue)
  - `--cta: #F97316` (warm oranje, actie)
  - `--bg: #F8FAFC` (licht canvas)
  - `--text: #1E293B` (slate ink)
- **Font pairing (Google Fonts):** Heading **Inter**, Body **Inter** (Professional + Clear typography).
- **Key effects:** logo-grid fade-in, stat counter count-up, testimonial fade, hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verstopte contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Installeer: `npm i gsap @gsap/react`.

`tailwind.config.ts`:

```ts
export default {
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#3B82F6",
        cta: "#F97316",
        bg: "#F8FAFC",
        ink: "#1E293B",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      maxWidth: { content: "1120px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

Traction-stats tellen omhoog via een GSAP-getween object. We tonen drie grote KPI's in een bento-achtige rij die in-staggeren. Investor-logo's faden als batch. `gsap.matchMedia()` zet beweging terug naar fade-only bij reduced-motion; `useGSAP({ scope })` regelt cleanup.

```tsx
// Kpi.tsx — één traction-kaart
export const Kpi = ({ end, prefix = "", suffix = "", label }: { end: number; prefix?: string; suffix?: string; label: string }) => (
  <div data-kpi className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
    <span className="stat block text-4xl font-extrabold text-primary" data-end={end} data-prefix={prefix} data-suffix={suffix}>0</span>
    <p className="mt-2 text-sm text-ink/60">{label}</p>
  </div>
);
```

## Structure

```tsx
import { useRef } from "react";
import { Kpi } from "./Kpi";

export default function InvestorDeckHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="overflow-hidden bg-bg font-sans text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
        <span data-fade className="text-lg font-bold tracking-tight">Nimbus<span className="text-primary">.</span></span>
        <div data-fade className="flex items-center gap-3">
          <span className="hidden text-sm text-ink/50 sm:inline">Series A · 2026</span>
          <button className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold text-white transition-transform hover:scale-105">
            Plan een gesprek
          </button>
        </div>
      </header>

      {/* HERO */}
      <div className="max-w-content mx-auto px-6 py-16 text-center">
        <span data-fade className="inline-block rounded-full border border-primary/20 bg-white px-4 py-1 text-sm font-medium text-primary">
          Confidential · Investor Deck
        </span>
        <h1 data-fade className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] md:text-6xl">
          Wij maken cloud-infra <span className="text-primary">10× goedkoper</span> voor scale-ups.
        </h1>
        <p data-fade className="mx-auto mt-6 max-w-xl text-lg text-ink/70">
          €4,2M ARR, 18% MoM groei en 320 betalende teams — en we zijn net begonnen.
        </p>
        <div data-fade className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button className="cursor-pointer rounded-full bg-cta px-8 py-3.5 font-semibold text-white transition-transform hover:scale-105">
            Bekijk volledige deck
          </button>
          <button className="cursor-pointer rounded-full border border-primary/30 px-8 py-3.5 font-semibold text-primary transition-colors hover:bg-primary/10">
            Download one-pager
          </button>
        </div>

        {/* TRACTION KPIs */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <Kpi end={4200000} prefix="€" label="Annual Recurring Revenue" />
          <Kpi end={18} suffix="%" label="MoM groei" />
          <Kpi end={320} suffix="+" label="Betalende teams" />
        </div>

        {/* INVESTOR LOGOS */}
        <p data-fade className="mt-14 text-sm uppercase tracking-widest text-ink/40">Gesteund door</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-10 opacity-70">
          {["Sequoia", "Index", "Accel", "Point Nine"].map((b) => (
            <span key={b} data-logo className="text-lg font-semibold text-ink/50">{b}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const countUp = (el: HTMLElement) => {
  const obj = { val: 0 };
  const prefix = el.dataset.prefix ?? "";
  const suffix = el.dataset.suffix ?? "";
  gsap.to(obj, {
    val: Number(el.dataset.end),
    duration: 1.6,
    ease: "power2.out",
    onUpdate: () => (el.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`),
  });
};

useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
    tl.from("[data-fade]", { y: 30, autoAlpha: 0, stagger: 0.08 })
      .from("[data-kpi]", { y: 40, autoAlpha: 0, scale: 0.95, stagger: 0.12, ease: "back.out(1.5)" }, "-=0.3")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.06 }, "-=0.2")
      .add(() => root.current?.querySelectorAll<HTMLElement>(".stat").forEach(countUp));
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-kpi], [data-logo]", { clearProps: "transform" });
    gsap.from("[data-fade]", { autoAlpha: 0, duration: 0.4, stagger: 0.03 });
    root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) => {
      el.textContent = `${el.dataset.prefix ?? ""}${Number(el.dataset.end).toLocaleString()}${el.dataset.suffix ?? ""}`;
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Centered hero met Inter, royal-blue + oranje token-palet; "Confidential" badge.
- [ ] Entree-timeline (`gsap.timeline()`): staggered `y`/`autoAlpha` content, KPI-kaarten met `scale`/`y` en `back.out(1.5)`, logo's fade.
- [ ] Traction-stats tellen op via GSAP `onUpdate` met prefix/suffix (€, %, +).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, stats direct gezet).
- [ ] Built-in eases (`power3.out`, `power2.out`, `back.out(1.5)`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA's hebben `cursor-pointer` + hover 150–300ms.
- [ ] Responsive 375 / 768 / 1024 / 1440px; geen emoji-iconen; contrast ≥ 4.5:1.
