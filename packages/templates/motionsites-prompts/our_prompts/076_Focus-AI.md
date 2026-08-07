# Focus AI — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een rustige, conversiegerichte landingspage-hero voor "Focus AI" — een AI-assistent die afleiding wegfiltert en diepe focus mogelijk maakt — met een prijs-bewuste headline, dubbele CTA, social proof en een drijvend prompt-/focus-card. Doel: bezoeker laat zich inschrijven voor een gratis plan.

## Design system (ui-ux-pro-max)

- **Pattern:** Pricing Page + CTA — starter-plan highlighten, jaarkorting tonen, sticky CTA.
- **Stijl:** Social Proof-Focused — reviews, metrics, klantlogo's prominent.
- **Kleurtokens (hex):**
  - Primary `#0EA5E9` (sky blue trust)
  - Secondary `#38BDF8`
  - CTA `#F97316` (warm)
  - Background `#F0F9FF`
  - Text `#0C4A6E`
- **Font pairing (Google Fonts):** Heading **Outfit** (300–700), Body **Work Sans** (300–700) — clean, modern.
- **Key effects:** logo-grid fade-in, stat counter-up, card fade-up, typende prompt-tekst, zachte pulse op focus-ring.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-6xl mx-auto px-6`.
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

- `useGSAP(() => {...}, { scope: rootRef })` voor cleanup.
- Typend effect zonder plugin: tween een index `{ i: 0 }` → `onUpdate` slice de string.
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function FocusAIHero() {
  const rootRef = useRef<HTMLElement>(null);
  const promptRef = useRef<HTMLSpanElement>(null);
  const FULL = 'Summarize my unread threads and draft replies.';
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <nav data-nav className="sticky top-0 z-20 mx-auto flex max-w-6xl items-center justify-between bg-bg/80 px-6 py-4 backdrop-blur">
        <span className="font-display text-lg font-bold tracking-tight">Focus<span className="text-primary">AI</span></span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Features','Pricing','Reviews','Blog'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Try free
        </button>
      </nav>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-16 text-center">
        <span data-eyebrow className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Less noise. More done.
        </span>
        <h1 data-title className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Your AI for <span className="text-primary">deep focus.</span>
        </h1>
        <p data-sub className="mt-6 max-w-xl text-lg text-ink/70">
          Focus AI triages your inbox, drafts replies and protects your attention — free to start, 25% off annual.
        </p>
        <div data-actions className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button className="rounded-lg bg-cta px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer">
            Start for free
          </button>
          <button className="rounded-lg border border-ink/15 px-7 py-3 font-medium transition-colors hover:bg-white cursor-pointer">
            See pricing
          </button>
        </div>

        {/* focus / prompt card */}
        <div data-card className="mt-14 w-full max-w-2xl rounded-2xl border border-primary/20 bg-white p-5 text-left shadow-xl">
          <div className="flex items-center gap-2 text-xs text-ink/50">
            <span data-ring className="h-2.5 w-2.5 rounded-full bg-primary" /> Focus mode active
          </div>
          <div className="mt-4 rounded-xl bg-bg p-4 font-sans text-sm">
            <span ref={promptRef}></span><span data-caret className="inline-block w-[2px] bg-primary align-middle">&nbsp;</span>
          </div>
          <div data-reply className="mt-3 rounded-xl bg-primary/5 p-4 text-sm text-ink/80">
            3 threads summarized · 2 replies drafted · 41 min focus saved
          </div>
        </div>

        <div data-stats className="mt-12 flex gap-10">
          {[['2.1M','Tasks/day'],['41min','Saved/user'],['4.9','App rating']].map(([n,l]) => (
            <div key={l}>
              <div data-stat data-target={n} className="font-display text-2xl font-bold text-primary">{n}</div>
              <div className="text-xs uppercase tracking-wide text-ink/55">{l}</div>
            </div>
          ))}
        </div>

        <div data-logos className="mt-12 flex flex-wrap items-center justify-center gap-10 opacity-60">
          {['Slack','Gmail','Notion','Linear','Zoom'].map((p) => (
            <span key={p} className="text-sm font-semibold tracking-wide text-ink/50">{p}</span>
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

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('[data-nav]', { y: -24, autoAlpha: 0 })
      .from('[data-eyebrow]', { y: 16, autoAlpha: 0 }, '-=0.4')
      .from('[data-title]', { y: 36, autoAlpha: 0, duration: 1 }, '-=0.3')
      .from('[data-sub]', { y: 20, autoAlpha: 0 }, '-=0.6')
      .from('[data-actions] > *', { y: 18, autoAlpha: 0, stagger: 0.12 }, '-=0.5')
      .from('[data-card]', { y: 40, autoAlpha: 0, scale: 0.96, ease: 'back.out(1.5)', duration: 1 }, '-=0.4')
      .from('[data-stats] > *', { y: 16, autoAlpha: 0, stagger: 0.1 }, '-=0.4')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.4');

    // typende prompt
    const FULL = 'Summarize my unread threads and draft replies.';
    const o = { i: 0 };
    gsap.to(o, { i: FULL.length, duration: 1.8, delay: 1.2, ease: 'none',
      snap: { i: 1 }, onUpdate: () => { if (promptRef.current) promptRef.current.textContent = FULL.slice(0, o.i); } });

    // knipperende caret + pulserende ring
    gsap.to('[data-caret]', { autoAlpha: 0, repeat: -1, yoyo: true, duration: 0.5, ease: 'steps(1)' });
    gsap.to('[data-ring]', { scale: 1.4, autoAlpha: 0.4, repeat: -1, yoyo: true, duration: 1, ease: 'sine.inOut', delay: 1 });

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
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-actions] > *,[data-card],[data-stats] > *,[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    if (promptRef.current) promptRef.current.textContent = 'Summarize my unread threads and draft replies.';
    gsap.set('[data-caret]', { autoAlpha: 0 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Gecentreerde AI-landing hero met sky-blue trust + warm CTA, Outfit-headline + Work Sans body.
- [ ] Focus-card met typende prompt (GSAP index-tween), knipperende caret en pulserende focus-ring.
- [ ] Stats tellen op via GSAP counter; klantlogo-strip fade-in; sticky nav-CTA.
- [ ] Entrance via één `gsap.timeline()` met staggered `y`/`autoAlpha`; eases `power3.out` + `back.out`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles zichtbaar, prompt volledig, caret verborgen.
- [ ] Alleen transform-aliassen + `autoAlpha`; geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
