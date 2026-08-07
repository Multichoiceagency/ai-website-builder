# FlowMate Carousal — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Carousal · carousel.
> Light card carousel ("FlowMate") with a title + prev/next arrows top-right and three tall artwork cards (surreal sky doorway / painterly abstract / impressionist lamppost) each with a top-left category label and a bottom caption.

Build a horizontal **`FlowMateCarousel`** section: a soft grey panel with a heading + circular
prev/next controls, then a scroll-snapping row of tall rounded image cards, each overlaying a
top-left category label and a bottom white caption.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = light grey `#E8E8E8`. Cards = `rounded-2xl overflow-hidden` artwork
  images with a bottom-up dark gradient (`from-black/60 to-transparent`) for white text.
- Typeface: clean sans (Inter). Heading dark `font-semibold`; category labels tiny white;
  captions white `text-sm/snug`.
- Arrow controls = round outline buttons `border border-black/15 rounded-full` with chevrons.
- Tall card aspect ~`aspect-[3/4]`.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for heading + controls.
- `Carousel` — scroll-snap flex track (`overflow-x-auto snap-x`); prev/next buttons scroll by one
  card width; supports drag (`framer-motion` `drag="x"` with constraints) on touch.
- `SlideCard` — `{ category, caption, image }` → image card with top-left label + bottom caption.

## Structure
```tsx
<section className="w-full bg-[#E8E8E8] px-6 py-14">
  <div className="mx-auto max-w-[1180px]">
    {/* header row */}
    <div className="mb-7 flex items-center justify-between">
      <FadeUp><h2 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">FlowMate</h2></FadeUp>
      <FadeUp delay={0.1}>
        <div className="flex gap-2">
          <button aria-label="Previous" className="grid h-10 w-10 place-items-center rounded-full border border-black/15 text-[#333] hover:bg-black/5">‹</button>
          <button aria-label="Next"     className="grid h-10 w-10 place-items-center rounded-full border border-black/15 text-[#333] hover:bg-black/5">›</button>
        </div>
      </FadeUp>
    </div>

    {/* carousel track */}
    <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none]">
      {slides.map((s, i) => (
        <FadeUp key={s.caption} delay={0.15 + i * 0.08} className="snap-start shrink-0 basis-[340px]">
          <SlideCard {...s} />
        </FadeUp>
      ))}
    </div>
  </div>
</section>

function SlideCard({ category, caption, image }: any) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl text-white">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      <p className="absolute left-4 top-4 z-10 text-[11px] font-medium text-white/90">{category}</p>
      <p className="absolute bottom-5 left-5 right-5 z-10 text-base font-medium leading-snug">{caption}</p>
    </div>
  );
}
```

## Slides data (example, from the preview)
```ts
const slides = [
  { category: "For Teams",       caption: "Smart helper supporting each teammate daily",
    image: "/assets/flowmate/sky-doorway.jpg" },
  { category: "For Enterprises", caption: "Elevate your whole organization using business AI",
    image: "/assets/flowmate/abstract-paint.jpg" },
  { category: "Platform",        caption: "Enhanced with FlowMate",
    image: "/assets/flowmate/lamppost.jpg" },
];
```

## Motion & acceptance
- Heading + arrow controls fade-up; cards stagger in; prev/next buttons scroll the snap-track by one
  card (smooth behavior); drag-to-scroll on touch.
- Cards lift slightly on hover (`whileHover y:-4`) with a subtle shadow.
- Light grey panel; "FlowMate" heading left, round outline ‹ › controls top-right.
- Three tall rounded artwork cards (surreal cloud doorway / painterly abstract / impressionist
  lamppost) each with a top-left category label (For Teams / For Enterprises / Platform) and a
  bottom white caption matching the preview.
- Respect `prefers-reduced-motion` (no hover lift, instant scroll, opacity-only). Responsive:
  cards keep `basis-[340px]` and scroll horizontally; controls remain top-right.
```
