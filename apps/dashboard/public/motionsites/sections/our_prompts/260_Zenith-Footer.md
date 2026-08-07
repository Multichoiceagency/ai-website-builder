# Zenith Footer — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Footer Section · footer), met design-system via ui-ux-pro-max en GSAP-animatie.

Een premium glasmorfe footer voor "Zenith" met een grote afsluitende CTA-strook, link-kolommen, een nieuwsbrief-veld, social-iconen en een legal-baseline. Bedoeld als laatste conversiemoment en navigatie-afsluiting met een verfijnde, gelaagde uitstraling.

## Design system (ui-ux-pro-max)

- **Stijl:** Glassmorphism — frosted glass, transparant, blurred achtergrond, gelaagd, diepte. Patroon: *Hero + Features + CTA* (deep CTA-placement, contrasterende accentkleur).
- **Kleurenpalet (hex tokens):**
  - Primary `#2563EB` (blauw)
  - Secondary `#3B82F6` (helder blauw)
  - CTA `#F97316` (oranje accent)
  - Surface `#0F172A` (donkere footer-canvas, afgeleid van `#1E293B`)
  - Glass `rgba(255,255,255,0.06)` met `border rgba(255,255,255,0.15)`
  - Text `#E2E8F0` (licht), muted `#94A3B8`
- **Typografie (Google Fonts):** Inter voor headings en body (professional + hiërarchie).
- **Key effects:** backdrop-blur (10–20px), subtiele 1px witte border (rgba 0.2), lichtreflectie, Z-depth, zachte gradient-glow.
- **Anti-patterns vermijden:** overmatige animatie, dark-mode als default forceren (dit is een footer, donker mag) — hou animaties subtiel.

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
    surface: "#0F172A",
    ink: "#E2E8F0",
    muted: "#94A3B8",
  },
  fontFamily: { sans: ["Inter", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

## Helpers

```tsx
// Scoped entrance gekoppeld aan ScrollTrigger (footer komt onderin in beeld).
// matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger, useGSAP);
```

## Structure

```tsx
import { useRef } from "react";
import { ArrowRight, Twitter, Github, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ZenithFooter() {
  const root = useRef<HTMLElement>(null);
  const cols = [
    { h: "Product", l: ["Features", "Prijzen", "Changelog", "Roadmap"] },
    { h: "Bedrijf", l: ["Over ons", "Blog", "Carrière", "Contact"] },
    { h: "Resources", l: ["Docs", "API", "Support", "Status"] },
  ];

  return (
    <footer ref={root} className="relative overflow-hidden bg-surface font-sans text-ink">
      {/* Gradient glow */}
      <div data-glow className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      {/* CTA glass-strook */}
      <div data-cta className="relative z-10 mx-auto mt-20 max-w-5xl px-6">
        <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-10 text-center backdrop-blur-xl">
          <h2 className="text-3xl font-700 tracking-tight md:text-4xl">Klaar om het toppunt te bereiken?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">Begin vandaag met Zenith — geen creditcard nodig.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <input
              type="email"
              placeholder="jij@bedrijf.nl"
              className="w-full max-w-xs rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-primary"
            />
            <button className="group flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-6 py-3 font-600 text-white transition-transform hover:scale-105">
              Start nu
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Link-kolommen */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div data-col>
          <span className="text-2xl font-700 tracking-tight">Zenith</span>
          <p className="mt-3 max-w-xs text-sm text-muted">Het platform dat je team naar grotere hoogten brengt.</p>
          <div className="mt-5 flex gap-3">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
              <a key={i} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] transition-colors hover:border-primary hover:text-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div data-col key={c.h}>
            <h3 className="text-sm font-700 uppercase tracking-wider text-muted">{c.h}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.l.map((item) => (
                <li key={item}>
                  <a className="cursor-pointer text-ink/80 transition-colors hover:text-primary">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Baseline */}
      <div data-base className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted md:flex-row">
          <span>© {new Date().getFullYear()} Zenith. Alle rechten voorbehouden.</span>
          <div className="flex gap-6">
            <a className="cursor-pointer transition-colors hover:text-ink">Privacy</a>
            <a className="cursor-pointer transition-colors hover:text-ink">Voorwaarden</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

## Animation (GSAP)

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out", duration: 0.8 },
      scrollTrigger: { trigger: root.current, start: "top 80%" },
    });

    tl.from("[data-glow]", { scale: 0.7, autoAlpha: 0, duration: 1.2 })
      .from("[data-cta]", { y: 40, autoAlpha: 0, scale: 0.97, duration: 1 }, "-=0.8")
      .from("[data-col]", { y: 24, autoAlpha: 0, stagger: 0.12 }, "-=0.4")
      .from("[data-base]", { y: 14, autoAlpha: 0 }, "-=0.3");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-glow], [data-cta], [data-col], [data-base]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Glasmorfe CTA-strook met `backdrop-blur` + 1px witte border op donkere surface; Inter-typografie.
- [ ] Entrance scrolt in via ScrollTrigger (`start: "top 80%"`) en staggert glow → CTA → kolommen → baseline.
- [ ] Alleen transform-aliases (`x`, `y`, `scale`, `autoAlpha`); glow via `scale` (geen blur/width-animatie).
- [ ] Eén `gsap.timeline()`; eases `power3.out` (built-in); animaties bewust subtiel.
- [ ] `gsap.matchMedia()` zet alles statisch bij `prefers-reduced-motion: reduce`.
- [ ] Nieuwsbrief-input met zichtbare focus-state; social-iconen als SVG (Lucide), `cursor-pointer` + hover.
- [ ] `useGSAP` `{ scope: root }` voor cleanup; responsive 375 / 768 / 1024 / 1440px, tekstcontrast op donker ≥ 4.5:1.
