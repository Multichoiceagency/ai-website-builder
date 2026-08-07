# CoderCrest — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

CoderCrest is een developer-SaaS hero die met sociale bewijskracht (klantlogo's, sterren, succescijfers) een code-platform verkoopt. De sectie combineert een krachtige propositie links met een live "code editor" preview-card rechts, plus een logobalk en stat-counters om vertrouwen op te bouwen.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, reviews/ratings en succesmetrics prominent in beeld.
- **Pattern:** Video-First Hero, hier vertaald naar een rustige geanimeerde editor-card i.p.v. video (lichtere performance, geen autoplay-jank).
- **Color palette (hex tokens):**
  - `primary` `#6366F1` (indigo)
  - `secondary` `#818CF8`
  - `cta` `#10B981` (emerald)
  - `bg` `#F5F3FF`
  - `text` `#1E1B4B`
- **Typografie (Google Fonts):** Plus Jakarta Sans voor koppen én body (`wght 300;400;500;600;700`) — friendly, modern, SaaS.
- **Key effects:** logo-grid fade-in, stat counter (number count-up), testimonial/review sterren, zachte hover-transitions (150–300ms).

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge).
- Max content width: `max-w-7xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- `tailwind.config.ts` tokens:
  ```ts
  theme: { extend: {
    colors: {
      primary: '#6366F1', secondary: '#818CF8', cta: '#10B981',
      bg: '#F5F3FF', ink: '#1E1B4B',
    },
    fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
  }}
  ```

## Helpers

```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

// Count-up util voor stat-getallen, GSAP-driven (geen layout props).
function animateCount(el: HTMLElement, to: number, suffix = '') {
  const obj = { val: 0 };
  return gsap.to(obj, {
    val: to, duration: 1.4, ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString() + suffix; },
  });
}
```

Gebruik `gsap.matchMedia()` voor `prefers-reduced-motion`. Animeer uitsluitend transform-aliassen (`x`, `y`, `scale`, `autoAlpha`), nooit `width/height/top/left`.

## Structure

```tsx
export default function CoderCrestHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">CoderCrest</span>
        <div data-nav className="hidden md:flex items-center gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Product</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Docs</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Pricing</a>
        </div>
        <button data-nav className="rounded-xl bg-cta px-4 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">
          Start free
        </button>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span data-hero className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-600 text-primary">
            Trusted by 12,000+ engineering teams
          </span>
          <h1 data-hero className="mt-5 text-4xl font-700 leading-tight md:text-6xl">
            Ship code <span className="text-primary">faster</span>, review smarter.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Automated code review, CI insights en team-analytics in één developer-platform.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-xl bg-cta px-6 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Start free trial</button>
            <button className="rounded-xl border border-primary/30 px-6 py-3 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">Book a demo</button>
          </div>
          <div data-stats className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            {[['stat',4200000,'+ runs'],['stat',99,'% uptime'],['stat',38,'% faster']].map(([k,n,s],i)=>(
              <div key={i}>
                <p data-count data-to={n} data-suffix={s} className="text-3xl font-700 text-primary">0</p>
                <p className="text-xs text-ink/60">CI pipeline metric</p>
              </div>
            ))}
          </div>
        </div>

        <div data-card className="relative rounded-2xl bg-ink p-5 shadow-2xl shadow-primary/20">
          <div className="flex gap-2 pb-4">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-cta" />
          </div>
          {[...Array(6)].map((_,i)=>(
            <div data-codeline key={i} className="mb-2 h-3 rounded bg-white/10" style={{ width: `${90 - i*8}%` }} />
          ))}
          <div data-toast className="mt-4 flex items-center gap-2 rounded-lg bg-cta/15 px-3 py-2 text-sm text-cta">
            ✓ 24 issues auto-fixed
          </div>
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['Vercel','Linear','Stripe','Notion','Figma'].map((b)=>(
          <span key={b} className="text-sm font-600 text-ink/50">{b}</span>
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
    tl.from('[data-nav]', { y: -16, autoAlpha: 0, stagger: 0.08 })
      .from('[data-hero]', { y: 28, autoAlpha: 0, stagger: 0.12 }, '-=0.3')
      .from('[data-card]', { x: 48, autoAlpha: 0, scale: 0.96, duration: 0.9 }, '-=0.5')
      .from('[data-codeline]', { x: -20, autoAlpha: 0, stagger: 0.08 }, '-=0.5')
      .from('[data-toast]', { y: 12, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.2')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
          const to = Number(el.dataset.to || 0);
          const suffix = el.dataset.suffix || '';
          animateCount(el, to, suffix);
        });
      }, '-=0.4');
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-card],[data-codeline],[data-toast],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Indigo (`#6366F1`) primary + emerald (`#10B981`) CTA, achtergrond `#F5F3FF`, tekst `#1E1B4B`.
- [ ] Plus Jakarta Sans geladen voor koppen en body.
- [ ] Hero-entrance via één `gsap.timeline()` met gestaggerde reveals (nav → hero → card → codelines → toast → logos).
- [ ] Stat-counters tellen op met `power2.out`; toast komt binnen met `back.out(1.7)`.
- [ ] Alleen transform-aliassen geanimeerd (`x/y/scale/autoAlpha`), nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles direct zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }` voor cleanup; alle clickables `cursor-pointer` + hover-transitions 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; logo's en stats wrappen netjes; SVG-iconen i.p.v. emoji in productie.
