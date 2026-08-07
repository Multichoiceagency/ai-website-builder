# VertexAI Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een hero-centric AI-platform hero ("VertexAI"): een dramatische gecentreerde headline met hoog-contrast CTA, een subtiele parallax-gradient achtergrond en een glow/pulse op de primaire CTA. Bedoeld als product-launch hero met sterke value-proposition.

## Design system (ui-ux-pro-max)

- **Stijl:** Hero-Centric Design — grote hero, compelling headline, high-contrast CTA, product showcase, dramatische visual.
- **Pattern:** Video-First Hero → hier een rustige geanimeerde gradient/orb-visual i.p.v. video.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (blue)
  - `secondary` `#3B82F6`
  - `cta` `#F97316` (orange)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Typografie (Google Fonts):** Inter (headings + body) — professioneel, heldere typografie.
- **Key effects:** smooth scroll reveal, fade-in op hero, subtiele background-parallax, CTA glow/pulse, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-4xl mx-auto px-6` (gecentreerde hero).
- Font in `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', bg:'#F8FAFC', ink:'#1E293B' },
  fontFamily: { sans:['Inter','system-ui','sans-serif'] },
  ```

## Helpers

```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

Reduced-motion via `gsap.matchMedia()`; animeer uitsluitend transform-aliassen (`x/y/scale/autoAlpha`). De CTA-glow gebruikt een herhalende `scale`/`autoAlpha`-puls, geen layout-props.

## Structure

```tsx
export default function VertexAiHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative flex min-h-screen flex-col overflow-hidden bg-bg text-ink">
      {/* parallax gradient orbs */}
      <div data-orb className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div data-orb className="pointer-events-none absolute bottom-[-10%] right-1/4 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />

      <nav className="relative z-10 max-w-6xl mx-auto flex w-full items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">Vertex<span className="text-primary">AI</span></span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Models</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">API</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Pricing</a>
        </div>
        <button data-nav className="rounded-lg bg-cta px-4 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Get API key</button>
      </nav>

      <div className="relative z-10 flex flex-1 items-center">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <span data-hero className="inline-flex rounded-full border border-primary/30 px-3 py-1 text-xs font-600 text-primary">
            Introducing VertexAI 2.0
          </span>
          <h1 data-hero className="mt-6 text-5xl font-700 leading-tight md:text-7xl">
            Build with <span className="text-primary">intelligent</span> models.
          </h1>
          <p data-hero className="mx-auto mt-6 max-w-xl text-lg text-ink/70">
            Eén API voor reasoning, vision en spraak. Bouw production-ready AI-features in minuten, niet maanden.
          </p>
          <div data-hero className="mt-9 flex flex-wrap justify-center gap-4">
            <button data-glow className="rounded-full bg-cta px-8 py-3.5 font-600 text-white cursor-pointer hover:brightness-110 transition">Start building</button>
            <button className="rounded-full border border-primary/30 px-8 py-3.5 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">Read the docs</button>
          </div>
          <p data-hero className="mt-6 text-sm text-ink/50">No credit card required · 1M free tokens</p>
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

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.85 } });
    tl.from('[data-nav]', { y: -16, autoAlpha: 0, stagger: 0.08 })
      .from('[data-hero]', { y: 32, autoAlpha: 0, stagger: 0.12 }, '-=0.3')
      .from('[data-orb]', { scale: 0.7, autoAlpha: 0, duration: 1.2, stagger: 0.2 }, '-=0.9');

    // subtiele parallax-drift op de orbs
    gsap.to('[data-orb]', { y: 40, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.5 });

    // CTA glow/pulse
    gsap.to('[data-glow]', { scale: 1.04, autoAlpha: 0.92, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-orb],[data-glow]', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Blue primary `#2563EB` + high-contrast orange CTA `#F97316`, bg `#F8FAFC`, tekst `#1E293B`.
- [ ] Inter geladen; dramatische gecentreerde headline (5xl→7xl).
- [ ] Gradient-orbs faden/scalen in en driften subtiel (parallax via `y`, `sine.inOut`).
- [ ] CTA heeft continue glow/pulse via `scale`/`autoAlpha` (geen layout-props).
- [ ] Eén `gsap.timeline()` voor nav → hero → orbs entrance.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen in productie i.p.v. emoji.
