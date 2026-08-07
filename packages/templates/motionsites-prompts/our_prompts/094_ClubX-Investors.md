# ClubX Investors — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vertrouwenwekkende hero voor een besloten investeringsclub: een sterke value-prop, een "apply for access"-CTA en een portfolio-/performance-card met social proof (AUM, leden, rendement). Zakelijk, helder en credibility-gedreven.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused (success-metrics, member-avatars, credibility markers, rating).
- **Kleurenpalet (hex tokens):**
  - `primary` `#0EA5E9` (trust blue)
  - `secondary` `#38BDF8` (blue-light)
  - `cta` `#F97316` (warm orange)
  - `bg` `#F0F9FF` (ice)
  - `text` `#0C4A6E` (deep navy)
- **Font pairing (Google Fonts):** Outfit (heading) + Work Sans (body) — geometric, modern, contemporary.
- **Key effects:** stat count-up, logo/avatar grid fade-in, mini-chart reveal, rating-sterren. Hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#0EA5E9", secondary: "#38BDF8", cta: "#F97316", ice: "#F0F9FF", navy: "#0C4A6E" },
  fontFamily: { heading: ["Outfit", "sans-serif"], sans: ["Work Sans", "system-ui", "sans-serif"] },
  maxWidth: { content: "78rem" },
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope. `gsap.matchMedia()` voor reduced-motion. De mini-equity-chart is een inline SVG-polyline die we via `drawSVG`-achtig effect simuleren met `scaleX` op een masker (transform-only, geen plugin).

```tsx
import { cn } from "@/lib/utils";
function Badge({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={cn("inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-4 py-1.5 text-xs font-medium text-primary", className)}>{children}</span>;
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";

export default function ClubXInvestorsHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-ice font-sans text-navy">
      <div data-glow className="pointer-events-none absolute right-0 top-0 h-80 w-[36rem] rounded-full bg-secondary/25 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="font-heading text-lg font-semibold tracking-tight">Club<span className="text-primary">X</span></span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Strategy", "Track record", "Members"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase().replace(" ", "-")}`} className="cursor-pointer transition-colors duration-200 hover:text-primary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#apply" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105">Apply for access</a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <Badge data-hero><ShieldCheck className="h-3.5 w-3.5" /> Invite-only investor club</Badge>
          <h1 data-hero className="mt-6 font-heading text-5xl font-semibold leading-[1.03] tracking-tight md:text-7xl">
            Slim kapitaal, samen aan tafel.
          </h1>
          <p data-hero className="mt-6 max-w-md text-lg text-navy/70">
            Een besloten kring investeerders met gedeelde deal-flow, due-diligence en discipline.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-3">
            <a href="#apply" className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cta px-6 py-3 font-semibold text-white transition-transform duration-200 hover:scale-105">
              Aanvraag indienen <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#track-record" className="cursor-pointer rounded-full border border-navy/15 bg-white px-6 py-3 font-semibold transition-colors hover:border-primary/40">Track record</a>
          </div>
          <div data-stat className="mt-12 flex gap-10">
            {[["€480M", "AUM"], ["320", "leden"], ["+14%", "p.j."]].map(([n, l]) => (
              <div key={l}><div className="font-heading text-3xl font-semibold text-primary">{n}</div><div className="text-sm text-navy/60">{l}</div></div>
            ))}
          </div>
        </div>

        {/* performance card */}
        <div data-card className="rounded-3xl border border-navy/10 bg-white p-6 shadow-[0_24px_70px_rgba(14,165,233,0.16)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-navy/70">Portfolio performance</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><TrendingUp className="h-3.5 w-3.5" /> +14.2%</span>
          </div>
          {/* equity curve */}
          <div className="relative h-40 overflow-hidden rounded-xl bg-ice">
            <svg viewBox="0 0 300 140" className="h-full w-full">
              <polyline data-curve points="0,120 50,100 100,108 150,70 200,80 250,40 300,30" fill="none" stroke="#0EA5E9" strokeWidth="3" />
            </svg>
            <div data-mask className="absolute inset-y-0 right-0 origin-right bg-white" style={{ width: "100%" }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[["YTD", "+9.1%"], ["3y", "+46%"], ["Sharpe", "1.8"]].map(([k, v]) => (
              <div key={k} data-kpi className="rounded-lg border border-navy/10 p-3"><div className="text-xs text-navy/50">{k}</div><div className="font-heading text-base font-semibold">{v}</div></div>
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
      // reveal equity curve by sliding the cover mask off (scaleX, transform-only)
      .fromTo("[data-mask]", { scaleX: 1 }, { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, "-=0.3")
      .from("[data-kpi]", { y: 16, autoAlpha: 0, stagger: 0.08, ease: "back.out(1.7)" }, "-=0.6")
      .from("[data-stat] > div", { y: 22, autoAlpha: 0, stagger: 0.1 }, "-=0.6");

    gsap.to("[data-glow]", { scale: 1.07, autoAlpha: 0.8, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-kpi], [data-stat] > div, [data-glow]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.set("[data-mask]", { scaleX: 0 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Performance-card met equity-curve die wordt onthuld via een wegschuivend masker (`scaleX`, transform-only).
- [ ] Entrance: nav → hero-copy → card → curve-reveal → KPI's (`back.out`) → stats, gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit + toont curve direct bij `prefers-reduced-motion: reduce`.
- [ ] Trust-blue palet + warm-oranje CTA; Outfit/Work Sans typografie; `max-w-content`.
- [ ] Social proof (AUM, leden, rendement, Sharpe) zichtbaar; apply-CTA bereikbaar.
- [ ] `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen; responsive 375/768/1024/1440px.
