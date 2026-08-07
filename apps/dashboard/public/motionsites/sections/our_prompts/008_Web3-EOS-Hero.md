# Web3 EOS Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Web3 · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een futuristische, donkere blockchain-hero voor een Web3/EOS-platform: een grote glow-headline boven een glasachtige stat-balk (TVL, blocks, validators) met een primaire wallet-CTA en drijvende node-orbs op de achtergrond. Doel: vertrouwen en momentum tonen voor een on-chain product en de bezoeker naar "Launch App" leiden.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused × Web3/futuristic — credibility-markers (validator-stats, partner-logo's) op een diep donker canvas met neon-glow.
- **Kleurtokens (hex):**
  - Primary `#8B5CF6` (purple tech)
  - Secondary `#A78BFA`
  - CTA `#FBBF24` (gold value)
  - Background `#0F0F23`
  - Text `#F8FAFC`
- **Font pairing (Google Fonts):** Heading **Orbitron** (400–700), Body **Exo 2** (300–700) — crypto/blockchain/futuristic mood.
- **Key effects:** stat counter-up (TVL/validators), logo-grid fade-in, neon glow op headline + CTA, drijvende node-orbs, dark overlay achtergrond.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (gebruik Lucide/Heroicons SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge).
- Max content width `max-w-7xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens (`tailwind.config.ts`):
  ```ts
  theme: { extend: {
    colors: {
      primary: '#8B5CF6', secondary: '#A78BFA', cta: '#FBBF24',
      bg: '#0F0F23', ink: '#F8FAFC',
    },
    fontFamily: { display: ['Orbitron','sans-serif'], body: ['"Exo 2"','sans-serif'] },
    boxShadow: { glow: '0 0 40px rgba(139,92,246,0.45)' },
  }}
  ```
- Install: `npm i gsap @gsap/react`.

## Helpers

```tsx
// src/lib/useReveal.ts — register plugin once
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- Wrap alle tweens in `useGSAP(() => {...}, { scope: rootRef })` voor automatische cleanup.
- Counter-up via `gsap.to(obj, { val: target, snap: { val: 1 }, onUpdate })`.
- `gsap.matchMedia()` schakelt motion uit bij `(prefers-reduced-motion: reduce)`.

## Structure

```tsx
export function Web3EOSHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-bg font-body text-ink">
      {/* node-orbs achtergrond */}
      <div className="pointer-events-none absolute inset-0">
        <span data-orb className="absolute left-[12%] top-[20%] h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <span data-orb className="absolute right-[14%] top-[35%] h-56 w-56 rounded-full bg-secondary/25 blur-3xl" />
        <span data-orb className="absolute bottom-[12%] left-[40%] h-48 w-48 rounded-full bg-cta/20 blur-3xl" />
      </div>

      <nav data-nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-widest">EOS<span className="text-primary">·</span>CHAIN</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Protocol','Validators','Docs','Ecosystem'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-full bg-cta px-5 py-2 font-semibold text-bg shadow-glow transition-transform hover:scale-105 cursor-pointer">
          Launch App
        </button>
      </nav>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pt-20 text-center">
        <span data-eyebrow className="rounded-full border border-primary/40 px-4 py-1 text-xs uppercase tracking-[0.3em] text-secondary">
          On-chain. Trustless. Fast.
        </span>
        <h1 data-title className="mt-8 max-w-4xl font-display text-5xl leading-tight drop-shadow-[0_0_30px_rgba(139,92,246,0.5)] md:text-7xl">
          The settlement layer for the open economy
        </h1>
        <p data-sub className="mt-6 max-w-2xl text-lg text-ink/70">
          Build, stake and govern on a high-throughput chain secured by a global validator set.
        </p>
        <div data-actions className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button className="rounded-full bg-cta px-8 py-3 font-semibold text-bg shadow-glow transition-transform hover:scale-105 cursor-pointer">
            Connect Wallet
          </button>
          <button className="rounded-full border border-primary/50 px-8 py-3 font-medium text-ink transition-colors hover:bg-primary/10 cursor-pointer">
            Read the litepaper
          </button>
        </div>

        {/* glass stat-balk */}
        <div data-stats className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur md:grid-cols-4">
          {[['$4.2B','Total value locked'],['1.2s','Block time'],['312','Validators'],['18M','Daily txns']].map(([n,l]) => (
            <div key={l} className="p-6 text-center">
              <div data-stat-num data-target={n} className="font-display text-3xl text-primary">{n}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-ink/60">{l}</div>
            </div>
          ))}
        </div>

        <div data-logos className="mt-12 flex flex-wrap items-center justify-center gap-8 opacity-70">
          {['Ledger','Chainlink','Aave','Polygon'].map((p) => (
            <span key={p} className="font-display text-sm tracking-widest text-ink/50">{p}</span>
          ))}
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

  // volledige beweging
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('[data-nav]', { y: -24, autoAlpha: 0 })
      .from('[data-eyebrow]', { y: 20, autoAlpha: 0 }, '-=0.4')
      .from('[data-title]', { y: 40, autoAlpha: 0, duration: 1 }, '-=0.3')
      .from('[data-sub]', { y: 24, autoAlpha: 0 }, '-=0.6')
      .from('[data-actions] > *', { y: 20, autoAlpha: 0, stagger: 0.12 }, '-=0.5')
      .from('[data-stats]', { y: 30, scale: 0.96, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.3')
      .from('[data-logos] span', { y: 16, autoAlpha: 0, stagger: 0.08 }, '-=0.4');

    // node-orbs zachte drift
    gsap.to('[data-orb]', {
      y: '+=24', x: '+=16', repeat: -1, yoyo: true,
      duration: 6, ease: 'sine.inOut', stagger: { each: 0.8, from: 'random' },
    });

    // stat counter-up
    document.querySelectorAll<HTMLElement>('[data-stat-num]').forEach((el) => {
      const raw = el.dataset.target || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!num) return;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: num, duration: 1.6, ease: 'power2.out', delay: 1,
        snap: { v: raw.includes('.') ? 0.1 : 1 },
        onUpdate: () => { el.textContent = raw.replace(/[0-9.]+/, obj.v.toFixed(raw.includes('.') ? 1 : 0)); },
      });
    });
  });

  // reduced motion: alles zichtbaar, geen beweging
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-actions] > *,[data-stats],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Donkere Web3-hero met Orbitron-headline + Exo 2 body en neon glow op CTA.
- [ ] Glas stat-balk met 4 metrics; getallen tellen op via GSAP counter.
- [ ] Drijvende node-orbs blijven subtiel (blur, lage opacity) en `pointer-events-none`.
- [ ] Entrance via één `gsap.timeline()` met staggered `y`/`autoAlpha`, eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles direct zichtbaar zonder beweging.
- [ ] Geen geanimeerde width/height/top/left; alleen transform-aliassen + `autoAlpha`.
- [ ] `cursor-pointer` + zichtbare focus op alle knoppen; responsive op 375/768/1024/1440px.
- [ ] Geen emoji-iconen; navigatie eenvoudig; contact/CTA zichtbaar.
