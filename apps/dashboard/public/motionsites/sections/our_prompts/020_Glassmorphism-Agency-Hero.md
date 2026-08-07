# Glassmorphism Agency Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Agency · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een hero voor een creatief agency-merk waarin oversized statement-typografie boven een donkere, sfeervolle achtergrond zweeft, met frosted-glass kaartjes (clients, capabilities, CTA) die als glaslagen over de scene drijven. Doel: direct gezag en stijl uitstralen en de bezoeker naar "Start een project" leiden.

## Design system (ui-ux-pro-max)

- **Style:** Exaggerated Minimalism — bold minimalism, oversized typografie, high contrast, veel negative space, glaslagen.
- **Pattern:** Video-/sfeer-first hero met overlay-CTA en glass-cards.
- **Color palette (hex tokens):**
  - `primary` `#EC4899` (bold pink)
  - `secondary` `#F472B6` (soft pink)
  - `cta` `#06B6D4` (cyan accent)
  - `bg` `#FDF2F8` (licht) / dark canvas `#1A0B14` voor de hero
  - `text` `#831843`
- **Font pairing (Google Fonts):** Inter voor heading én body (`wght 300;400;500;600`), mood: spatial, glass, clean.
- **Key effects:** `font-size: clamp(3rem, 10vw, 12rem)`, `font-weight: 900`, `letter-spacing: -0.05em`, massive whitespace, frosted glass (`backdrop-blur`) cards, subtiele kleur-gradient glow.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge) voor conditionele classes.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts — kleur-tokens uit het palette
extend: {
  colors: {
    primary: "#EC4899",
    secondary: "#F472B6",
    cta: "#06B6D4",
    canvas: "#1A0B14",
    ink: "#831843",
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
}
```

```tsx
// main: registreer plugin éénmalig
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
```

## Helpers

- `useGSAP(() => {...}, { scope: rootRef })` zorgt voor automatische cleanup van alle tweens binnen de hero.
- Een kleine `GlassCard` wrapper: `cn("rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl", className)`.
- Gebruik `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)` zodat alles direct zichtbaar staat.

## Structure

```tsx
export function GlassmorphismAgencyHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-canvas text-white">
      {/* ambient color glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/30 blur-[120px]" data-glow />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-cta/20 blur-[120px]" data-glow />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="text-lg font-semibold tracking-tight">studio<span className="text-primary">.</span></span>
        <div className="hidden gap-8 text-sm text-white/70 md:flex">
          <a href="#work" className="cursor-pointer hover:text-white">Work</a>
          <a href="#about" className="cursor-pointer hover:text-white">Studio</a>
          <a href="#contact" className="cursor-pointer hover:text-white">Contact</a>
        </div>
        <a href="#contact" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-medium text-canvas transition-colors hover:bg-cyan-300">Let's talk</a>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="mb-6 text-sm uppercase tracking-[0.3em] text-primary" data-eyebrow>Creative agency</p>
          <h1 className="font-black leading-[0.9] tracking-[-0.05em] text-[clamp(3rem,10vw,9rem)]">
            <span className="block" data-line>We build</span>
            <span className="block bg-gradient-to-r from-primary to-cta bg-clip-text text-transparent" data-line>brands that</span>
            <span className="block" data-line>move people.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg text-white/70" data-sub>
            Strategy, design en motion voor merken die durven opvallen.
          </p>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-4">
          {["Brand strategy", "Web & motion", "Art direction"].map((c) => (
            <div key={c} className={cn("rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl")} data-card>
              <p className="text-base font-medium">{c}</p>
              <p className="mt-1 text-sm text-white/60">Premium delivery, end to end.</p>
            </div>
          ))}
          <a href="#contact" className="cursor-pointer rounded-2xl bg-cta px-6 py-4 text-center font-semibold text-canvas transition-colors hover:bg-cyan-300" data-card>
            Start een project →
          </a>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

    tl.from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.6 })
      .from("[data-eyebrow]", { y: 20, autoAlpha: 0, duration: 0.5 }, "-=0.2")
      .from("[data-line]", { y: 80, autoAlpha: 0, stagger: 0.12 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.4")
      .from("[data-card]", { y: 40, autoAlpha: 0, scale: 0.96, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.5")
      .from("[data-glow]", { autoAlpha: 0, scale: 0.8, duration: 1.4, ease: "power2.out" }, 0);

    // zacht zwevende glass-cards
    gsap.to("[data-card]", { y: "+=8", duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-eyebrow], [data-line], [data-sub], [data-card], [data-glow]", { autoAlpha: 1, y: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Oversized headline schaalt via `clamp(3rem, 10vw, 9rem)` met `tracking-[-0.05em]` en `font-black`.
- [ ] Glass-cards tonen `backdrop-blur-xl` + `border-white/15` en zweven subtiel.
- [ ] Entree via één `gsap.timeline()` met staggered `y`/`autoAlpha`/`scale`, eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles direct zichtbaar (geen motion).
- [ ] Alleen transform-aliases geanimeerd (`x/y/scale/autoAlpha`), nooit width/height/top/left.
- [ ] CTA's hebben `cursor-pointer`, zichtbare focus-states en hover-transitions 150–300ms.
- [ ] Tekstcontrast voldoet aan WCAG AA op donkere canvas; responsive op 375 / 768 / 1024 / 1440px.
- [ ] Contact-CTA prominent zichtbaar (geen verborgen contactinfo).
