# Nexora Features — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Features Section · features), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vibrante, block-based features-sectie ("Nexora") die 3–5 kernfeatures van een product toont in een bento-/card-grid, met een korte eyebrow + headline bovenaan en een afsluitende CTA. Bedoeld als value-prop blok dat tussen hero en pricing leeft.

## Design system (ui-ux-pro-max)

- **Stijl:** Vibrant & Block-based — bold, energetisch, geometrische blokken, hoog kleurcontrast, grote secties.
- **Pattern:** Hero + Features + CTA → focus op de features-grid met contrasterende CTA.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (blue)
  - `secondary` `#3B82F6`
  - `cta` `#F97316` (orange)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Typografie (Google Fonts):** Inter (headings + body) — modern, friendly.
- **Key effects:** grote secties (48px+ gaps), bold hover (color shift), grote type (32px+), scroll-snap gevoel, 200–300ms transitions.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-6xl mx-auto px-6`.
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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(useGSAP, ScrollTrigger);
```

Gebruik `gsap.matchMedia()` voor `prefers-reduced-motion`. Animeer uitsluitend transform-aliassen (`x/y/scale/autoAlpha`); de grid komt scroll-getriggerd in beeld via ScrollTrigger.

## Structure

```tsx
const FEATURES = [
  { t: 'Realtime sync', d: 'Alle data live gesynchroniseerd over je hele stack.', span: 'md:col-span-2' },
  { t: 'AI insights', d: 'Slimme aanbevelingen op basis van je gebruik.', span: '' },
  { t: 'No-code flows', d: 'Bouw automations zonder een regel code.', span: '' },
  { t: 'Enterprise security', d: 'SOC 2, SSO en end-to-end encryptie.', span: 'md:col-span-2' },
];

export default function NexoraFeatures() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="bg-bg py-24 text-ink">
      <div className="max-w-6xl mx-auto px-6">
        <header className="max-w-2xl">
          <span data-head className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-600 uppercase tracking-wide text-primary">
            Why Nexora
          </span>
          <h2 data-head className="mt-4 text-4xl font-700 leading-tight md:text-5xl">
            Everything you need to <span className="text-primary">move faster</span>.
          </h2>
          <p data-head className="mt-4 text-lg text-ink/70">
            Eén platform met de bouwblokken voor moderne teams — bold, snel en schaalbaar.
          </p>
        </header>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              data-card
              key={i}
              className={cn(
                'group rounded-3xl border border-primary/10 bg-white p-8 transition-colors duration-300 hover:border-primary/40 hover:bg-primary/5',
                f.span,
              )}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-cta group-hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-xl font-600">{f.t}</h3>
              <p className="mt-2 text-sm text-ink/70">{f.d}</p>
            </article>
          ))}
        </div>

        <div data-cta className="mt-16 flex flex-col items-center justify-between gap-6 rounded-3xl bg-primary px-8 py-10 text-center sm:flex-row sm:text-left">
          <p className="text-2xl font-600 text-white">Ready to build with Nexora?</p>
          <button className="rounded-full bg-cta px-7 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Start for free</button>
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
    gsap.from('[data-head]', {
      y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '[data-head]', start: 'top 80%' },
    });

    gsap.from('[data-card]', {
      y: 40, autoAlpha: 0, scale: 0.96, duration: 0.7, ease: 'back.out(1.7)', stagger: 0.12,
      scrollTrigger: { trigger: '[data-card]', start: 'top 85%' },
    });

    gsap.from('[data-cta]', {
      y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '[data-cta]', start: 'top 90%' },
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-head],[data-card],[data-cta]', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Blue primary `#2563EB` + orange CTA `#F97316`, bg `#F8FAFC`, tekst `#1E293B`.
- [ ] Inter geladen voor koppen en body; grote type (32px+) en ruime gaps.
- [ ] Bento-achtige grid met col-span variatie; bold hover color-shift (200–300ms).
- [ ] Header reveal met `power3.out`; cards met `back.out(1.7)`, scroll-getriggerd via ScrollTrigger.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }` voor cleanup; clickables `cursor-pointer`.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen i.p.v. emoji.
