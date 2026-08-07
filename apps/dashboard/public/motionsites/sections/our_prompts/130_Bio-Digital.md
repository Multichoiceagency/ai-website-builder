# Bio-Digital — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Minimal light hero ("NeuralKinetics") with a soft prismatic blurred ring/orb behind a centered two-weight headline, a pill "+ Menu" nav and bottom-row pill tags.

Build a clean, airy **`BioDigitalHero`** section: a near-white background with a large soft-focus
iridescent ring (orange→blue→green smear) centered behind a two-tone headline mixing thin grey and
bold black words, framed by a pill nav and bottom pill tags.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = `#F2F2F0` near-white with a faint top-down sheen.
- Hero art = a heavily blurred prismatic ring (`/assets/prism-ring.png`, `blur-2xl` if CSS-only),
  centered, ~46vw, low contrast so text reads over it.
- Typeface: a clean grotesque (Inter / Geist). Headline blends `font-normal text-neutral-400`
  (e.g. "cybernetics") with `font-semibold text-[#1A1A1A]` (e.g. "NeuralKinetics", "made organic").
- Pills: white `bg-white border border-black/10 rounded-full` with subtle shadow; menu/avatar
  buttons are black circles.

## Helpers
- `FadeUp` — framer-motion wrapper, `whileInView` opacity+y, easing `[0.22,1,0.36,1]`.
- `SpinSlow` — very slow infinite rotation for the prismatic ring (`animate rotate:360`, 60s linear).
- `Pill` — reusable rounded white tag (`px-4 py-1.5 text-xs`).

## Structure
```tsx
<section className="relative flex min-h-screen w-full flex-col bg-[#F2F2F0] overflow-hidden">
  {/* prismatic blurred ring behind everything */}
  <SpinSlow className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
    <img src="/assets/prism-ring.png" alt="" className="h-[46vw] w-[46vw] opacity-90 blur-[2px]" />
  </SpinSlow>

  {/* TOP NAV: brand + pill menu left, avatar pill right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <div className="flex items-center gap-4">
      <span className="text-sm font-semibold text-[#1A1A1A]">✦ NeuralKinetics</span>
      <button className="flex items-center gap-2 rounded-full bg-black px-1 py-1 pr-4 text-xs text-white">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-black">+</span> Menu
      </button>
      <span className="text-xs text-[#7A7A7A]">Advanced Bionics</span>
      <span className="text-xs text-[#7A7A7A]">Cognitive AI</span>
    </div>
    <button className="flex items-center gap-2 rounded-full bg-black px-1 py-1 pr-4 text-xs text-white">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-black">+</span> Adaptive Systems
    </button>
  </header>

  {/* centered two-weight headline */}
  <div className="relative z-10 flex flex-1 items-center justify-center px-6">
    <FadeUp>
      <h1 className="text-center text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
        <span className="font-semibold text-[#1A1A1A]">NeuralKinetics</span><br />
        <span className="font-normal text-neutral-400">cybernetics </span>
        <span className="font-semibold text-[#1A1A1A]">made organic</span>
      </h1>
    </FadeUp>
  </div>

  {/* bottom row: left caption block + right pill tags */}
  <footer className="relative z-10 flex items-end justify-between gap-6 border-t border-black/5 px-8 py-6">
    <FadeUp delay={0.1}>
      <div className="max-w-xs">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#9A9A9A]">Autonomous Dynamics</p>
        <p className="mt-2 text-sm leading-snug text-[#2A2A2A]">
          Unifying biological grace with machine intelligence to design the next era of fusion
        </p>
      </div>
    </FadeUp>
    <div className="flex gap-3">
      {tags.map(t => <Pill key={t}>{t}</Pill>)}
    </div>
  </footer>
</section>
```

## Content data (example, from the preview)
```ts
const navLeft  = ["Advanced Bionics", "Cognitive AI"];
const tags     = ["Neuromorphic", "AGI", "Cybernetics"];
const caption  = {
  eyebrow: "Autonomous Dynamics",
  text: "Unifying biological grace with machine intelligence to design the next era of fusion",
};
```

## Motion & acceptance
- Prismatic ring rotates very slowly (`SpinSlow`); optional gentle `scale:[1,1.04,1]` breathing (~20s).
- Headline fades up; bottom caption + tags stagger in after it.
- Two-weight headline: bold black "NeuralKinetics" / "made organic" + thin grey "cybernetics",
  centered, two lines.
- Pill nav: brand glyph + black "＋ Menu" pill + two plain links left; black "＋ Adaptive Systems"
  pill right; bottom-right three white tag pills (Neuromorphic / AGI / Cybernetics).
- Near-white `#F2F2F0` bg, soft iridescent ring behind. Respect `prefers-reduced-motion`
  (freeze ring, opacity-only). Responsive: nav wraps, headline scales, footer stacks on mobile.
```
