# Futuristic Cinematic — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a dark, cinematic **`FuturisticCinematic`** hero: a centered pill nav with a wordmark and a
white "Join the wait" button, a large iridescent fluid sphere/orb glowing in the middle of a black
field, and a centered headline + mono subline + white pill CTA layered over the orb.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background pure black `#050506` with a soft central vignette glow behind the orb.
- KEY COLORS: white text `#F5F5F7`, dim mono text `#7E8088`, the orb is an oil-slick iridescence
  (teal `#3E6E72`, amber `#9A7B4C`, violet `#5B5A8C`) over a dark sphere — render as a layered
  radial/conic gradient with blur.
- Fonts: a clean grotesk for headline (Inter/General Sans), a monospace for the subline.
- Full-bleed `min-h-screen`; content centered `max-w-[820px]`.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, staggered delay, `ease:[0.22,1,0.36,1]`).
- `FluidOrb` — the iridescent sphere: a `rounded-full` div stacking conic + radial gradients with
  `blur-2xl` glow ring; slow rotation/scale for a "living" fluid look.
- `PillNav` — floating rounded nav bar with hairline border + blur.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-[#050506] text-[#F5F5F7]">
  {/* floating pill nav + wordmark + CTA */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <span className="text-sm font-medium tracking-tight">axentra</span>
    <PillNav className="hidden gap-6 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-[13px] text-white/70 backdrop-blur md:flex">
      <a>Platform</a><a>How it works</a><a className="text-white">AI Defense</a><a>Connections</a><a>Insights</a>
    </PillNav>
    <a className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black">Join the wait</a>
  </header>

  {/* iridescent fluid orb behind content */}
  <FluidOrb className="absolute left-1/2 top-1/2 -z-0 h-[78vmin] w-[78vmin] -translate-x-1/2 -translate-y-[46%]" />

  {/* centered hero copy */}
  <div className="relative z-10 mx-auto flex max-w-[820px] flex-col items-center px-6 pt-[20vh] text-center">
    <FadeUp>
      <h1 className="text-4xl font-normal leading-[1.1] tracking-tight md:text-5xl">
        When strategy meets its spark<br/>and thought reshapes what lies ahead
      </h1>
    </FadeUp>
    <FadeUp delay={0.15}>
      <p className="mt-6 font-mono text-[13px] leading-relaxed text-white/45">
        a fluid channel - where deep resolve<br/>and neural insight dissolve as one
      </p>
    </FadeUp>
    <FadeUp delay={0.3}>
      <a className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black">
        See it in motion →
      </a>
    </FadeUp>
  </div>
</section>
```

## Nav data (example, from the preview)
```ts
const nav = ["Platform", "How it works", "AI Defense", "Connections", "Insights"];
const brand = "axentra";
```

## FluidOrb sketch
```tsx
function FluidOrb({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360, scale: [1, 1.04, 1] }}
      transition={{ rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                    scale:  { duration: 12, repeat: Infinity, ease: "easeInOut" } }}
      className={cn("rounded-full blur-[2px]", className)}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, rgba(120,140,150,0.55), transparent 55%)," +
          "conic-gradient(from 200deg, #3E6E72, #9A7B4C, #5B5A8C, #2A2D3A, #3E6E72)",
        boxShadow: "0 0 160px 40px rgba(90,110,120,0.25)",
      }}
    />
  );
}
```

## Motion & acceptance
- Headline / mono subline / CTA stagger in (`FadeUp` delays 0 / .15 / .3).
- Orb rotates very slowly and "breathes" (scale 1↔1.04); soft glow halo.
- Acceptance checklist:
  - Pure-black background; centered iridescent oil-slick sphere with a soft glow behind the text.
  - Top bar: "axentra" wordmark left, centered pill nav (Platform / How it works / AI Defense [active] / Connections / Insights), white "Join the wait" pill right.
  - Centered 2-line grotesk headline "When strategy meets its spark / and thought reshapes what lies ahead".
  - Dim monospace 2-line subline beneath it.
  - White "See it in motion →" pill CTA centered below.
  - Responsive: nav collapses on mobile, orb scales with viewport; `prefers-reduced-motion` freezes orb rotation/scale, keeps fade.
```
