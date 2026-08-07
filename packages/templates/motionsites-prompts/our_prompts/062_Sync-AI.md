# Sync AI — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een AI-product hero ("Sync AI") die een intelligente workflow-/data-sync engine verkoopt: links de propositie met krachtige headline en duale CTA, rechts een geanimeerde "AI sync" visual met nodes die verbinden. Klantlogo's en succescijfers bouwen vertrouwen.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — logo's, ratings, succesmetrics en credibility-markers.
- **Pattern:** Video-First Hero → hier een rustige geanimeerde node-graph visual i.p.v. video.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (blue)
  - `secondary` `#3B82F6`
  - `cta` `#F97316` (orange)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Typografie (Google Fonts):** Inter (headings + body) — professioneel, heldere typografie.
- **Key effects:** node/connection reveal, stat counter count-up, logo fade-in, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.
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

function countUp(el: HTMLElement, to: number, suffix = '') {
  const o = { v: 0 };
  return gsap.to(o, { v: to, duration: 1.3, ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString() + suffix; } });
}
```

Reduced-motion via `gsap.matchMedia()`; uitsluitend transform-aliassen animeren.

## Structure

```tsx
export default function SyncAiHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">Sync<span className="text-primary">AI</span></span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Platform</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Integrations</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Pricing</a>
        </div>
        <button data-nav className="rounded-lg bg-cta px-4 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Try free</button>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span data-hero className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-600 text-primary">
            New — AI auto-sync engine
          </span>
          <h1 data-hero className="mt-5 text-4xl font-700 leading-tight md:text-6xl">
            Keep every tool <span className="text-primary">in perfect sync</span>.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Sync AI verbindt je data, apps en workflows realtime — met AI die conflicten oplost voordat ze ontstaan.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-6 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Start free</button>
            <button className="rounded-lg border border-primary/30 px-6 py-3 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">See it work</button>
          </div>
          <div data-stats className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            {[[500,'+ apps'],[99,'% accuracy'],[12,'ms latency']].map(([n,s],i)=>(
              <div key={i}>
                <p data-count data-to={n} data-suffix={s} className="text-3xl font-700 text-primary">0</p>
                <p className="text-xs text-ink/60">Sync metric</p>
              </div>
            ))}
          </div>
        </div>

        <div data-card className="relative h-80 rounded-2xl bg-white p-5 shadow-2xl shadow-primary/15">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320" fill="none">
            <line data-edge x1="80" y1="80" x2="200" y2="160" stroke="#3B82F6" strokeWidth="2" />
            <line data-edge x1="320" y1="90" x2="200" y2="160" stroke="#3B82F6" strokeWidth="2" />
            <line data-edge x1="120" y1="240" x2="200" y2="160" stroke="#3B82F6" strokeWidth="2" />
          </svg>
          {[['80px','64px'],['304px','74px'],['104px','224px'],['184px','144px']].map(([l,t],i)=>(
            <span data-node key={i} className="absolute h-9 w-9 rounded-xl bg-primary shadow-lg"
              style={{ left:l, top:t }} />
          ))}
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['Slack','Notion','GitHub','Salesforce','Zapier'].map(b=>(<span key={b} className="text-sm font-600 text-ink/50">{b}</span>))}
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
      .from('[data-node]', { scale: 0, autoAlpha: 0, stagger: 0.12, ease: 'back.out(1.7)' }, '-=0.4')
      .from('[data-edge]', { autoAlpha: 0, stagger: 0.1 }, '-=0.4')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countUp(el, Number(el.dataset.to || 0), el.dataset.suffix || ''));
      }, '-=0.4');

    // continue subtiele pulse op nodes
    gsap.to('[data-node]', { scale: 1.08, autoAlpha: 0.85, duration: 1.6, ease: 'sine.inOut',
      stagger: { each: 0.2, yoyo: true, repeat: -1 } });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-card],[data-node],[data-edge],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Blue primary `#2563EB` + orange CTA `#F97316`, bg `#F8FAFC`, tekst `#1E293B`.
- [ ] Inter geladen voor koppen en body.
- [ ] Nodes poppen in met `back.out(1.7)`; edges faden in via `autoAlpha`; subtiele pulse-loop met `sine.inOut`.
- [ ] Stat-counters count-up met `power2.out`; één `gsap.timeline()` voor de hele entrance.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG voor visuals i.p.v. emoji.
