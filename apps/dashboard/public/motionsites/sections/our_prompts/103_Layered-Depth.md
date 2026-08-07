# Layered Depth — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a bright, editorial **`LayeredDepthHero`** React section: a near-white studio canvas with a
photoreal floating "island" (a mossy curved trunk on a patch of grass with wildflowers and rocks) anchored
top-center, a pill-style top nav, and an oversized serif statement headline rising from the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Light theme. Background = warm off-white `#F2F1EE` with a very faint diagonal palm-frond shadow overlay
  bottom-left (`/assets/frond-shadow.png` at `opacity-[0.07]`).
- Key colors seen: paper `#F2F1EE`, ink `#1B1B19` for the headline, moss greens `#5C6B3A`/`#3E4A26`,
  trunk stone `#9A958B`, accent dandelion yellow `#E7B23A`.
- Fonts: a heavy grotesk/serif display for the big line (e.g. `font-["Aeonik"]`/system sans, weight 700,
  very tight `tracking-tight`); small uppercase labels in a clean sans with `tracking-[0.18em]`.
- Max content width `max-w-6xl` centered; the hero is `min-h-screen` with deep vertical rhythm.

## Helpers
- `FadeUp` — framer-motion wrapper, `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Float` — slow infinite bob for the island PNG: `animate={{y:[0,-10,0]}}`,
  `transition={{duration:9, repeat:Infinity, ease:"easeInOut"}}`.
- `NavPill` — rounded-full white chip wrapper used for the menu and language switch.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-[#F2F1EE]">
  {/* faint frond shadow */}
  <img src="/assets/frond-shadow.png" alt="" className="pointer-events-none absolute bottom-0 left-0 w-1/2 opacity-[0.07]" />

  {/* TOP BAR — wordmark left, pill nav center-right, lang + menu right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <span className="text-lg font-semibold tracking-tight text-[#1B1B19]">Qelora</span>
    <nav className="hidden items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[13px] text-[#1B1B19] shadow-sm backdrop-blur md:flex">
      <a className="rounded-full px-4 py-2 hover:bg-black/[0.04]">Projects</a>
      <a className="rounded-full px-4 py-2 hover:bg-black/[0.04]">Studio</a>
      <a className="rounded-full px-4 py-2 hover:bg-black/[0.04]">Responsibility</a>
      <a className="rounded-full px-4 py-2 hover:bg-black/[0.04]">Archive</a>
    </nav>
    <div className="flex items-center gap-2">
      <button className="rounded-full bg-white/80 px-3 py-2 text-[13px] shadow-sm">EN ⌄</button>
    </div>
  </header>

  {/* tiny eyebrow above the island */}
  <FadeUp>
    <p className="relative z-10 mt-2 text-center text-[11px] uppercase tracking-[0.22em] text-[#1B1B19]/55">
      Explore our approach ↓
    </p>
  </FadeUp>

  {/* floating photoreal island, anchored top-center */}
  <Float className="relative z-10 mx-auto mt-2 w-full max-w-3xl">
    <img src="/assets/qelora-island.png" alt="Mossy floating island with curved trunk"
         className="mx-auto h-auto w-[78%] drop-shadow-[0_40px_60px_rgba(0,0,0,0.12)]" />
  </Float>

  {/* oversized statement headline rising from the bottom */}
  <div className="relative z-10 mx-auto mt-10 max-w-5xl px-6 pb-24 text-center">
    <FadeUp delay={0.15}>
      <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-[#1B1B19] sm:text-6xl md:text-7xl">
        What stands the<br/>test of time is all<br/>that guides the…
      </h1>
    </FadeUp>
  </div>
</section>
```

## Nav data (example, from the preview)
```ts
const nav = ["Projects", "Studio", "Responsibility", "Archive"];
const wordmark = "Qelora";
const eyebrow = "Explore our approach";
const headline = "What stands the test of time is all that guides the…";
```

## Motion & acceptance
- Island bobs gently via `Float`; eyebrow + headline fade-up with stagger (0 / .15).
- On scroll, the big serif line can continue/complete (optional second clause revealed below the fold).
- Pill nav is a single white rounded-full container with hover-tinted link chips; wordmark left, language/menu right.
- Photoreal island PNG sits on transparent ground with a soft contact shadow (`drop-shadow`), floating above paper bg.
- Acceptance checklist:
  - [ ] Warm off-white `#F2F1EE` canvas with faint frond shadow bottom-left.
  - [ ] Top bar: "Qelora" wordmark, centered white pill nav (Projects/Studio/Responsibility/Archive), EN switch right.
  - [ ] Center eyebrow "Explore our approach ↓" in uppercase tracked caps.
  - [ ] One large floating photoreal mossy-trunk island with drop-shadow, top-center.
  - [ ] Oversized bold serif/grotesk headline ("What stands the test of time…") bottom-center, ink color.
  - [ ] `prefers-reduced-motion`: disable Float bob, keep opacity fades only.
