# AI Designer Agency — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een minimalistische hero voor een AI-gedreven design-agency: een editorial headline, een korte propositie en een "AI-prompt-to-design"-showcasecard, ondersteund door social proof. Strak, artistiek en credible — gepositioneerd op het snijvlak van AI en craft.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused met minimal/designer-mood (testimonials, client-logo's, success-metrics, credibility markers).
- **Kleurenpalet (hex tokens):**
  - `primary` `#0EA5E9` (sky)
  - `secondary` `#38BDF8` (sky-light)
  - `cta` `#F97316` (warm orange)
  - `bg` `#F0F9FF` (ice)
  - `text` `#0C4A6E` (deep teal)
- **Font pairing (Google Fonts):** Archivo (heading) + Space Grotesk (body) — minimal, designer, creative, artistic.
- **Key effects:** logo grid fade-in, stat count-up, testimonial-reveal. Hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#0EA5E9", secondary: "#38BDF8", cta: "#F97316", ice: "#F0F9FF", ink: "#0C4A6E" },
  fontFamily: { heading: ["Archivo", "sans-serif"], sans: ["Space Grotesk", "system-ui", "sans-serif"] },
  maxWidth: { content: "78rem" },
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Space+Grotesk:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope. `gsap.matchMedia()` voor reduced-motion. Een licht "scramble"-gevoel simuleren we eenvoudig met een cursor-blink op de prompt (CSS), geen externe plugin.

```tsx
import { cn } from "@/lib/utils";
function Tag({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={cn("inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-1.5 text-xs font-medium tracking-wide text-ink/70", className)}>{children}</span>;
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AIDesignerHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-ice font-sans text-ink">
      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="font-heading text-lg font-bold tracking-tight">AI<span className="text-primary">·</span>Designer</span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Werk", "Aanpak", "Studio"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer transition-colors duration-200 hover:text-primary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#contact" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105">Brief insturen</a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <Tag data-hero><Sparkles className="h-3.5 w-3.5 text-primary" /> AI-augmented design studio</Tag>
          <h1 data-hero className="mt-6 font-heading text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            Design op het tempo van denken.
          </h1>
          <p data-hero className="mt-6 max-w-md text-lg text-ink/70">
            Wij combineren AI-snelheid met menselijke smaak — van concept tot pixelperfecte oplevering.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cta px-6 py-3 font-semibold text-white transition-transform duration-200 hover:scale-105">
              Start een project <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#werk" className="cursor-pointer rounded-full border border-ink/15 bg-white px-6 py-3 font-semibold transition-colors hover:border-primary/40">Bekijk werk</a>
          </div>
          <div data-stat className="mt-12 flex gap-10">
            {[["3x", "sneller concept"], ["200+", "merken"], ["4.9", "rating"]].map(([n, l]) => (
              <div key={l}><div className="font-heading text-3xl font-bold text-primary">{n}</div><div className="text-sm text-ink/60">{l}</div></div>
            ))}
          </div>
        </div>

        {/* prompt-to-design showcase */}
        <div data-card className="rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_24px_70px_rgba(14,165,233,0.16)]">
          <div data-prompt className="rounded-2xl bg-ink/[0.04] p-4 font-mono text-sm text-ink/80">
            <span className="text-primary">prompt&gt;</span> ontwerp een rustige fintech-app<span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-primary align-middle" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} data-frame className="aspect-[4/3] rounded-xl bg-gradient-to-br from-secondary/25 to-primary/15" />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-ink/50">
            <span>4 varianten gegenereerd</span><span className="text-primary">in 2.4s</span>
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
      .from("[data-hero]", { y: 40, autoAlpha: 0, stagger: 0.11 }, "-=0.3")
      .from("[data-card]", { x: 60, autoAlpha: 0, scale: 0.96 }, "-=0.6")
      .from("[data-prompt]", { autoAlpha: 0, y: 12 }, "-=0.4")
      .from("[data-frame]", { autoAlpha: 0, scale: 0.85, stagger: 0.08, ease: "back.out(1.7)" }, "-=0.2")
      .from("[data-stat] > div", { y: 22, autoAlpha: 0, stagger: 0.1 }, "-=0.5");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-prompt], [data-frame], [data-stat] > div", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Prompt-to-design card toont een prompt-regel met blink-cursor en 4 gegenereerde frames.
- [ ] Entrance: nav → hero-copy → showcase-card → prompt → frames (`back.out`) → stats, gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit bij `prefers-reduced-motion: reduce`.
- [ ] Sky-palet + warm-oranje CTA; Archivo/Space Grotesk minimal-designer typografie; `max-w-content`.
- [ ] Social proof (rating + stats + merken) zichtbaar; contact-CTA bereikbaar (geen verborgen contact).
- [ ] `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen; responsive 375/768/1024/1440px.
