# Scroll Marquee — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Marquee · carousel.

Build a dark **`ScrollMarquee`** showcase: two horizontal rows of website-preview cards that
auto-scroll in opposite directions across a near-black stage. Each card is a rounded screenshot
of a landing page (skies, coding hero, cityscape, agency, crypto, SaaS dashboard) — an infinite
marquee gallery used as a portfolio / "made with us" band.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0B0B0C` with no glow — the colourful cards carry the contrast.
- Cards: `rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl`, fixed aspect ratio
  (`aspect-[16/10]`), width ~`w-[320px]` desktop, scaled down on mobile.
- Font Inter. The section is `overflow-hidden` so off-stage cards are clipped at the edges.
- Two rows: top row drifts left→right slowly, bottom row right→left, slightly offset.

## Helpers
- `Marquee` — duplicates its children once and animates the track with framer-motion:
  `animate={{x: dir==="left" ? ["0%","-50%"] : ["-50%","0%"]}}`,
  `transition={{duration:40, repeat:Infinity, ease:"linear"}}`; pauses on hover via `whileHover`.
- `PreviewCard` — image + optional tiny title overlay; subtle `whileHover={{scale:1.03}}`.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#0B0B0C] py-16">
  <div className="flex flex-col gap-6">
    {/* row 1 — drifts left */}
    <Marquee dir="left" className="flex w-max gap-6">
      {[...rowTop, ...rowTop].map((c, i) => (
        <PreviewCard key={`t-${i}`} {...c} />
      ))}
    </Marquee>

    {/* row 2 — drifts right, slightly larger cards */}
    <Marquee dir="right" className="flex w-max gap-6">
      {[...rowBottom, ...rowBottom].map((c, i) => (
        <PreviewCard key={`b-${i}`} {...c} />
      ))}
    </Marquee>
  </div>
</section>

function PreviewCard({ img, title }: { img: string; title?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="relative aspect-[16/10] w-[320px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-2xl"
    >
      <img src={img} alt="" className="h-full w-full object-cover" />
      {title && (
        <span className="absolute bottom-3 left-3 text-xs font-semibold text-white/90 drop-shadow">
          {title}
        </span>
      )}
    </motion.div>
  );
}
```

## Cards data (example, from the preview)
```ts
const rowTop = [
  { img: "/assets/prev/venture-sky.jpg",  title: "Venture Past Our Sky" },
  { img: "/assets/prev/coding-career.jpg", title: "Launch Your Coding Career" },
  { img: "/assets/prev/city-vision.jpg",   title: "Shaping Tomorrow With Vision" },
  { img: "/assets/prev/smarter-saas.jpg",  title: "Work Smarter. Move Faster." },
];

const rowBottom = [
  { img: "/assets/prev/agency-brand.jpg",  title: "Building Brands That Resonate" },
  { img: "/assets/prev/own-the-future.jpg", title: "Own The Future Of Your Assets" },
  { img: "/assets/prev/automation.jpg",    title: "The Future Of Smarter Automation" },
  { img: "/assets/prev/aurora.jpg",        title: "Across The Universe" },
];
```

## Motion & acceptance
- Two infinite linear marquees scrolling in opposite directions (top→left, bottom→right), seamless loop via duplicated track + 0%↔-50% translate.
- Hover pauses the row and lifts the hovered card (`scale 1.03`); cards keep their rounded screenshot look with a thin white ring + drop shadow.
- Cards are clipped at the left/right stage edges (`overflow-hidden`), giving the "continuous reel" feel.
- Respect `prefers-reduced-motion`: freeze both tracks (no auto-scroll), keep cards as a static, horizontally scrollable strip.
- Acceptance checklist:
  - Near-black background; ~4 colourful rounded landing-page screenshots per row, two rows.
  - Top row and bottom row move in opposite directions at a slow, even pace.
  - Each card 16:10, rounded, thin white ring, shadow; partial cards bleed off both edges.
  - Optional small title labels readable on the imagery; reduced-motion safe.
