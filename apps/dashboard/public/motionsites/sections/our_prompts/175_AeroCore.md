# AeroCore — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Aerospace/propulsion hero ("EngineTech") with a full-bleed close-up of jet engine nozzles, a floating white rounded nav bar, a bottom-left headline + stat list, and the first line of the next section peeking below.

Build a high-tech **`AeroCoreHero`** section: a full-bleed photographic close-up of metallic
engine nozzles, a floating white rounded navbar, a bottom-left numbered eyebrow + serif/sans
headline + sub + an indexed stat list on the right, and a partial next-section heading at the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Theme: dark imagery up top, white panel below. Hero media = `/assets/engine-nozzles.jpg`
  `object-cover`; metallic greys with a green-foliage backdrop bottom-right.
- Overlay a left/bottom dark gradient (`from-black/55 via-black/10 to-transparent`) for headline legibility.
- Typeface: clean grotesque (Inter/Geist). Headline large white `font-medium tracking-tight`;
  eyebrow numerals + stat indices tiny mono-ish (`tabular-nums`).
- Navbar: white `bg-white rounded-full shadow` floating with `px` padding; dark CTA pill `bg-[#111] text-white`.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for nav, headline, sub, stat rows.
- `StatRow` — `{ index, label }` → right-aligned label + small index, with the last/active row brightened.
- `Pill` / `NavLink` — small nav item helpers.

## Structure
```tsx
<section className="relative w-full">
  {/* HERO viewport */}
  <div className="relative min-h-[88vh] w-full overflow-hidden text-white">
    <img src="/assets/engine-nozzles.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/15 to-transparent" />

    {/* floating white navbar */}
    <header className="relative z-20 mx-auto mt-5 flex max-w-[1240px] items-center justify-between rounded-full bg-white px-5 py-2.5 text-sm text-[#1A1A1A] shadow-lg">
      <span className="flex items-center gap-2 font-semibold">◍ EngineTech</span>
      <nav className="hidden gap-7 text-[#444] md:flex">
        {["Company","Technology","Solutions","Our Edge","Our Team","Investors","News"].map(l =>
          <a key={l} className="hover:text-black">{l}</a>)}
      </nav>
      <button className="rounded-full bg-[#111] px-4 py-2 text-white">Get In Touch</button>
    </header>

    {/* bottom-left headline block */}
    <div className="absolute bottom-[10%] left-8 z-10 max-w-xl">
      <FadeUp><p className="text-[11px] tracking-[0.2em] text-white/70">04</p></FadeUp>
      <FadeUp delay={0.1}>
        <h1 className="mt-2 text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
          Flight-Proven<br />Propulsion
        </h1>
      </FadeUp>
      <FadeUp delay={0.2}>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
          Our engines have powered missions across low-Earth orbit, polar orbit, and deep-space
          trajectories — delivering zero in-flight anomalies across 47 consecutive launches.
        </p>
      </FadeUp>
    </div>

    {/* bottom-right indexed stat list */}
    <div className="absolute bottom-[12%] right-8 z-10 flex flex-col items-end gap-2 text-sm">
      {stats.map((s, i) => (
        <FadeUp key={s.label} delay={0.15 + i * 0.07}><StatRow {...s} active={i === stats.length-1} /></FadeUp>
      ))}
    </div>
  </div>

  {/* next-section heading peeking below */}
  <div className="flex items-start justify-between gap-6 bg-white px-8 py-8">
    <h2 className="max-w-2xl text-2xl font-medium leading-snug text-[#1A1A1A] sm:text-3xl">
      Propulsion programs need a partner that can move from concept to certified hardware.
    </h2>
    <button className="shrink-0 rounded-full border border-black/15 px-5 py-2.5 text-sm">Start a Program ↗</button>
  </div>
</section>
```

## Stats & nav data (example, from the preview)
```ts
const nav = ["Company","Technology","Solutions","Our Edge","Our Team","Investors","News"];
const stats = [
  { index: "01", label: "Precision Manufacturing" },
  { index: "02", label: "Advanced Materials" },
  { index: "03", label: "Thermal Testing" },
  { index: "04", label: "Mission Certified" },
];
```

## Motion & acceptance
- Nav, headline, sub, and stat rows fade-up with stagger; the last stat row ("04 Mission Certified")
  is brightened/active.
- Optional very slow `scale:[1,1.05,1]` Ken-Burns on the engine photo (~30s).
- Full-bleed engine-nozzle close-up with a dark corner gradient; white floating pill navbar with
  brand, 7 links and a dark "Get In Touch" CTA.
- Bottom-left "04" eyebrow + "Flight-Proven Propulsion" headline + descriptive sub; bottom-right
  indexed stat list (Precision Manufacturing → Mission Certified).
- White panel below shows the next section's heading + "Start a Program ↗" outline button peeking in.
- Respect `prefers-reduced-motion` (no Ken-Burns, opacity-only). Responsive: nav links hide on
  mobile, stats stack, headline scales down.
```
