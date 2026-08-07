# Media Card Carousel — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Slider · carousel.

Build a light, editorial **`MediaCardCarousel`** section: a large left-aligned headline + intro on
a white background, then a horizontally scrolling row of wide image cards (rocket/spacecraft
photography) each with a title, one-line description and a small meta caption, plus a thin progress
track and a "05 / 05" counter beneath.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background pure white `#FFFFFF`; image cards `rounded-md` with a subtle steel-grey
  fallback `#9AA3AE` (photo `object-cover`).
- KEY COLORS: ink `#1B1C1E`, muted grey body `#7B7E84`, faint meta grey `#A4A7AD`, track grey
  `#E4E5E7` with a dark fill `#1B1C1E`.
- Font: clean grotesk (Inter/General Sans); headline large and tight.
- Content `max-w-[1280px]`; cards overflow the right edge to hint more (`overflow-x-auto` + snap).

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, `whileInView`, `once`).
- `useCarousel` — tracks `index`, scrolls the track on prev/next or drag, updates the progress bar
  and the "NN / NN" counter.
- `MediaCard` — fixed-width card (`w-[360px] shrink-0 snap-start`) with image + caption block.

## Structure
```tsx
<section className="bg-white py-20 text-[#1B1C1E]">
  <div className="mx-auto max-w-[1280px] px-8">
    {/* heading */}
    <FadeUp>
      <h2 className="max-w-2xl text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl">
        Program stories from the people building flight-ready power.
      </h2>
    </FadeUp>
    <FadeUp delay={0.1}>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#7B7E84]">
        Short field notes from integration leads, test engineers, and manufacturing teams moving
        advanced propulsion systems from requirement reviews to repeatable flight hardware.
      </p>
    </FadeUp>
  </div>

  {/* scrolling card track */}
  <div ref={trackRef} className="mt-10 flex gap-5 overflow-x-auto px-8 pb-2 [scrollbar-width:none] snap-x">
    {slides.map((s, i) => (
      <article key={s.title} className="w-[360px] shrink-0 snap-start">
        <div className="aspect-[16/11] overflow-hidden rounded-md bg-[#9AA3AE]">
          <img src={s.image} alt="" className="h-full w-full object-cover" />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold">{s.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[#7B7E84]">{s.desc}</p>
        <p className="mt-2 text-[12px] text-[#A4A7AD]">{s.meta}</p>
      </article>
    ))}
  </div>

  {/* progress track + counter */}
  <div className="mx-auto mt-8 flex max-w-[1280px] items-center gap-6 px-8">
    <div className="h-[2px] flex-1 bg-[#E4E5E7]">
      <motion.div className="h-full bg-[#1B1C1E]" style={{ width: progress }} />
    </div>
    <span className="text-sm tabular-nums text-[#1B1C1E]">{String(index+1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</span>
  </div>
</section>
```

## Slides data (example, from the preview)
```ts
const slides = [
  { title: "Launch Cadence",      desc: "How tighter integration windows shorten the path to a stable flight profile.",
    meta: "Vehicle ops · 06:20", image: "/media/launch.jpg" },
  { title: "Manufacturing Floor", desc: "Why sub-micron inspection changes the way aerospace teams plan reliability.",
    meta: "Precision build · 05:10", image: "/media/manufacturing.jpg" },
  { title: "Hydrogen Pathway",    desc: "Designing feed systems and ignition envelopes for hydrogen-ready propulsion.",
    meta: "H2 systems · 04:55", image: "/media/hydrogen.jpg" },
  { title: "Test Stand Notes",    desc: "What repeatable hot-fire campaigns reveal about long-duration burns.",
    meta: "Propulsion · 07:02", image: "/media/teststand.jpg" },
  { title: "Avionics Loop",       desc: "Closing the loop between telemetry, guidance and ground control software.",
    meta: "Avionics · 05:48", image: "/media/avionics.jpg" },
];
```

## Motion & acceptance
- Heading + intro fade-up on enter; cards scroll horizontally with snap + drag; progress bar fill
  and "NN / NN" counter track the active card.
- Cards lift slightly on hover (`whileHover y:-4`); arrow/drag advances `index`.
- Acceptance checklist:
  - White background, large left-aligned headline "Program stories from the people building flight-ready power."
  - Grey intro paragraph beneath it.
  - Horizontal row of wide image cards (16:11) bleeding off the right edge to signal more.
  - Each card: photo, bold title (e.g. "Manufacturing Floor", "Hydrogen Pathway"), grey one-liner, and a faint meta caption ("Precision build · 05:10").
  - Thin grey progress track with a dark fill + "05 / 05" counter below.
  - Responsive: cards keep fixed width and scroll; `prefers-reduced-motion` keeps native scroll, drops slide/lift.
```
