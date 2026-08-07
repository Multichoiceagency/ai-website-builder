# Acreage Farming — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een landing-hero voor een agrarisch / acreage-farming bedrijf: links een vertrouwenwekkende propositie over duurzame landbouw en oogstopbrengst, rechts een visuele kaart-/veld-card met seizoenstatistieken. Sociale bewijskracht en harvest-cijfers ondersteunen de conversie.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, certificeringslogo's, succescijfers (yield/hectares), reviews.
- **Pattern:** Pricing Page + CTA → hier vertaald naar een hero met sterke headline + duale CTA en een feature/stat-card; sticky nav-CTA.
- **Color palette (hex tokens):**
  - `primary` `#0EA5E9` (sky blue, trust)
  - `secondary` `#38BDF8`
  - `cta` `#F97316` (warm orange)
  - `bg` `#F0F9FF`
  - `text` `#0C4A6E`
- **Typografie (Google Fonts):** Outfit (headings) + Work Sans (body) — geometrisch, modern, clean.
- **Key effects:** stat counter count-up, logo-grid fade-in, kaart-pins fade, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.
- Fonts in `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#0EA5E9', secondary:'#38BDF8', cta:'#F97316', bg:'#F0F9FF', ink:'#0C4A6E' },
  fontFamily: { display:['Outfit','sans-serif'], sans:['"Work Sans"','system-ui','sans-serif'] },
  ```

## Helpers

```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

function countUp(el: HTMLElement, to: number, suffix = '') {
  const o = { v: 0 };
  return gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString() + suffix; } });
}
```

Reduced-motion via `gsap.matchMedia()`; alleen transform-aliassen (`x/y/scale/autoAlpha`).

## Structure

```tsx
export default function AcreageFarmingHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="font-display text-lg font-700">Acreage</span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Crops</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Land</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">About</a>
        </div>
        <button data-nav className="rounded-full bg-cta px-5 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Request quote</button>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span data-hero className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-600 text-primary">
            Certified regenerative farming
          </span>
          <h1 data-hero className="font-display mt-5 text-4xl font-700 leading-tight md:text-6xl">
            Grow more from <span className="text-primary">every acre</span>.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Slim landbeheer, data-gedreven irrigatie en duurzame teelt — voor hogere opbrengst en gezondere grond.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-full bg-cta px-6 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Plan a consult</button>
            <button className="rounded-full border border-primary/30 px-6 py-3 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">View harvest data</button>
          </div>
          <div data-stats className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            {[[1200,' ha'],[34,'% yield'],[18,' regions']].map(([n,s],i)=>(
              <div key={i}>
                <p data-count data-to={n} data-suffix={s} className="font-display text-3xl font-700 text-primary">0</p>
                <p className="text-xs text-ink/60">Harvest metric</p>
              </div>
            ))}
          </div>
        </div>

        <div data-card className="relative rounded-2xl bg-white p-5 shadow-2xl shadow-primary/15">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-secondary/40 to-primary/20">
            {[['38%','22%'],['62%','48%'],['28%','66%']].map(([l,t],i)=>(
              <span data-pin key={i} className="absolute h-4 w-4 rounded-full border-2 border-white bg-cta shadow"
                style={{ left:l, top:t }} />
            ))}
          </div>
          <div data-meta className="mt-4 flex items-center justify-between rounded-xl bg-bg px-3 py-3">
            <span className="text-sm font-500">Field 12 — Wheat</span>
            <span className="rounded-full bg-cta/15 px-2 py-1 text-xs font-600 text-cta">Healthy</span>
          </div>
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['USDA','EU-Organic','Rainforest','GlobalGAP'].map(b=>(<span key={b} className="text-sm font-600 text-ink/50">{b}</span>))}
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
      .from('[data-hero]', { y: 28, autoAlpha: 0, stagger: 0.12 }, '-=0.3')
      .from('[data-card]', { x: 48, autoAlpha: 0, scale: 0.96, duration: 0.9 }, '-=0.5')
      .from('[data-pin]', { scale: 0, autoAlpha: 0, stagger: 0.12, ease: 'back.out(1.7)' }, '-=0.4')
      .from('[data-meta]', { y: 14, autoAlpha: 0 }, '-=0.3')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countUp(el, Number(el.dataset.to || 0), el.dataset.suffix || ''));
      }, '-=0.4');
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-card],[data-pin],[data-meta],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Sky-blue primary `#0EA5E9` + warm-orange CTA `#F97316`, bg `#F0F9FF`, tekst `#0C4A6E`.
- [ ] Outfit voor headings, Work Sans voor body.
- [ ] Kaart-pins poppen in met `back.out(1.7)`; harvest-counters tellen op met `power2.out`.
- [ ] Eén `gsap.timeline()`: nav → hero → card → pins → meta → logos.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` schakelt motion uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen in productie i.p.v. emoji.
