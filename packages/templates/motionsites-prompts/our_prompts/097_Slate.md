# Slate — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een strakke, minimalistische SaaS-hero voor "Slate", een collaboratieve workspace-/notes-app: rustige headline, dubbele CTA, social proof en een licht zwevende app-mock. Doel: teams overtuigen om gratis te starten.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused — testimonials/logo's prominent, success metrics, credibility markers.
- **Pattern:** Video-First Hero (toegepast als product/app-showcase met optionele video-loop).
- **Color palette (hex tokens):**
  - `primary` #6366F1 (indigo)
  - `secondary` #818CF8
  - `cta` #10B981 (emerald)
  - `bg` #F5F3FF
  - `text` #1E1B4B
- **Font pairing (Google Fonts):** Plus Jakarta Sans (heading + body) — friendly, modern, clean SaaS.
- **Key effects:** logo grid fade-in, stat count-up, zwevende mock, testimonial micro-animaties.
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
Een gedeelde `useGSAP` scope. De app-mock zweeft subtiel met een herhalende `y`-tween (yoyo). `gsap.matchMedia()` regelt reduced-motion: bij reduce geen float-loop en geen count-up.

```tsx
// floating mock loop (transform only)
// gsap.to('.hero-mock', { y: -12, repeat: -1, yoyo: true, duration: 2.4, ease: 'sine.inOut' })
```

## Structure
```tsx
// src/sections/SlateHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function SlateHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-extrabold tracking-tight">Slate</span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Product', 'Templates', 'Prijzen', 'Blog'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#start" className="hero-nav rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 cursor-pointer">
          Gratis starten
        </a>
      </header>

      <div className="relative z-10 mx-auto flex max-w-content flex-col items-center gap-7 px-6 pt-20 text-center lg:pt-28">
        <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          De workspace voor moderne teams
        </span>
        <h1 className="hero-title max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          Schrijf, plan en bouw samen — op <span className="text-primary">één rustige plek</span>.
        </h1>
        <p className="hero-sub max-w-xl text-lg text-ink/70">
          Slate brengt notities, taken en docs samen, zonder de chaos van losse tools.
        </p>
        <div className="hero-cta flex flex-wrap items-center justify-center gap-4">
          <a href="#start" className={cn('rounded-lg bg-cta px-7 py-3.5 text-base font-bold text-white', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
            Begin gratis
          </a>
          <a href="#tour" className="rounded-lg border border-ink/15 bg-white px-7 py-3.5 text-base font-semibold transition-colors duration-200 hover:bg-bg cursor-pointer">
            Neem een rondleiding
          </a>
        </div>
        <div className="hero-logos mt-4 flex flex-wrap items-center justify-center gap-8 opacity-70">
          {['Acme','Vercel','Linear','Notion','Figma'].map((b) => (
            <span key={b} className="hero-logo text-base font-bold text-ink/50">{b}</span>
          ))}
        </div>

        {/* Floating app mock */}
        <div className="hero-mock relative mt-10 w-full max-w-4xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-2xl shadow-primary/15">
            <div className="mb-3 flex gap-1.5"><span className="h-3 w-3 rounded-full bg-ink/15" /><span className="h-3 w-3 rounded-full bg-ink/15" /><span className="h-3 w-3 rounded-full bg-ink/15" /></div>
            <div className="grid grid-cols-[200px_1fr] gap-4">
              <aside className="space-y-2 rounded-lg bg-bg p-3">
                {[1,2,3,4,5].map((s) => <span key={s} className="block h-2.5 w-full rounded bg-secondary/30" />)}
              </aside>
              <main className="space-y-3 rounded-lg bg-bg p-4">
                {[1,2,3,4].map((r) => <span key={r} className="hero-line block h-3 rounded bg-ink/10" style={{ width: `${90 - r * 12}%` }} />)}
              </main>
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
      .from('.hero-logo', { y: 14, autoAlpha: 0, stagger: 0.07 }, '-=0.4')
      .from('.hero-mock', { y: 60, scale: 0.97, autoAlpha: 0, duration: 1 }, '-=0.5')
      .from('.hero-line', { x: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.6')

    // floating mock loop
    gsap.to('.hero-mock', { y: -12, repeat: -1, yoyo: true, duration: 2.6, ease: 'sine.inOut', delay: 1.2 })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-logo, .hero-mock, .hero-line', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
  })
}, { scope: root })
```

## Acceptance
- [ ] Indigo primary + emerald CTA conform palet; Plus Jakarta Sans typografie; rustige minimal layout.
- [ ] Gecentreerde hero met logo strip (social proof) en zwevende app-mock.
- [ ] App-mock float-loop via `y` (transform-only, yoyo); start na de entrance.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`x`/`y`/`scale`), eases `power3.out` + `back.out(1.7)`.
- [ ] `gsap.matchMedia()` schakelt motion + float uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope voor cleanup; geen width/height/top/left geanimeerd.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
