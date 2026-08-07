# Crypto Wealth — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een futuristische landing-hero voor een crypto wealth-platform: donkere achtergrond, gouden vertrouwens-accent en een paarse tech-CTA, met een live "portfolio waarde"-ticker en social proof. Doel: bezoekers laten starten met beleggen of een wallet koppelen.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — credibility markers, success metrics, reviews.
- **Pattern:** Video-First Hero — donkere overlay, brand-accent CTA, witte tekst op donker.
- **Color palette (hex tokens):**
  - `primary` #F59E0B (gold / trust)
  - `secondary` #FBBF24
  - `cta` #8B5CF6 (purple / tech)
  - `bg` #0F172A (slate-950)
  - `text` #F8FAFC
- **Font pairing (Google Fonts):** Orbitron (heading) + Exo 2 (body) — crypto/web3/futuristisch.
- **Key effects:** stat count-up, logo grid fade-in, testimonial micro-animaties, glow-accenten.
- **Avoid:** complexe navigatie, verstopte contactinfo.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=Orbitron:wght@500;600;700;800&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#F59E0B', secondary:'#FBBF24', cta:'#8B5CF6', bg:'#0F172A', ink:'#F8FAFC' },
  fontFamily: { display: ['Orbitron','sans-serif'], sans: ['"Exo 2"','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een `useCountUp` (GSAP-proxy) voor de portfolio-ticker en stats, plus gedeelde `useGSAP` scope. `gsap.matchMedia()` regelt reduced-motion: bij reduce geen ticker-tween en geen glow-loops.

```tsx
// glowing accent token (reused on CTA + ticker)
// boxShadow tween in timeline, never animate width/height
```

## Structure
```tsx
// src/sections/CryptoWealthHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function CryptoWealthHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg text-ink">
      {/* glow grid backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(139,92,246,0.18),transparent_55%),radial-gradient(circle_at_20%_80%,rgba(245,158,11,0.12),transparent_50%)]" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav font-display text-lg font-bold tracking-widest">CRYPTO·WEALTH</span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Markten', 'Earn', 'Wallet', 'Over ons'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-secondary">{l}</a>
          ))}
        </nav>
        <a href="#start" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Wallet koppelen
        </a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div className="flex flex-col gap-7">
          <span className="hero-eyebrow inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
            Beheer · groei · beveilig
          </span>
          <h1 className="hero-title font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Bouw je <span className="text-primary">digitale vermogen</span> in realtime.
          </h1>
          <p className="hero-sub max-w-md text-lg text-ink/70">
            Volg, ruil en stake meer dan 300 assets met institutionele beveiliging en lage fees.
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-4">
            <a href="#start" className={cn('rounded-lg bg-cta px-7 py-3.5 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
              Begin met beleggen
            </a>
            <a href="#demo" className="rounded-lg border border-ink/20 px-7 py-3.5 text-base font-semibold transition-colors duration-200 hover:bg-white/5 cursor-pointer">
              Bekijk markten
            </a>
          </div>
          <div className="hero-stats mt-2 flex gap-10">
            {[['2.4', 'mld € volume'], ['300', '+ assets'], ['1.2', 'M+ gebruikers']].map(([n, l], i) => (
              <div key={i}><div className="stat-num font-display text-3xl font-bold text-ink" data-target={n}>{n}</div><span className="text-sm text-ink/60">{l}</span></div>
            ))}
          </div>
        </div>

        {/* Portfolio ticker card */}
        <div className="hero-card relative rounded-2xl border border-cta/30 bg-white/5 p-6 backdrop-blur-xl">
          <p className="text-sm text-ink/60">Portfolio waarde</p>
          <p className="portfolio-val font-display text-4xl font-bold text-primary" data-target="84210">€0</p>
          <p className="mb-5 text-sm font-semibold text-cta">+12.4% deze maand</p>
          <div className="space-y-3">
            {[['BTC','+3.1%'],['ETH','+5.8%'],['SOL','+9.2%']].map(([sym, pct]) => (
              <div key={sym} className="hero-coin flex items-center justify-between rounded-lg bg-bg/60 px-4 py-3">
                <span className="font-display text-sm font-semibold">{sym}</span>
                <span className="text-sm font-semibold text-emerald-400">{pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

## Animation (GSAP)
```tsx
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

useGSAP(() => {
  const mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.85 } })
    tl.from('.hero-nav', { y: -18, autoAlpha: 0, stagger: 0.05 })
      .from('.hero-eyebrow', { y: 22, autoAlpha: 0 }, '-=0.3')
      .from('.hero-title', { y: 40, autoAlpha: 0, duration: 1.05 }, '-=0.4')
      .from('.hero-sub', { y: 26, autoAlpha: 0 }, '-=0.6')
      .from('.hero-cta', { y: 22, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.5')
      .from('.hero-card', { x: 50, scale: 0.96, autoAlpha: 0, duration: 1 }, '-=0.9')
      .from('.hero-coin', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.6')
      .from('.hero-stats > div', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.5')

    // count-up: portfolio + stats
    const pVal = document.querySelector<HTMLElement>('.portfolio-val')!
    const pp = { v: 0 }
    gsap.to(pp, { v: 84210, duration: 1.8, ease: 'power2.out', onUpdate: () => { pVal.textContent = '€' + Math.round(pp.v).toLocaleString('nl-NL') } })
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
      const t = parseFloat(el.dataset.target || '0'); const proxy = { v: 0 }
      gsap.to(proxy, { v: t, duration: 1.5, ease: 'power2.out', onUpdate: () => { el.textContent = (Number.isInteger(t) ? Math.round(proxy.v) : proxy.v.toFixed(1)).toString() } })
    })

    // CTA + card glow loop
    gsap.to('.hero-card', { boxShadow: '0 0 36px rgba(139,92,246,0.35)', repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut' })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-card, .hero-coin, .hero-stats > div', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
    document.querySelector<HTMLElement>('.portfolio-val')!.textContent = '€84.210'
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => { el.textContent = el.dataset.target || '' })
  })
}, { scope: root })
```

## Acceptance
- [ ] Donkere slate-bg, gold primary + purple CTA conform palet.
- [ ] Orbitron display + Exo 2 body; witte tekst leesbaar op donker (≥ 4.5:1).
- [ ] Portfolio-ticker en stats animeren met count-up via proxy; reduce toont eindwaarde.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`x`/`y`/`scale`), eases `power3.out` + `back.out(1.7)`.
- [ ] Card glow-loop via boxShadow; geen layout-eigenschappen geanimeerd.
- [ ] `gsap.matchMedia()` schakelt motion + count-up uit bij reduce; `useGSAP` scope voor cleanup.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
