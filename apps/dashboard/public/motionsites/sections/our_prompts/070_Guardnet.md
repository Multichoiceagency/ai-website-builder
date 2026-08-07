# Guardnet — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een landing-hero voor "Guardnet", een cybersecurity/netwerkbescherming-product: vertrouwen-gedreven headline, een direct-aan-de-slag CTA, en social-proof (klantlogo's, uptime/threat-stats). Doel: geloofwaardigheid tonen en de bezoeker naar een gratis trial/demo leiden.

## Design system (ui-ux-pro-max)

- **Style:** Social Proof-Focused — client logos, success-metrics, credibility markers, reviews.
- **Pattern:** Pricing/CTA-georiënteerde hero met sticky-CTA in nav en stat-proof.
- **Color palette (hex tokens):**
  - `primary` `#0EA5E9` (sky blue, trust)
  - `secondary` `#38BDF8` (lichtblauw)
  - `cta` `#F97316` (warm oranje)
  - `bg` `#F0F9FF`
  - `text` `#0C4A6E`
- **Font pairing (Google Fonts):** Outfit (heading) + Work Sans (body), `wght 300–700`, mood: geometric, modern, clean.
- **Key effects:** logo-grid fade-in, stat counter (count-up), subtiele shield-glow, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-6xl mx-auto px-6`.

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
  fontFamily: {
    display: ["Outfit", "system-ui", "sans-serif"],
    sans: ["Work Sans", "system-ui", "sans-serif"],
  },
}
```

```tsx
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
```

## Helpers

- `useGSAP(() => {...}, { scope: rootRef })` voor scoped cleanup.
- `countTo(el, end, suffix)` voor uptime/threat-stats.
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)`.

```tsx
function countTo(el: HTMLElement, end: number, suffix = "") {
  const o = { v: 0 };
  return gsap.to(o, { v: end, duration: 1.6, ease: "power2.out",
    onUpdate: () => { el.innerText = (Math.round(o.v * 10) / 10) + suffix; } });
}
```

## Structure

```tsx
export function GuardnetHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-secondary/30 blur-[120px]" data-glow />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6" data-nav>
        <span className="font-display text-xl font-bold tracking-tight">Guard<span className="text-primary">net</span></span>
        <div className="hidden gap-7 text-sm text-ink/70 md:flex">
          <a href="#features" className="cursor-pointer hover:text-ink">Platform</a>
          <a href="#pricing" className="cursor-pointer hover:text-ink">Pricing</a>
          <a href="#docs" className="cursor-pointer hover:text-ink">Docs</a>
        </div>
        <a href="#trial" className="cursor-pointer rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">Gratis trial</a>
      </nav>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-4 py-1.5 text-xs font-medium text-primary" data-badge>
          SOC 2 Type II • 24/7 monitoring
        </span>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl" data-headline>
          Bescherm je netwerk <span className="text-primary">voordat</span> aanvallers toeslaan.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink/70" data-sub>
          Realtime threat-detectie en automatische respons — zonder een leger aan analisten.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4" data-actions>
          <a href="#trial" className="cursor-pointer rounded-lg bg-cta px-7 py-3 font-semibold text-white transition-colors hover:bg-orange-600">Start gratis</a>
          <a href="#demo" className="cursor-pointer rounded-lg border border-ink/20 bg-white px-7 py-3 font-semibold text-ink transition-colors hover:bg-sky-50">Boek een demo</a>
        </div>
      </div>

      {/* social proof: logos */}
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-5 text-center text-xs uppercase tracking-widest text-ink/40">Vertrouwd door security-teams</p>
        <div className="grid grid-cols-2 items-center gap-8 opacity-70 sm:grid-cols-4">
          {["Atlas", "Corevault", "Nimbus", "Sentry"].map((b) => (
            <span key={b} className="font-display text-center text-lg font-semibold text-ink/60" data-logo>{b}</span>
          ))}
        </div>
      </div>

      {/* social proof: stats */}
      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-3 gap-6 px-6 pb-20">
        {[{ n: 99.9, l: "% uptime", s: "%" }, { n: 12, l: "M threats geblokt", s: "M" }, { n: 200, l: "ms respons", s: "ms" }].map((st) => (
          <div key={st.l} className="rounded-2xl border border-sky-100 bg-white p-6 text-center shadow-sm" data-stat>
            <span className="block font-display text-3xl font-bold text-primary" data-count={st.n} data-suffix={st.s}>0</span>
            <span className="mt-1 block text-sm text-ink/60">{st.l}</span>
          </div>
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

    tl.from("[data-glow]", { autoAlpha: 0, scale: 0.85, duration: 1.3, ease: "power2.out" }, 0)
      .from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 }, 0)
      .from("[data-badge]", { y: 16, autoAlpha: 0, scale: 0.9, ease: "back.out(1.7)" }, "-=0.1")
      .from("[data-headline]", { y: 40, autoAlpha: 0 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.45")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.08 }, "-=0.2")
      .from("[data-stat]", { y: 30, autoAlpha: 0, stagger: 0.12 }, "-=0.2")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count), el.dataset.suffix ?? "")
        );
      }, "-=0.2");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-glow], [data-nav], [data-badge], [data-headline], [data-sub], [data-actions] > *, [data-logo], [data-stat]", { autoAlpha: 1, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = (el.dataset.count ?? "0") + (el.dataset.suffix ?? ""); });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Trust-gedreven headline (Outfit display) met `text-primary` accent op licht `bg`; oranje CTA contrasterend.
- [ ] Compliance-badge, logo-strook en stat-counters communiceren geloofwaardigheid.
- [ ] Eén `gsap.timeline()`: glow + nav → badge → headline → sub → actions → logos → stats.
- [ ] Eases: `power3.out` (entrees), `back.out(1.7)` (badge + CTA's).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; sticky/prominente CTA in nav.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast.
