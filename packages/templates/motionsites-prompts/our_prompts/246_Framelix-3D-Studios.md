# Framelix 3D Studios — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Agency · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een bold, avant-garde hero voor een creatieve 3D-/motion-studio ("Framelix"): expressieve oversized typografie, een cyan accent-CTA en een rechts geplaatste 3D-achtige showreel-tegel met parallax-frames. Doel: merken en regisseurs een project laten starten.

## Design system (ui-ux-pro-max)
- **Style:** Social Proof-Focused, maar uitgevoerd in een creative-agency look (Syne/Manrope, bold pink + cyan).
- **Pattern:** Video-First Hero — donkere visual-tegel met overlay, brand-accent CTA.
- **Color palette (hex tokens):**
  - `primary` #EC4899 (bold pink)
  - `secondary` #F472B6
  - `cta` #06B6D4 (cyan accent)
  - `bg` #FDF2F8
  - `text` #831843
- **Font pairing (Google Fonts):** Syne (heading, avant-garde) + Manrope (body) — creative, edgy, artistic.
- **Key effects:** stat count-up, logo grid fade-in, parallax 3D-frames, hover color shift.
- **Avoid:** complexe navigatie, verstopte contactinfo.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#EC4899', secondary:'#F472B6', cta:'#06B6D4', bg:'#FDF2F8', ink:'#831843' },
  fontFamily: { display: ['Syne','sans-serif'], sans: ['Manrope','system-ui','sans-serif'] },
  maxWidth: { content: '80rem' },
  ```
- Max content width: `max-w-content` (1280px), `mx-auto px-6`.

## Helpers
Een gedeelde `useGSAP` scope plus een lichte pointer-parallax op de gestapelde 3D-frames (transform `x`/`y`, getemperd via `gsap.utils.clamp`). `gsap.matchMedia()` regelt reduced-motion: bij reduce geen parallax-listener, geen float-loop en geen count-up.

```tsx
// pointer parallax (transform only)
// onMouseMove → gsap.to('.frame', { x: dx * depth, y: dy * depth, duration: 0.6, ease: 'power2.out' })
```

## Structure
```tsx
// src/sections/FramelixHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function FramelixHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav font-display text-lg font-bold tracking-tight">FRAMELIX</span>
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          {['Werk', 'Studio', '3D', 'Contact'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#brief" className="hero-nav rounded-full bg-cta px-5 py-2 text-sm font-semibold text-ink transition-transform duration-200 hover:scale-105 cursor-pointer">
          Start project
        </a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="flex flex-col gap-7">
          <span className="hero-eyebrow inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            3D · motion · CGI studio
          </span>
          <h1 className="hero-title font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Wij geven merken <span className="text-primary">dimensie</span>.
          </h1>
          <p className="hero-sub max-w-md text-lg text-ink/70">
            Framelix maakt 3D-films, product-CGI en immersive motion die blijven hangen.
          </p>
          <div className="hero-cta flex flex-wrap items-center gap-4">
            <a href="#brief" className={cn('rounded-full bg-cta px-8 py-4 text-base font-bold text-ink', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
              Start een project
            </a>
            <a href="#reel" className="rounded-full border border-ink/20 px-8 py-4 text-base font-semibold transition-colors duration-200 hover:bg-white cursor-pointer">
              Bekijk de reel
            </a>
          </div>
          <div className="hero-stats mt-2 flex gap-10">
            {[['240', '+ shots'], ['18', 'awards'], ['7 jr', 'studio']].map(([n, l], i) => (
              <div key={i}><div className="stat-num font-display text-3xl font-bold text-ink" data-target={n}>{n}</div><span className="text-sm text-ink/60">{l}</span></div>
            ))}
          </div>
        </div>

        {/* Stacked 3D frames (parallax) */}
        <div className="relative h-[360px] [perspective:1200px]">
          <div className="frame absolute right-10 top-4 h-56 w-72 rotate-6 rounded-2xl border border-secondary/40 bg-secondary/20 backdrop-blur-sm" data-depth="0.6" />
          <div className="frame absolute right-24 top-16 h-56 w-72 -rotate-3 rounded-2xl border border-cta/40 bg-cta/15 backdrop-blur-sm" data-depth="1.0" />
          <div className="frame absolute right-2 top-28 h-56 w-72 rotate-2 overflow-hidden rounded-2xl bg-ink shadow-2xl" data-depth="1.4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,0.5),transparent_60%)]" />
            <div className="absolute inset-0 bg-black/30" />
            <span className="absolute bottom-4 left-4 font-display text-sm font-semibold text-white">SHOWREEL '26</span>
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
      .from('.hero-title', { y: 46, autoAlpha: 0, duration: 1.1 }, '-=0.4')
      .from('.hero-sub', { y: 26, autoAlpha: 0 }, '-=0.7')
      .from('.hero-cta', { y: 22, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.6')
      .from('.frame', { y: 60, scale: 0.92, autoAlpha: 0, stagger: 0.12, ease: 'back.out(1.4)' }, '-=0.8')
      .from('.hero-stats > div', { y: 18, autoAlpha: 0, stagger: 0.1 }, '-=0.5')

    // pointer parallax on frames
    const clamp = gsap.utils.clamp(-30, 30)
    const onMove = (e: PointerEvent) => {
      const r = root.current!.getBoundingClientRect()
      const dx = clamp(((e.clientX - r.left) / r.width - 0.5) * 60)
      const dy = clamp(((e.clientY - r.top) / r.height - 0.5) * 40)
      gsap.utils.toArray<HTMLElement>('.frame').forEach((f) => {
        const depth = parseFloat(f.dataset.depth || '1')
        gsap.to(f, { x: dx * depth, y: dy * depth, duration: 0.6, ease: 'power2.out' })
      })
    }
    root.current!.addEventListener('pointermove', onMove)

    // stat count-up
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
      const t = parseFloat(el.dataset.target || '0'); const proxy = { v: 0 }
      gsap.to(proxy, { v: t, duration: 1.5, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(proxy.v).toString() } })
    })

    return () => root.current?.removeEventListener('pointermove', onMove)
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .frame, .hero-stats > div', { autoAlpha: 1, x: 0, y: 0, scale: 1 })
    gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => { el.textContent = el.dataset.target || '' })
  })
}, { scope: root })
```

## Acceptance
- [ ] Bold pink primary + cyan CTA conform palet; Syne display + Manrope body; oversized expressieve kop.
- [ ] Gestapelde 3D-frames met diepte-gebaseerde pointer-parallax (transform-only).
- [ ] Stats count-up via proxy; bij reduce direct eindwaarde.
- [ ] GSAP entrance-timeline met staggered reveal (`autoAlpha`/`x`/`y`/`scale`), eases `power3.out` + `back.out(...)`.
- [ ] `gsap.matchMedia()` schakelt parallax + count-up uit bij `prefers-reduced-motion: reduce`; listener wordt opgeruimd.
- [ ] `useGSAP` scope voor cleanup; geen width/height/top/left geanimeerd.
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
