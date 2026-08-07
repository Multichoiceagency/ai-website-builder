# Taskora SaaS Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een SaaS-hero voor "Taskora", een team-/projectmanagement-app: een duidelijke waardepropositie, een "Start gratis" CTA, social proof en een productdashboard-preview. Doel: bezoekers overtuigen en richting trial/sign-up sturen.

## Design system (ui-ux-pro-max)

- **Style:** Social Proof-Focused — client logos, success-metrics, credibility markers.
- **Pattern:** Video-/UI-first hero met overlay-CTA en proof-strook.
- **Color palette (hex tokens):**
  - `primary` `#6366F1` (indigo)
  - `secondary` `#818CF8` (licht indigo)
  - `cta` `#10B981` (emerald)
  - `bg` `#F5F3FF`
  - `text` `#1E1B4B`
- **Font pairing (Google Fonts):** Plus Jakarta Sans (heading + body, `wght 300–700`), mood: friendly, modern, saas, clean.
- **Key effects:** dashboard-card reveal, stat counter (count-up), logo-grid fade-in, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

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
  fontFamily: { sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"] },
}
```

```tsx
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
```

## Helpers

- `useGSAP(() => {...}, { scope: rootRef })` voor scoped cleanup.
- `countTo(el, end, suffix)` voor dashboard-stats.
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)`.

```tsx
function countTo(el: HTMLElement, end: number, suffix = "") {
  const o = { v: 0 };
  return gsap.to(o, { v: end, duration: 1.5, ease: "power2.out",
    onUpdate: () => { el.innerText = Math.round(o.v).toLocaleString("nl-NL") + suffix; } });
}
```

## Structure

```tsx
export function TaskoraSaasHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute -top-24 right-1/4 h-[28rem] w-[28rem] rounded-full bg-secondary/30 blur-[120px]" data-glow />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="text-lg font-extrabold tracking-tight">Taskora</span>
        <div className="hidden gap-7 text-sm text-ink/70 md:flex">
          <a href="#product" className="cursor-pointer hover:text-ink">Product</a>
          <a href="#pricing" className="cursor-pointer hover:text-ink">Pricing</a>
          <a href="#docs" className="cursor-pointer hover:text-ink">Docs</a>
        </div>
        <a href="#start" className="cursor-pointer rounded-lg bg-cta px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600">Start gratis</a>
      </nav>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-primary shadow-sm" data-badge>
          Nieuw · AI-planning
        </span>
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl" data-headline>
          Je hele team, één <span className="text-primary">helder</span> overzicht.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink/70" data-sub>
          Projecten, taken en deadlines op één plek — zonder de chaos van losse tools.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4" data-actions>
          <a href="#start" className="cursor-pointer rounded-lg bg-cta px-7 py-3 font-bold text-white transition-colors hover:bg-emerald-600">Start gratis</a>
          <a href="#demo" className="cursor-pointer rounded-lg border border-ink/20 bg-white px-7 py-3 font-semibold text-ink transition-colors hover:bg-violet-50">Bekijk demo</a>
        </div>
      </div>

      {/* dashboard preview */}
      <div className="relative z-10 mx-auto max-w-5xl px-6" data-dash>
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center gap-4">
            {[{ n: 128, l: "Taken" }, { n: 94, l: "% on-time", s: "%" }, { n: 12, l: "Teams" }].map((s) => (
              <div key={s.l} className="flex-1 rounded-2xl bg-violet-50 p-4 text-center" data-stat>
                <span className="block text-2xl font-extrabold text-primary" data-count={s.n} data-suffix={s.s ?? ""}>0</span>
                <span className="mt-1 block text-xs text-ink/60">{s.l}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Backlog", "In progress", "Done"].map((col) => (
              <div key={col} className="rounded-2xl border border-violet-100 p-3" data-col>
                <p className="mb-2 text-xs font-semibold text-ink/60">{col}</p>
                <div className="space-y-2">
                  <div className="h-7 rounded-lg bg-violet-100" />
                  <div className="h-7 rounded-lg bg-violet-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* logo proof */}
      <div className="relative z-10 mx-auto mt-12 max-w-5xl px-6 pb-20">
        <p className="mb-5 text-center text-xs uppercase tracking-widest text-ink/40">Gebruikt door teams bij</p>
        <div className="grid grid-cols-2 items-center gap-8 opacity-70 sm:grid-cols-4">
          {["Northwind", "Lumio", "Cascade", "Vault"].map((b) => (
            <span key={b} className="text-center text-lg font-semibold text-ink/60" data-logo>{b}</span>
          ))}
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

    tl.from("[data-glow]", { autoAlpha: 0, scale: 0.85, duration: 1.3, ease: "power2.out" }, 0)
      .from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 }, 0)
      .from("[data-badge]", { y: 16, autoAlpha: 0, scale: 0.9, ease: "back.out(1.7)" }, "-=0.1")
      .from("[data-headline]", { y: 40, autoAlpha: 0 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.45")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-dash]", { y: 60, autoAlpha: 0, scale: 0.97, duration: 1 }, "-=0.3")
      .from("[data-col]", { y: 24, autoAlpha: 0, stagger: 0.1 }, "-=0.6")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.08 }, "-=0.3")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count), el.dataset.suffix ?? "")
        );
      }, "-=0.6");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-glow], [data-nav], [data-badge], [data-headline], [data-sub], [data-actions] > *, [data-dash], [data-col], [data-logo]", { autoAlpha: 1, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = Number(el.dataset.count).toLocaleString("nl-NL") + (el.dataset.suffix ?? ""); });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] SaaS-headline (Plus Jakarta Sans extrabold) met `text-primary` (indigo) accent; emerald CTA.
- [ ] Dashboard-preview (stats + kanban-kolommen) reveal't; stat-counters tellen op via GSAP.
- [ ] Logo-strook fade-in toont social proof.
- [ ] Eén `gsap.timeline()`: glow + nav → badge → headline → sub → actions → dashboard → kolommen → logos.
- [ ] Eases: `power3.out` (entrees), `back.out(1.7)` (badge + CTA's).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; "Start gratis"-CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast.
