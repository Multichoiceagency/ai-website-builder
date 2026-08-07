# Automation Machines — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een heldere B2B-hero voor een industrieel automatisering-/robotica-platform: krachtige headline over productiviteit, een oranje actie-CTA en een rechts geplaatste visual met een geanimeerde "workflow pipeline" van nodes. Doel: fabrikanten een demo of offerte laten aanvragen.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — credibility markers, success metrics, klantlogo's.
- **Pattern:** Video-First Hero (toegepast als product/pipeline-showcase met optionele video-loop).
- **Color palette (hex tokens):**
  - `primary` #2563EB (blue)
  - `secondary` #3B82F6
  - `cta` #F97316 (orange)
  - `bg` #F8FAFC
  - `text` #1E293B
- **Font pairing (Google Fonts):** Inter (heading + body) — professional + clear.
- **Key effects:** stat count-up, logo grid fade-in, pipeline-node flow, testimonial micro-animaties.
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
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', bg:'#F8FAFC', ink:'#1E293B' },
  fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een gedeelde `useGSAP` scope plus een herbruikbare pipeline-flow tween die een "puls" langs de nodes laat lopen. `gsap.matchMedia()` regelt reduced-motion: bij reduce geen pulse-loop en geen count-up.

```tsx
// pipeline pulse: animate a dot's x along the connector (transform only)
// gsap.to('.pipe-pulse', { x: 240, repeat: -1, duration: 2, ease: 'none' })
```

## Structure
```tsx
// src/sections/AutomationMachinesHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function AutomationMachinesHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute -right-24 top-0 h-[460px] w-[460px] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-extrabold tracking-tight">Automation<span className="text-primary">Machines</span></span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Platform', 'Integraties', 'Cases', 'Prijzen'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#demo" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Demo aanvragen
        </a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col gap-7">
          <span className="hero-eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Industriële automatisering
          </span>
          <h1 className="hero-title text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Laat je <span className="text-primary">machines</span> samenwerken — automatisch.
          </h1>
          <p className="hero-sub max-w-md text-lg text-ink/70">
            Verbind robots, sensoren en systemen in één visuele pijplijn en verhoog je output zonder downtime.
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-4">
            <a href="#demo" className={cn('rounded-lg bg-cta px-7 py-3.5 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
              Plan een demo
            </a>
            <a href="#docs" className="rounded-lg border border-ink/15 px-7 py-3.5 text-base font-semibold transition-colors duration-200 hover:bg-white cursor-pointer">
              Bekijk documentatie
            </a>
          </div>
          <div className="hero-stats mt-2 flex gap-10">
            {[['99.98', '% uptime'], ['3.4', 'x output'], ['500', '+ fabrieken']].map(([n, l], i) => (
              <div key={i}><div className="stat-num text-3xl font-extrabold text-ink" data-target={n}>{n}</div><span className="text-sm text-ink/60">{l}</span></div>
            ))}
          </div>
        </div>

        {/* Pipeline visual */}
        <div className="hero-pipe relative rounded-2xl border border-ink/10 bg-white p-8 shadow-2xl shadow-primary/10">
          <div className="flex flex-col gap-6">
            {['Sensor', 'Controller', 'Robot arm', 'Output'].map((node, i) => (
              <div key={node} className="pipe-node flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                <span className="flex-1 font-semibold">{node}</span>
                <span className="h-2.5 w-2.5 rounded-full bg-cta" />
              </div>
            ))}
            <div className="relative h-1 rounded-full bg-ink/10">
              <span className="pipe-pulse absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-cta shadow-[0_0_12px_rgba(249,115,22,0.7)]" />
            </div>
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
      .from('.hero-pipe', { x: 50, autoAlpha: 0, duration: 1 }, '-=0.9')
      .from('.pipe-node', { x: 22, autoAlpha: 0, stagger: 0.12 }, '-=0.6')
      .from('.hero-stats > div', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.4')

    // pipeline pulse loop (transform only)
    gsap.to('.pipe-pulse', { xPercent: 2400, repeat: -1, duration: 2.2, ease: 'none' })

    // stat count-up
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
      const t = parseFloat(el.dataset.target || '0'); const proxy = { v: 0 }
      gsap.to(proxy, { v: t, duration: 1.5, ease: 'power2.out', onUpdate: () => { el.textContent = (Number.isInteger(t) ? Math.round(proxy.v) : proxy.v.toFixed(2)).toString() } })
    })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-pipe, .pipe-node, .hero-stats > div', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => { el.textContent = el.dataset.target || '' })
  })
}, { scope: root })
```

## Acceptance
- [ ] Blauw primary + oranje CTA conform palet; Inter typografie, helder en zakelijk.
- [ ] Pipeline-visual met genummerde nodes en lopende pulse (transform-only loop).
- [ ] Stats count-up via proxy; bij reduce direct eindwaarde.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`x`/`y`/`scale`), eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` schakelt motion + pulse + count-up uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope voor cleanup; geen width/height/top/left geanimeerd.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
