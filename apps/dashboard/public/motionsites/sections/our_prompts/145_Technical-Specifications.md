# Technical Specifications — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Tabs · features.

Build a dark aerospace-data **`TechnicalSpecifications`** section: a two-column heading/intro,
a row of underline tabs (Fuels & Upstream active), and a glass "operating envelope" panel
containing labeled horizontal bar gauges with right-aligned percentage values and a 0–100 axis.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = deep navy-black `#0A0D14` with a faint top-down gradient.
- Key colors from the image: white headings `#F3F5F8`, muted slate body `#8B93A1`,
  a soft blue→cyan gauge gradient `#3B82F6→#7DD3FC` with tiny sparkle glints, dark track
  `#161A22`, active-tab accent underline `#5B8DEF`, glass panel `bg-white/[0.03] border-white/10`.
- Typeface: Inter; small uppercase mono-ish labels (`tracking-widest`) for tab/section captions.
- Max content width `max-w-6xl`.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:20}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.7, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Tabs` — controlled tab strip; active tab gets a blue underline that slides via `layoutId`.
- `Gauge` — animated horizontal bar that grows its width from 0 → `value%` (`whileInView`).

## Structure
```tsx
<section className="relative overflow-hidden bg-[#0A0D14] px-6 py-16 text-white md:py-20">
  <div className="mx-auto max-w-6xl">

    {/* two-column heading + intro */}
    <FadeUp>
      <div className="grid gap-6 md:grid-cols-2">
        <h2 className="text-2xl font-medium leading-snug tracking-tight md:text-3xl">
          Unmatched propulsion data across every flight-critical layer.
        </h2>
        <p className="self-end text-sm leading-relaxed text-slate-400">
          Fuel-path analysis links propellant availability, storage constraints, and injector
          behavior before a program commits to flight architecture.
        </p>
      </div>
    </FadeUp>

    {/* underline tabs */}
    <FadeUp delay={0.1}>
      <Tabs tabs={tabs} className="mt-10 border-b border-white/10" />
    </FadeUp>

    {/* glass operating-envelope panel */}
    <FadeUp delay={0.2}>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm md:p-8">
        <div className="mb-6 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          <span>Fuels & Upstream</span><span>Operating Envelope</span>
        </div>

        <div className="flex flex-col gap-6">
          {metrics.map((m, i) => (
            <div key={m.label} className="grid grid-cols-[200px_1fr_48px] items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-[11px] text-slate-500">{m.sub}</p>
              </div>
              <Gauge value={m.value} delay={i*0.1} />
              <span className="text-right text-sm font-semibold text-white">{m.value}%</span>
            </div>
          ))}
        </div>

        {/* 0–100 axis */}
        <div className="mt-4 flex justify-between pl-[216px] text-[10px] text-slate-600">
          {[0,10,20,30,40,50,60,70,80,90,100].map(t => <span key={t}>{t}</span>)}
        </div>
      </div>
    </FadeUp>
  </div>
</section>
```

## Gauge helper
```tsx
function Gauge({ value, delay }: { value:number; delay:number }) {
  return (
    <div className="h-7 w-full overflow-hidden rounded-md bg-[#161A22]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay, ease: [0.22,1,0.36,1] }}
        className="h-full rounded-md bg-gradient-to-r from-blue-600 to-cyan-300 shadow-[0_0_20px_-4px_rgba(59,130,246,0.7)]"
      />
    </div>
  );
}
```

## Tabs & metrics data (from the preview)
```ts
const tabs = ["Cities & Infrastructure", "Materials & Manufacturing", "Fuels & Upstream", "H₂ Hydrogen"];
// active = "Fuels & Upstream"

const metrics = [
  { label:"Methane supply compatibility", sub:"regional availability",  value:78 },
  { label:"Kerosene retrofit readiness",  sub:"legacy platforms",        value:64 },
  { label:"Cryogenic storage stability",  sub:"validated envelopes",     value:88 },
  { label:"Injector response confidence", sub:"hot-fire data",           value:92 },
];
```

## Motion & acceptance
- Heading + intro fade up; tabs and panel follow (delays 0 / .1 / .2).
- Each `Gauge` bar animates its width from 0 → value% on scroll, staggered by row; gradient bars have a soft blue glow + faint sparkle glints.
- Active tab underline slides via `layoutId="tabUnderline"` when a tab is clicked (panel content can swap per tab).
- Respect `prefers-reduced-motion`: bars appear at full width instantly, no underline slide.
- Acceptance checklist:
  - Dark navy section; two-column heading (left bold statement, right muted intro paragraph).
  - Tab strip with 4 labels on a bottom border; "Fuels & Upstream" active with blue underline; cursor hint near "H₂ Hydrogen".
  - Glass panel labeled "FUELS & UPSTREAM" / "OPERATING ENVELOPE".
  - Four labeled rows (label + sub) each with a blue→cyan horizontal gauge and a right-aligned % (78 / 64 / 88 / 92).
  - 0–100 numeric axis beneath the bars, aligned to the gauge column. Responsive: grid collapses on mobile.
