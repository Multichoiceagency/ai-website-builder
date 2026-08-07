# Wealth Video Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Fintech · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een fullscreen video-first fintech-hero voor een vermogensbeheer-platform: donkere video-achtergrond met 60% overlay, gouden vertrouwens-accent en een paarse tech-CTA, met een count-up "beheerd vermogen"-stat. Doel: bezoekers laten starten met beleggen of een adviesgesprek inplannen.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — credibility markers, success metrics, klantlogo's.
- **Pattern:** Video-First Hero — donkere overlay 60% op video, brand-accent CTA, witte tekst op donker.
- **Color palette (hex tokens):**
  - `primary` #F59E0B (gold / trust)
  - `secondary` #FBBF24
  - `cta` #8B5CF6 (purple / tech)
  - `bg` #0F172A (slate-950)
  - `text` #F8FAFC
- **Font pairing (Google Fonts):** IBM Plex Sans (heading + body) — financial, trustworthy, corporate.
- **Key effects:** stat count-up, logo grid fade-in, fade-in op hero, CTA glow.
- **Avoid:** complexe navigatie, verstopte contactinfo.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#F59E0B', secondary:'#FBBF24', cta:'#8B5CF6', bg:'#0F172A', ink:'#F8FAFC' },
  fontFamily: { sans: ['"IBM Plex Sans"','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een gedeelde `useGSAP` scope en een `useCountUp` (GSAP-proxy) voor het "beheerd vermogen"-cijfer. `gsap.matchMedia()` regelt reduced-motion: bij reduce geen CTA-glow en geen count-up (eindwaarde direct).

```tsx
// AUM count-up via proxy, formatted as currency
// gsap.to(proxy, { v: 8.4, duration: 1.8, ease: 'power2.out', onUpdate: () => el.textContent = '€' + proxy.v.toFixed(1) + ' mld' })
```

## Structure
```tsx
// src/sections/WealthVideoHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function WealthVideoHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg text-ink">
      {/* Video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay muted loop playsInline poster="/poster.jpg"
        aria-hidden="true"
      >
        <source src="/markets.webm" type="video/webm" />
        <source src="/markets.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(245,158,11,0.18),transparent_55%)]" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-bold tracking-tight">Aurum<span className="text-primary">Wealth</span></span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Beleggen', 'Advies', 'Performance', 'Over ons'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-secondary">{l}</a>
          ))}
        </nav>
        <a href="#start" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Open rekening
        </a>
      </header>

      <div className="relative z-10 mx-auto flex max-w-content flex-col items-start gap-7 px-6 pb-24 pt-24 md:pt-36">
        <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
          Vermogensbeheer · sinds 1998
        </span>
        <h1 className="hero-title max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
          Laat je <span className="text-primary">vermogen</span> voor je werken.
        </h1>
        <p className="hero-sub max-w-xl text-lg text-ink/80 md:text-xl">
          Persoonlijk advies, gespreide portefeuilles en transparante kosten — voor de lange termijn.
        </p>
        <div className="hero-cta flex flex-wrap items-center gap-4">
          <a href="#start" className={cn('rounded-lg bg-cta px-8 py-4 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
            Begin met beleggen
          </a>
          <a href="#talk" className="rounded-lg border border-white/30 px-8 py-4 text-base font-semibold transition-colors duration-200 hover:bg-white/10 cursor-pointer">
            Plan adviesgesprek
          </a>
        </div>
        <div className="hero-stats mt-6 flex flex-wrap gap-10 text-sm text-ink/70">
          <div><div className="aum text-3xl font-bold text-white" data-target="8.4">€0 mld</div>Beheerd vermogen</div>
          {[['24k+', 'Klanten'], ['+9.2%', 'Gem. rendement']].map(([n, l]) => (
            <div key={l}><div className="text-3xl font-bold text-white">{n}</div>{l}</div>
          ))}
        </div>

        {/* Logo strip */}
        <div className="hero-logos mt-8 flex flex-wrap items-center gap-8 opacity-70">
          {['AFM','DNB','Euronext','MSCI'].map((b) => (
            <span key={b} className="hero-logo text-base font-bold text-ink/60">{b}</span>
          ))}
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
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } })
    tl.from('.hero-nav', { y: -20, autoAlpha: 0, stagger: 0.06 })
      .from('.hero-eyebrow', { y: 22, autoAlpha: 0 }, '-=0.4')
      .from('.hero-title', { y: 44, autoAlpha: 0, duration: 1.1 }, '-=0.5')
      .from('.hero-sub', { y: 28, autoAlpha: 0 }, '-=0.7')
      .from('.hero-cta', { y: 24, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.6')
      .from('.hero-stats > div', { y: 20, autoAlpha: 0, stagger: 0.12 }, '-=0.5')
      .from('.hero-logo', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.4')

    // AUM count-up
    const aum = document.querySelector<HTMLElement>('.aum')!
    const proxy = { v: 0 }
    gsap.to(proxy, { v: 8.4, duration: 1.8, ease: 'power2.out', onUpdate: () => { aum.textContent = '€' + proxy.v.toFixed(1) + ' mld' } })

    // CTA glow loop
    gsap.to('.hero-cta a:first-child', { boxShadow: '0 0 30px rgba(139,92,246,0.55)', repeat: -1, yoyo: true, duration: 1.6, ease: 'sine.inOut' })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-stats > div, .hero-logo', { autoAlpha: 1, y: 0, scale: 1 })
    document.querySelector<HTMLElement>('.aum')!.textContent = '€8.4 mld'
  })
}, { scope: root })
```

## Acceptance
- [ ] Fullscreen video met 60% donkere overlay; witte tekst leesbaar (contrast ≥ 4.5:1).
- [ ] Gold primary + purple CTA conform palet; IBM Plex Sans typografie (trustworthy/corporate).
- [ ] "Beheerd vermogen" count-up via proxy; bij reduce direct eindwaarde.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`y`/`scale`), eases `power3.out` + `back.out(1.7)`.
- [ ] CTA glow-loop via boxShadow; geen layout-eigenschappen geanimeerd.
- [ ] `gsap.matchMedia()` schakelt motion + count-up uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope voor cleanup; video heeft `poster`/`muted`/`loop`/`playsInline`.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
