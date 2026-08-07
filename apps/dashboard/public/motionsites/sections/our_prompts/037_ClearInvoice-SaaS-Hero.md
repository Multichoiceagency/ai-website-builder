# ClearInvoice SaaS Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een conversiegerichte SaaS-hero voor een facturatie-platform: heldere headline, korte sub, dubbele CTA en sociale bewijskracht (logo's + statcounters) naast een schuin geprojecteerde app-mock. Doel: vertrouwen wekken en proefaccounts genereren.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — testimonials/logo's prominent, success metrics, credibility markers.
- **Pattern:** Video-First Hero (hier toegepast als product/app-showcase met optionele video-loop).
- **Color palette (hex tokens):**
  - `primary` #6366F1 (indigo)
  - `secondary` #818CF8
  - `cta` #10B981 (emerald)
  - `bg` #F5F3FF
  - `text` #1E1B4B
- **Font pairing (Google Fonts):** Plus Jakarta Sans (heading + body) — friendly, modern, clean SaaS.
- **Key effects:** logo grid fade-in, stat counter count-up, testimonial micro-animaties.
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
  colors: { primary:'#6366F1', secondary:'#818CF8', cta:'#10B981', bg:'#F5F3FF', ink:'#1E1B4B' },
  fontFamily: { sans: ['"Plus Jakarta Sans"','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een `useCountUp` voor de statcounters (GSAP tween op een proxy-object) en een gedeelde `useGSAP` scope. `gsap.matchMedia()` regelt reduced-motion: bij reduce slaan we count-up over en tonen we de eindwaarde direct.

```tsx
// proxy count-up snippet (used inside the GSAP timeline)
const counter = { val: 0 }
gsap.to(counter, {
  val: 99.9, duration: 1.6, ease: 'power2.out',
  onUpdate: () => { statEl.textContent = counter.val.toFixed(1) + '%' },
})
```

## Structure
```tsx
// src/sections/ClearInvoiceHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function ClearInvoiceHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-extrabold tracking-tight">ClearInvoice</span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Functies', 'Prijzen', 'Klanten', 'Docs'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#trial" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Gratis proberen
        </a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col gap-7">
          <span className="hero-eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Facturatie zonder gedoe
          </span>
          <h1 className="hero-title text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Stuur facturen die <span className="text-primary">binnen 30 dagen</span> betaald worden.
          </h1>
          <p className="hero-sub max-w-md text-lg text-ink/70">
            Automatiseer herinneringen, koppel je bank en zie realtime wie nog moet betalen.
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-4">
            <a href="#trial" className={cn('rounded-lg bg-cta px-7 py-3.5 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
              Start gratis trial
            </a>
            <a href="#demo" className="rounded-lg border border-ink/15 px-7 py-3.5 text-base font-semibold transition-colors duration-200 hover:bg-white cursor-pointer">
              Bekijk demo
            </a>
          </div>
          <div className="hero-stats mt-2 flex gap-10">
            {[['12k+', 'Bedrijven'], ['99.9', '% betaald', true], ['4.9', 'G2 score']].map(([n, l, isPct], i) => (
              <div key={i}><div className={cn('stat-num text-3xl font-extrabold text-ink')} data-target={n} data-pct={isPct ? '1' : '0'}>{n}{isPct ? '%' : ''}</div><span className="text-sm text-ink/60">{l}</span></div>
            ))}
          </div>
        </div>

        {/* App mock */}
        <div className="hero-mock relative">
          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-2xl shadow-primary/10">
            <div className="mb-3 flex gap-1.5"><span className="h-3 w-3 rounded-full bg-ink/15" /><span className="h-3 w-3 rounded-full bg-ink/15" /><span className="h-3 w-3 rounded-full bg-ink/15" /></div>
            <div className="space-y-3">
              {[1,2,3,4].map((r) => (
                <div key={r} className="hero-row flex items-center justify-between rounded-lg bg-bg px-4 py-3">
                  <span className="h-2.5 w-28 rounded bg-secondary/40" />
                  <span className="rounded-full bg-cta/15 px-3 py-1 text-xs font-semibold text-cta">Betaald</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logo strip (social proof) */}
      <div className="relative z-10 mx-auto max-w-content border-t border-ink/10 px-6 py-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-ink/40">Vertrouwd door teams bij</p>
        <div className="hero-logos flex flex-wrap items-center justify-center gap-10 opacity-70">
          {['Acme','Northwind','Globex','Initech','Umbrella'].map((b) => (
            <span key={b} className="hero-logo text-lg font-bold text-ink/50">{b}</span>
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
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })
    tl.from('.hero-nav', { y: -18, autoAlpha: 0, stagger: 0.05 })
      .from('.hero-eyebrow', { y: 20, autoAlpha: 0 }, '-=0.3')
      .from('.hero-title', { y: 36, autoAlpha: 0, duration: 1 }, '-=0.4')
      .from('.hero-sub', { y: 24, autoAlpha: 0 }, '-=0.6')
      .from('.hero-cta', { y: 20, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.5')
      .from('.hero-mock', { x: 60, autoAlpha: 0, duration: 1 }, '-=0.9')
      .from('.hero-row', { x: 24, autoAlpha: 0, stagger: 0.1 }, '-=0.6')
      .from('.hero-logo', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.4')

    // stat count-up via proxy
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
      const target = parseFloat(el.dataset.target || '0')
      const pct = el.dataset.pct === '1'
      const proxy = { v: 0 }
      gsap.to(proxy, {
        v: target, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.textContent = (Number.isInteger(target) ? Math.round(proxy.v) : proxy.v.toFixed(1)) + (pct ? '%' : '') },
      })
    })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-mock, .hero-row, .hero-logo, .hero-stats', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
  })
}, { scope: root })
```

## Acceptance
- [ ] Indigo primary + emerald CTA conform palet; Plus Jakarta Sans typografie.
- [ ] Social proof: logo strip + stat counters met count-up animatie.
- [ ] App-mock schuift in vanaf rechts (`x`), rijen staggered via `autoAlpha`.
- [ ] GSAP entrance-timeline met `power3.out` / `back.out(1.7)`; alleen transform-aliassen.
- [ ] Count-up via proxy-object; bij `prefers-reduced-motion: reduce` direct eindwaarde.
- [ ] `gsap.matchMedia()` schakelt motion uit; `useGSAP` scope voor cleanup.
- [ ] Geen width/height/top/left geanimeerd.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states overal.
