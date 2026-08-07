# Mindloop — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vriendelijke SaaS-hero voor "Mindloop" — een AI-tool voor kennis-/notitie-loops die je gedachten verbindt — met een value-headline, dubbele CTA, social proof en een drijvend knowledge-graph card waarin nodes en verbindingen tot leven komen. Doel: bezoeker laten starten met een gratis workspace.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — metrics, logo's en reviews prominent voor B2B-SaaS.
- **Kleurtokens (hex):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8`
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF` (lavender)
  - Text `#1E1B4B`
- **Font pairing (Google Fonts):** Heading & Body **Plus Jakarta Sans** (300–700) — friendly, modern SaaS mood.
- **Key effects:** logo-grid fade-in, stat counter-up, knowledge-graph nodes + edges reveal, zwevende orb-knooppunten, card-float.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-7xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#6366F1', secondary:'#818CF8', cta:'#10B981', bg:'#F5F3FF', ink:'#1E1B4B' },
  fontFamily: { sans: ['"Plus Jakarta Sans"','sans-serif'] },
  boxShadow: { card: '0 30px 60px -20px rgba(99,102,241,0.4)' },
  ```
- Install: `npm i gsap @gsap/react`.

## Helpers

```tsx
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- `useGSAP(() => {...}, { scope: rootRef })` voor cleanup.
- Graph-edges (SVG lijnen) revealen via `strokeDashoffset`; nodes via `scale`+`autoAlpha`.
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function MindloopHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-primary/10 to-transparent" />

      <nav data-nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-lg font-extrabold tracking-tight">Mindloop</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Product','Templates','Pricing','Blog'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Get started
        </button>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2">
        <div>
          <span data-eyebrow className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Think in loops, not lists
          </span>
          <h1 data-title className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Connect every<br /><span className="text-primary">idea you have.</span>
          </h1>
          <p data-sub className="mt-6 max-w-md text-lg text-ink/70">
            Mindloop turns your notes into a living knowledge graph — AI links related thoughts so nothing gets lost.
          </p>
          <div data-actions className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
              Start free
            </button>
            <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
              Watch the tour
            </button>
          </div>
          <div data-stats className="mt-10 flex gap-8">
            {[['3.4M','Notes linked'],['92%','Recall rate'],['4.9','Rating']].map(([n,l]) => (
              <div key={l}>
                <div data-stat data-target={n} className="text-2xl font-extrabold text-primary">{n}</div>
                <div className="text-xs uppercase tracking-wide text-ink/55">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* knowledge-graph card */}
        <div data-card className="relative rounded-2xl border border-white/40 bg-white/85 p-6 shadow-card backdrop-blur">
          <svg viewBox="0 0 320 260" className="h-full w-full">
            <g stroke="#818CF8" strokeWidth="2" fill="none">
              <line data-edge x1="60" y1="60" x2="160" y2="120" />
              <line data-edge x1="160" y1="120" x2="260" y2="70" />
              <line data-edge x1="160" y1="120" x2="110" y2="200" />
              <line data-edge x1="160" y1="120" x2="240" y2="190" />
            </g>
            {[[60,60,'idea'],[260,70,'note'],[110,200,'link'],[240,190,'tag'],[160,120,'core']].map(([x,y,t],i) => (
              <g key={i} data-node>
                <circle cx={x as number} cy={y as number} r={t === 'core' ? 16 : 11}
                  fill={t === 'core' ? '#6366F1' : '#fff'} stroke="#6366F1" strokeWidth="2" />
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-60">
        {['Obsidian','Notion','Roam','Readwise','Linear'].map((p) => (
          <span key={p} className="text-sm font-semibold tracking-wide text-ink/50">{p}</span>
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
      .from('[data-eyebrow]', { y: 16, autoAlpha: 0 }, '-=0.4')
      .from('[data-title]', { y: 36, autoAlpha: 0, duration: 1 }, '-=0.3')
      .from('[data-sub]', { y: 20, autoAlpha: 0 }, '-=0.6')
      .from('[data-actions] > *', { y: 18, autoAlpha: 0, stagger: 0.12 }, '-=0.5')
      .from('[data-stats] > *', { y: 16, autoAlpha: 0, stagger: 0.1 }, '-=0.4')
      .from('[data-card]', { x: 60, autoAlpha: 0, scale: 0.95, ease: 'back.out(1.5)', duration: 1 }, '-=0.7')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.3');

    // edges tekenen + nodes poppen
    rootRef.current?.querySelectorAll<SVGLineElement>('[data-edge]').forEach((line) => {
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(line, { strokeDashoffset: 0, duration: 0.7, delay: 1.1, ease: 'power2.inOut' });
    });
    gsap.from('[data-node]', { scale: 0, transformOrigin: '50% 50%', autoAlpha: 0, stagger: 0.1, delay: 1.2, ease: 'back.out(2)' });

    // zachte float van de card + node-pulse
    gsap.to('[data-card]', { y: '+=12', repeat: -1, yoyo: true, duration: 3.5, ease: 'sine.inOut', delay: 1.6 });

    // counter-up
    document.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
      const raw = el.dataset.target || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!num) return;
      const c = { v: 0 };
      gsap.to(c, { v: num, duration: 1.4, delay: 1, ease: 'power2.out',
        snap: { v: raw.includes('.') ? 0.1 : 1 },
        onUpdate: () => { el.textContent = raw.replace(/[0-9.]+/, c.v.toFixed(raw.includes('.') ? 1 : 0)); } });
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-actions] > *,[data-stats] > *,[data-card],[data-node],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    rootRef.current?.querySelectorAll<SVGLineElement>('[data-edge]').forEach((line) => gsap.set(line, { strokeDashoffset: 0 }));
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] SaaS-hero met Plus Jakarta Sans, indigo accent + emerald CTA, friendly knowledge-loop verhaal.
- [ ] Knowledge-graph card: SVG-edges tekenen via `strokeDashoffset`, nodes poppen met `scale`+`back.out`.
- [ ] Card komt van rechts binnen en zweeft; stats tellen op via GSAP counter; logo-strip fade-in.
- [ ] Entrance via één `gsap.timeline()` met staggered transform-aliassen; eases `power3.out` + `back.out`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles zichtbaar, edges volledig getekend.
- [ ] Alleen transform-aliassen + `autoAlpha` (+ SVG-dash); geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
