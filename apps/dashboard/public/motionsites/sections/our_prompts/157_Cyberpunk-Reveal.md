# Cyberpunk Reveal — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Felle oranje sci-fi hero: een man met glowing carbon-fiber bodysuit op een vurige oranje gradient, pill-nav bovenin, monospace headline + "Reserve Now" knop linksonder, en concentrische ring-stats (10+ / 40+ / 95%) rechts.

Build an intense, fiery **`CyberpunkReveal`** hero for a biotech/augmentation brand:
a centered floating pill-nav, a full-bleed portrait of a figure in a glowing-circuit bodysuit on a
hot-orange radial background, a monospace eyebrow + big headline + body + "Reserve Now" pill bottom-left,
and three orbiting ring-stats on the right (years / use forms / repeat members).

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark/warm theme. Background = hot-orange radial glow `radial-gradient(80% 80% at 30% 40%, #FF6A1A, #C2390A 60%, #7A1F05)`
  behind a cut-out portrait (`/assets/augment-portrait.png`, `object-cover`).
- Colors I see: vivid orange `#FF6A1A`/`#FF8A3D`, near-black suit, off-white text `#FBEFE6`,
  thin white concentric ring strokes `border-white/20`, glowing teal/orange suit circuitry accents.
- Fonts: a monospace / techno face for eyebrow + body (`font-mono`, `tracking-tight`), bold headline same family but large.
- Headline lowercase-ish, set big and tight: `text-5xl`/`text-6xl`. Max width `max-w-[1200px]`.

## Helpers
- `FadeUp` / `FadeIn` — framer-motion wrappers (eyebrow → headline → body → CTA stagger).
- `RingStat` — a stat with a faint quarter/full concentric ring arc behind it; big number + tiny uppercase caption.
- `PillNav` — floating dark rounded nav bar.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden">
  {/* fiery background + portrait */}
  <div className="absolute inset-0 bg-[radial-gradient(80%_80%_at_30%_40%,#FF6A1A,#C2390A_60%,#7A1F05)]" />
  <img src="/assets/augment-portrait.png" alt="" className="absolute inset-0 h-full w-full object-cover object-top" />

  {/* concentric ring guides (decorative) */}
  <div className="pointer-events-none absolute right-[-10%] top-1/3 h-[120vh] w-[120vh] -translate-y-1/2 rounded-full border border-white/15" />
  <div className="pointer-events-none absolute right-[-4%] top-1/3 h-[80vh] w-[80vh] -translate-y-1/2 rounded-full border border-white/10" />

  {/* PILL NAV */}
  <header className="relative z-10 mx-auto mt-6 flex w-fit items-center gap-6 rounded-full bg-black/70 px-5 py-2 text-sm text-white/80 backdrop-blur">
    <span className="text-white">◎</span>
    <a>Module</a><a>Case Records</a><a>Biotech</a><a>Tiers</a><a>Live Demo</a>
    <a className="rounded-full border border-white/30 px-3 py-1 text-white">Connect</a>
  </header>

  {/* HEADLINE BLOCK bottom-left */}
  <div className="absolute bottom-[10%] left-0 z-10 max-w-xl px-8 text-[#FBEFE6]">
    <FadeUp><p className="mb-3 font-mono text-xs tracking-widest text-white/70">Gateway to your augmented self</p></FadeUp>
    <FadeUp delay={0.12}><h1 className="font-mono text-5xl font-bold leading-[1.05] md:text-6xl">A window<br/>of coming<br/>enhancements</h1></FadeUp>
    <FadeUp delay={0.24}><p className="mt-4 max-w-sm font-mono text-xs leading-relaxed text-white/75">
      A future where carbon fiber, titanium, and human instinct align. Not machine. Not human. Something wonderfully poised between.
    </p></FadeUp>
    <FadeUp delay={0.36}><button className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black">Reserve Now</button></FadeUp>
  </div>

  {/* RING STATS right edge */}
  <div className="absolute right-8 top-1/4 z-10 flex flex-col gap-16 text-right text-[#FBEFE6]">
    {stats.map((s, i) => <FadeUp key={s.label} delay={0.2 + i * 0.15}><RingStat {...s} /></FadeUp>)}
  </div>
</section>
```

## Stats + nav data (example, from the preview)
```ts
const stats = [
  { value: "10+", label: "Years Real" },
  { value: "40+", label: "Use Forms" },
  { value: "95%", label: "Repeat Members" },
];
const nav = ["Module","Case Records","Biotech","Tiers","Live Demo"];
```

## Motion & acceptance
- Full-bleed hot-orange radial background with a cut-out portrait in a black bodysuit showing glowing circuit lines along the arms.
- Floating dark pill-nav centered at top (logo, 5 links, bordered "Connect").
- Bottom-left monospace block: small "Gateway to your augmented self" eyebrow, big 3-line headline "A window / of coming / enhancements", monospace body, and a white "Reserve Now" pill.
- Right side: three ring-stats (10+ Years Real, 40+ Use Forms, 95% Repeat Members) sitting on faint concentric ring arcs that suggest an orbit.
- Eyebrow→headline→body→CTA stagger-fade-up; stats fade in top→bottom; rings can slowly rotate (`animate rotate:[0,360]`, ~120s).
- Reduced-motion: stop ring rotation, opacity-only fades. On mobile the ring-stats move below the headline as a small inline row.
