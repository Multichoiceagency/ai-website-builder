# Terra Geo Map — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een geospatial-SaaS hero ("Terra") voor een mapping-/location-intelligence platform: links de propositie en een prominente zoekbalk (de zoekbalk is de CTA), rechts een interactieve kaart-card met locatie-pins. Categorie-chips, dataset-cijfers en logo's versterken vertrouwen.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — datasets, klantlogo's, succescijfers en reviews.
- **Pattern:** Marketplace / Directory → zoekbalk als CTA, kaart met hover-pins, categorie-chips, lage friction.
- **Color palette (hex tokens):**
  - `primary` `#6366F1` (indigo)
  - `secondary` `#818CF8`
  - `cta` `#10B981` (emerald)
  - `bg` `#F5F3FF`
  - `text` `#1E1B4B`
- **Typografie (Google Fonts):** Plus Jakarta Sans (kop + body, `wght 300;400;500;600;700`) — friendly, modern, SaaS.
- **Key effects:** map-pin reveal, stat counter count-up, logo fade-in, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.
- Font in `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#6366F1', secondary:'#818CF8', cta:'#10B981', bg:'#F5F3FF', ink:'#1E1B4B' },
  fontFamily: { sans:['"Plus Jakarta Sans"','system-ui','sans-serif'] },
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

Reduced-motion via `gsap.matchMedia()`; uitsluitend transform-aliassen.

## Structure

```tsx
export default function TerraGeoMapHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">Terra</span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Maps</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Data</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">API</a>
        </div>
        <button data-nav className="rounded-xl bg-cta px-4 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Add your data</button>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span data-hero className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-600 text-primary">
            Location intelligence platform
          </span>
          <h1 data-hero className="mt-5 text-4xl font-700 leading-tight md:text-6xl">
            Map the world's <span className="text-primary">data</span>, instantly.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Doorzoek miljoenen geospatial datasets en visualiseer ze realtime op een interactieve kaart.
          </p>
          <div data-hero className="mt-8 flex w-full max-w-md items-center gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-primary/10">
            <input className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" placeholder="Search a city, region or dataset…" />
            <button className="rounded-xl bg-primary px-5 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Search</button>
          </div>
          <div data-chips className="mt-4 flex flex-wrap gap-2">
            {['Population','Climate','Mobility','Land use'].map(c=>(
              <span data-chip key={c} className="cursor-pointer rounded-full bg-secondary/15 px-3 py-1 text-xs font-500 text-primary hover:bg-secondary/25 transition">{c}</span>
            ))}
          </div>
          <div data-stats className="mt-10 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            {[[8500000,' points'],[190,' countries'],[42,' layers']].map(([n,s],i)=>(
              <div key={i}>
                <p data-count data-to={n} data-suffix={s} className="text-3xl font-700 text-primary">0</p>
                <p className="text-xs text-ink/60">Dataset metric</p>
              </div>
            ))}
          </div>
        </div>

        <div data-card className="relative h-96 overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/30 to-primary/20 p-5 shadow-2xl shadow-primary/15">
          {[['28%','30%'],['58%','22%'],['44%','58%'],['72%','64%'],['20%','72%']].map(([l,t],i)=>(
            <span data-pin key={i} className="absolute flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-cta shadow"
              style={{ left:l, top:t }}>
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          ))}
          <div data-tip className="absolute bottom-5 left-5 rounded-xl bg-white px-3 py-2 text-xs font-500 shadow">
            Amsterdam · 2.4M data points
          </div>
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['NASA','ESA','Mapbox','Esri','OpenStreet'].map(b=>(<span key={b} className="text-sm font-600 text-ink/50">{b}</span>))}
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
      .from('[data-chip]', { y: 12, autoAlpha: 0, stagger: 0.06 }, '-=0.4')
      .from('[data-card]', { x: 48, autoAlpha: 0, scale: 0.96, duration: 0.9 }, '-=0.6')
      .from('[data-pin]', { scale: 0, autoAlpha: 0, stagger: 0.1, ease: 'back.out(1.7)' }, '-=0.4')
      .from('[data-tip]', { y: 14, autoAlpha: 0 }, '-=0.2')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countUp(el, Number(el.dataset.to || 0), el.dataset.suffix || ''));
      }, '-=0.4');

    gsap.to('[data-pin]', { scale: 1.15, duration: 1.4, ease: 'sine.inOut',
      stagger: { each: 0.25, yoyo: true, repeat: -1 } });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-chip],[data-card],[data-pin],[data-tip],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Indigo primary `#6366F1` + emerald CTA `#10B981`, bg `#F5F3FF`, tekst `#1E1B4B`.
- [ ] Plus Jakarta Sans als enige font.
- [ ] Zoekbalk is de visuele primaire CTA; categorie-chips faden in; map-pins poppen met `back.out(1.7)` + subtiele pulse-loop (`sine.inOut`).
- [ ] Dataset-counters count-up met `power2.out`; één `gsap.timeline()` voor de entrance.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-pins/iconen in productie i.p.v. emoji.
