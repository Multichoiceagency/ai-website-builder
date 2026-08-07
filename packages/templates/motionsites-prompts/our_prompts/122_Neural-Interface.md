# Neural Interface — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Donkere AI-hero ("SynapseX"): een 3D-geroteerde coverflow van vijf glazen metric-kaarten boven een groene mist-glow, met een gepilde logo-chip linksboven en een witte "Download"-pil rechtsboven.

Build a dark **`NeuralInterface`** hero for an AI product ("SynapseX"): a horizontal coverflow
of glass stat cards rotated in 3D perspective (center card upright, side cards angled toward the
viewer), floating over a soft emerald radial fog.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#070A08` with an off-center emerald glow
  `radial-gradient(50% 50% at 45% 40%, rgba(34,140,90,0.40), transparent)`.
- Glass cards: `bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl`, faint inner highlight.
- Key colors: white headline numbers `#FFFFFF`, muted captions `#8FA39A`, emerald fog `#1E7A52`.
- Font: condensed/mono-ish display for the big numbers (`font-mono` or `tracking-tight`), small uppercase labels.
- Max width `max-w-7xl`; perspective container `[perspective:1400px]`.

## Helpers
- `Coverflow` — flex row; each card gets a `rotateY` based on its distance from center
  (`left: +28deg`, `center: 0`, `right: -28deg`) plus depth `translateZ`.
- `StatCard` — `{label, value, sub, bullets[]}`; top label, huge value, footer caption, 3 bullet lines.
- `Glow` — absolutely-positioned blurred emerald radial.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-[#070A08]">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_45%_40%,rgba(34,140,90,0.40),transparent)]" />

  {/* top bar */}
  <header className="relative z-10 flex items-center justify-between px-6 py-5">
    <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm text-white">
      <span>✦</span> SynapseX <span className="ml-1 text-white/40">≡</span>
    </span>
    <a className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black">⬇ Download</a>
  </header>

  {/* 3D coverflow */}
  <div className="relative z-10 mt-10 flex justify-center [perspective:1400px]">
    <div className="flex items-center gap-5">
      {cards.map((c,i) => {
        const offset = i - 2; // center = index 2
        return (
          <motion.div key={c.label}
            initial={{opacity:0, y:30}} whileInView={{opacity:1, y:0}}
            transition={{duration:0.7, delay:Math.abs(offset)*0.08}}
            style={{ transform:`rotateY(${offset*-14}deg) translateZ(${-Math.abs(offset)*60}px)` }}
            className={cn("w-56 shrink-0 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md",
              offset===0 && "border-white/20 shadow-[0_0_60px_-10px_rgba(34,140,90,0.5)]")}>
            <StatCard {...c} />
          </motion.div>
        );
      })}
    </div>
  </div>
</section>
```

```tsx
function StatCard({label,value,sub,bullets}:Card){
  return (
    <>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#8FA39A]">{label}</p>
      <div className="mt-6 font-mono text-4xl font-semibold text-white">{value}</div>
      <ul className="mt-6 space-y-1.5 text-[11px] text-[#8FA39A]">
        {bullets.map(b => <li key={b}>· {b}</li>)}
      </ul>
      <p className="mt-6 text-[9px] uppercase tracking-[0.18em] text-white/30">{sub}</p>
    </>
  );
}
```

## Cards data (example, from the preview)
```ts
const cards: Card[] = [
  { label:"Mapping",          value:"…",     sub:"Feedback System",       bullets:["Adaptive mapping","Neural execution","Feedback routing"] },
  { label:"Epoch Latency",    value:"0.4ms", sub:"Cycle Response Speed",  bullets:["Hardware-accelerated pipeline","Direct metal shader execution","Temporal synchronisation loop"] },
  { label:"Cognitive Streams",value:"14.8M", sub:"Real-time Model Coherency", bullets:["Distributed synapse projection","High-fidelity entropy filtering","Sub-millisecond state coherence"] },
  { label:"Synapse",          value:"128L",  sub:"Model Resolution Depth", bullets:["Deep feed-forward mapping","Transformer-based neural routing","Multi-dimensional pattern projection"] },
  { label:"Signal Integrity", value:"99.9%", sub:"Noise Resolution Ratio", bullets:["Advanced wavelet filtering","Dynamic heuristic balancing","Corrected signal amplification"] },
];
```

## Motion & acceptance
- Cards reveal with a center-out stagger; center card sits upright and brightest with an emerald glow halo.
- Optional drag/scroll to cycle which card is "center" (re-mapping rotateY/translateZ); emerald fog drifts slowly.
- Hover lifts a side card slightly toward upright.
- Acceptance checklist:
  - Near-black background with off-center emerald radial fog.
  - Coverflow of 5 glass cards in 3D perspective: side cards angled, center upright + glowing, edge cards partly clipped.
  - Each card: small uppercase label, big mono number (0.4ms / 14.8M / 128L / 99.9%), three "·" bullet lines, tiny footer caption.
  - Pill logo chip "✦ SynapseX ≡" top-left; white "⬇ Download" pill top-right.
  - Reduced-motion: drop 3D drift/stagger, render cards flat in a scrollable row.
