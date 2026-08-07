# Dark Portfolio Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Portfolio · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een donkere, minimalistische portfolio-hero voor een designer/developer: een oversized naam/rol-statement, korte intro, beschikbaarheids-badge en een teaser-grid met geselecteerd werk dat als masonry binnenkomt. Doel: bezoeker imponeren en naar het werk + contact leiden.

## Design system (ui-ux-pro-max)

- **Pattern:** Portfolio Grid — neutrale achtergrond zodat het werk spreekt, hover-overlay op cards, contact in footer.
- **Stijl:** minimal/portfolio/designer — clean, artistiek, monochroom met blauw accent.
- **Kleurtokens (hex):**
  - Primary `#18181B` (ink/zinc)
  - Secondary `#3F3F46`
  - CTA `#2563EB` (blue accent)
  - Background `#09090B` (donker — "dark" variant; werk-cards zijn licht)
  - Text `#FAFAFA`
- **Font pairing (Google Fonts):** Heading **Archivo** (300–700), Body **Space Grotesk** (300–700) — minimal, creative, clean.
- **Key effects:** statement-reveal per regel, masonry-cards fade/scale-in, hover-overlay met project-info, magnetische CTA-hint.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-6xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#18181B', secondary:'#3F3F46', cta:'#2563EB', bg:'#09090B', ink:'#FAFAFA' },
  fontFamily: { display: ['Archivo','sans-serif'], sans: ['"Space Grotesk"','sans-serif'] },
  ```
- Install: `npm i gsap @gsap/react`.

## Helpers

```tsx
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- `useGSAP(() => {...}, { scope: rootRef })` voor cleanup.
- Statement-reveal: elke regel in een overflow-masker, anim `yPercent`.
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function DarkPortfolioHero() {
  const rootRef = useRef<HTMLElement>(null);
  const projects = [
    { t: 'Aurora', tag: 'Brand · 2025', span: 'row-span-2' },
    { t: 'Northwind', tag: 'Product · 2024', span: '' },
    { t: 'Cobalt', tag: 'Web · 2024', span: '' },
    { t: 'Lumen', tag: 'Motion · 2023', span: 'row-span-2' },
  ];
  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-bg font-sans text-ink">
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cta/10 blur-3xl" />

      <nav data-nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold tracking-tight">Studio<span className="text-cta">.</span></span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Work','About','Process','Contact'].map((l) => (
            <a key={l} href="#" className="text-ink/60 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-full border border-ink/20 px-5 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-bg cursor-pointer">
          Let's talk
        </button>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16">
        <span data-badge className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1 text-xs text-ink/70">
          <span className="h-2 w-2 rounded-full bg-cta" /> Available for new projects
        </span>
        <h1 className="mt-8 font-display text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl">
          <span className="block overflow-hidden"><span data-line className="block">Designer &</span></span>
          <span className="block overflow-hidden"><span data-line className="block text-ink/50">developer.</span></span>
        </h1>
        <p data-intro className="mt-8 max-w-md text-lg text-ink/60">
          I craft minimal, fast interfaces and motion for ambitious brands. Selected work below.
        </p>
      </div>

      {/* werk-grid */}
      <div data-grid className="relative z-10 mx-auto mt-16 grid max-w-6xl auto-rows-[180px] grid-cols-2 gap-4 px-6 pb-24 md:grid-cols-4">
        {projects.map((p) => (
          <article
            key={p.t}
            data-tile
            className={cn('group relative overflow-hidden rounded-xl border border-white/5 bg-secondary/30', p.span)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary opacity-80" />
            <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <h3 className="font-display text-lg font-semibold">{p.t}</h3>
              <p className="text-xs text-ink/70">{p.tag}</p>
            </div>
          </article>
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

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('[data-nav]', { y: -24, autoAlpha: 0 })
      .from('[data-badge]', { y: 16, autoAlpha: 0 }, '-=0.4')
      // oversized statement per regel uit masker
      .from('[data-line]', { yPercent: 110, autoAlpha: 0, stagger: 0.16, duration: 1.1, ease: 'power4.out' }, '-=0.3')
      .from('[data-intro]', { y: 20, autoAlpha: 0 }, '-=0.6')
      // masonry tiles scale/fade-in
      .from('[data-tile]', { y: 40, scale: 0.92, autoAlpha: 0, stagger: 0.12, ease: 'back.out(1.6)', duration: 0.9 }, '-=0.4');
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-badge],[data-line],[data-intro],[data-tile]', { autoAlpha: 1, x: 0, y: 0, yPercent: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Donkere minimalistische portfolio-hero met Archivo-statement + Space Grotesk body, blauw accent.
- [ ] Oversized naam/rol-statement reveal per regel uit een overflow-masker (`yPercent`+`autoAlpha`).
- [ ] Beschikbaarheids-badge + masonry werk-grid met hover-overlay (project-titel + tag).
- [ ] Tiles komen in stagger op met `y`/`scale`/`autoAlpha` (`back.out`).
- [ ] Entrance via één `gsap.timeline()`; eases `power3.out`/`power4.out`/`back.out`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles direct zichtbaar zonder beweging.
- [ ] Alleen transform-aliassen + `autoAlpha`; geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
