# Botanical Shadow About — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: About · about.

Build a calm, editorial **`BotanicalShadowAbout`** section: a near-white canvas with soft
fern/palm-leaf shadows cast across it, a large centered serif-ish statement headline, a thin
scroll divider with a small outline marker, and a quiet two-line caption underneath.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme, very minimal. Background = warm off-white `#EDEBE7` with overlaid soft botanical
  shadow image (`/assets/leaf-shadows.png`) at low opacity, blurred, in the corners.
- Key colors from the image: charcoal headline `#3A3A38`, faint grey leaf shadows `rgba(60,60,60,0.12)`,
  muted grey caption `#9A9A96`, thin hairline divider `#CFCDC8`.
- Typeface: a soft humanist sans / light serif display for the headline (e.g. `font-["Fraunces"]`
  or a rounded sans), regular weight; caption in small uppercase-ish sans.
- Full section `min-h-screen`, content centered both axes; max width `max-w-3xl`.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:18}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.9, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `LeafDrift` — extremely slow sway on the shadow overlay: `animate={{x:[0,8,0],rotate:[0,1,0]}}`,
  `transition={{duration:18, repeat:Infinity, ease:"easeInOut"}}` (mimics leaves moving in light wind).

## Structure
```tsx
<section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EDEBE7] px-6">
  {/* soft botanical shadows, low opacity, corners */}
  <LeafDrift className="pointer-events-none absolute -left-10 top-0 h-[70vh] w-auto opacity-40">
    <img src="/assets/leaf-shadow-left.png" className="h-full w-auto blur-[1px]" alt="" />
  </LeafDrift>
  <LeafDrift className="pointer-events-none absolute -right-10 bottom-0 h-[70vh] w-auto opacity-30">
    <img src="/assets/leaf-shadow-right.png" className="h-full w-auto blur-[1px]" alt="" />
  </LeafDrift>

  {/* centered statement */}
  <div className="relative z-10 mx-auto max-w-3xl text-center">
    <FadeUp>
      <h2 className="text-4xl font-normal leading-[1.15] tracking-tight text-[#3A3A38] sm:text-5xl md:text-6xl">
        What stands the test of time is all that guides the work.
      </h2>
    </FadeUp>

    {/* thin scroll divider + outline marker */}
    <FadeUp delay={0.25}>
      <div className="mx-auto mt-14 flex flex-col items-center gap-4">
        <span className="h-16 w-px bg-[#CFCDC8]" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#9A9A96] text-[#9A9A96]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#9A9A96]" />
        </span>
      </div>
    </FadeUp>

    {/* quiet caption */}
    <FadeUp delay={0.4}>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#9A9A96]">
        Civic bodies and private clients trust us to shape resilient communities and purposeful places.
      </p>
    </FadeUp>
  </div>
</section>
```

## Copy data (from the preview)
```ts
const aboutCopy = {
  headline: "What stands the test of time is all that guides the work.",
  caption:  "Civic bodies and private clients trust us to shape resilient communities and purposeful places.",
};
// No nav, no buttons in this section — it is a pure editorial statement block.
```

## Motion & acceptance
- Headline fades up first; the vertical divider "draws" downward (`scaleY` from 0 via `transform-origin: top`), then caption fades in (delays 0 / .25 / .4).
- Botanical leaf shadows sway very slowly (`LeafDrift`) to feel like dappled light — never distracting.
- Optional: the headline can do a gentle word-by-word reveal using staggered children.
- Respect `prefers-reduced-motion`: disable LeafDrift + divider draw, keep simple opacity fades.
- Acceptance checklist:
  - Warm off-white full-height canvas with faint blurred fern/palm-leaf shadows in the corners.
  - Single large centered charcoal statement headline (4 lines on desktop), generous line-height.
  - Thin vertical hairline divider below the headline ending in a small outlined circle marker.
  - Two-line muted-grey caption centered under the marker.
  - No nav/buttons; purely editorial, calm, lots of whitespace. Reduced-motion safe.
