# RIVR DeFi — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een DeFi-landing hero ("RIVR") voor een decentraal finance / staking-protocol: links de propositie over yield, liquiditeit en non-custodial swaps met duale CTA, rechts een swap-/portfolio-card met live APY-cijfer. TVL-cijfers en partner-logo's bouwen vertrouwen.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — TVL-metrics, partner-logo's, audits/ratings als credibility-markers.
- **Pattern:** Pricing Page + CTA → hier vertaald naar hero met sterke headline, duale CTA en swap-card; sticky nav-CTA.
- **Color palette (hex tokens):**
  - `primary` `#0EA5E9` (sky blue, trust)
  - `secondary` `#38BDF8`
  - `cta` `#F97316` (warm orange)
  - `bg` `#F0F9FF`
  - `text` `#0C4A6E`
- **Typografie (Google Fonts):** Outfit (headings) + Work Sans (body) — geometrisch, modern, clean.
- **Key effects:** APY/TVL counter count-up, logo fade-in, swap-card reveal, hover-transitions 150–300ms.

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

function countUp(el: HTMLElement, to: number, suffix = '', decimals = 0) {
  const o = { v: 0 };
  return gsap.to(o, { v: to, duration: 1.5, ease: 'power2.out',
    onUpdate: () => { el.textContent = o.v.toFixed(decimals) + suffix; } });
}
```

Reduced-motion via `gsap.matchMedia()`; alleen transform-aliassen animeren.

## Structure

```tsx
export default function RivrDefiHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="font-display text-lg font-700">RIVR</span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Swap</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Stake</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Docs</a>
        </div>
        <button data-nav className="rounded-full bg-cta px-5 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Connect wallet</button>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span data-hero className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-600 text-primary">
            Audited · Non-custodial
          </span>
          <h1 data-hero className="font-display mt-5 text-4xl font-700 leading-tight md:text-6xl">
            DeFi yield that <span className="text-primary">flows to you</span>.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Swap, stake en earn op een non-custodial protocol met transparante APY en lage fees.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-full bg-cta px-6 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Launch app</button>
            <button className="rounded-full border border-primary/30 px-6 py-3 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">Read whitepaper</button>
          </div>
          <div data-stats className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            <div><p data-count data-to="1.4" data-suffix="B TVL" data-dec="1" className="font-display text-3xl font-700 text-primary">0</p><p className="text-xs text-ink/60">Total value locked</p></div>
            <div><p data-count data-to="12.6" data-suffix="% APY" data-dec="1" className="font-display text-3xl font-700 text-primary">0</p><p className="text-xs text-ink/60">Avg staking yield</p></div>
            <div><p data-count data-to="240" data-suffix="K users" data-dec="0" className="font-display text-3xl font-700 text-primary">0</p><p className="text-xs text-ink/60">Active wallets</p></div>
          </div>
        </div>

        <div data-card className="rounded-2xl bg-white p-6 shadow-2xl shadow-primary/15">
          <div className="flex items-center justify-between pb-4">
            <span className="text-sm font-600">Swap</span>
            <span className="rounded-full bg-cta/15 px-2 py-1 text-xs font-600 text-cta">12.6% APY</span>
          </div>
          {[['You pay','2.5 ETH'],['You receive','4,820 USDC']].map(([l,v],i)=>(
            <div data-row key={i} className="mb-3 rounded-xl bg-bg px-4 py-4">
              <p className="text-xs text-ink/50">{l}</p>
              <p className="text-lg font-600">{v}</p>
            </div>
          ))}
          <button data-row className="mt-2 w-full rounded-xl bg-cta py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Confirm swap</button>
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['Chainlink','Uniswap','Aave','Polygon','Arbitrum'].map(b=>(<span key={b} className="text-sm font-600 text-ink/50">{b}</span>))}
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
      .from('[data-row]', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.5')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countUp(el, Number(el.dataset.to || 0), el.dataset.suffix || '', Number(el.dataset.dec || 0)));
      }, '-=0.4');
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-card],[data-row],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      const dec = Number(el.dataset.dec || 0);
      el.textContent = Number(el.dataset.to || 0).toFixed(dec) + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Sky-blue primary `#0EA5E9` + warm-orange CTA `#F97316`, bg `#F0F9FF`, tekst `#0C4A6E`.
- [ ] Outfit voor headings, Work Sans voor body.
- [ ] TVL/APY/user-counters tellen op met `power2.out` (met decimalen waar nodig).
- [ ] Eén `gsap.timeline()`: nav → hero → swap-card → rows → logos.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen in productie i.p.v. emoji.
