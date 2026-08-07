# Dreamcore Landing — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a full-bleed, atmospheric **`DreamcoreHero`** React section: a cinematic dawn-sky
background (soft lavender → rose clouds) with a single surreal classical column floating
on a sea of clouds, a minimal transparent top nav, and a centered ethereal headline.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Full-viewport section (`min-h-screen`), background = a high-res dreamy cloudscape image
  (`/assets/dreamcore-sky.jpg`) with `object-cover`; overlay a subtle top-down gradient
  `from-black/15 via-transparent to-black/20` for nav + footer legibility.
- Typeface: a light serif display for the headline (e.g. `font-["Cormorant_Garamond"]`, weight 300–400),
  Inter for nav/labels. Letter-spacing wide (`tracking-[0.25em]`) on the uppercase nav.
- Palette is image-driven; text is near-white `#F6F2FA` with `drop-shadow` for contrast. No hard hexes elsewhere.

## Helpers
- `FadeUp` — `framer-motion` wrapper, `initial={{opacity:0,y:20}}`, `whileInView` to `{opacity:1,y:0}`,
  `transition={{duration:0.9, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Drift` — slow infinite parallax for the column/clouds: `animate={{y:[0,-12,0]}}`,
  `transition={{duration:14, repeat:Infinity, ease:"easeInOut"}}`.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden">
  <img src="/assets/dreamcore-sky.jpg" className="absolute inset-0 h-full w-full object-cover" alt="" />
  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />

  {/* NAV — transparent, split left/right with a centered star glyph */}
  <header className="relative z-10 flex items-center justify-between px-8 py-6 text-[12px] uppercase tracking-[0.25em] text-white/85">
    <nav className="flex gap-8"><a>Worlds</a><a>Atelier</a><a>Immersions</a></nav>
    <span className="text-white">✦</span>
    <nav className="flex gap-8"><a>Craft</a><a>Codex</a><a>Connect</a></nav>
  </header>

  {/* floating column anchored low-center */}
  <Drift className="absolute bottom-[8%] left-1/2 -translate-x-1/2 z-[5]">
    <img src="/assets/cloud-column.png" className="h-[42vh] w-auto drop-shadow-2xl" alt="" />
  </Drift>

  {/* centered headline block */}
  <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pt-[14vh] text-center">
    <FadeUp><p className="mb-5 text-[11px] uppercase tracking-[0.35em] text-white/70">A realm above the noise</p></FadeUp>
    <FadeUp delay={0.15}>
      <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
        Build worlds<br/>that feel like dreams
      </h1>
    </FadeUp>
    <FadeUp delay={0.3}>
      <p className="mt-6 max-w-md text-sm text-white/75">Ethereal landing experiences crafted from light, cloud and quiet motion.</p>
    </FadeUp>
    <FadeUp delay={0.45}>
      <a className="mt-9 rounded-full border border-white/40 bg-white/10 px-7 py-3 text-xs uppercase tracking-[0.2em] text-white backdrop-blur-md transition hover:bg-white/20">Enter the atelier</a>
    </FadeUp>
  </div>
</section>
```

## Motion & feel
- Headline + sub + CTA stagger in via `FadeUp` (delays 0 / .15 / .3 / .45).
- Column drifts vertically (`Drift`); optional very slow `scale` breathing on the bg image (`animate scale:[1,1.04,1]` over 30s) for living-cloud feel.
- Respect `prefers-reduced-motion`: disable Drift/scale, keep opacity fade only.

## Acceptance checklist
- Full-viewport, image-cover background dawn cloudscape; readable white text via gradient overlay + drop-shadow.
- Split transparent nav (3 links left, centered ✦ glyph, 3 links right), uppercase `tracking-[0.25em]`.
- One floating classical column low-center with slow vertical drift.
- Centered eyebrow + light-serif 2-line headline + sub + glass CTA, staggered fade-up.
- No solid background color blocks — the imagery is the hero. Reduced-motion safe.
