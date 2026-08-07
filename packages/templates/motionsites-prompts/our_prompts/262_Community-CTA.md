# Community CTA — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (CTA Section · cta), met design-system via ui-ux-pro-max en GSAP-animatie.

Een levendige, block-based call-to-action-sectie die bezoekers uitnodigt om lid te worden van een community: warme value-prop, een rij overlappende member-avatars met live activiteits-indicatoren en een prominente "Word lid"-knop. Doel: aanmeldingen voor de community stimuleren met sociaal bewijs.

## Design system (ui-ux-pro-max)
- **Style:** Vibrant & Block-based — bold, energetic, geometric, high color contrast, large type.
- **Pattern:** Community/Forum Landing — active community tonen (member count, posts vandaag), join-knop prominent, activity-indicators groen.
- **Color palette (hex tokens):**
  - `primary` #6366F1 (indigo)
  - `secondary` #818CF8
  - `cta` #10B981 (emerald)
  - `bg` #F5F3FF
  - `text` #1E1B4B
- **Font pairing (Google Fonts):** Inter (heading + body) — friendly + engaging.
- **Key effects:** grote secties (48px+ gaps), bold hover (color shift), large type (32px+), 200-300ms, scroll-snap-vriendelijk.
- **Avoid:** verstopte benefits, geen community-proof.

## Stack & global setup
- React 18 + Vite + TypeScript + TailwindCSS.
- **GSAP**: `gsap` + `@gsap/react` (`useGSAP`) + `ScrollTrigger` (entrance bij scroll-in).
- `cn()` helper uit `@/lib/utils`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#6366F1', secondary:'#818CF8', cta:'#10B981', bg:'#F5F3FF', ink:'#1E1B4B' },
  fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
  maxWidth: { content: '72rem' }, // 1152px, iets compacter voor een CTA-blok
  ```
- Max content width: `max-w-content` (1152px), `mx-auto px-6`.

## Helpers
Een gedeelde `useGSAP` scope, een `ScrollTrigger` die de timeline start zodra het blok in beeld komt, en een `useCountUp` (GSAP-proxy) voor "leden online / posts vandaag". `gsap.matchMedia()` regelt reduced-motion: bij reduce geen count-up en geen pulse, alles direct zichtbaar.

```tsx
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger, useGSAP)
```

## Structure
```tsx
// src/sections/CommunityCTA.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const members = ['Lin','Sam','Noa','Eli','Mira','Tom']

export default function CommunityCTA() {
  const root = useRef<HTMLElement>(null)
  return (
    <section ref={root} className="relative overflow-hidden bg-bg py-24 text-ink md:py-32">
      {/* geometric blocks backdrop */}
      <div className="pointer-events-none absolute -left-10 top-10 h-24 w-24 rotate-12 rounded-2xl bg-primary/15" aria-hidden="true" />
      <div className="pointer-events-none absolute right-12 bottom-16 h-32 w-32 -rotate-6 rounded-3xl bg-cta/15" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-content px-6">
        <div className="cta-card flex flex-col items-center gap-8 rounded-[2rem] border border-primary/20 bg-white p-10 text-center shadow-2xl shadow-primary/10 md:p-16">
          <span className="cta-eyebrow inline-flex items-center gap-2 rounded-full bg-cta/10 px-4 py-1.5 text-sm font-semibold text-cta">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cta" /> Live community
          </span>

          <h2 className="cta-title max-w-2xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Word onderdeel van <span className="text-primary">10.000+ makers</span>.
          </h2>
          <p className="cta-sub max-w-xl text-lg text-ink/70">
            Stel vragen, deel je werk en groei samen met een community die elke dag actief is.
          </p>

          {/* avatar stack + activity */}
          <div className="cta-social flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
              {members.map((m, i) => (
                <span key={m} className={cn('cta-avatar flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white', i % 2 ? 'bg-secondary' : 'bg-primary')}>
                  {m[0]}
                </span>
              ))}
              <span className="cta-avatar flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-ink text-xs font-bold text-white">+9k</span>
            </div>
            <p className="text-sm text-ink/60">
              <span className="cta-stat font-bold text-cta" data-target="312">0</span> leden online ·
              <span className="cta-stat font-bold text-primary" data-target="148"> 0</span> posts vandaag
            </p>
          </div>

          <div className="cta-actions flex flex-wrap items-center justify-center gap-4">
            <a href="#join" className={cn('rounded-full bg-cta px-9 py-4 text-base font-bold text-white', 'transition-all duration-200 hover:scale-105 hover:bg-emerald-600 cursor-pointer')}>
              Word nu lid
            </a>
            <a href="#tour" className="rounded-full border border-ink/15 px-9 py-4 text-base font-semibold transition-colors duration-200 hover:bg-bg cursor-pointer">
              Verken topics
            </a>
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
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

useGSAP(() => {
  const mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.8 },
      scrollTrigger: { trigger: '.cta-card', start: 'top 80%' },
    })
    tl.from('.cta-card', { y: 50, autoAlpha: 0, duration: 0.9 })
      .from('.cta-eyebrow', { y: 18, autoAlpha: 0 }, '-=0.5')
      .from('.cta-title', { y: 36, autoAlpha: 0, duration: 0.95 }, '-=0.5')
      .from('.cta-sub', { y: 24, autoAlpha: 0 }, '-=0.6')
      .from('.cta-avatar', { scale: 0, autoAlpha: 0, stagger: 0.08, ease: 'back.out(1.7)' }, '-=0.4')
      .from('.cta-actions', { y: 22, scale: 0.97, autoAlpha: 0, ease: 'back.out(1.7)' }, '-=0.3')

    // count-up for community stats
    gsap.utils.toArray<HTMLElement>('.cta-stat').forEach((el) => {
      const t = parseFloat(el.dataset.target || '0'); const proxy = { v: 0 }
      gsap.to(proxy, {
        v: t, duration: 1.4, ease: 'power2.out',
        scrollTrigger: { trigger: '.cta-social', start: 'top 85%' },
        onUpdate: () => { el.textContent = Math.round(proxy.v).toString() },
      })
    })
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.cta-card, .cta-eyebrow, .cta-title, .cta-sub, .cta-avatar, .cta-actions', { autoAlpha: 1, y: 0, scale: 1 })
    gsap.utils.toArray<HTMLElement>('.cta-stat').forEach((el) => { el.textContent = el.dataset.target || '' })
  })
}, { scope: root })
```

## Acceptance
- [ ] Vibrant block-based look: geometrische blokken, grote type (32px+), 48px+ gaps, indigo + emerald conform palet.
- [ ] Community-proof: overlappende member-avatars + live "leden online / posts vandaag" met count-up.
- [ ] Avatars schalen in via `scale`/`autoAlpha` met `back.out(1.7)`; CTA bold hover color shift (200-300ms).
- [ ] `ScrollTrigger` start de timeline + count-up zodra het blok in beeld komt.
- [ ] `gsap.matchMedia()` schakelt motion + count-up uit bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` scope voor cleanup; geen width/height/top/left geanimeerd (alleen transforms).
- [ ] Responsief 375 / 768 / 1024 / 1440px; cursor-pointer + focus states; SVG-iconen i.p.v. emoji.
