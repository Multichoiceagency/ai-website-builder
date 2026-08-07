# EVR Ventures — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een professionele venture-capital hero voor "EVR Ventures": een zelfverzekerde thesis-headline, dubbele CTA (pitch / portfolio), portfolio-logo-grid en fund-stats (AUM, companies, exits). Doel: founders naar "Submit your pitch" leiden en geloofwaardigheid van het fonds tonen.

## Design system (ui-ux-pro-max)

- **Pattern:** Video-First/Statement Hero — grote claim, CTA centraal/links, social proof eronder.
- **Stijl:** Social Proof-Focused — portfoliologo's, exits en metrics prominent.
- **Kleurtokens (hex):**
  - Primary `#2563EB`
  - Secondary `#3B82F6`
  - CTA `#F97316`
  - Background `#F8FAFC`
  - Text `#1E293B`
- **Font pairing (Google Fonts):** Heading & Body **Inter** (300–800) — professioneel, helder, neutraal.
- **Key effects:** logo-grid fade-in, stat counter-up, statement-headline reveal, subtiele lijn-accenten.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-6xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', bg:'#F8FAFC', ink:'#1E293B' },
  fontFamily: { sans: ['Inter','sans-serif'] },
  ```
- Install: `npm i gsap @gsap/react`.

## Helpers

```tsx
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- `useGSAP(() => {...}, { scope: rootRef })` voor cleanup.
- Statement-reveal: split de headline in regels (wrap elke regel in een masker-`div`), anim `y`/`autoAlpha`.
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function EVRVenturesHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav data-nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-extrabold tracking-tight">EVR<span className="text-primary"> Ventures</span></span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Thesis','Portfolio','Team','Insights'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Submit pitch
        </button>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-20">
        <span data-eyebrow className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Early-stage · Seed to Series A
        </span>
        <h1 className="mt-8 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          <span className="block overflow-hidden"><span data-line className="block">We back founders</span></span>
          <span className="block overflow-hidden"><span data-line className="block">building the <span className="text-primary">next decade.</span></span></span>
        </h1>
        <p data-sub className="mt-6 max-w-xl text-lg text-ink/70">
          A conviction-led fund partnering with technical teams from first cheque to category leadership.
        </p>
        <div data-actions className="mt-8 flex flex-wrap gap-4">
          <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
            Submit your pitch
          </button>
          <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
            View portfolio
          </button>
        </div>

        <div data-stats className="mt-14 grid grid-cols-2 gap-8 border-t border-ink/10 pt-10 md:grid-cols-4">
          {[['$1.2B','Assets under mgmt'],['140+','Companies'],['28','Exits'],['11','Unicorns']].map(([n,l]) => (
            <div key={l}>
              <div data-stat data-target={n} className="text-3xl font-extrabold text-primary">{n}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/55">{l}</div>
            </div>
          ))}
        </div>

        <div data-logos className="mt-14">
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-ink/40">Selected portfolio</p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
            {['Helio','Quanta','Nimbus','Forge','Atlas','Orbit'].map((p) => (
              <span key={p} data-logo className="flex h-12 items-center justify-center rounded-lg border border-ink/10 bg-white text-sm font-semibold tracking-wide text-ink/60">
                {p}
              </span>
            ))}
          </div>
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

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('[data-nav]', { y: -24, autoAlpha: 0 })
      .from('[data-eyebrow]', { y: 16, autoAlpha: 0 }, '-=0.4')
      // statement-reveal per regel uit een masker
      .from('[data-line]', { yPercent: 110, autoAlpha: 0, stagger: 0.14, duration: 1, ease: 'power4.out' }, '-=0.3')
      .from('[data-sub]', { y: 20, autoAlpha: 0 }, '-=0.6')
      .from('[data-actions] > *', { y: 18, autoAlpha: 0, stagger: 0.12 }, '-=0.5')
      .from('[data-stats] > *', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.3')
      .from('[data-logos] [data-logo]', { y: 16, autoAlpha: 0, stagger: 0.07, ease: 'back.out(1.5)' }, '-=0.3');

    // counter-up
    document.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
      const raw = el.dataset.target || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!num) return;
      const c = { v: 0 };
      gsap.to(c, { v: num, duration: 1.5, delay: 1, ease: 'power2.out',
        snap: { v: raw.includes('.') ? 0.1 : 1 },
        onUpdate: () => { el.textContent = raw.replace(/[0-9.]+/, c.v.toFixed(raw.includes('.') ? 1 : 0)); } });
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-eyebrow],[data-line],[data-sub],[data-actions] > *,[data-stats] > *,[data-logos] [data-logo]', { autoAlpha: 1, x: 0, y: 0, yPercent: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] VC-hero met Inter, blauw + warme CTA "Submit your pitch", helder fund-thesis-statement.
- [ ] Headline reveal per regel uit een overflow-masker (`yPercent`+`autoAlpha`).
- [ ] Fund-stats tellen op via GSAP counter; portfolio-logo-grid fade-in met `back.out`.
- [ ] Entrance via één `gsap.timeline()` met staggered transform-aliassen; eases `power3.out`/`power4.out`/`back.out`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles zichtbaar zonder beweging.
- [ ] Alleen transform-aliassen + `autoAlpha`; geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
