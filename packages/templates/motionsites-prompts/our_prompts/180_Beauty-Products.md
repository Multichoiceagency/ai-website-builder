# Beauty Products — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Products · carousel.
> Minimalistische skincare best-sellers carousel op crème-wit: een "● best sellers / sets" kop, dan een horizontale rij van vijf productkaarten met categorie-eyebrow, gecentreerde flacon, productnaam en prijs (incl. doorgestreepte oude prijs).

Build a clean, airy **`BeautyProducts`** carousel on warm white: a dot + "best sellers / sets"
heading, then a horizontally scrollable row of five product cards separated by hairlines — each
with a small uppercase category eyebrow, a centered bottle image, a product name and a price
(with an optional struck-through original price).

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = warm off-white `#F4F2EE`; text near-black `#1A1A1A`, muted `#9A958C`.
- Cards separated by thin vertical hairlines `border-l border-black/10`; minimal, no card shadow.
- Key colors: black dot/heading `#1A1A1A`, muted grey eyebrow + "sets" tab `#9A958C`, struck price `#B8B3A8`.
- Font: clean sans (Inter). Small uppercase eyebrows, regular product names, mono-ish prices optional.
- Max width `max-w-7xl`.

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `Carousel` — horizontal flex track (`overflow-x-auto snap-x`), optional drag with framer; arrow buttons optional.
- `ProductCard` — `{category, sub, name, price, oldPrice?, image}`.

## Structure
```tsx
<section className="bg-[#F4F2EE] py-16">
  <div className="mx-auto max-w-7xl px-8">
    {/* heading */}
    <FadeUp>
      <h2 className="flex items-center gap-3 text-2xl font-semibold text-[#1A1A1A]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1A1A1A]" />
        best sellers <span className="font-normal text-[#9A958C]">sets</span>
      </h2>
    </FadeUp>

    {/* carousel */}
    <div className="mt-10 flex snap-x gap-0 overflow-x-auto border-t border-black/10 pt-8">
      {products.map((p,i) => (
        <FadeUp key={p.name} delay={0.06*i}>
          <article className="w-[20vw] min-w-[180px] shrink-0 snap-start border-l border-black/10 px-6">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#1A1A1A]">{p.category}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#9A958C]">{p.sub}</div>
            <div className="my-8 flex h-44 items-center justify-center">
              <img src={p.image} alt={p.name} className="h-full w-auto object-contain" />
            </div>
            <div className="text-center text-sm text-[#1A1A1A]">{p.name}</div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm">
              <span className="text-[#1A1A1A]">{p.price}</span>
              {p.oldPrice && <span className="text-[#B8B3A8] line-through">{p.oldPrice}</span>}
            </div>
          </article>
        </FadeUp>
      ))}
    </div>
  </div>
</section>
```

## Products data (example, from the preview)
```ts
const products = [
  { category:"DISCOVER", sub:"REVIVE",   name:"v set",              price:"…",     image:"/assets/sk-1.png" },
  { category:"PROTECT",  sub:"ILLUMINATE", name:"Radiance day oil", price:"€59,00", image:"/assets/sk-2.png" },
  { category:"HYDRATE",  sub:"NOURISH",  name:"Deep moisture cream", price:"€48,00", image:"/assets/sk-3.png" },
  { category:"RENEW",    sub:"",         name:"Night repair elixir", price:"€72,00", oldPrice:"€79,00", image:"/assets/sk-4.png" },
  { category:"SMOOTH",   sub:"REFINE",   name:"Gentle exfoliant",   price:"€42,00", image:"/assets/sk-5.png" },
];
```

## Motion & acceptance
- Cards fade-up left→right on scroll-in; the carousel is draggable/scrollable with snap; left/right edge cards are partly clipped to hint scrollability.
- Hover: bottle scales `1.04`, product name underlines subtly.
- Acceptance checklist:
  - Warm off-white `#F4F2EE` background; heading "● best sellers" + muted "sets" tab.
  - Horizontal row of 5 product cards divided by vertical hairlines, top border above the track.
  - Each card: small uppercase category + sub eyebrow, centered bottle image, product name, price; "Night repair elixir" shows struck-through old price €79,00.
  - Edge cards partly clipped (carousel affordance); minimal flat aesthetic, no heavy shadows.
  - Responsive: horizontal scroll on all sizes, cards keep min-width. Reduced-motion safe (no stagger/scale).
