# Bionova Biotech — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een wetenschappelijk-strakke hero voor een biotech-/life-sciences-platform ("Bionova"): vertrouwenwekkende headline over onderzoek en data, een groene actie-CTA en een rechts geplaatste visual met een geanimeerde DNA-helix en research-stats. Doel: labs en partners laten aanmelden voor een demo.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — credibility markers, success metrics, partnerlogo's.
- **Pattern:** Video-First Hero (toegepast als research/data-showcase met optionele video-loop).
- **Color palette (hex tokens):**
  - `primary` #0EA5E9 (DNA blue)
  - `secondary` #0284C7
  - `cta` #10B981 (life green)
  - `bg` #F0F9FF
  - `text` #0C4A6E
- **Font pairing (Google Fonts):** Plus Jakarta Sans (heading + body) — clean, modern, professional.
- **Key effects:** stat count-up, logo grid fade-in, DNA-helix rotatie/draw, subtiele glow.
- **Avoid:** complexe navigatie, verstopte contactinfo.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#0EA5E9', secondary:'#0284C7', cta:'#10B981', bg:'#F0F9FF', ink:'#0C4A6E' },
  fontFamily: { sans: ['"Plus Jakarta Sans"','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een gedeelde `useGSAP` scope, een `useCountUp` (GSAP-proxy) voor research-stats en een herhalende rotatie van de DNA-helix (transform `rotation`). `gsap.matchMedia()` regelt reduced-motion: bij reduce geen helix-rotatie en geen count-up.

```tsx
// DNA helix base-pair stagger reveal (autoAlpha + scale), then slow rotation loop
// gsap.to('.dna', { rotation: 360, repeat: -1, duration: 18, ease: 'none', transformOrigin: 'center' })
```

## Structure
```tsx
// src/sections/BionovaHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function BionovaHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute -right-24 top-0 h-[460px] w-[460px] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-extrabold tracking-tight">Bio<span className="text-primary">nova</span></span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Platform', 'Onderzoek', 'Partners', 'Publicaties'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#demo" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Demo aanvragen
        </a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col gap-7">
          <span className="hero-eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
            Life sciences · data platform
          </span>
          <h1 className="hero-title text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Versnel ontdekkingen met <span className="text-primary">genoomdata</span> in realtime.
          </h1>
          <p className="hero-sub max-w-md text-lg text-ink/70">
            Analyseer, visualiseer en deel onderzoeksdata veilig — van lab tot publicatie.
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-4">
            <a href="#demo" className={cn('rounded-lg bg-cta px-7 py-3.5 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
              Plan een demo
            </a>
            <a href="#science" className="rounded-lg border border-ink/15 bg-white px-7 py-3.5 text-base font-semibold transition-colors duration-200 hover:bg-bg cursor-pointer">
              Bekijk de wetenschap
            </a>
          </div>
          <div className="hero-stats mt-2 flex gap-10">
            {[['2.1', 'M+ samples'], ['40', '+ instituten'], ['99.9', '% nauwkeurig']].map(([n, l], i) => (
              <div key={i}><div className="stat-num text-3xl font-extrabold text-ink" data-target={n}>{n}</div><span className="text-sm text-ink/60">{l}</span></div>
            ))}
          </div>
        </div>

        {/* DNA helix visual */}
        <div className="relative flex items-center justify-center">
          <div className="hero-card relative rounded-2xl border border-ink/10 bg-white p-10 shadow-2xl shadow-primary/10">
            <svg className="dna mx-auto h-64 w-40" viewBox="0 0 120 240" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => {
                const y = 12 + i * 24
                const phase = Math.sin((i / 10) * Math.PI * 2) * 40
                return (
                  <g key={i} className="dna-pair">
                    <circle cx={60 + phase} cy={y} r="6" fill="#0EA5E9" />
                    <circle cx={60 - phase} cy={y} r="6" fill="#10B981" />
                    <line x1={60 + phase} y1={y} x2={60 - phase} y2={y} stroke="#0284C7" strokeWidth="2" opacity="0.4" />
                  </g>
                )
              })}
            </svg>
            <p className="mt-4 text-center text-sm font-semibold text-ink/60">Sequence rendering · live</p>
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
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })
    tl.from('.hero-nav', { y: -18, autoAlpha: 0, stagger: 0.05 })
      .from('.hero-eyebrow', { y: 20, autoAlpha: 0 }, '-=0.3')
      .from('.hero-title', { y: 38, autoAlpha: 0, duration: 1 }, '-=0.4')
      .from('.hero-sub', { y: 24, autoAlpha: 0 }, '-=0.6')
      .from('.hero-cta', { y: 22, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.5')
      .from('.hero-card', { x: 50, autoAlpha: 0, duration: 1 }, '-=0.9')
      .from('.dna-pair', { scale: 0, autoAlpha: 0, transformOrigin: 'center', stagger: 0.08, ease: 'back.out(1.7)' }, '-=0.7')
      .from('.hero-stats > div', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.5')

    // slow helix rotation loop
    gsap.to('.dna', { rotation: 360, transformOrigin: 'center', repeat: -1, duration: 22, ease: 'none', delay: 1.4 })

    // stat count-up
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
      const t = parseFloat(el.dataset.target || '0'); const proxy = { v: 0 }
      gsap.to(proxy, { v: t, duration: 1.5, ease: 'power2.out', onUpdate: () => { el.textContent = (Number.isInteger(t) ? Math.round(proxy.v) : proxy.v.toFixed(1)).toString() } })
    })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-card, .dna-pair, .hero-stats > div', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => { el.textContent = el.dataset.target || '' })
  })
}, { scope: root })
```

## Acceptance
- [ ] DNA-blue primary + life-green CTA conform palet; Plus Jakarta Sans typografie.
- [ ] DNA-helix SVG met base-pairs die staggered inschalen, daarna trage rotatie-loop (transform `rotation`).
- [ ] Research-stats count-up via proxy; bij reduce direct eindwaarde.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`x`/`y`/`scale`), eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` schakelt rotatie + count-up uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope voor cleanup; geen width/height/top/left geanimeerd.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
