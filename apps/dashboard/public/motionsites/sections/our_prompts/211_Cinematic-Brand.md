# Cinematic Brand — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Cinematische dark hero ("VERTX"): een gloeiende energie-ring (rood/oranje boven → blauw/cyaan onder) op een sterrenveld, met een gecentreerde eyebrow, grote witte headline, sub-tekst en twee gepilde CTA's; logo links + Contact/Sign Up rechts in de nav.

Build a dramatic, dark **`CinematicBrand`** hero: a luminous circular energy ring (warm
red/orange at top fading to electric blue/cyan at the bottom) glowing over a starfield, with a
centered eyebrow, a large white two-line headline, a sub paragraph and two pill CTAs.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = deep space black `#04060B` with a subtle starfield (CSS dots or `/assets/stars.png`).
- The ring is the hero focal point — ideally `/assets/energy-ring.png` (or a video/canvas), centered, large, with bloom.
- Key colors I see: warm orange/red `#FF5A2C` (top arc), electric blue `#2E7BFF` + cyan `#35D6FF` (bottom arc), white text `#F5F7FF`.
- Font: clean sans (Inter); headline medium-bold, wide-tracked uppercase eyebrow.
- Max content width `max-w-3xl` centered over the ring.

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `EnergyRing` — the glowing ring asset with slow continuous `rotate` + gentle `scale` breathing + `drop-shadow` bloom.
- `Starfield` — tiny twinkling dots (random opacity loop), optional.

## Structure
```tsx
<section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04060B]">
  <Starfield className="absolute inset-0" />

  {/* glowing energy ring centered */}
  <EnergyRing className="absolute left-1/2 top-1/2 h-[78vh] w-[78vh] -translate-x-1/2 -translate-y-1/2" />

  {/* top nav */}
  <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-5 text-sm text-white/85">
    <span className="flex items-center gap-2 font-medium"><span>◯</span> VERTX</span>
    <nav className="flex items-center gap-3">
      <a className="rounded-full px-4 py-1.5">Contact</a>
      <a className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 backdrop-blur">Sign Up</a>
    </nav>
  </header>

  {/* centered copy */}
  <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
    <FadeUp><p className="mb-5 text-[11px] uppercase tracking-[0.4em] text-white/60">The future is unfolding</p></FadeUp>
    <FadeUp delay={0.12}>
      <h1 className="text-4xl font-medium leading-[1.1] tracking-tight text-[#F5F7FF] sm:text-5xl md:text-6xl">
        Innovation that reshapes the fabric of experience
      </h1>
    </FadeUp>
    <FadeUp delay={0.24}>
      <p className="mx-auto mt-6 max-w-md text-sm text-white/70">
        We craft platforms where insight, power, and design converge — giving rise to something the world hasn't seen.
      </p>
    </FadeUp>
    <FadeUp delay={0.36}>
      <div className="mt-9 flex items-center justify-center gap-4">
        <a className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black">Begin Now ▶</a>
        <a className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white backdrop-blur">Watch the story</a>
      </div>
    </FadeUp>
  </div>
</section>
```

## Nav data (example, from the preview)
```ts
const brand = "VERTX";
const navRight = ["Contact", "Sign Up"];
```

## Motion & acceptance
- Eyebrow → headline → sub → CTA row stagger in (0/.12/.24/.36).
- The energy ring rotates slowly and continuously, gently breathes scale (`1 → 1.03`) and pulses its bloom; stars twinkle subtly.
- "Begin Now" pill is solid white; "Watch the story" is glassy; both lift slightly on hover.
- Acceptance checklist:
  - Deep-space black background + starfield; large centered glowing energy ring (warm red/orange top → electric blue/cyan bottom) with bloom.
  - Nav: "◯ VERTX" left; "Contact" link + glassy "Sign Up" pill right.
  - Centered "THE FUTURE IS UNFOLDING" eyebrow, two-line white headline "Innovation that reshapes the fabric of experience", sub paragraph.
  - Two pill CTAs: white "Begin Now ▶" + glass "Watch the story".
  - Reduced-motion: freeze ring rotation/scale + star twinkle, keep opacity fades only.
