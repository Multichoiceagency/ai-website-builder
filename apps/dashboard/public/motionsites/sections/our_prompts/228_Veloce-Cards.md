# Veloce Cards — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Cards · features.

Build a light, airy **`VeloceCards`** stats section: a top-left two-line heading with a small
sub-line, then three soft pastel "frosted glass" stat cards (with translucent overlapping-circle
artwork) each showing a big number and a short supporting line — the middle card lifted/offset.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = very light grey `#EDEDEE` (almost white).
- Key colors from the image: near-black heading + numbers `#101014`, muted grey body `#7C7C82`,
  pastel card artwork = translucent overlapping circles in lilac/blue/pink/peach
  (`#C7C2F0`, `#BFD4F2`, `#F2C9DC`, `#F7D9C4`). Cards are soft rounded with faint border.
- Typeface: Inter; big numbers `font-semibold`, heading medium with tight tracking.
- Max content width `max-w-6xl`, 3-column grid on md+.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.7, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `CountUp` — animates a number from 0 → target on view (for "1.6M" / "850K" / "120+").
- `Blobs` — translucent overlapping circles rendered behind/inside the card as decoration.

## Structure
```tsx
<section className="relative bg-[#EDEDEE] px-6 py-16 md:py-24">
  <div className="mx-auto max-w-6xl">

    {/* heading */}
    <FadeUp>
      <h2 className="max-w-md text-3xl font-medium leading-tight tracking-tight text-[#101014] md:text-4xl">
        Instant payment clarity counts
      </h2>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#7C7C82]">
        Real-time data powers smarter spending choices every day
      </p>
    </FadeUp>

    {/* three stat cards */}
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {stats.map((s, i) => (
        <FadeUp key={s.value} delay={i*0.12}>
          <div className={cn(
            "relative h-64 overflow-hidden rounded-3xl border border-black/5 bg-white/40 p-7 backdrop-blur-md",
            i===1 && "md:translate-y-6")}>            {/* middle card offset down */}
            <Blobs palette={s.palette} />
            <div className="relative z-10 flex h-full flex-col justify-end">
              <span className="text-4xl font-semibold text-[#101014] md:text-5xl">
                <CountUp value={s.value} />
              </span>
              <p className="mt-3 max-w-[80%] text-sm leading-relaxed text-[#5A5A60]">
                {s.label}
              </p>
            </div>
          </div>
        </FadeUp>
      ))}
    </div>
  </div>
</section>
```

## Blobs helper
```tsx
function Blobs({ palette }: { palette:string[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {palette.map((c, i) => (
        <span key={i}
          className="absolute rounded-full opacity-60 blur-xl mix-blend-multiply"
          style={{
            background: c,
            width: 200 - i*30, height: 200 - i*30,
            top: 10 + i*30, right: -20 + i*40,
          }} />
      ))}
    </div>
  );
}
```

## Stats data (from the preview)
```ts
const stats = [
  { value:"1.6M", label:"Active members rely on us for effortless payment experiences",
    palette:["#C7C2F0","#BFD4F2","#F2C9DC"] },
  { value:"850K", label:"Transfers completed each day, quick and protected",
    palette:["#F2C9DC","#C7C2F0","#F7D9C4"] },
  { value:"120+", label:"Nations enabled for instant checkouts and worldwide remittance",
    palette:["#BFD4F2","#C7C2F0","#F2C9DC"] },
];
```

## Motion & acceptance
- Heading fades up first; the three cards stagger up (delays 0 / .12 / .24).
- Numbers `CountUp` from 0 to their target when scrolled into view ("1.6M", "850K", "120+").
- The middle card is offset downward (`md:translate-y-6`) for a staggered/asymmetric layout, matching the preview.
- The pastel blob artwork can drift very slowly (`animate scale`/`x`) inside each card for a living-glass feel.
- Respect `prefers-reduced-motion`: numbers show final value immediately, blobs static, keep opacity fades.
- Acceptance checklist:
  - Light-grey section; top-left two-line heading "Instant payment clarity counts" + small muted sub-line.
  - Three soft frosted-glass rounded cards in a row, middle one offset lower.
  - Each card has translucent overlapping pastel circles (lilac/blue/pink/peach) as background artwork.
  - Each card shows a big number bottom-left (1.6M / 850K / 120+) + a short supporting line.
  - Responsive: 3 cols → stacked on mobile, offset removed. Reduced-motion safe.
