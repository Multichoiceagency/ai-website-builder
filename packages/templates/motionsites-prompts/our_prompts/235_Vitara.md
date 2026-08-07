# Vitara — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een frisse, productgerichte hero voor "Vitara" — een modern wellness/SaaS-merk: een rustige headline, propositie en een feature-card met social proof (gebruikers, rating). Schoon, geometrisch en converterend richting de gratis start.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused (testimonials, success-metrics, rating, credibility markers).
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
  maxWidth: { content: "76rem" },
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope met data-attribuut-targets. `gsap.matchMedia()` voor reduced-motion (alles direct zichtbaar, geen beweging).

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
import { ArrowRight, Star, Leaf } from "lucide-react";

export default function VitaraHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-ice font-sans text-ink">
      <div data-glow className="pointer-events-none absolute -right-20 top-10 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"><Leaf className="h-5 w-5 text-primary" /> Vitara</span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Product", "Pricing", "Verhalen"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer transition-colors duration-200 hover:text-primary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#start" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105">Gratis starten</a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <Pill data-hero><Star className="h-3.5 w-3.5 fill-cta text-cta" /> 4.8/5 — geliefd door 30k+ leden</Pill>
          <h1 data-hero className="mt-6 font-heading text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
            Meer energie, minder ruis.
          </h1>
          <p data-hero className="mt-6 max-w-md text-lg text-ink/70">
            Vitara helpt je dagelijkse gewoontes opbouwen die echt blijven plakken — rustig en meetbaar.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-3">
            <a href="#start" className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cta px-6 py-3 font-semibold text-white transition-transform duration-200 hover:scale-105">
              Begin gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#product" className="cursor-pointer rounded-full border border-ink/15 bg-white px-6 py-3 font-semibold transition-colors hover:border-primary/40">Hoe het werkt</a>
          </div>
          <div data-stat className="mt-12 flex gap-10">
            {[["30k+", "leden"], ["92%", "blijft"], ["4.8", "rating"]].map(([n, l]) => (
              <div key={l}><div className="font-heading text-3xl font-semibold text-primary">{n}</div><div className="text-sm text-ink/60">{l}</div></div>
            ))}
          </div>
        </div>

        {/* feature card */}
        <div data-card className="rounded-3xl border border-white bg-white p-6 shadow-[0_24px_70px_rgba(14,165,233,0.16)]">
          <div className="mb-4 text-sm font-semibold text-ink/70">Jouw week in één oogopslag</div>
          <div className="flex items-end justify-between gap-2">
            {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div data-bar className="w-full origin-bottom rounded-t-md bg-gradient-to-t from-primary to-secondary" style={{ height: `${h}px` }} />
                <span className="text-[10px] text-ink/40">{["M","D","W","D","V","Z","Z"][i]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[["Streak", "12 dagen"], ["Focus", "+18%"]].map(([k, v]) => (
              <div key={k} data-kpi className="rounded-xl border border-ink/10 p-3"><div className="text-xs text-ink/50">{k}</div><div className="font-heading text-base font-semibold">{v}</div></div>
            ))}
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
      // bars grow with scaleY (transform-only, never height)
      .from("[data-bar]", { scaleY: 0, autoAlpha: 0, stagger: 0.07, ease: "back.out(1.7)" }, "-=0.3")
      .from("[data-kpi]", { y: 16, autoAlpha: 0, stagger: 0.1 }, "-=0.3")
      .from("[data-stat] > div", { y: 22, autoAlpha: 0, stagger: 0.1 }, "-=0.5");

    gsap.to("[data-glow]", { y: 26, scale: 1.06, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-kpi], [data-stat] > div, [data-glow]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.set("[data-bar]", { scaleY: 1, autoAlpha: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Feature-card met week-bars (groeien via `scaleY`, niet height) en KPI's; achtergrond-glow ademt.
- [ ] Entrance: nav → hero-copy → card → bars (`back.out`) → KPI's → stats, gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit + toont bars direct bij `prefers-reduced-motion: reduce`.
- [ ] Sky-palet + warm-oranje CTA; Outfit/Work Sans typografie; `max-w-content` toegepast.
- [ ] Social proof (leden, retentie, rating) zichtbaar; gratis-start-CTA bereikbaar.
- [ ] `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen; responsive 375/768/1024/1440px.
