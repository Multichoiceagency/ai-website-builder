# Futuristic Tech — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a cinematic full-bleed **`FuturisticTechHero`** for "axentra": a dark photographic
background (a figure crouched in a glowing meadow at dusk, a god-ray lens flare behind them),
a centered pill navbar with a white "Join the wait" button, a large bottom-left two-line
headline, faint monospace sub-copy, and a rounded "See it in motion" CTA.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Dark theme. Background = a full-viewport photographic image (`/assets/meadow-dusk.jpg`) with
  `object-cover`; overlay a `bg-gradient-to-t from-black/80 via-black/30 to-black/60` so the top nav
  and bottom headline stay legible.
- Palette is image-driven: deep near-black greens/teals with a warm white god-ray bloom; foreground
  text **white `#FFFFFF`**, micro-copy `text-white/45` in monospace.
- Font Inter; headline large, regular/medium weight, tight leading.
- Logo wordmark "axentra" lowercase, white, top-left.

## Helpers
- `FadeUp` (framer-motion, opacity+y) for headline, sub, CTA.
- `PillNav` — centered rounded translucent nav bar: `rounded-full border border-white/15 bg-white/5 backdrop-blur px-2 py-2`.
- `Bloom` — very slow opacity/scale breathing on the god-ray overlay to suggest living light.

## Structure
```tsx
<section className="relative flex min-h-screen w-full flex-col overflow-hidden">
  <img src="/assets/meadow-dusk.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />

  {/* top bar: logo · pill nav · CTA */}
  <header className="relative z-10 flex items-center justify-between px-8 py-6">
    <span className="text-lg font-medium tracking-tight text-white">axentra</span>
    <PillNav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
      <a className="hover:text-white">Platform</a>
      <a className="hover:text-white">How it works</a>
      <a className="hover:text-white">AI Defense</a>
      <a className="hover:text-white">Connections</a>
      <a className="hover:text-white">Insights</a>
    </PillNav>
    <a className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-white/90">
      Join the wait
    </a>
  </header>

  {/* bottom-left headline block */}
  <div className="relative z-10 mt-auto max-w-2xl px-8 pb-12">
    <FadeUp>
      <h1 className="text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
        When strategy meets its spark
        <br />
        and thought reshapes what lies ahead
      </h1>
    </FadeUp>
    <FadeUp delay={0.12}>
      <p className="mt-4 font-mono text-xs leading-relaxed text-white/45">
        a fluid channel — where deep resolve
        <br />
        and neural insight dissolve as one
      </p>
    </FadeUp>
    <FadeUp delay={0.24}>
      <a className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90">
        See it in motion <span aria-hidden>→</span>
      </a>
    </FadeUp>
  </div>
</section>
```

## Nav / copy data (example, from the preview)
```ts
const nav = ["Platform", "How it works", "AI Defense", "Connections", "Insights"];
const hero = {
  brand: "axentra",
  headline: "When strategy meets its spark and thought reshapes what lies ahead",
  sub: "a fluid channel — where deep resolve and neural insight dissolve as one",
  primaryCta: "Join the wait",
  secondaryCta: "See it in motion",
};
```

## Motion & acceptance
- Headline → sub → CTA stagger in via `FadeUp` (delays 0 / .12 / .24).
- God-ray bloom breathes slowly (`Bloom`); optional very slight background `scale:[1,1.03,1]` over ~30s.
- Pill nav items get a quiet hover brighten; both buttons are solid white pills with black text.
- Respect `prefers-reduced-motion`: disable bloom/scale, keep opacity fades only.
- Acceptance checklist:
  - Full-viewport dusk-meadow photo with a warm god-ray flare behind a crouched figure; dark gradient overlay top + bottom.
  - Top row: `axentra` wordmark left, centered translucent pill nav (5 links), solid white "Join the wait" button right.
  - Bottom-left two-line white headline + faint monospace two-line sub-copy.
  - Rounded white "See it in motion →" CTA below the copy.
  - Reduced-motion safe; all chrome legible over imagery via gradient overlay.
