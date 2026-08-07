# Synapse Dark Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een strakke SaaS-hero voor "Synapse" — een AI-/data-platform — met een centrale value-headline, dubbele CTA, social-proof avatarrij en een drijvend product-mockup card met glow. De "dark" twist: indigo accent op een licht/lavendel canvas dat naar een diep paneel kantelt. Doel: bezoeker overtuigen om te starten met een trial.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's en success-metrics prominent voor een B2B-SaaS.
- **Kleurtokens (hex):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8`
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF` (lavender)
  - Text `#1E1B4B`
- **Font pairing (Google Fonts):** Heading & Body **Plus Jakarta Sans** (300–700) — friendly, modern, clean SaaS mood.
- **Key effects:** logo-grid fade-in, stat counter-up, testimonial-carousel feel, kaart-tilt met glow, zachte parallax.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (gebruik Lucide SVG).

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
  boxShadow: { card: '0 30px 60px -20px rgba(99,102,241,0.45)' },
  ```
- Install: `npm i gsap @gsap/react`.

## Helpers

```tsx
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- `useGSAP(() => {...}, { scope: rootRef })` voor scope + cleanup.
- `gsap.matchMedia()` voor responsive + `prefers-reduced-motion`.
- Card-tilt: subtiele `rotationX/rotationY` via `gsap.quickTo` op `mousemove` (alleen desktop).

## Structure

```tsx
export function SynapseDarkHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/10 to-transparent" />

      <nav data-nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-lg font-extrabold tracking-tight">Synapse</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Product','Solutions','Pricing','Docs'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Start free
        </button>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2">
        <div>
          <span data-eyebrow className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            New · AI workspace
          </span>
          <h1 data-title className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Connect every signal.<br /><span className="text-primary">Decide in seconds.</span>
          </h1>
          <p data-sub className="mt-6 max-w-md text-lg text-ink/70">
            Synapse unifies your data streams into one intelligent surface — so your team ships answers, not dashboards.
          </p>
          <div data-actions className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
              Start 14-day trial
            </button>
            <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
              Book a demo
            </button>
          </div>

          <div data-proof className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[0,1,2,3].map((i) => (
                <span key={i} className="h-9 w-9 rounded-full border-2 border-bg bg-gradient-to-br from-primary to-secondary" />
              ))}
            </div>
            <p className="text-sm text-ink/60"><span className="font-semibold text-ink">4,200+</span> teams onboard this month</p>
          </div>
        </div>

        {/* drijvende product-mockup */}
        <div data-card className="relative">
          <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-card backdrop-blur">
            <div className="rounded-xl bg-ink p-5 text-white">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Live insights</span><span>Today</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[['MRR','$182k'],['Churn','1.2%'],['NPS','71']].map(([k,v]) => (
                  <div key={k} className="rounded-lg bg-white/5 p-3">
                    <div data-metric data-target={v} className="text-xl font-bold text-secondary">{v}</div>
                    <div className="text-[10px] uppercase tracking-wide text-white/50">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-24 rounded-lg bg-gradient-to-tr from-primary/40 to-cta/30" />
            </div>
          </div>
        </div>
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-60">
        {['Northwind','Acme','Lumen','Vertex','Cobalt'].map((p) => (
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
      .from('[data-proof]', { y: 16, autoAlpha: 0 }, '-=0.4')
      .from('[data-card]', { x: 60, autoAlpha: 0, scale: 0.95, ease: 'back.out(1.5)', duration: 1 }, '-=0.8')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.4');

    // zachte float van de card
    gsap.to('[data-card]', { y: '+=14', repeat: -1, yoyo: true, duration: 3.5, ease: 'sine.inOut', delay: 1 });

    // counter-up
    document.querySelectorAll<HTMLElement>('[data-metric]').forEach((el) => {
      const raw = el.dataset.target || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!num) return;
      const o = { v: 0 };
      gsap.to(o, { v: num, duration: 1.4, delay: 1, ease: 'power2.out',
        snap: { v: raw.includes('.') ? 0.1 : 1 },
        onUpdate: () => { el.textContent = raw.replace(/[0-9.]+/, o.v.toFixed(raw.includes('.') ? 1 : 0)); } });
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-actions] > *,[data-proof],[data-card],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Tweekoloms SaaS-hero met Plus Jakarta Sans headline, emerald CTA, indigo accent.
- [ ] Social-proof avatarrij + klantlogo-strip, mockup-card met 3 live metrics (counter-up).
- [ ] Card komt van rechts binnen (`x`+`scale`+`back.out`) en zweeft daarna subtiel.
- [ ] Entrance via één `gsap.timeline()` met staggered `y`/`autoAlpha`; eases `power3.out` + `back.out`.
- [ ] `gsap.matchMedia()` reduceert/uitschakelt motion bij `prefers-reduced-motion: reduce`.
- [ ] Geen geanimeerde width/height/top/left; alleen transform-aliassen + `autoAlpha`.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
