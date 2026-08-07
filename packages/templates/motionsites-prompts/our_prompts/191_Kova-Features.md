# Kova Features — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Benefits · features.
> Warm-beige fintech benefits row ("Kova") with a serif heading + dark "Watch Demo" pill, and four cards: three dark photo cards (Smart Budgeting / Bank-Grade Security / Wealth Building) plus one light data card with a donut spend chart.

Build a calm **`KovaFeatures`** section: a beige canvas with a left-aligned serif heading and a
dark video CTA on the right, then a four-card row mixing moody nature photo cards (icon + title top,
caption bottom) with one bright "Spend Insights" card containing a donut budget chart.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/warm theme. Background = warm beige `#E6E2D8`. Photo cards are dark moody nature shots with
  a bottom-up dark gradient for white text.
- Heading uses a serif (`font-serif`, `text-[#222]`); body/captions Inter.
- Cards: `rounded-2xl overflow-hidden`; photo cards `bg-cover` + `from-black/70 to-transparent`
  overlay; data card = light `bg-[#F1EEE7] border border-black/5` with a donut chart.
- CTA = dark rounded pill `bg-[#1A1A1A] text-white`.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for heading, CTA, and each card (stagger).
- `PhotoCard` — `{ icon, title, caption, image }` → image card with top icon+title, bottom caption.
- `DonutChart` — small SVG conic/stroke-dasharray donut showing % of budget (green→amber arc).

## Structure
```tsx
<section className="w-full bg-[#E6E2D8] px-6 py-20">
  <div className="mx-auto max-w-[1240px]">
    {/* heading row */}
    <div className="mb-10 flex items-end justify-between gap-6">
      <FadeUp>
        <h2 className="font-serif text-3xl tracking-tight text-[#222] sm:text-4xl">
          Designed to sharpen every decision
        </h2>
      </FadeUp>
      <FadeUp delay={0.1}>
        <button className="flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm text-white">
          Watch Demo ▸
        </button>
      </FadeUp>
    </div>

    {/* four-card row */}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <FadeUp key={c.title ?? "insights"} delay={0.15 + i * 0.08}>
          {c.type === "data" ? (
            <div className="flex h-full flex-col rounded-2xl border border-black/5 bg-[#F1EEE7] p-5">
              <p className="flex items-center gap-2 text-sm text-[#444]">◷ Spend Insights</p>
              <div className="mt-4 flex flex-col items-center rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-[#222]">Monthly Spend</p>
                <p className="text-xs text-[#888]">1 Apr – 30 May 2026</p>
                <DonutChart percent={50} className="mt-3" />
                <p className="mt-2 text-[11px] text-[#888]">of budget</p>
              </div>
            </div>
          ) : (
            <PhotoCard {...c} />
          )}
        </FadeUp>
      ))}
    </div>
  </div>
</section>

function PhotoCard({ icon, title, caption, image }: any) {
  return (
    <div className="relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white"
         style={{ backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
      <p className="relative z-10 flex items-center gap-2 text-sm">{icon} {title}</p>
      <p className="relative z-10 text-sm text-white/85">{caption}</p>
    </div>
  );
}
```

## Cards data (example, from the preview)
```ts
const cards = [
  { type: "photo", icon: "✦", title: "Smart Budgeting",
    caption: "Let AI reshape how you plan your spending. Kova adapts to your…",
    image: "/assets/kova/portrait.jpg" },
  { type: "photo", icon: "⛨", title: "Bank-Grade Security",
    caption: "Keep your money safe with end-to-end encryption, live fraud alerts, and two-factor auth…",
    image: "/assets/kova/rock.jpg" },
  { type: "data" }, // Spend Insights donut card
  { type: "photo", icon: "📈", title: "Wealth Building",
    caption: "Grow your net worth with tools that help you set targets, monitor gains, and act…",
    image: "/assets/kova/tree.jpg" },
];
```

## Motion & acceptance
- Heading + CTA fade-up first; the four cards stagger in left→right (~0.08s each); cards lift
  slightly on hover (`whileHover y:-4`).
- Donut chart animates its arc to 50% on view (green→amber), "50% of budget" centered.
- Beige bg; serif "Designed to sharpen every decision" left + dark "Watch Demo ▸" pill right.
- Row of four equal cards: 3 dark photo cards (icon+title top, caption bottom over a gradient) and
  1 light "Spend Insights" card with a white inner panel + donut.
- Respect `prefers-reduced-motion` (no hover lift, donut renders at final value, opacity-only).
- Responsive: 4 → 2 → 1 columns; cards keep equal height.
```
