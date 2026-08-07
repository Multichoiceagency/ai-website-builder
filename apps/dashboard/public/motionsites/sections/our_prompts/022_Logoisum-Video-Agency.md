# Logoisum Video Agency — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Agency · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een video-first hero voor een creatieve videoproductie-agency: een fullscreen video-achtergrond met donkere overlay, een bold expressieve kop, een korte value-proposition en een felgekleurde CTA die aanzet tot een showreel of intake. Bedoeld om binnen seconden vakmanschap en energie over te brengen.

## Design system (ui-ux-pro-max)
- **Style:** Hero-Centric Design — grote hero, dramatische visual, high-contrast CTA, productshowcase.
- **Pattern:** Video-First Hero — donkere overlay 60% op video, brand-accent voor CTA, witte tekst op donker.
- **Color palette (hex tokens):**
  - `primary` #EC4899 (bold pink)
  - `secondary` #F472B6
  - `cta` #06B6D4 (cyan accent)
  - `bg` #FDF2F8
  - `text` #831843
- **Font pairing (Google Fonts):** Inter (heading + body), bold + expressive.
- **Key effects:** smooth scroll reveal, fade-in op hero, subtiele background-parallax, CTA glow/pulse.
- **Avoid:** corporate minimalism, verstopte portfolio.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge).
- Fonts via `index.html`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens (`tailwind.config.ts`):
  ```ts
  theme: { extend: {
    colors: {
      primary: '#EC4899', secondary: '#F472B6', cta: '#06B6D4',
      bg: '#FDF2F8', ink: '#831843',
    },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    maxWidth: { content: '80rem' }, // 1280px
  }}
  ```
- Max content width: `max-w-content` (1280px), centered met `mx-auto px-6`.

## Helpers
`Reveal` wrapper en een gedeelde `useGSAP` scope. Gebruik `gsap.matchMedia()` voor reduced-motion: bij `(prefers-reduced-motion: reduce)` zetten we alle targets direct op `autoAlpha: 1` zonder beweging.

```tsx
// src/components/Reveal.tsx
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
export const Reveal = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('reveal will-change-transform', className)} {...props} />
  )
)
Reveal.displayName = 'Reveal'
```

## Structure
```tsx
// src/sections/LogoisumHero.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export default function LogoisumHero() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-ink text-white">
      {/* Video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay muted loop playsInline poster="/poster.jpg"
        aria-hidden="true"
      >
        <source src="/reel.webm" type="video/webm" />
        <source src="/reel.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="hero-nav text-lg font-extrabold tracking-tight">Logoisum</span>
        <nav className="hidden gap-8 text-sm font-medium md:flex">
          {['Werk', 'Studio', 'Diensten', 'Contact'].map((l) => (
            <a key={l} href="#" className="hero-nav transition-colors duration-200 hover:text-primary">{l}</a>
          ))}
        </nav>
        <a href="#start" className="hero-nav rounded-full bg-cta px-5 py-2 text-sm font-semibold text-ink transition-transform duration-200 hover:scale-105 cursor-pointer">
          Showreel
        </a>
      </header>

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex max-w-content flex-col items-start gap-8 px-6 pb-24 pt-24 md:pt-40">
        <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
          Video productie studio
        </span>
        <h1 className="hero-title max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          Verhalen die <span className="text-primary">bewegen</span>, merken die blijven.
        </h1>
        <p className="hero-sub max-w-xl text-lg text-white/80 md:text-xl">
          Wij maken commercials, brand films en social content die kijkers vasthouden en conversie opleveren.
        </p>
        <div className="hero-cta flex flex-wrap items-center gap-4">
          <a href="#start" className={cn('rounded-full bg-cta px-8 py-4 text-base font-bold text-ink', 'transition-transform duration-200 hover:scale-105 cursor-pointer')}>
            Bekijk onze reel
          </a>
          <a href="#contact" className="rounded-full border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 cursor-pointer">
            Plan een gesprek
          </a>
        </div>
        <div className="hero-stats mt-6 flex flex-wrap gap-10 text-sm text-white/70">
          {[['120+', 'Projecten'], ['38', 'Awards'], ['9 jr', 'Ervaring']].map(([n, l]) => (
            <div key={l}><div className="text-3xl font-extrabold text-white">{n}</div>{l}</div>
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
      .from('.hero-eyebrow', { y: 24, autoAlpha: 0 }, '-=0.4')
      .from('.hero-title', { y: 48, autoAlpha: 0, duration: 1.1 }, '-=0.5')
      .from('.hero-sub', { y: 28, autoAlpha: 0 }, '-=0.7')
      .from('.hero-cta', { y: 24, scale: 0.96, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.6')
      .from('.hero-stats > div', { y: 20, autoAlpha: 0, stagger: 0.12 }, '-=0.5')

    // CTA glow/pulse loop
    gsap.to('.hero-cta a:first-child', {
      boxShadow: '0 0 28px rgba(6,182,212,0.6)', repeat: -1, yoyo: true, duration: 1.4, ease: 'sine.inOut',
    })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.hero-nav, .hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-stats > div', { autoAlpha: 1, y: 0, scale: 1 })
  })
}, { scope: root })
```

## Acceptance
- [ ] Fullscreen video met 60% donkere overlay; witte tekst leesbaar (contrast ≥ 4.5:1).
- [ ] Bold Inter-koptypografie; pink primair + cyan CTA conform palet.
- [ ] GSAP entrance-timeline met staggered reveal via `autoAlpha`/`y`/`scale` en gedocumenteerde eases (`power3.out`, `back.out(1.7)`).
- [ ] CTA glow/pulse loop; geen layout-eigenschappen geanimeerd (alleen transforms/boxShadow).
- [ ] `gsap.matchMedia()` schakelt motion uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope zorgt voor cleanup; geen geheugenlekken bij unmount.
- [ ] Responsief op 375 / 768 / 1024 / 1440px; alle clickables `cursor-pointer` + focus states.
- [ ] Video heeft `poster`, `muted`, `loop`, `playsInline`; SVG-iconen i.p.v. emoji.
