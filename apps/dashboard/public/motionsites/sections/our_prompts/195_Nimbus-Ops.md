# Nimbus Ops — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: CTA · cta.
> Donkere ops-CTA ("Nimbus Grid"): links een "OPERATIONS"-eyebrow, een grote bold kop, een korte paragraaf en een gele "PLAN OPERATIONS"-pil; rechts een 3D-radiaal van zwevende gouden tegels die rond één centrale, oplichtende tegel cirkelen.

Build a dark **`NimbusOps`** CTA section: a left column with an "OPERATIONS" eyebrow, a bold
four-line headline, a short paragraph and a warm-gold pill CTA; a right-side 3D visual of small
floating gold tiles orbiting one larger glowing central tile.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = warm near-black `#15130F` with a faint radial vignette behind the tiles.
- Key colors: near-white headline `#F0EEE8`, muted body `#9C988E`, warm gold tiles + CTA `#D9B777`/`#C9A86A`.
- Font: bold sans for the headline, small uppercase eyebrow + button label, regular body.
- Max width `max-w-6xl`; two-column grid (text left, visual right).

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `OrbitTiles` — central glowing tile + N small tiles placed on a circle (`rotate(i*angle) translate(r)`); the whole ring slowly rotates, tiles counter-rotate to stay upright; gentle individual `y` bob.
- `GoldPill` — rounded-full gold CTA button.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#15130F] py-24 text-[#F0EEE8]">
  <div className="pointer-events-none absolute right-[10%] top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,183,119,0.15),transparent_70%)]" />

  <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-8 md:grid-cols-2">
    {/* left copy */}
    <div>
      <FadeUp><p className="text-[11px] uppercase tracking-[0.3em] text-[#9C988E]">Operations</p></FadeUp>
      <FadeUp delay={0.1}>
        <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          A control layer for<br/>every storage<br/>move your<br/>business makes.
        </h2>
      </FadeUp>
      <FadeUp delay={0.2}>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#9C988E]">
          Route migrations, active workspaces, archives, and compliance exports through one
          operational grid. Nimbus Grid keeps capacity, policy, and transfer status visible
          before teams hit a limit.
        </p>
      </FadeUp>
      <FadeUp delay={0.3}>
        <button className="mt-8 rounded-full bg-[#D9B777] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#15130F] transition hover:bg-[#E6C98C]">Plan Operations</button>
      </FadeUp>
    </div>

    {/* right 3D orbit visual */}
    <FadeUp delay={0.2}>
      <OrbitTiles className="relative mx-auto h-80 w-80 [perspective:1000px]" />
    </FadeUp>
  </div>
</section>
```

```tsx
function OrbitTiles({className}:{className?:string}) {
  const tiles = Array.from({length:12});
  return (
    <div className={className}>
      {/* central glowing tile */}
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rotate-[8deg] rounded-lg bg-gradient-to-br from-[#E6C98C] to-[#B98E4A] shadow-[0_0_60px_-5px_rgba(217,183,119,0.7)]" />
      {/* orbiting small tiles */}
      <motion.div className="absolute inset-0" animate={{rotate:360}} transition={{duration:40, repeat:Infinity, ease:"linear"}}>
        {tiles.map((_,i) => {
          const a = (i/tiles.length)*Math.PI*2;
          return (
            <div key={i}
              style={{ left:`${50+38*Math.cos(a)}%`, top:`${50+38*Math.sin(a)}%` }}
              className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-[10deg] rounded bg-gradient-to-br from-[#C9A86A] to-[#7C5E2E] opacity-80" />
          );
        })}
      </motion.div>
    </div>
  );
}
```

## Motion & acceptance
- Eyebrow → headline → paragraph → CTA stagger in (0/.1/.2/.3).
- The tile ring rotates slowly and continuously; the central tile glows/pulses gently; small tiles bob slightly on `y`.
- CTA brightens on hover.
- Acceptance checklist:
  - Warm near-black `#15130F` background with a soft gold radial vignette behind the right visual.
  - Left: "OPERATIONS" eyebrow, bold four-line headline "A control layer for every storage move your business makes.", grey paragraph, gold "PLAN OPERATIONS" pill.
  - Right: ~12 small gold tiles orbiting one larger glowing central tile in faux-3D.
  - Continuous slow orbit + central glow; CTA hover state.
  - Responsive: visual stacks below copy on mobile. Reduced-motion safe (freeze orbit + glow, keep fades).
