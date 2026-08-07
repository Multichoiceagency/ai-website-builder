# EcoVolta — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een schone, vertrouwenwekkende hero voor een duurzame energie-/EV-laad-startup ("EcoVolta"): heldere belofte over groene stroom, een energieke CTA en een rechts geplaatste dashboardkaart met live energie-opbrengst. Doel: bezoekers laten starten met groene energie of een laadpaal aanvragen.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — credibility markers, success metrics, klantlogo's.
- **Pattern:** Video-First Hero (toegepast als dashboard/energie-showcase met optionele video-loop).
- **Color palette (hex tokens):**
  - `primary` #2563EB (blue)
  - `secondary` #3B82F6
  - `cta` #F97316 (orange / energie-accent)
  - `bg` #F8FAFC
  - `text` #1E293B
  - *toegevoegd accent voor "groen":* `eco` #10B981 (gebruikt voor energie/positieve indicatoren, binnen WCAG-contrast)
- **Font pairing (Google Fonts):** Inter (heading + body) — professional + clear.
- **Key effects:** stat count-up, logo grid fade-in, dashboard reveal, subtiele glow op energie-meter.
- **Avoid:** complexe navigatie, verstopte contactinfo.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', eco:'#10B981', bg:'#F8FAFC', ink:'#1E293B' },
  fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een gedeelde `useGSAP` scope plus een `useCountUp` (GSAP-proxy) voor de energie-meter en stats. `gsap.matchMedia()` regelt reduced-motion: bij reduce geen meter-tween/glow en geen count-up.

```tsx
// energy meter: animate scaleX of a fill bar via transform-origin left (no width animation)
// gsap.from('.meter-fill', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'power3.out' })
```

## Structure
```tsx
// src/sections/EcoVoltaHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function EcoVoltaHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute -left-24 top-0 h-[440px] w-[440px] rounded-full bg-eco/10 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-extrabold tracking-tight">Eco<span className="text-eco">Volta</span></span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Stroom', 'Laden', 'Zakelijk', 'Impact'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#start" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Overstappen
        </a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col gap-7">
          <span className="hero-eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-eco/10 px-4 py-1.5 text-sm font-semibold text-eco">
            100% groene energie
          </span>
          <h1 className="hero-title text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Stroom die je <span className="text-eco">planeet</span> én portemonnee spaart.
          </h1>
          <p className="hero-sub max-w-md text-lg text-ink/70">
            Schakel over op zonne- en windstroom en laad je EV slim op de goedkoopste momenten.
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-4">
            <a href="#start" className={cn('rounded-lg bg-cta px-7 py-3.5 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
              Bereken je besparing
            </a>
            <a href="#how" className="rounded-lg border border-ink/15 px-7 py-3.5 text-base font-semibold transition-colors duration-200 hover:bg-white cursor-pointer">
              Hoe het werkt
            </a>
          </div>
          <div className="hero-stats mt-2 flex gap-10">
            {[['38', '% besparing'], ['12', 'k+ huishoudens'], ['0', ' CO₂']].map(([n, l], i) => (
              <div key={i}><div className="stat-num text-3xl font-extrabold text-ink" data-target={n}>{n}</div><span className="text-sm text-ink/60">{l}</span></div>
            ))}
          </div>
        </div>

        {/* Energy dashboard card */}
        <div className="hero-card relative rounded-2xl border border-ink/10 bg-white p-7 shadow-2xl shadow-eco/10">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-ink/60">Vandaag opgewekt</span>
            <span className="rounded-full bg-eco/10 px-3 py-1 text-xs font-semibold text-eco">Live</span>
          </div>
          <p className="meter-num text-4xl font-extrabold text-eco" data-target="24.6">0 kWh</p>
          <div className="my-4 h-3 overflow-hidden rounded-full bg-ink/10">
            <span className="meter-fill block h-full w-3/4 rounded-full bg-gradient-to-r from-eco to-secondary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['Zon', '18.2 kWh'], ['Wind', '6.4 kWh'], ['Verbruik', '11.0 kWh'], ['Teruglevering', '13.6 kWh']].map(([k, v]) => (
              <div key={k} className="hero-tile rounded-lg bg-bg px-4 py-3">
                <span className="text-xs text-ink/50">{k}</span>
                <div className="font-semibold">{v}</div>
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
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })
    tl.from('.hero-nav', { y: -18, autoAlpha: 0, stagger: 0.05 })
      .from('.hero-eyebrow', { y: 20, autoAlpha: 0 }, '-=0.3')
      .from('.hero-title', { y: 38, autoAlpha: 0, duration: 1 }, '-=0.4')
      .from('.hero-sub', { y: 24, autoAlpha: 0 }, '-=0.6')
      .from('.hero-cta', { y: 22, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.5')
      .from('.hero-card', { x: 50, autoAlpha: 0, duration: 1 }, '-=0.9')
      .from('.meter-fill', { scaleX: 0, transformOrigin: 'left center', duration: 1.4 }, '-=0.7')
      .from('.hero-tile', { y: 18, autoAlpha: 0, stagger: 0.08 }, '-=0.9')
      .from('.hero-stats > div', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.6')

    // count-up: meter + stats
    const meter = document.querySelector<HTMLElement>('.meter-num')!
    const mp = { v: 0 }
    gsap.to(mp, { v: 24.6, duration: 1.6, ease: 'power2.out', onUpdate: () => { meter.textContent = mp.v.toFixed(1) + ' kWh' } })
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
      const t = parseFloat(el.dataset.target || '0'); const proxy = { v: 0 }
      gsap.to(proxy, { v: t, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(proxy.v).toString() } })
    })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-card, .hero-tile, .hero-stats > div', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
    gsap.set('.meter-fill', { scaleX: 1 })
    document.querySelector<HTMLElement>('.meter-num')!.textContent = '24.6 kWh'
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => { el.textContent = el.dataset.target || '' })
  })
}, { scope: root })
```

## Acceptance
- [ ] Blauw primary + oranje CTA + groen eco-accent conform palet; Inter typografie.
- [ ] Energie-meter animeert via `scaleX` (transform-only, geen width-animatie) + count-up.
- [ ] Stats count-up via proxy; bij reduce direct eindwaarde, meter direct vol.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`x`/`y`/`scale`), eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` schakelt motion + count-up uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope voor cleanup; geen width/height/top/left geanimeerd.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
