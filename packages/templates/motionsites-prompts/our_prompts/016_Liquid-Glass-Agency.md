# Liquid Glass Agency — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een agency-landingshero waarin frosted "liquid glass"-panelen over een sky-blue verloop zweven: een geloofwaardige headline, social-proof (logo's + stats) en een warme CTA die direct naar contact converteert. De glass-esthetiek wordt gedragen door subtiele blur, randlicht en zachte reflecties — geheel met de hand opgebouwd, geen gekopieerde tekst.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused + glass / spatial typografie-mood (testimonials, client-logo's, success-metrics, credibility markers).
- **Kleurenpalet (hex tokens):**
  - `primary` `#0EA5E9` (sky)
  - `secondary` `#38BDF8` (sky-light)
  - `cta` `#F97316` (warm orange)
  - `bg` `#F0F9FF` (ice)
  - `text` `#0C4A6E` (deep teal)
- **Font pairing (Google Fonts):** Inter (heading) + Inter (body) — spatial, legible, glass, clean.
- **Key effects:** glass-panel blur + randlicht, logo grid fade-in, stat count-up, zachte parallax. Hover-transities 150–300ms. Geen emoji-iconen (Lucide SVG), `cursor-pointer`, focus-states, `prefers-reduced-motion` respecteren.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge).
- Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens (`tailwind.config.ts`):

```ts
extend: {
  colors: {
    primary: "#0EA5E9", secondary: "#38BDF8",
    cta: "#F97316", ice: "#F0F9FF", ink: "#0C4A6E",
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
  maxWidth: { content: "80rem" }, // 1280px
}
```

- Fonts via `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap')`.
- Max content-breedte: `max-w-content mx-auto px-6`.

## Helpers

`Reveal` als opt-in wrapper en een gedeelde `useGSAP`-scope. Gebruik `gsap.matchMedia()` voor reduced-motion: bij `(prefers-reduced-motion: reduce)` zetten we elementen direct zichtbaar (`autoAlpha: 1`) zonder beweging.

```tsx
// GlassPanel.tsx — herbruikbaar frosted paneel
import { cn } from "@/lib/utils";
export function GlassPanel({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn(
      "rounded-3xl border border-white/40 bg-white/30 backdrop-blur-xl",
      "shadow-[0_8px_40px_rgba(14,165,233,0.18)] ring-1 ring-inset ring-white/50",
      className
    )}>{children}</div>
  );
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { GlassPanel } from "./GlassPanel";

export default function LiquidGlassHero() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-ice text-ink">
      {/* liquid backdrop */}
      <div data-blob className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-secondary/40 blur-3xl" />
      <div data-blob className="pointer-events-none absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="text-lg font-semibold tracking-tight">Liquid<span className="text-primary">Glass</span></span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Work", "Services", "Studio"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer transition-colors duration-200 hover:text-primary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#contact" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-medium text-white transition-transform duration-200 hover:scale-105">Start a project</a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content gap-10 px-6 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
        <div>
          <span data-hero className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/40 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Digital design studio
          </span>
          <h1 data-hero className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Interfaces met diepte, helderheid en glans.
          </h1>
          <p data-hero className="mt-6 max-w-md text-lg text-ink/70">
            Wij bouwen merkbeleving die voelt als glas: licht, transparant en perfect afgewerkt.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cta px-6 py-3 font-medium text-white transition-transform duration-200 hover:scale-105">
              Plan een gesprek <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#work" className="cursor-pointer rounded-full border border-ink/15 bg-white/40 px-6 py-3 font-medium backdrop-blur transition-colors hover:border-primary/40">Bekijk werk</a>
          </div>
          {/* social proof */}
          <div data-stat className="mt-12 flex gap-8">
            {[["120+", "projecten"], ["98%", "tevredenheid"], ["14", "awards"]].map(([n, l]) => (
              <div key={l}><div className="text-3xl font-semibold text-primary">{n}</div><div className="text-sm text-ink/60">{l}</div></div>
            ))}
          </div>
        </div>

        <GlassPanel data-card className="self-center p-7">
          <div className="mb-5 text-sm font-medium text-ink/60">Vertrouwd door teams</div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} data-logo className="flex h-14 items-center justify-center rounded-xl bg-white/50 text-sm font-semibold text-ink/40">Logo</div>
            ))}
          </div>
        </GlassPanel>
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
    tl.from("[data-nav]", { y: -20, autoAlpha: 0, stagger: 0.08 })
      .from("[data-hero]", { y: 40, autoAlpha: 0, stagger: 0.12 }, "-=0.3")
      .from("[data-card]", { x: 60, autoAlpha: 0, scale: 0.96 }, "-=0.6")
      .from("[data-logo]", { autoAlpha: 0, scale: 0.8, stagger: 0.06, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-stat] > div", { y: 24, autoAlpha: 0, stagger: 0.1 }, "-=0.5");

    // floating liquid blobs (transform only)
    gsap.to("[data-blob]", { y: 30, scale: 1.06, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 1.5 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-logo], [data-stat] > div", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Glass-panelen tonen blur + randlicht + reflectie; achtergrond-blobs bewegen vloeiend (alleen transform).
- [ ] Entrance-timeline: nav → hero-copy → glass-card → logo's (`back.out`) → stats, gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases (`x/y/autoAlpha/scale`); geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit bij `prefers-reduced-motion: reduce`.
- [ ] Palet-tokens, Inter-typografie en `max-w-content` correct toegepast.
- [ ] CTA is warm-oranje, `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; contact-CTA altijd zichtbaar (geen verborgen contactinfo).
