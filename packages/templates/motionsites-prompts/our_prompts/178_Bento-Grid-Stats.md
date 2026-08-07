# Bento Grid Stats — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Bento · features.

Build a **`BentoGridStats`** "why us" section: a dark charcoal stage with a heading block
("why us? / Seamless Brand, Identity, and Web") and an asymmetric bento grid mixing light and
dark tiles — a big stat (32M+), a centered "5x" ring-diagram card, a description card, a team
photo card with rating, an animated pixel line-chart, and dotted-square accent tiles (200+, 100+).

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Theme = dark charcoal stage `#1B1B1D`; tiles are a mix of **off-white `#F4F3EF`** (with ink text)
  and **dark `#202022`** (with white text) for a bento contrast.
- Accent marks: tiny black/white squares forming dotted patterns + a pixelated line chart; a single
  amber/orange micro-icon in the ring diagram.
- Font Inter; big numbers in a heavy weight, labels in muted small caps. Rounded tiles `rounded-2xl`, gap-4.
- Heading uses a two-tone treatment: "Seamless" solid, "Brand, Identity, and Web" dimmed.

## Helpers
- `FadeUp` (framer-motion, opacity+y) with per-tile stagger.
- `Bento` — wrapper applying `grid` with explicit `col-span`/`row-span` per tile.
- `CountUp` — animates a number from 0 → target when in view (for 32M+, 200+, 100+, 5x).
- `PixelChart` — a rising staircase of small squares (SVG/divs) animating in left→right.

## Structure
```tsx
<section className="bg-[#1B1B1D] px-6 py-20 text-white">
  <div className="mx-auto max-w-6xl">
    {/* heading */}
    <FadeUp>
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">why us?</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
        Seamless<br /><span className="text-white/40">Brand, Identity,<br />and Web</span>
      </h2>
    </FadeUp>

    {/* bento grid */}
    <Bento className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:auto-rows-[180px]">
      {/* 32M+ income — light tall tile */}
      <article className="row-span-2 flex flex-col justify-between rounded-2xl bg-[#F4F3EF] p-5 text-zinc-900">
        <div className="self-end rounded-md border border-zinc-300 p-1 text-xs">＋</div>
        <div>
          <div className="text-3xl font-bold"><CountUp to={32} suffix="M +" /></div>
          <p className="mt-1 text-xs text-zinc-500">Income produced for our customers.</p>
        </div>
        <PixelChart years={["2016","2018","2022","2024","2026"]} />
      </article>

      {/* 5x ring diagram — light tile */}
      <article className="col-span-1 rounded-2xl bg-[#F4F3EF] p-5 text-zinc-900 md:col-span-1">
        <RingDiagram /> {/* concentric circle with 4 small square nodes + amber bolt */}
        <div className="mt-2 text-center text-3xl font-bold">5x</div>
        <p className="text-center text-xs text-zinc-500">Quicker than competing firms.</p>
      </article>

      {/* description — dark tile spanning two */}
      <article className="rounded-2xl bg-[#202022] p-5 text-sm leading-relaxed text-white/70 md:col-span-2">
        <p>We partner with ambitious brands to craft unified digital identities that merge strategy,
          design, and code into one seamless experience.</p>
        <p className="mt-4">We accelerate the journey from concept to launch, eliminating the friction
          of scattered teams and misaligned visions.</p>
      </article>

      {/* team photo + rating */}
      <article className="relative col-span-2 overflow-hidden rounded-2xl md:col-span-1 md:row-span-1">
        <img src="/assets/team-meeting.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute right-3 top-3 rounded bg-black/50 px-2 py-1 text-xs text-white">4.9 / 5 ★★★★★</span>
        <div className="absolute bottom-3 left-3 text-white"><div className="text-2xl font-bold"><CountUp to={100} suffix=" +" /></div><p className="text-xs">Joyful clients and growing.</p></div>
      </article>

      {/* 200+ projects — dark tile with dotted squares */}
      <article className="rounded-2xl bg-[#202022] p-5 text-white md:col-span-1">
        <DottedSquares />
        <div className="mt-4 text-3xl font-bold"><CountUp to={200} suffix=" +" /></div>
        <p className="mt-1 text-xs text-white/55">Delivering projects globally, assisting our clients in reaching their objectives.</p>
      </article>
    </Bento>
  </div>
</section>
```

## Stats data (example, from the preview)
```ts
const stats = [
  { value: 32,  suffix: "M +", label: "Income produced for our customers." },
  { value: "5x", label: "Quicker than competing firms." },
  { value: 100, suffix: " +", label: "Joyful clients and growing." },
  { value: 200, suffix: " +", label: "Delivering projects globally, assisting our clients in reaching their objectives." },
];
const heading = { eyebrow: "why us?", title: ["Seamless", "Brand, Identity, and Web"] };
```

## Motion & acceptance
- Tiles `FadeUp` with a small per-index stagger; numbers `CountUp` from 0 when the tile enters view.
- Pixel line-chart squares animate in left→right; ring-diagram nodes pop in; dotted-square accents stagger.
- Tiles lift slightly on hover (`whileHover y:-3`); light/dark alternation preserved exactly as shown.
- Respect `prefers-reduced-motion`: render final numbers/charts statically, fades only.
- Acceptance checklist:
  - Dark charcoal stage; heading "why us? / Seamless / Brand, Identity, and Web" (second part dimmed).
  - Asymmetric bento: tall light 32M+ tile with pixel line-chart + year axis, light "5x" ring-diagram card, dark description card (2 paragraphs), team-photo card with "4.9 / 5" + "100 +", dark "200 +" tile with dotted-square accent.
  - Mix of off-white (ink text) and dark (white text) tiles, rounded, even gaps.
  - CountUp numbers + animated chart; reduced-motion safe.
