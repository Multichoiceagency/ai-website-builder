# FlowMate — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een SaaS-landingshero voor "FlowMate", een productiviteits-/workflow-tool: heldere value-prop, een app-preview-card en social proof (logo's + rating), met een warme CTA voor de gratis trial. Modern, vriendelijk en converterend.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused (testimonials, client-logo's, success-metrics, rating-sterren).
- **Kleurenpalet (hex tokens):**
  - `primary` `#0EA5E9` (sky)
  - `secondary` `#38BDF8` (sky-light)
  - `cta` `#F97316` (warm orange)
  - `bg` `#F0F9FF` (ice)
  - `text` `#0C4A6E` (deep teal)
- **Font pairing (Google Fonts):** Outfit (heading) + Work Sans (body) — geometric, modern, contemporary, versatile.
- **Key effects:** logo grid fade-in, stat count-up, testimonial-reveal, rating-sterren. Hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#0EA5E9", secondary: "#38BDF8", cta: "#F97316", ice: "#F0F9FF", ink: "#0C4A6E" },
  fontFamily: { heading: ["Outfit", "sans-serif"], sans: ["Work Sans", "system-ui", "sans-serif"] },
  maxWidth: { content: "75rem" }, // 1200px
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope met data-attribuut-targets. `gsap.matchMedia()` voor reduced-motion. Een mini count-up wordt met GSAP gedaan via een proxy-object dat een tekstnode update.

```tsx
import { cn } from "@/lib/utils";
function Pill({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={cn("inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-4 py-1.5 text-xs font-medium text-primary", className)}>{children}</span>;
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Star, Check } from "lucide-react";

export default function FlowMateHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-ice font-sans text-ink">
      <div data-glow className="pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-secondary/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="font-heading text-xl font-semibold tracking-tight">Flow<span className="text-primary">Mate</span></span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Product", "Pricing", "Docs"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer transition-colors duration-200 hover:text-primary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#trial" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105">Gratis proberen</a>
      </header>

      <div className="relative z-10 mx-auto max-w-content px-6 pb-24 pt-16 text-center md:pt-24">
        <Pill data-hero><Star className="h-3.5 w-3.5 fill-cta text-cta" /> 4.9/5 op 2.000+ reviews</Pill>
        <h1 data-hero className="mx-auto mt-6 max-w-3xl font-heading text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Breng flow in elke werkdag.
        </h1>
        <p data-hero className="mx-auto mt-6 max-w-xl text-lg text-ink/70">
          FlowMate bundelt taken, automatisering en team-samenwerking in één rustige interface.
        </p>
        <div data-hero className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#trial" className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cta px-6 py-3 font-semibold text-white transition-transform duration-200 hover:scale-105">
            Start gratis trial <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#demo" className="cursor-pointer rounded-full border border-ink/15 bg-white px-6 py-3 font-semibold transition-colors hover:border-primary/40">Bekijk demo</a>
        </div>
        <ul data-hero className="mt-5 flex flex-wrap justify-center gap-5 text-sm text-ink/60">
          {["Geen creditcard", "14 dagen gratis", "Annuleer altijd"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> {t}</li>
          ))}
        </ul>

        {/* app preview card */}
        <div data-card className="mx-auto mt-16 max-w-4xl rounded-3xl border border-white bg-white p-3 shadow-[0_30px_80px_rgba(14,165,233,0.18)]">
          <div className="rounded-2xl bg-gradient-to-br from-ice to-white p-8">
            <div className="grid gap-4 md:grid-cols-3">
              {["Vandaag", "In uitvoering", "Klaar"].map((col) => (
                <div key={col} className="rounded-xl border border-ink/10 bg-white p-4 text-left">
                  <div className="mb-3 text-sm font-semibold">{col}</div>
                  {[0, 1].map((r) => <div key={r} data-task className="mb-2 h-8 rounded-lg bg-secondary/15" />)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* logos */}
        <div className="mt-14">
          <div className="mb-5 text-xs font-medium uppercase tracking-widest text-ink/50">Gebruikt door teams bij</div>
          <div className="flex flex-wrap items-center justify-center gap-10 opacity-70">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} data-logo className="text-base font-semibold text-ink/40">Logo {i + 1}</div>)}
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
      .from("[data-hero]", { y: 38, autoAlpha: 0, stagger: 0.1 }, "-=0.3")
      .from("[data-card]", { y: 60, autoAlpha: 0, scale: 0.96 }, "-=0.4")
      .from("[data-task]", { y: 14, autoAlpha: 0, stagger: 0.06, ease: "back.out(1.7)" }, "-=0.3")
      .from("[data-logo]", { autoAlpha: 0, y: 12, stagger: 0.07 }, "-=0.3");

    gsap.to("[data-glow]", { scale: 1.08, autoAlpha: 0.85, duration: 5, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-task], [data-logo], [data-glow]", { autoAlpha: 1, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Entrance-timeline: nav → hero-copy → app-card → taken (`back.out`) → logo's, gestaggerd.
- [ ] App-preview-card en logo-grid faden gestaggerd in; achtergrond-glow ademt (transform/opacity).
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit bij `prefers-reduced-motion: reduce`.
- [ ] Sky-palet + warm-oranje CTA, Outfit/Work Sans typografie, `max-w-content` toegepast.
- [ ] Rating + reviews zichtbaar; trial-CTA met `cursor-pointer`, hover 150–300ms, focus zichtbaar.
- [ ] Geen emoji-iconen (Lucide); responsive 375/768/1024/1440px; navigatie simpel, contact bereikbaar.
