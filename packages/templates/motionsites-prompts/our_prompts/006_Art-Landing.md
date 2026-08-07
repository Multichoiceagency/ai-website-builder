# Art Landing — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a bold full-bleed **`ArtLandingHero`** React section: a saturated vermilion-red
canvas (fading to a softer warm red at the bottom), a tiny white droplet logomark up top,
a centered mission statement, an oversized white hand-script monogram ("S.P.D"), and two
short paragraphs of copy — a manifesto-style art/brand landing.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Single-color "theme": full-viewport section (`min-h-screen`) on a solid **vermilion red `#F50A0A`**
  with a soft vertical gradient to a lighter red `#FF4A2E` near the bottom (`bg-gradient-to-b from-[#F50A0A] to-[#FF5238]`).
- All foreground text is **white `#FFFFFF`** (mission line slightly translucent `text-white/90`).
- Fonts: Inter for body/eyebrow copy (uppercase, wide `tracking-[0.18em]`); a flowing **script/handwritten
  display** for the monogram (e.g. `font-["Dancing_Script"]` or `font-["Caveat"]`, weight 700).
- Max content width `max-w-2xl`, generously centered with vertical rhythm.

## Helpers
- `FadeUp` — `framer-motion` wrapper: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Droplet` — the small white logo glyph (two comma/teardrop shapes) as an inline SVG, ~40px.

## Structure
```tsx
<section className="relative flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-[#F50A0A] to-[#FF5238] px-6 text-center text-white">
  {/* top droplet logomark */}
  <FadeUp>
    <div className="pt-20">
      <Droplet className="mx-auto h-10 w-10 text-white" />
    </div>
  </FadeUp>

  {/* mission statement */}
  <FadeUp delay={0.1}>
    <p className="mx-auto mt-10 max-w-md text-[13px] font-medium uppercase leading-relaxed tracking-[0.18em] text-white/90">
      We built this platform with a single purpose: to eliminate operational chaos
      and restore balance to your daily business routine
    </p>
  </FadeUp>

  {/* oversized handwritten monogram */}
  <FadeUp delay={0.25}>
    <h1 className="mt-12 font-['Dancing_Script'] text-7xl font-bold leading-none text-white sm:text-8xl md:text-[7rem]">
      S.P.D
    </h1>
  </FadeUp>

  {/* two short body paragraphs */}
  <div className="mx-auto mt-12 max-w-md space-y-6 text-sm leading-relaxed text-white/90">
    <FadeUp delay={0.35}>
      <p>
        I was exhausted by software that demanded more effort than it actually saved.
        That is why we engineered an autonomous architecture that operates silently in the background.
      </p>
    </FadeUp>
    <FadeUp delay={0.45}>
      <p>
        Your business should serve your life, not consume it. Let our algorithms handle
        the heavy lifting, so you can focus on the vision.
      </p>
    </FadeUp>
  </div>

  {/* hint of an image peeking from the bottom edge (portrait) */}
  <div className="pointer-events-none mt-auto h-24 w-full" />
</section>
```

## Section data (example, from the preview)
```ts
const content = {
  mission:
    "We built this platform with a single purpose: to eliminate operational chaos and restore balance to your daily business routine",
  monogram: "S.P.D",
  paragraphs: [
    "I was exhausted by software that demanded more effort than it actually saved. That is why we engineered an autonomous architecture that operates silently in the background.",
    "Your business should serve your life, not consume it. Let our algorithms handle the heavy lifting, so you can focus on the vision.",
  ],
};
```

## Motion & acceptance
- Sequential `FadeUp` reveal top→bottom: droplet → mission → monogram → paragraph 1 → paragraph 2 (delays 0 / .1 / .25 / .35 / .45).
- The script monogram is the visual anchor — render at a much larger size than everything else, dead-center.
- Optional: very subtle continuous breathing on the background gradient stop (`from`→slightly lighter over ~20s) for a living-canvas feel; skip under reduced motion.
- Acceptance checklist:
  - Solid vermilion-red background fading to a warmer red toward the bottom; everything centered.
  - Small white teardrop/droplet logomark near the top.
  - Uppercase, wide-tracked white mission statement (3 lines on desktop).
  - Oversized white handwritten "S.P.D" monogram as the focal point.
  - Two short white body paragraphs below the monogram, narrow column.
  - All text pure/near-white on red; no card or button chrome in this view; reduced-motion safe.
