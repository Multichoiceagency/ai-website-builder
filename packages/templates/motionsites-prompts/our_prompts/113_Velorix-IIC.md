# Velorix IIC — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a pitch-black, futuristic **`VelorixHero`**: a floating pill nav, a centered two-line
headline with a monospace eyebrow and a rounded "Watch it unfold" CTA, and three pixel/voxel
hand-and-cross sculptures rising from the bottom of the frame.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-pure black `#050506` (subtle vertical gradient `from-[#0A0A0C] to-[#020203]`).
- Key colors from the image: white text `#F4F4F6`, muted grey body `#8A8A92`, a glowing
  violet/indigo accent `#8B5CF6` on the central voxel cross, warm peach skin tones on the right hand.
- Typeface: clean sans (Inter) for headline/nav; a **monospace** (`font-mono`) for the eyebrow line.
- Max content width ~`max-w-4xl`, generous vertical padding; imagery bleeds full-width at the bottom.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:20}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Float` — slow infinite bob for the voxel sculptures: `animate={{y:[0,-10,0]}}`,
  `transition={{duration:6+i, repeat:Infinity, ease:"easeInOut"}}`.
- `Glow` — radial blur halo behind the central cross (`bg-violet-500/30 blur-3xl`).

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-[#050506] text-white">
  {/* floating pill nav */}
  <header className="relative z-20 flex items-center justify-between px-7 py-5">
    <span className="text-lg font-semibold tracking-tight">velorix</span>
    <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white/70 backdrop-blur md:flex">
      {nav.map(n => <a key={n} className="rounded-full px-3 py-1.5 transition hover:text-white">{n}</a>)}
    </nav>
    <a className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-white/90">
      Join the wait
    </a>
  </header>

  {/* centered copy */}
  <div className="relative z-10 mx-auto max-w-4xl px-6 pt-[10vh] text-center">
    <FadeUp>
      <h1 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
        Where precision finds its edge<br/>and vision rewrites what comes next
      </h1>
    </FadeUp>
    <FadeUp delay={0.15}>
      <p className="mx-auto mt-6 max-w-md font-mono text-sm leading-relaxed text-white/45">
        a seamless bridge - where raw ambition<br/>and machine clarity converge as one
      </p>
    </FadeUp>
    <FadeUp delay={0.3}>
      <a className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90">
        Watch it unfold <span aria-hidden>→</span>
      </a>
    </FadeUp>
  </div>

  {/* three voxel sculptures rising from the bottom */}
  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex items-end justify-between px-2">
    <Float i={0}><img src="/assets/voxel-hand-left.png" className="h-[34vh] w-auto opacity-90" alt="" /></Float>
    <div className="relative">
      <Glow className="absolute inset-0 m-auto h-40 w-40" />
      <Float i={1}><img src="/assets/voxel-cross.png" className="relative h-[40vh] w-auto" alt="" /></Float>
    </div>
    <Float i={2}><img src="/assets/voxel-hand-right.png" className="h-[34vh] w-auto opacity-95" alt="" /></Float>
  </div>
</section>
```

## Nav data (from the preview)
```ts
const nav = ["Platform", "How it works", "AI Defense", "Connections", "Insights"];
```

## Imagery notes
- Left: a monochrome dotted/voxel **hand** reaching in from the lower-left corner.
- Center: a glowing **plus/cross voxel sculpture** in violet→indigo with motion-blur streaks radiating out.
- Right: a peach-toned dotted/voxel **hand** entering from the lower-right.
- All three sit on pure black and bleed off the bottom edge.

## Motion & acceptance
- Headline → eyebrow → CTA stagger up (delays 0 / .15 / .3).
- Each voxel sculpture floats independently via `Float` (different durations); central cross has a pulsing violet `Glow`.
- Optional: faint radial light-streaks behind the cross animate opacity slowly.
- Respect `prefers-reduced-motion`: disable Float + glow pulse, keep static positions + opacity fade.
- Acceptance checklist:
  - Pure-black hero, white "velorix" logo left, frosted pill nav (5 links) centre, white "Join the wait" pill right.
  - Centered two-line sans headline; monospace muted-grey two-line eyebrow below it.
  - White rounded "Watch it unfold →" CTA centered under the eyebrow.
  - Three dotted/voxel sculptures (left hand, center violet cross with glow, right hand) rising from the bottom.
  - Responsive: nav collapses on mobile; sculptures scale down / can hide on very small screens.
