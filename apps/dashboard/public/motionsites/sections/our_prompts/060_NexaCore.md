# NexaCore — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een heldere, conversiegerichte landingspage-hero voor "NexaCore" — een infrastructuur/platformproduct — met een prijs-georiënteerde headline, dubbele CTA, monthly/annual toggle-teaser, social proof en een drijvend pricing-preview card. Doel: bezoeker naar een plan + sticky CTA leiden.

## Design system (ui-ux-pro-max)

- **Pattern:** Pricing Page + CTA — highlight starter-plan, toon jaarkorting, sticky CTA in nav.
- **Stijl:** Social Proof-Focused — logo's, reviews en metrics prominent.
- **Kleurtokens (hex):**
  - Primary `#0EA5E9` (sky blue trust)
  - Secondary `#38BDF8`
  - CTA `#F97316` (warm)
  - Background `#F0F9FF`
  - Text `#0C4A6E`
- **Font pairing (Google Fonts):** Heading **Outfit** (300–700), Body **Work Sans** (300–700) — geometric, modern, versatile.
- **Key effects:** logo-grid fade-in, stat counter-up, prijskaart fade-up + highlight-glow, toggle-pulse.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-7xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#0EA5E9', secondary:'#38BDF8', cta:'#F97316', bg:'#F0F9FF', ink:'#0C4A6E' },
  fontFamily: { display: ['Outfit','sans-serif'], sans: ['"Work Sans"','sans-serif'] },
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

## Structure

```tsx
export function NexaCoreHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav data-nav className="sticky top-0 z-20 mx-auto flex max-w-7xl items-center justify-between bg-bg/80 px-6 py-4 backdrop-blur">
        <span className="font-display text-lg font-bold tracking-tight">NexaCore</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Product','Pricing','Customers','Docs'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Start free
        </button>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2">
        <div>
          <span data-eyebrow className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Simple, scalable pricing
          </span>
          <h1 data-title className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            The core that<br /><span className="text-primary">powers your stack.</span>
          </h1>
          <p data-sub className="mt-6 max-w-md text-lg text-ink/70">
            One platform for compute, data and edge — pay only for what you ship. Save 25% on annual plans.
          </p>

          <div data-toggle className="mt-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-white p-1 text-sm">
            <span className="rounded-full bg-primary px-4 py-1.5 font-medium text-white">Annual</span>
            <span className="px-4 py-1.5 text-ink/60">Monthly</span>
          </div>

          <div data-actions className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
              Get started free
            </button>
            <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
              Compare plans
            </button>
          </div>

          <div data-stats className="mt-10 flex gap-8">
            {[['12k+','Teams'],['99.99%','Uptime'],['4.9','Rating']].map(([n,l]) => (
              <div key={l}>
                <div data-stat data-target={n} className="font-display text-2xl font-bold text-primary">{n}</div>
                <div className="text-xs uppercase tracking-wide text-ink/55">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* pricing-preview card */}
        <div data-card className="relative rounded-2xl border border-primary/20 bg-white p-7 shadow-xl">
          <span className="absolute -top-3 right-6 rounded-full bg-cta px-3 py-1 text-xs font-semibold text-white">Popular</span>
          <h3 className="font-display text-lg font-semibold">Starter</h3>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-4xl font-bold">$29</span>
            <span className="mb-1 text-ink/60">/mo</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-ink/80">
            {['Unlimited projects','100 GB edge cache','Realtime metrics','Priority support'].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />{f}
              </li>
            ))}
          </ul>
          <button className="mt-7 w-full rounded-lg bg-primary py-3 font-semibold text-white transition-transform hover:scale-[1.02] cursor-pointer">
            Choose Starter
          </button>
        </div>
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-60">
        {['Vercel','Stripe','Linear','Notion','Figma'].map((p) => (
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
      .from('[data-toggle]', { y: 16, autoAlpha: 0 }, '-=0.5')
      .from('[data-actions] > *', { y: 18, autoAlpha: 0, stagger: 0.12 }, '-=0.4')
      .from('[data-stats] > *', { y: 16, autoAlpha: 0, stagger: 0.1 }, '-=0.4')
      .from('[data-card]', { y: 40, autoAlpha: 0, scale: 0.95, ease: 'back.out(1.6)', duration: 1 }, '-=0.8')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.4');

    // highlight-glow op popular card
    gsap.fromTo('[data-card]', { boxShadow: '0 10px 30px rgba(14,165,233,0.0)' },
      { boxShadow: '0 25px 60px rgba(14,165,233,0.30)', duration: 1.2, delay: 1.1, ease: 'power2.out' });

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
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-toggle],[data-actions] > *,[data-stats] > *,[data-card],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Conversie-hero met sky-blue trust + warm CTA, Outfit-headline + Work Sans body.
- [ ] Sticky nav-CTA, annual/monthly toggle-teaser, "Popular" pricing-preview card.
- [ ] Stats tellen op via GSAP counter; klantlogo-strip fade-in.
- [ ] Card komt op met `y`+`scale`+`back.out` en krijgt subtiele highlight-glow.
- [ ] Entrance via één `gsap.timeline()` met staggered `y`/`autoAlpha`; eases `power3.out` + `back.out`.
- [ ] `gsap.matchMedia()` schakelt motion uit bij `prefers-reduced-motion: reduce`.
- [ ] Alleen transform-aliassen + `autoAlpha` (boxShadow als losse glow-tween); geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
