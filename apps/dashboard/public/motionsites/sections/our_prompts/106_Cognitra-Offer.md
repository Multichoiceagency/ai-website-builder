# Cognitra Offer — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Cards · features.

Build a calm, light **`CognitraOffer`** services section: a large left-aligned "EXPLORE WHAT WE
OFFER" headline with a short intro on the right, followed by three soft off-white feature cards,
each carrying a glossy embossed metallic/glass 3D icon and a small title + paragraph.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Light theme. Page background a very soft warm grey `#E9E8E6`; cards a hair lighter `#EFEEEC` with hairline borders `border-black/5`.
- KEY COLORS seen: near-black ink text `#1A1A1A`, muted grey body `#6B6B6B`, warm cream/gold glints on the embossed icons (`#D8C9A4` → `#FBF6E9`).
- Font: a clean sans (Inter/Geist). Headline is large and tight; eyebrow + body small.
- Max content width `max-w-[1200px]` centered, generous padding `px-8 py-20`.

## Helpers
- `FadeUp` — framer-motion wrapper, `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.7, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `EmbossIcon` — renders an SVG line glyph styled as a glossy embossed relief: white SVG stroke
  with a soft `drop-shadow` + a warm gold inner glow (`filter` + `text-[#E9D9AE]`). Three glyphs:
  partial broken circle, triangle/delta, nested square+diamond.

## Structure
```tsx
<section className="mx-auto max-w-[1200px] px-8 py-20 text-[#1A1A1A]">
  {/* tiny pager label */}
  <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-black/40">003 / 006</p>

  {/* heading row: big title left, intro right */}
  <div className="mb-14 grid items-start gap-10 md:grid-cols-2">
    <FadeUp>
      <h2 className="text-5xl font-medium uppercase leading-[1.05] tracking-tight md:text-6xl">
        Explore<br/>what we<br/>offer
      </h2>
    </FadeUp>
    <FadeUp delay={0.1}>
      <p className="max-w-sm pt-2 text-sm leading-relaxed text-black/55">
        We provide all-in-one AI automation services in one place.
      </p>
    </FadeUp>
  </div>

  {/* three feature cards */}
  <div className="grid gap-6 md:grid-cols-3">
    {offers.map((o, i) => (
      <FadeUp key={o.title} delay={0.1 + i * 0.1}>
        <article className="flex h-full flex-col rounded-2xl border border-black/[0.06] bg-[#EFEEEC] p-7">
          {/* embossed icon panel */}
          <div className="mb-10 flex h-40 items-center justify-center">
            <EmbossIcon name={o.icon} />
          </div>
          <h3 className="text-lg font-medium text-[#1A1A1A]">{o.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-black/55">{o.body}</p>
        </article>
      </FadeUp>
    ))}
  </div>

  {/* tiny footer hint (scroll + repost) */}
  <div className="mt-14 flex items-center justify-between text-[11px] uppercase tracking-widest text-black/35">
    <span>🖱</span>
    <span>↗ Repost</span>
  </div>
</section>
```

## Offer data (example, from the preview)
```ts
const offers = [
  { icon: "ring",     title: "Process Streamlining",
    body: "We automate your processes by linking together the daily tools you rely upon. Lifting throughput and improving overall output." },
  { icon: "delta",    title: "Strategic advisory",
    body: "We craft intelligent assistants that are adaptive, grasp context, and are skilled enough to handle highly intricate customer requests." },
  { icon: "lattice",  title: "Assistant engineering",
    body: "Through our knowledge, we explore deep into your business and advise you on how AI powered automations may transform your operations." },
];
```

## EmbossIcon sketch
```tsx
function EmbossIcon({ name }: { name: string }) {
  const paths: Record<string, JSX.Element> = {
    ring:    <path d="M20 50 A30 30 0 1 1 75 65" />,
    delta:   <path d="M50 20 L78 70 H22 Z" />,
    lattice: <g><rect x="28" y="28" width="34" height="34" /><rect x="44" y="44" width="34" height="34" transform="rotate(45 61 61)" /></g>,
  };
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 fill-none stroke-[6] text-[#EFE6CC]
      [stroke-linecap:round] [stroke-linejoin:round]
      drop-shadow-[0_8px_18px_rgba(180,150,90,0.35)]">
      {paths[name]}
    </svg>
  );
}
```

## Motion & acceptance
- Heading, intro and the three cards fade-up with stagger (delays ~0 / .1 / .2 / .3); `whileInView` `once`.
- Optional: icon glints have a slow shimmer (`animate` on a gradient mask, ~6s loop) — purely decorative.
- Acceptance checklist:
  - Light warm-grey background with a hair-lighter card surface and hairline borders.
  - Tiny "003 / 006" pager label top-left.
  - Big uppercase 3-line headline "EXPLORE / WHAT WE / OFFER" left, short intro right.
  - Three equal cards, each with a centered embossed glossy line-icon (broken ring, delta, nested square+diamond), then title + grey paragraph.
  - Readable copy exactly as in the preview (Process Streamlining / Strategic advisory / Assistant engineering).
  - Subtle bottom row with a mouse glyph and "↗ Repost".
  - Responsive 1→3 columns; respects `prefers-reduced-motion` (drop shimmer + slide, keep opacity).
```
