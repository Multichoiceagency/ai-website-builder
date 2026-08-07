# Viktor Portfolio — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Portfolio · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een motion-driven portfolio-hero voor "Viktor" — een designer/creative. Naam en rol groot in beeld, een neutrale monochroom achtergrond die het werk laat ademen, en een teaser-grid van projecten met hover-overlays. Bedoeld om binnen seconden vakmanschap en stijl te tonen.

## Design system (ui-ux-pro-max)

- **Stijl:** Motion-Driven — animation-heavy, microinteractions, scroll-effecten, parallax, entrance-animaties (best voor portfolio's; let op prefers-reduced-motion).
- **Pattern:** Portfolio Grid — neutrale achtergrond, werk eerst, hover-overlay met info, masonry/grid.
- **Kleurenpalet (hex tokens):**
  - Primary `#18181B` (near-black)
  - Secondary `#3F3F46`
  - CTA `#2563EB` (blue accent)
  - Background `#FAFAFA`
  - Text `#09090B`
- **Typografie (Google Fonts):** Archivo (heading) + Space Grotesk (body) — minimal, designer, artistic.
- **Key effects:** scroll-anim (Intersection Observer), hover 300–400ms, entrance, parallax (3–5 lagen), page transitions.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#18181B",
    secondary: "#3F3F46",
    cta: "#2563EB",
    surface: "#FAFAFA",
    ink: "#09090B",
  },
  fontFamily: {
    display: ["Archivo", "system-ui", "sans-serif"],
    body: ["'Space Grotesk'", "system-ui", "sans-serif"],
  },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Project-tile met hover-overlay (info verschijnt bij hover, 350ms).

```tsx
import { cn } from "@/lib/utils";

export function ProjectTile({ title, tag, className }: { title: string; tag: string; className?: string }) {
  return (
    <a href="#" data-anim="tile" className={cn(
      "group relative block cursor-pointer overflow-hidden rounded-2xl bg-secondary/10 ring-1 ring-ink/5",
      className,
    )}>
      <div className="aspect-[4/3] bg-gradient-to-br from-secondary/20 to-primary/10 transition-transform duration-[400ms] group-hover:scale-105" />
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/70 to-transparent p-5 opacity-0 transition-opacity duration-[350ms] group-hover:opacity-100">
        <div className="text-surface">
          <p className="text-xs uppercase tracking-widest text-surface/70">{tag}</p>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
        </div>
      </div>
    </a>
  );
}
```

## Structure

```tsx
export default function ViktorPortfolioHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-body text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="font-display text-lg font-bold">Viktor.</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#work" className="cursor-pointer hover:text-cta">Work</a>
          <a href="#about" className="cursor-pointer hover:text-cta">About</a>
          <a href="#contact" className="cursor-pointer hover:text-cta">Contact</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-surface transition hover:bg-cta">
          Let's talk
        </button>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <p data-anim="eyebrow" className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">
          Designer · Art Director · Berlin
        </p>
        <h1 data-anim="title" className="mt-6 max-w-5xl font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          Crafting calm<br />interfaces with<br /><span className="text-cta">restless</span> detail.
        </h1>
        <div data-anim="cta" className="mt-10 flex flex-wrap items-center gap-6">
          <button className="cursor-pointer rounded-full bg-primary px-7 py-3.5 font-semibold text-surface transition hover:bg-cta">
            View selected work
          </button>
          <a href="#about" className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline">
            More about me →
          </a>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-3">
        <ProjectTile title="Aurora Banking" tag="Product · UI" className="md:row-span-2 md:aspect-auto" />
        <ProjectTile title="Field Notes" tag="Editorial" />
        <ProjectTile title="Soundwave" tag="Brand · Motion" />
        <ProjectTile title="Northpass" tag="Web · 3D" />
        <ProjectTile title="Studio Mono" tag="Identity" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <div data-anim="logos" className="flex flex-wrap items-center gap-10 text-sm opacity-50">
          {["Awwwards", "CSS Design", "FWA", "Behance"].map((b) => (
            <span key={b} className="font-display font-semibold">{b}</span>
          ))}
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

    tl.from("[data-anim='nav']", { y: -20, autoAlpha: 0, stagger: 0.08 })
      .from("[data-anim='eyebrow']", { y: 16, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='title']", { y: 44, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='cta']", { y: 20, autoAlpha: 0 }, "-=0.55")
      .from("[data-anim='tile']", { y: 48, autoAlpha: 0, scale: 0.96, stagger: 0.12, ease: "back.out(1.5)" }, "-=0.3")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    // lichte parallax op de tiles bij scroll-vrije mousebeweging is optioneel;
    // hier subtiele drift om de motion-driven stijl te onderstrepen
    gsap.to("[data-anim='title']", { y: -12, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1.2 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope });
```

## Acceptance

- [ ] Naam/rol, headline, CTA's en project-tiles verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Tiles hebben hover-overlay (300–400ms) met titel + tag; werk staat centraal op neutrale achtergrond.
- [ ] Subtiele looping drift alleen bij no-preference; reduced-motion zet alles direct zichtbaar en statisch.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.5)`, `sine.inOut`).
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion: reduce`; cleanup via `useGSAP` scope.
- [ ] Archivo + Space Grotesk geladen; monochroom palet + blauwe accent uit design system.
- [ ] `cursor-pointer` + focus-states op tiles/links; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
