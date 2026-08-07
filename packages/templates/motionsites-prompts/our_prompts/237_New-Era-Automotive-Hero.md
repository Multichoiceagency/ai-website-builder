# New Era Automotive Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Automotive · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een premium automotive-hero met kinetische, brede typografie en een donkere showroom-sfeer: een statement over de "nieuwe generatie", een actie-CTA (configureer/proefrit) en performance-specs als counters. Doel: snelheid en exclusiviteit overbrengen en de bezoeker naar een configurator/proefrit leiden.

## Design system (ui-ux-pro-max)

- **Style:** Premium dark + action red (Social Proof/credibility basis, vertaald naar automotive performance).
- **Pattern:** Dynamische hero (personalized/feature-first) met overlay-CTA en spec-counters.
- **Color palette (hex tokens):**
  - `primary` `#1E293B` (premium dark)
  - `secondary` `#334155` (slate)
  - `cta` `#DC2626` (action red)
  - `bg` `#F8FAFC` (licht) / dark canvas `#0B1120` voor de hero
  - `text` `#0F172A`
- **Font pairing (Google Fonts):** Syncopate (heading, `400;700`) + Space Mono (body, `400;700`), mood: kinetic, futuristisch, speed, wide.
- **Key effects:** brede letter-spacing, kinetische slide-in, stat counter (count-up), speed-line glow, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#1E293B",
    secondary: "#334155",
    cta: "#DC2626",
    canvas: "#0B1120",
    ink: "#0F172A",
  },
  fontFamily: {
    display: ["Syncopate", "system-ui", "sans-serif"],
    mono: ["Space Mono", "ui-monospace", "monospace"],
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
- `countTo(el, end, suffix)` voor spec-counters (0–100 / PK / km).
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)`.

```tsx
function countTo(el: HTMLElement, end: number, suffix = "") {
  const o = { v: 0 };
  return gsap.to(o, { v: end, duration: 1.4, ease: "power2.out",
    onUpdate: () => { el.innerText = (Math.round(o.v * 10) / 10) + suffix; } });
}
```

## Structure

```tsx
export function NewEraAutomotiveHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-canvas font-mono text-white">
      {/* speed-line glow */}
      <div className="pointer-events-none absolute right-0 top-1/3 h-40 w-2/3 -skew-y-3 bg-gradient-to-l from-cta/40 to-transparent blur-2xl" data-glow />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="font-display text-sm font-bold tracking-[0.3em]">VELOX</span>
        <div className="hidden gap-7 text-xs uppercase tracking-widest text-white/60 md:flex">
          <a href="#models" className="cursor-pointer hover:text-white">Models</a>
          <a href="#tech" className="cursor-pointer hover:text-white">Tech</a>
          <a href="#config" className="cursor-pointer hover:text-white">Config</a>
        </div>
        <a href="#test-drive" className="cursor-pointer rounded-sm bg-cta px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700">Proefrit</a>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-16">
        <p className="mb-6 text-xs uppercase tracking-[0.4em] text-cta" data-eyebrow>The new era · 2026</p>
        <h1 className="font-display font-bold uppercase leading-[0.95] tracking-[0.02em] text-[clamp(2.5rem,8vw,7rem)]">
          <span className="block" data-line>Pure</span>
          <span className="block text-cta" data-line>velocity.</span>
        </h1>
        <p className="mt-8 max-w-md text-base text-white/70" data-sub>
          Volledig elektrisch. Brute acceleratie. Een nieuwe generatie rijden.
        </p>
        <div className="mt-8 flex flex-wrap gap-4" data-actions>
          <a href="#config" className="cursor-pointer rounded-sm bg-cta px-7 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700">Configureer</a>
          <a href="#specs" className="cursor-pointer rounded-sm border border-white/30 px-7 py-3 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-white/10">Specs</a>
        </div>
      </div>

      {/* spec counters */}
      <div className="relative z-10 mx-auto mt-16 grid max-w-5xl grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/5 px-6 py-8 sm:gap-6">
        {[{ n: 2.8, l: "0–100 km/u", s: "s" }, { n: 680, l: "vermogen", s: " PK" }, { n: 540, l: "actieradius", s: " km" }].map((sp) => (
          <div key={sp.l} className="text-center" data-stat>
            <span className="block font-display text-2xl font-bold text-cta md:text-4xl" data-count={sp.n} data-suffix={sp.s}>0</span>
            <span className="mt-2 block text-[0.65rem] uppercase tracking-widest text-white/50">{sp.l}</span>
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
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 0.9 } });

    tl.from("[data-glow]", { x: 120, autoAlpha: 0, duration: 1.3, ease: "power2.out" }, 0)
      .from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 }, 0)
      .from("[data-eyebrow]", { x: -24, autoAlpha: 0, duration: 0.5 }, "-=0.1")
      // kinetische slide-in van de regels
      .from("[data-line]", { x: -80, autoAlpha: 0, stagger: 0.12 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0, ease: "power3.out" }, "-=0.5")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-stat]", { y: 30, autoAlpha: 0, stagger: 0.12, ease: "power3.out" }, "-=0.2")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count), el.dataset.suffix ?? "")
        );
      }, "-=0.2");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-glow], [data-nav], [data-eyebrow], [data-line], [data-sub], [data-actions] > *, [data-stat]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = (el.dataset.count ?? "0") + (el.dataset.suffix ?? ""); });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Kinetische headline (Syncopate, brede tracking) met `text-cta` accent op donkere `canvas`.
- [ ] Speed-line glow schuift in; spec-counters tellen op (0–100, PK, km) via GSAP.
- [ ] Eén `gsap.timeline()`: glow + nav → eyebrow → lines (kinetic `x`) → sub → actions → specs.
- [ ] Eases: `power4.out`/`power3.out` (entrees), `back.out(1.7)` (CTA's).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; proefrit/configureer-CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast op donkere achtergrond.
