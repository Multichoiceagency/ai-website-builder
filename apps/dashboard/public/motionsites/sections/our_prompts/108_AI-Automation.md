# AI Automation — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Light, editorial AI-agency hero ("COGNITRA") with a centered glowing 3D wireframe/network sculpture, a split top nav and a bottom-left aligned headline block.

Build a near-full-bleed **`AIAutomationHero`** section: a soft grey studio background with a
centered, faintly-glowing 3D wireframe "neural" sculpture (warm amber sparks inside a dark mesh),
a thin split navigation, and a large left-aligned uppercase headline overlapping the sculpture.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = warm light grey `#DEDDDB` → `#E7E6E4` with a very soft concentric
  radial ring vignette behind the sculpture (`radial-gradient(50%_50%_at_50%_45%,rgba(255,255,255,0.5),transparent)`).
- Hero art = a transparent PNG/video of a dark mesh sphere with glowing amber filaments
  (`/assets/ai-mesh.png`), `object-contain`, centered, ~70vh tall.
- Typeface: Helvetica/Inter. Headline is heavy uppercase, tight tracking (`tracking-[-0.01em]`),
  near-black `#1A1A1A`. Nav labels are tiny uppercase grey `#5C5C5C`.
- Max content width `max-w-[1280px]`, generous side padding `px-8`.

## Helpers
- `FadeUp` — framer-motion wrapper: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Drift` — slow infinite float for the sculpture: `animate={{y:[0,-10,0]}}`, `transition={{duration:12, repeat:Infinity, ease:"easeInOut"}}`.
- `Pulse` — soft opacity breathing for the amber glow overlay (`animate opacity:[0.6,1,0.6]`, 6s).

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-[#E2E1DF]">
  {/* faint concentric ring vignette */}
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_45%,rgba(255,255,255,0.55),transparent)]" />

  {/* TOP NAV — brand left, split menu, actions right */}
  <header className="relative z-20 mx-auto flex max-w-[1280px] items-center justify-between px-8 py-6">
    <div className="text-[13px] font-semibold uppercase tracking-wide text-[#1A1A1A]">
      <p className="text-[10px] font-normal normal-case text-[#5C5C5C]">streamlined workflows.</p>
      Cognitra
    </div>
    <nav className="hidden gap-8 text-[11px] uppercase tracking-[0.12em] text-[#5C5C5C] md:flex">
      {["Main","Offering","Case","Rates"].map(l => <a key={l} className="hover:text-black">{l}</a>)}
    </nav>
    <nav className="flex gap-8 text-[11px] uppercase tracking-[0.12em] text-[#5C5C5C]">
      {["Crew","Connect"].map(l => <a key={l} className="hover:text-black">{l}</a>)}
    </nav>
  </header>

  {/* centered glowing mesh sculpture */}
  <Drift className="absolute left-1/2 top-[18%] z-0 -translate-x-1/2">
    <img src="/assets/ai-mesh.png" alt="" className="h-[70vh] w-auto object-contain" />
    <Pulse className="absolute inset-0 bg-[radial-gradient(40%_40%_at_45%_45%,rgba(255,170,60,0.35),transparent)]" />
  </Drift>

  {/* bottom-left headline block overlapping the sculpture */}
  <div className="absolute bottom-[14%] left-0 z-10 mx-auto w-full max-w-[1280px] px-8">
    <FadeUp>
      <h1 className="max-w-[820px] text-4xl font-bold uppercase leading-[1.05] tracking-[-0.01em] text-[#1A1A1A] sm:text-5xl md:text-6xl">
        We build end-to-end AI automation systems.
      </h1>
    </FadeUp>
    <FadeUp delay={0.15}>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#4A4A4A]">
        We provide all-in-one AI automation services in one place.
      </p>
    </FadeUp>
  </div>

  {/* tiny bottom-center scroll cue + bottom-right repost pill */}
  <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-[#7A7A7A]">⌖</div>
  <a className="absolute bottom-6 right-8 z-20 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#5C5C5C]">
    ⤴ Repost
  </a>
</section>
```

## Nav data (example, from the preview)
```ts
const leftNav  = ["Main", "Offering", "Case", "Rates"];
const rightNav = ["Crew", "Connect"];
const brand    = { name: "COGNITRA", tagline: "streamlined workflows." };
```

## Motion & acceptance
- Mesh sculpture floats vertically (`Drift`) with a breathing amber glow (`Pulse`); optional slow
  `rotate`/`scale:[1,1.03,1]` over ~24s for a living-sculpture feel.
- Headline + sub fade-up with stagger (0 / .15); nav links subtly darken on hover.
- Warm light-grey studio bg with concentric ring vignette; sculpture centered, headline bottom-left
  overlapping it.
- Split nav: brand + tagline left, 4 links center, 2 links right; bottom-center scroll glyph and
  bottom-right "↻ Repost" pill.
- Respect `prefers-reduced-motion`: disable Drift/Pulse/rotate, keep opacity fades only.
- Responsive: nav collapses on mobile, headline scales down, sculpture stays centered.
```
