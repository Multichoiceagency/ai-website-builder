# Pro AI Deck — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Presentation · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een presentatie-/deck-hero voor "Pro AI Deck" — een AI-tool die in seconden pitch-decks genereert — met een grote titelslide, dubbele CTA, en een drijvende stapel slide-cards die als een deck binnenkomen. Doel: bezoeker laat een deck genereren (CTA "Generate deck").

## Design system (ui-ux-pro-max)

- **Pattern:** Video-First/Deck Hero — grote titel-claim, CTA centraal, sectie eronder met features.
- **Stijl:** Social Proof-Focused — metrics en logo's prominent.
- **Kleurtokens (hex):**
  - Primary `#2563EB`
  - Secondary `#3B82F6`
  - CTA `#F97316`
  - Background `#F8FAFC`
  - Text `#1E293B`
- **Font pairing (Google Fonts):** Heading **Be Vietnam Pro** (300–700), Body **Noto Sans** (300–700) — readable, clean, international.
- **Key effects:** slide-stack stagger-in (deck-fan), counter-up, logo fade-in, subtiele tilt op de bovenste slide.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-6xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', bg:'#F8FAFC', ink:'#1E293B' },
  fontFamily: { display: ['"Be Vietnam Pro"','sans-serif'], sans: ['"Noto Sans"','sans-serif'] },
  ```
- Install: `npm i gsap @gsap/react`.

## Helpers

```tsx
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- `useGSAP(() => {...}, { scope: rootRef })` voor cleanup.
- Deck-fan: stagger `rotation` + `x`/`y` op de slide-cards (transform-only).
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function ProAIDeckHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav data-nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold tracking-tight">Pro AI Deck</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Templates','Examples','Pricing','Login'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Open app
        </button>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2">
        <div>
          <span data-eyebrow className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            From prompt to pitch
          </span>
          <h1 data-title className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Decks that<br /><span className="text-primary">write themselves.</span>
          </h1>
          <p data-sub className="mt-6 max-w-md text-lg text-ink/70">
            Describe your idea — Pro AI Deck builds a polished, on-brand presentation in under a minute.
          </p>
          <div data-actions className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
              Generate a deck
            </button>
            <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
              Watch demo
            </button>
          </div>
          <div data-stats className="mt-10 flex gap-8">
            {[['1.4M','Decks made'],['52s','Avg build'],['4.8','Rating']].map(([n,l]) => (
              <div key={l}>
                <div data-stat data-target={n} className="font-display text-2xl font-bold text-primary">{n}</div>
                <div className="text-xs uppercase tracking-wide text-ink/55">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* deck-stapel */}
        <div data-deck className="relative h-[340px]">
          {[2,1,0].map((i) => (
            <div
              key={i}
              data-slide
              className="absolute inset-x-0 mx-auto h-[300px] w-[88%] rounded-2xl border border-black/5 bg-white p-6 shadow-xl"
              style={{ top: i * 14, zIndex: 10 - i }}
            >
              <div className="h-3 w-28 rounded bg-primary/30" />
              <div className="mt-4 h-6 w-3/4 rounded bg-ink/15" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="h-20 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20" />
                <div className="space-y-2">
                  <div className="h-2 w-full rounded bg-ink/10" />
                  <div className="h-2 w-5/6 rounded bg-ink/10" />
                  <div className="h-2 w-4/6 rounded bg-ink/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-60">
        {['Sequoia','Y Combinator','a16z','Accel'].map((p) => (
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
      // deck-fan: slides komen gefaseerd binnen
      .from('[data-slide]', { y: 60, rotation: 6, autoAlpha: 0, scale: 0.95, stagger: 0.14, ease: 'back.out(1.7)', duration: 0.9 }, '-=0.6')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.3');

    // subtiele float van de bovenste slide
    gsap.to('[data-deck]', { y: '+=10', repeat: -1, yoyo: true, duration: 3.5, ease: 'sine.inOut', delay: 1.2 });

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
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-actions] > *,[data-stats] > *,[data-slide],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Deck-hero met Be Vietnam Pro headline + Noto Sans body, blauw + warme CTA "Generate a deck".
- [ ] Gestapelde slide-cards komen als een deck-fan binnen (stagger `y`/`rotation`/`scale`).
- [ ] Stats tellen op via GSAP counter; investeerder-logo's fade-in; bovenste deck zweeft subtiel.
- [ ] Entrance via één `gsap.timeline()` met staggered transform-aliassen; eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles zichtbaar zonder beweging/rotatie.
- [ ] Alleen transform-aliassen + `autoAlpha`; geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
