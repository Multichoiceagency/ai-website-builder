# Cosmic — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Full-bleed deep-space hero met een fotorealistische asteroïde die vrij in een sterrenveld zweeft, een dunne cirkel-orbit eromheen, en een minimale transparante top-nav met het wordmark "COSMIQ."

Build a cinematic **`CosmicHero`** React section: a near-black starfield, one large
rocky asteroid floating dead-center inside a faint circular orbit ring, and a thin
transparent navbar (wordmark left, 3 center links, SHARE right).

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme only. Background = deep space `#0A0A0C` with a subtle vignette
  `radial-gradient(120% 120% at 50% 40%, transparent 40%, rgba(0,0,0,0.6) 100%)`.
- Starfield: small white dots at low opacity, generated procedurally (positions + sizes).
- Asteroid = high-res PNG (`/assets/asteroid.png`) with a warm copper rim-light on its
  lower-left edge; subtle `drop-shadow-[0_30px_80px_rgba(0,0,0,0.8)]`.
- Font: a tight sans (Inter / `font-sans`), uppercase nav with wide `tracking-[0.25em]`.
- Key colors I see: black `#0A0A0C`, off-white text `#E8E8EA`, faint grey orbit `rgba(255,255,255,0.12)`, copper highlight `#B07A5A`.

## Helpers
- `Starfield` — renders ~120 absolutely-positioned dots with randomized `top/left/opacity/scale`,
  each gently twinkling via `animate={{opacity:[o, o*0.3, o]}}` with random duration 3–7s.
- `Drift` — slow infinite float for the asteroid: `animate={{y:[0,-14,0], rotate:[0,2,0]}}`,
  `transition={{duration:18, repeat:Infinity, ease:"easeInOut"}}`.
- `FadeIn` — framer-motion wrapper, `initial={{opacity:0}}`, `animate={{opacity:1}}`, configurable delay.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0C] text-[#E8E8EA]">
  <Starfield />
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_40%,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

  {/* NAV — wordmark left, center links, share right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6 text-[11px] uppercase tracking-[0.25em]">
    <span className="text-sm font-semibold tracking-[0.15em] text-white">COSMIQ.</span>
    <nav className="hidden gap-10 text-white/70 md:flex">
      <a className="hover:text-white">Discover</a>
      <a className="hover:text-white">Story</a>
      <a className="hover:text-white">Connect</a>
    </nav>
    <button className="flex items-center gap-2 text-white/70 hover:text-white">Share <span>⌁</span></button>
  </header>

  {/* faint circular orbit ring centered */}
  <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
    <div className="h-[78vh] w-[78vh] rounded-full border border-white/10" />
  </div>

  {/* asteroid floating dead-center */}
  <div className="absolute inset-0 z-10 flex items-center justify-center">
    <Drift>
      <img src="/assets/asteroid.png" alt="Asteroid"
        className="h-[46vh] w-auto drop-shadow-[0_30px_80px_rgba(0,0,0,0.85)]" />
    </Drift>
  </div>

  {/* optional tiny caption bottom-center */}
  <FadeIn delay={0.6}>
    <p className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white/40">
      Object 2024-XR · adrift
    </p>
  </FadeIn>
</section>
```

## Nav data (example, from the preview)
```ts
const nav = ["Discover", "Story", "Connect"];
const brand = "COSMIQ.";
```

## Motion & acceptance
- Stars twinkle independently (random durations); the whole field can drift ~4px over 40s for parallax depth.
- Asteroid floats up/down and rotates ~2° on an 18s loop (`Drift`); orbit ring stays static behind it.
- Nav + caption fade in on mount (`FadeIn`, staggered delays).
- Optional: asteroid reacts subtly to mouse — translate it by `mouseX/40, mouseY/40` for a living-parallax feel.
- Acceptance checklist:
  - Near-black `#0A0A0C` background with a procedural twinkling starfield and a soft center vignette.
  - One large rocky asteroid centered, with warm copper rim-light and a deep ground shadow, floating on a slow loop.
  - One thin faint circular orbit ring (`border-white/10`) centered behind the asteroid.
  - Transparent nav: `COSMIQ.` wordmark left, Discover / Story / Connect center, Share + glyph right; uppercase `tracking-[0.25em]`.
  - No solid color blocks — space imagery carries the hero. Respect `prefers-reduced-motion` (disable drift/twinkle, keep static stars + fade).
```
