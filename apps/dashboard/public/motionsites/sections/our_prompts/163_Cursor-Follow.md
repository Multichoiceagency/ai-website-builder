# Cursor Follow — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Full-bleed video/3D character hero (a friendly waving blue yeti on a green hill under a bright sky) with a pill nav, a custom-following cursor accent and a heavy uppercase bottom-left headline.

Build an immersive **`CursorFollowHero`** section: a full-screen sky-and-hill scene with a charming
3D mascot, a floating dark pill nav, a large white uppercase headline anchored bottom-left, and a
custom cursor-follower that adds a script-font "collection" accent near the pointer.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/airy theme over media. Background = full-bleed looping video or image
  (`/assets/yeti-hill.mp4`/`.jpg`) `object-cover`, bright cloudy sky `#9FC4E8` → green hill `#6E7D3C`.
- Headline = heavy condensed uppercase white `font-bold tracking-tight`, with a subtle dark gradient
  scrim at the bottom-left for legibility (`from-black/30 to-transparent`).
- Nav pills: dark `bg-[#0E0E0E] text-white rounded-full`; active link is a black pill, others plain.
- Accent script word ("collection") in lime green `font-["Caveat"]/italic` that follows the cursor.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for nav + headline.
- `CursorFollower` — tracks `mousemove`, animates a `motion.span` with spring `x/y` lag; shows the
  lime script "collection" word offset from the pointer.
- `Pill` — rounded nav item helper (active = filled black).

## Structure
```tsx
<section
  onMouseMove={onMove}
  className="relative min-h-screen w-full overflow-hidden text-white">
  {/* full-bleed media */}
  <video autoPlay muted loop playsInline poster="/assets/yeti-hill.jpg"
    className="absolute inset-0 h-full w-full object-cover">
    <source src="/assets/yeti-hill.mp4" type="video/mp4" />
  </video>
  <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-transparent" />

  {/* NAV: brand glyph left, pill links center, reserve CTA right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0E0E0E] text-white">◉</span>
    <nav className="flex items-center gap-2 rounded-full bg-[#0E0E0E]/80 p-1 text-sm backdrop-blur">
      {nav.map(n => <Pill key={n.label} active={n.active}>{n.label}</Pill>)}
    </nav>
    <button className="flex items-center gap-2 rounded-full bg-[#0E0E0E] px-5 py-2 text-sm">
      <span className="h-2 w-2 rounded-full bg-lime-400" /> Reserve Yours
    </button>
  </header>

  {/* bottom-left headline */}
  <div className="absolute bottom-[10%] left-8 z-10 max-w-3xl">
    <FadeUp>
      <h1 className="text-4xl font-bold uppercase leading-[0.95] tracking-tight drop-shadow sm:text-6xl md:text-7xl">
        Beyond Earth and<br />( its ) familiar<br />boundaries
      </h1>
    </FadeUp>
  </div>

  {/* cursor-following lime script accent */}
  <CursorFollower className="pointer-events-none fixed z-30 font-['Caveat'] text-2xl italic text-lime-400">
    collection
  </CursorFollower>
</section>
```

## Nav data (example, from the preview)
```ts
const nav = [
  { label: "Device",       active: true },
  { label: "Real Stories", active: false },
  { label: "Science",      active: false },
  { label: "Plans",        active: false },
  { label: "Reach Us",     active: false },
];
```

## Motion & acceptance
- `CursorFollower` lags behind the pointer with a spring (stiffness ~120, damping ~18); lime script
  "collection" word trails the cursor.
- Nav + headline fade-up on load; active nav link is a filled black pill.
- Full-bleed mascot scene (waving blue yeti on a green hill, bright sky); subtle bottom-left scrim
  keeps the white uppercase headline readable.
- Headline reads "BEYOND EARTH AND ( ITS ) FAMILIAR BOUNDARIES", heavy condensed, three lines.
- Top: brand glyph + dark pill nav (Device active) + "● Reserve Yours" CTA with lime dot.
- Respect `prefers-reduced-motion`: pause the video (show poster), disable cursor-follower lag
  (render static or hide). Responsive: nav stays pilled, headline scales down.
```
