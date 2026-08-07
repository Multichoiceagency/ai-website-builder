# NOVA Space Systems — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een aerospace-landing hero ("NOVA Space Systems") voor een ruimtevaart-/satelliet-bedrijf: een gecentreerde, krachtige mission-statement headline op een donker space-canvas met sterrenveld en een orbit-visual, plus duale CTA. Mission-cijfers en partner-logo's bouwen credibility.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — mission-stats, partner-/agency-logo's, credibility-markers (toegepast op donkere space-look).
- **Pattern:** Pricing Page + CTA → hier een mission-hero met sterke headline, duale CTA en stat-strip; sticky nav-CTA.
- **Color palette (hex tokens):**
  - `primary` `#0EA5E9` (sky blue)
  - `secondary` `#38BDF8`
  - `cta` `#F97316` (orange ignition)
  - `bg` `#F0F9FF` (light) / donkere hero-surface `#0C4A6E`
  - `text` `#0C4A6E` (op licht) / wit op donker
- **Typografie (Google Fonts):** Inter (headings + body) — minimal, clean, swiss, functioneel.
- **Key effects:** sterrenveld twinkle, orbit-rotatie, stat counter count-up, logo fade-in, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-5xl mx-auto px-6` (gecentreerde hero).
- Font in `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#0EA5E9', secondary:'#38BDF8', cta:'#F97316', bg:'#F0F9FF', deep:'#0C4A6E' },
  fontFamily: { sans:['Inter','system-ui','sans-serif'] },
  ```

## Helpers

```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

function countUp(el: HTMLElement, to: number, suffix = '') {
  const o = { v: 0 };
  return gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString() + suffix; } });
}
```

Reduced-motion via `gsap.matchMedia()`; alleen transform-aliassen (`x/y/scale/rotation/autoAlpha`).

## Structure

```tsx
export default function NovaSpaceHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-deep text-white">
      {/* sterrenveld */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(40)].map((_, i) => (
          <span data-star key={i} className="absolute h-0.5 w-0.5 rounded-full bg-white"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }} />
        ))}
      </div>
      {/* orbit-visual */}
      <div data-orbit className="pointer-events-none absolute right-[-10%] top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-secondary/30">
        <span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-cta shadow-[0_0_20px] shadow-cta" />
      </div>

      <nav className="relative z-10 max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">NOVA</span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500 text-white/80">
          <a className="cursor-pointer hover:text-white transition-colors" href="#">Missions</a>
          <a className="cursor-pointer hover:text-white transition-colors" href="#">Launch</a>
          <a className="cursor-pointer hover:text-white transition-colors" href="#">Careers</a>
        </div>
        <button data-nav className="rounded-full bg-cta px-5 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Partner with us</button>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-28 text-center">
        <span data-hero className="inline-flex rounded-full border border-secondary/40 px-3 py-1 text-xs font-600 text-secondary">
          Next launch window — Q3
        </span>
        <h1 data-hero className="mt-6 text-5xl font-700 leading-tight md:text-7xl">
          Engineering the <span className="text-secondary">next orbit</span>.
        </h1>
        <p data-hero className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          NOVA Space Systems bouwt satellieten en launch-platforms die de aarde verbinden — betrouwbaar, herbruikbaar en duurzaam.
        </p>
        <div data-hero className="mt-9 flex flex-wrap justify-center gap-4">
          <button className="rounded-full bg-cta px-7 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Explore missions</button>
          <button className="rounded-full border border-white/30 px-7 py-3 font-600 text-white cursor-pointer hover:bg-white/10 transition">Watch launch</button>
        </div>

        <div data-stats className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-8">
          {[[128,' launches'],[64,' satellites'],[99,'% success']].map(([n,s],i)=>(
            <div key={i}>
              <p data-count data-to={n} data-suffix={s} className="text-3xl font-700 text-secondary">0</p>
              <p className="text-xs text-white/60">Mission record</p>
            </div>
          ))}
        </div>

        <div data-logos className="mt-12 flex flex-wrap items-center justify-center gap-10 opacity-60">
          {['NASA','ESA','SpaceX','Airbus','Boeing'].map(b=>(<span key={b} className="text-sm font-600 text-white/60">{b}</span>))}
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
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('[data-nav]', { y: -16, autoAlpha: 0, stagger: 0.08 })
      .from('[data-hero]', { y: 30, autoAlpha: 0, stagger: 0.12 }, '-=0.3')
      .from('[data-stats] > div', { y: 20, autoAlpha: 0, stagger: 0.1 }, '-=0.3')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countUp(el, Number(el.dataset.to || 0), el.dataset.suffix || ''));
      }, '-=0.4');

    // twinkle sterren + draaiende orbit
    gsap.to('[data-star]', { autoAlpha: 0.2, duration: 1.5, ease: 'sine.inOut',
      stagger: { each: 0.04, yoyo: true, repeat: -1, from: 'random' } });
    gsap.to('[data-orbit]', { rotation: 360, duration: 40, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-stats] > div,[data-logos] span,[data-star]', { autoAlpha: 1, x: 0, y: 0 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Donkere space-surface `#0C4A6E` met sky-blue/secondary `#0EA5E9`/`#38BDF8` accenten en orange ignition-CTA `#F97316`.
- [ ] Inter geladen; gecentreerde mission-headline (5xl→7xl).
- [ ] Sterrenveld twinkelt (`sine.inOut`, random stagger); orbit draait continu (`rotation`, ease `none`).
- [ ] Mission-counters count-up met `power2.out`; één `gsap.timeline()` voor nav → hero → stats → logos.
- [ ] Alleen transform-aliassen geanimeerd (`x/y/scale/rotation/autoAlpha`); nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen in productie i.p.v. emoji.
