# Nexar — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · dashboard), met design-system via ui-ux-pro-max en GSAP-animatie.

Een donkere, data-gedreven hero met een ingebouwde dashboard-preview voor "Nexar" — een analytics/monitoring-platform. Technische headline, groene "positive"-accenten, live-ogende KPI-tiles en een mini-grafiek, plus een start-CTA.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused + Video/dashboard-first hero, dashboard/data/technical-mood.
- **Kleurenpalet (hex tokens):**
  - `primary` `#0F172A` (slate-900)
  - `secondary` `#1E293B` (slate-800)
  - `cta` `#22C55E` (positive green)
  - `bg` `#020617` (near-black)
  - `text` `#F8FAFC` (off-white)
- **Font pairing (Google Fonts):** Fira Code (heading/cijfers) + Fira Sans (body) — dashboard, data, technical, precise.
- **Key effects:** stat count-up, chart reveal, KPI-tile fade-in, subtiele grid-glow. Hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { slate900: "#0F172A", slate800: "#1E293B", positive: "#22C55E", abyss: "#020617", offwhite: "#F8FAFC" },
  fontFamily: { mono: ["Fira Code", "monospace"], sans: ["Fira Sans", "system-ui", "sans-serif"] },
  maxWidth: { content: "82rem" },
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope. `gsap.matchMedia()` voor reduced-motion. Count-up via een GSAP-proxy die `textContent` update; chart-reveal via een `scaleX`-masker (transform-only).

```tsx
import { cn } from "@/lib/utils";
function Tile({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <div data-tile className={cn("rounded-xl border border-white/10 bg-slate800/60 p-4 backdrop-blur", className)}>{children}</div>;
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Activity, TrendingUp } from "lucide-react";
import { Tile } from "./Tile";

export default function NexarHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-abyss font-sans text-offwhite">
      <div data-grid className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.06)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div data-glow className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-positive/15 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="font-mono text-lg font-semibold tracking-tight">nexar<span className="text-positive">.</span></span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Platform", "Docs", "Pricing"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer text-offwhite/70 transition-colors duration-200 hover:text-offwhite">{i}</a>
          ))}
        </nav>
        <a data-nav href="#start" className="cursor-pointer rounded-lg bg-positive px-5 py-2 text-sm font-semibold text-abyss transition-transform duration-200 hover:scale-105">Start free</a>
      </header>

      <div className="relative z-10 mx-auto max-w-content px-6 pb-24 pt-16 text-center md:pt-24">
        <span data-hero className="inline-flex items-center gap-2 rounded-full border border-positive/30 bg-positive/10 px-4 py-1.5 font-mono text-xs text-positive">
          <Activity className="h-3.5 w-3.5" /> realtime observability
        </span>
        <h1 data-hero className="mx-auto mt-6 max-w-3xl font-mono text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Zie elke metric. Mis geen signaal.
        </h1>
        <p data-hero className="mx-auto mt-6 max-w-xl text-lg text-offwhite/70">
          Nexar bundelt logs, metrics en traces in één snel, donker dashboard.
        </p>
        <div data-hero className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#start" className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-positive px-6 py-3 font-semibold text-abyss transition-transform duration-200 hover:scale-105">
            Begin gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#demo" className="cursor-pointer rounded-lg border border-white/15 px-6 py-3 font-semibold transition-colors hover:border-positive/50">Live demo</a>
        </div>

        {/* dashboard preview */}
        <div data-card className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/10 bg-slate900/80 p-4 text-left shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur">
          <div className="mb-4 flex items-center gap-1.5 px-1">
            {["bg-red-500/70","bg-yellow-500/70","bg-positive/70"].map((c) => <span key={c} className={`h-3 w-3 rounded-full ${c}`} />)}
            <span className="ml-3 font-mono text-xs text-offwhite/40">~/nexar/overview</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[["Uptime","99.98%"],["P95 latency","124ms"],["Errors","0.02%"],["Req/s","48.3k"]].map(([k, v]) => (
              <Tile key={k}>
                <div className="font-mono text-xs text-offwhite/50">{k}</div>
                <div data-count className="mt-1 font-mono text-2xl font-semibold text-positive">{v}</div>
              </Tile>
            ))}
          </div>
          {/* chart */}
          <div className="relative mt-3 h-44 overflow-hidden rounded-xl border border-white/10 bg-abyss/60">
            <svg viewBox="0 0 600 176" className="h-full w-full">
              <polyline points="0,150 80,120 160,135 240,80 320,95 400,50 480,65 600,28" fill="none" stroke="#22C55E" strokeWidth="2.5" />
            </svg>
            <div data-mask className="absolute inset-y-0 right-0 origin-right bg-slate900" style={{ width: "100%" }} />
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 font-mono text-xs text-positive"><TrendingUp className="h-3.5 w-3.5" /> +12%</span>
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
    tl.from("[data-nav]", { y: -18, autoAlpha: 0, stagger: 0.08 })
      .from("[data-hero]", { y: 40, autoAlpha: 0, stagger: 0.1 }, "-=0.3")
      .from("[data-card]", { y: 60, autoAlpha: 0, scale: 0.97 }, "-=0.3")
      .from("[data-tile]", { y: 20, autoAlpha: 0, stagger: 0.08, ease: "back.out(1.7)" }, "-=0.3")
      .fromTo("[data-mask]", { scaleX: 1 }, { scaleX: 0, duration: 1.2, ease: "power2.inOut" }, "-=0.2");

    gsap.to("[data-glow]", { autoAlpha: 0.7, scale: 1.08, duration: 5, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to("[data-grid]", { y: -48, duration: 12, ease: "none", repeat: -1 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-tile], [data-glow]", { autoAlpha: 1, y: 0, scale: 1 });
    gsap.set("[data-mask]", { scaleX: 0 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Donkere dashboard-preview met 4 KPI-tiles en een chart die via `scaleX`-masker wordt onthuld.
- [ ] Entrance: nav → hero-copy → dashboard-card → tiles (`back.out`) → chart-reveal, gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt grid-loop + entrance uit en toont chart direct bij `prefers-reduced-motion: reduce`.
- [ ] Slate/abyss-palet + groene positive-accent; Fira Code/Fira Sans typografie; `max-w-content`.
- [ ] KPI-cijfers en chart leesbaar op donkere achtergrond; start-CTA bereikbaar.
- [ ] `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen; responsive 375/768/1024/1440px.
