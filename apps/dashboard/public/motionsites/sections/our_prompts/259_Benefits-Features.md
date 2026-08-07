# Benefits Features — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Features Section · features), met design-system via ui-ux-pro-max en GSAP-animatie.

Een levendige, block-based features-sectie die kernvoordelen van een product toont in een bento-achtig raster van kaarten met iconen, korte titels en een CTA. Bold, energiek en converterend — bedoeld als de "waarom"-sectie onder de hero.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Vibrant & Block-based (bold, energetic, block layout, geometric shapes, high color contrast).
- **Kleurenpalet (hex tokens):**
  - `primary` `#2563EB` (blue)
  - `secondary` `#3B82F6` (blue-light)
  - `cta` `#F97316` (warm orange)
  - `bg` `#F8FAFC` (slate-50)
  - `text` `#1E293B` (slate-800)
- **Font pairing (Google Fonts):** Inter (heading) + Inter (body) — modern, friendly.
- **Key effects:** grote secties (48px+ gaps), bold hover (color shift), grote type (32px+), 200–300ms transities, scroll-snap-gevoel.
- **Anti-patterns vermijden:** generic profiles, geen veiligheid/contrast — zorg voor WCAG-contrast.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#2563EB", secondary: "#3B82F6", cta: "#F97316", surface: "#F8FAFC", ink: "#1E293B" },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
  maxWidth: { content: "76rem" },
}
```

- Font: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope. `gsap.matchMedia()` voor reduced-motion. Kaarten faden vanuit een lichte y-offset met stagger; de eyebrow/heading komt eerst.

```tsx
import { cn } from "@/lib/utils";
function FeatureCard({ title, body, icon: Icon, className }: {
  title: string; body: string; icon: React.ComponentType<{ className?: string }>; className?: string;
}) {
  return (
    <article data-card className={cn(
      "group rounded-3xl border border-ink/10 bg-white p-7 transition-colors duration-300 hover:border-primary/40 hover:bg-primary/[0.03]",
      className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-ink/65">{body}</p>
    </article>
  );
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Zap, ShieldCheck, BarChart3, Rocket, Layers, Clock } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

const FEATURES = [
  { icon: Zap, title: "Razendsnel", body: "Sub-seconde laadtijden, overal ter wereld." },
  { icon: ShieldCheck, title: "Veilig by design", body: "Versleuteld, gecertificeerd en privacy-first." },
  { icon: BarChart3, title: "Inzicht direct", body: "Realtime metrics zonder configuratie." },
  { icon: Rocket, title: "Snel live", body: "Van setup tot launch in minuten." },
  { icon: Layers, title: "Schaalbaar", body: "Groeit moeiteloos mee met je team." },
  { icon: Clock, title: "24/7 support", body: "Echte mensen, altijd bereikbaar." },
];

export default function BenefitsFeatures() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-surface py-24 font-sans text-ink md:py-32">
      <div data-blob className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-content px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span data-head className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">Voordelen</span>
          <h2 data-head className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Alles wat je nodig hebt, niets wat afleidt.
          </h2>
          <p data-head className="mt-4 text-lg text-ink/65">
            Krachtige features die het verschil maken — gebouwd voor snelheid, schaal en gemoedsrust.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>

        <div data-cta className="mt-14 flex flex-col items-center justify-center gap-4 rounded-3xl bg-primary p-10 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight">Klaar om te starten?</h3>
            <p className="mt-1 text-white/80">Probeer alle features 14 dagen gratis.</p>
          </div>
          <a href="#start" className="cursor-pointer rounded-full bg-cta px-7 py-3 font-bold text-white transition-transform duration-200 hover:scale-105">Start gratis</a>
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
    tl.from("[data-head]", { y: 32, autoAlpha: 0, stagger: 0.12 })
      .from("[data-card]", { y: 48, autoAlpha: 0, scale: 0.96, stagger: 0.09, ease: "back.out(1.7)" }, "-=0.3")
      .from("[data-cta]", { y: 36, autoAlpha: 0 }, "-=0.2");

    gsap.to("[data-blob]", { y: 30, scale: 1.08, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-head], [data-card], [data-cta], [data-blob]", { autoAlpha: 1, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Bento-achtig 3-koloms feature-raster met icon-tiles en bold color-shift hover.
- [ ] Entrance: heading-blok → feature-cards (`back.out`, gestaggerd) → CTA-blok.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit bij `prefers-reduced-motion: reduce`.
- [ ] Vibrant blue-palet + warm-oranje CTA; Inter modern/friendly; grote type (32px+) en ruime gaps.
- [ ] WCAG-contrast gewaarborgd (geen low-contrast); CTA-blok met `cursor-pointer`, hover 150–300ms, focus zichtbaar.
- [ ] Geen emoji-iconen (Lucide SVG); responsive 375/768/1024/1440px.
