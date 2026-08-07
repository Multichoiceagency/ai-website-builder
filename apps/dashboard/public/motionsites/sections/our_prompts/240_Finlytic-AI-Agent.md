# Finlytic AI Agent — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een moderne SaaS-hero voor "Finlytic AI Agent" — een autonome finance-/analytics-agent — met een value-headline, dubbele CTA, social proof en een drijvende chat-/agent-card waarin de AI een financiële vraag beantwoordt met een live mini-chart. Doel: bezoeker laten starten met een trial van de agent.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — metrics, klantlogo's en reviews prominent voor B2B-SaaS.
- **Kleurtokens (hex):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8`
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF` (lavender)
  - Text `#1E1B4B`
- **Font pairing (Google Fonts):** Heading & Body **Plus Jakarta Sans** (300–700) — friendly, modern SaaS mood.
- **Key effects:** logo-grid fade-in, stat counter-up, chat-bubbles in stagger, mini-chart bars die uitgroeien (`scaleY`), zachte card-float.
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
- Mini-chart bars met `transformOrigin: 'bottom'` zodat `scaleY` netjes vanaf de basis groeit.
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function FinlyticAIHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-primary/10 to-transparent" />

      <nav data-nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-lg font-extrabold tracking-tight">Finlytic</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Agent','Integrations','Pricing','Security'].map((l) => (
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
            Autonomous finance agent
          </span>
          <h1 data-title className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Ask your numbers<br /><span className="text-primary">anything.</span>
          </h1>
          <p data-sub className="mt-6 max-w-md text-lg text-ink/70">
            Finlytic connects your ledgers and answers in plain language — forecasts, anomalies and reports on demand.
          </p>
          <div data-actions className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
              Start 14-day trial
            </button>
            <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
              See it work
            </button>
          </div>
          <div data-proof className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[0,1,2,3].map((i) => <span key={i} className="h-9 w-9 rounded-full border-2 border-bg bg-gradient-to-br from-primary to-secondary" />)}
            </div>
            <p className="text-sm text-ink/60"><span className="font-semibold text-ink">1,800+</span> finance teams trust Finlytic</p>
          </div>
        </div>

        {/* agent / chat card */}
        <div data-card className="relative rounded-2xl border border-white/40 bg-white/85 p-5 shadow-card backdrop-blur">
          <div data-bubble className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-white">
            What's our Q3 burn vs forecast?
          </div>
          <div data-bubble className="mt-3 max-w-[88%] rounded-2xl rounded-bl-sm bg-bg px-4 py-3 text-sm">
            Burn is 8% under forecast. Runway extended to 19 months.
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {[40,65,50,80,60,90].map((h, i) => (
                <span key={i} data-bar style={{ height: `${h}%` }} className="w-full rounded-sm bg-gradient-to-t from-primary to-secondary" />
              ))}
            </div>
          </div>
          <div data-bubble className="mt-3 flex items-center gap-2 text-xs text-ink/50">
            <span className="h-2 w-2 rounded-full bg-cta" /> Agent generated a CFO summary
          </div>
        </div>
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-60">
        {['QuickBooks','Xero','Stripe','NetSuite','Brex'].map((p) => (
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
      .from('[data-card] [data-bubble]', { y: 16, autoAlpha: 0, stagger: 0.18 }, '-=0.4')
      .from('[data-bar]', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.08, ease: 'back.out(1.7)' }, '-=0.2')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.3');

    // zachte card-float
    gsap.to('[data-card]', { y: '+=12', repeat: -1, yoyo: true, duration: 3.5, ease: 'sine.inOut', delay: 1.4 });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-actions] > *,[data-proof],[data-card],[data-card] [data-bubble],[data-bar],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1, scaleY: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] SaaS finance-hero met Plus Jakarta Sans, indigo accent + emerald CTA, social-proof avatarrij.
- [ ] Agent-card met chat-bubbles in stagger en mini-chart bars die via `scaleY` (origin bottom) uitgroeien.
- [ ] Card komt van rechts binnen (`x`+`scale`+`back.out`) en zweeft daarna; klantlogo-strip fade-in.
- [ ] Entrance via één `gsap.timeline()` met staggered transform-aliassen; eases `power3.out` + `back.out`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles zichtbaar zonder beweging.
- [ ] Alleen transform-aliassen + `autoAlpha` (bars via `scaleY`); geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
