# Future-State — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a dark, technical **`FutureStateHero`** for an AI brand ("NOVA_AI"): a black stage with a
glowing electric-blue radial iris/burst centered, monospaced bracketed nav in the corners, a
left-aligned mixed serif-italic headline ("LEARN *to see* BRILLIANTLY"), and small HUD-style
counters/labels — a futuristic, instrument-panel landing.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = pure black `#000000` (very subtly lighter toward edges).
- Accent = **electric blue `#2D6BFF` / `#3B82F6`** glow concentrated in the centered iris graphic.
- Text white `#FFFFFF`; HUD labels in **monospace** (`font-mono`) at small size, dimmed `text-white/50`.
- Headline mixes a heavy sans (`font-semibold`) with an *italic serif* word — e.g. `LEARN` + italic `to see` + `BRILLIANTLY`.
- Background art = a radial "iris" image/canvas: a dense blue light-burst inside a thin white ring of spokes (`/assets/iris.png`), centered, ~50vh.

## Helpers
- `FadeUp` (framer-motion, opacity+y) for headline + footer copy.
- `HudLabel` — small monospace text with bracket wrappers, e.g. `[ v.01b ]`, `[ 002 /004 ]`, `( B )`.
- `Pulse` — slow scale/opacity loop on the iris glow: `animate={{scale:[1,1.04,1],opacity:[0.9,1,0.9]}}`, `transition={{duration:6,repeat:Infinity}}`.

## Structure
```tsx
<section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black text-white">
  {/* corner HUD nav */}
  <header className="relative z-10 flex items-start justify-between p-6 text-xs font-mono uppercase tracking-wide text-white/70">
    <div>
      <div className="text-white">(NOVA_AI)</div>
      <div className="mt-2 text-white/40">[ v.01b ]</div>
    </div>
    <nav className="flex flex-col items-end gap-1 text-white/60">
      <a className="hover:text-white">main ↗</a>
      <a className="hover:text-white">tiers ↗</a>
      <a className="hover:text-white">features ↗</a>
      <a className="hover:text-white">talk to us ↗</a>
    </nav>
  </header>

  {/* centered glowing iris */}
  <Pulse className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
    <img src="/assets/iris.png" alt="" className="h-[60vh] w-auto" />
  </Pulse>

  {/* left headline overlapping the iris */}
  <div className="relative z-10 flex flex-1 items-center px-6 md:px-12">
    <FadeUp>
      <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight md:text-6xl">
        LEARN <span className="font-serif italic font-normal">to see</span>
        <br />
        BRILLIANTLY
      </h1>
    </FadeUp>
  </div>

  {/* right-side HUD counters */}
  <div className="pointer-events-none absolute right-8 top-1/2 z-10 -translate-y-1/2 text-right font-mono text-xs text-white/50">
    <HudLabel>( B )</HudLabel>
    <HudLabel>[ 002 /004 ]</HudLabel>
  </div>

  {/* footer micro-copy bottom-left */}
  <FadeUp delay={0.2}>
    <p className="relative z-10 max-w-xs p-6 text-xs leading-relaxed text-white/40">
      Nova AI doesn't just respond — it interprets, sharpens, and delivers. From outline to
      final render, it supplies the insight you want.
    </p>
  </FadeUp>
</section>
```

## Nav / HUD data (example, from the preview)
```ts
const nav = ["main", "tiers", "features", "talk to us"];
const hud = { brand: "(NOVA_AI)", version: "[ v.01b ]", index: "[ 002 /004 ]", marker: "( B )" };
const headline = ["LEARN", "to see", "BRILLIANTLY"]; // middle word is italic serif
```

## Motion & acceptance
- Iris glow `Pulse` (slow scale + opacity breathing); optional very slow rotation of the outer spoke ring.
- Headline fades up on load; footer micro-copy fades in slightly later (delay .2).
- Nav links sit in opposite top corners; right-side HUD counters are vertically centered.
- Respect `prefers-reduced-motion`: stop iris pulse/rotation, keep static glow + opacity fades only.
- Acceptance checklist:
  - Pure-black stage with a centered electric-blue radial light-burst inside a thin white spoke ring.
  - Top-left brand `(NOVA_AI)` + `[ v.01b ]`; top-right vertical nav `main / tiers / features / talk to us` with ↗ arrows, all monospace.
  - Left, large headline `LEARN to see BRILLIANTLY` with the middle word in italic serif, overlapping the iris.
  - Right HUD counters `( B )` and `[ 002 /004 ]`; dim monospace footer copy bottom-left.
  - Everything monochrome white + single blue accent; reduced-motion safe.
