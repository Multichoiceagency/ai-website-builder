# Nimbus Grid — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a dark **`NimbusGridTiers`** section (a pricing-table tail + a three-column plan-tier grid): a near-black
canvas where a comparison feature row ("Customer-managed key vault … included") sits up top, three minimal plan
columns (Starter / Team / Enterprise) each with a short blurb and a pill CTA, and a soft blurred bar-chart skyline
glowing along the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0C0C0A` with a faint warm tan glow toward the bottom.
- Key colors seen: black `#0C0C0A`, heading near-white `#ECEAE4`, body muted grey `#9C998F`, hairline divider
  `#FFFFFF1A`, blurred gold/tan bar-chart `#B79A6A`/`#8A7548`, pill CTA outline `#FFFFFF33`.
- Font Inter; column titles `text-lg`, blurbs `text-[13px] leading-relaxed`, CTA labels uppercase `tracking-[0.15em]`.
- Max content width `max-w-6xl`; section `py-16` with a tall lower zone for the chart glow.

## Helpers
- `FadeUp` (framer-motion) for the columns.
- `PillBtn` — outlined rounded-full ghost button: `border border-white/20 rounded-full px-5 py-2 text-[11px]
  uppercase tracking-[0.15em] text-white/90 hover:bg-white/5`.
- `ChartGlow` — decorative blurred bar skyline at the bottom: a row of tan bars with `blur-[2px]` and a
  `mask-image` fade so it dissolves upward.

## Structure
```tsx
<section className="relative isolate overflow-hidden bg-[#0C0C0A] py-16 text-white">
  {/* top comparison feature row (tail of a pricing table) */}
  <div className="relative z-10 mx-auto max-w-5xl px-6">
    <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm">
      <span className="text-white/50">Customer-managed key vault</span>
      <span className="text-white/90">included</span>
    </div>
  </div>

  {/* three plan-tier columns */}
  <div className="relative z-10 mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-10 px-6 md:grid-cols-3">
    {tiers.map((t, i) => (
      <FadeUp key={t.name} delay={i * 0.1}>
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium text-[#ECEAE4]">{t.name}</h3>
          <p className="max-w-[230px] text-[13px] leading-relaxed text-white/55">{t.desc}</p>
          <PillBtn>{t.cta}</PillBtn>
        </div>
      </FadeUp>
    ))}
  </div>

  {/* blurred bar-chart skyline glow */}
  <ChartGlow className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-64" bars={chartBars} />
</section>
```

## Tiers + chart data (example, from the preview)
```ts
const tiers = [
  { name: "Starter",    desc: "For small teams consolidating shared project files.",                  cta: "Start Small" },
  { name: "Team",       desc: "For departments scaling collaboration and regional transfer.",         cta: "Build Team Plan" },
  { name: "Enterprise", desc: "For organizations prioritizing governance, residency, and support.",    cta: "Talk to Sales" },
];

// decorative skyline heights (%) — irregular like a usage chart
const chartBars = [40, 24, 30, 18, 52, 34, 28, 70, 58, 64, 78, 50, 88, 72];
```

## Motion & acceptance
- Columns fade-up with stagger (0/.1/.2); pill CTAs get a subtle `whileHover` background tint.
- The bottom bar-chart skyline glows softly (low-opacity tan) and is decorative only (masked fade upward).
- Acceptance checklist:
  - [ ] Near-black `#0C0C0A` canvas; warm tan glow rising from the bottom.
  - [ ] Top comparison feature row ("Customer-managed key vault … included") on a hairline divider.
  - [ ] Three minimal plan columns: Starter / Team / Enterprise, each title + muted blurb + outlined pill CTA.
  - [ ] CTA labels uppercase tracked ("START SMALL", "BUILD TEAM PLAN", "TALK TO SALES").
  - [ ] Blurred gold bar-chart skyline along the bottom edge, decorative and faded.
  - [ ] `prefers-reduced-motion`: no fade-up motion, static layout; chart remains static.
