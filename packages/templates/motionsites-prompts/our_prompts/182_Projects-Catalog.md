# Projects Catalog — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Projects · features.
> Donkere portfolio case-study kaart: grote "02" index + "PERSONAL / Aura Brand Identity" titel met "LIVE PROJECT" pill rechts, en daaronder een bento-grid van paarse lavendel/zonnebloem-foto's (twee kleine links, één grote rechts).

Build a dark **`ProjectCatalogCard`** section: a stacked-card portfolio entry with a big two-digit
index, a category eyebrow + project title, a "LIVE PROJECT" outline pill on the right, and a bento
image grid below (two small stacked thumbnails on the left, one large hero image on the right).

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0C0C0E`; the card itself is a slightly lighter panel
  `bg-[#141416] border border-white/10 rounded-[28px]`, with a faint stacked "card behind card" edge above it.
- Colors I see: white index/title `#F5F5F7`, muted eyebrow `text-white/55`, the imagery is dominated
  by lavender/violet purples `#7C5CC4`-ish (lavender fields, misty mountains, sunflowers in purple light).
- Fonts: bold grotesque/sans for the giant "02" (`font-extrabold`), Inter for labels. Max width `max-w-[1100px]`.

## Helpers
- `FadeUp` — framer-motion wrapper for the card + grid items.
- `OutlinePill` — rounded-full `border-white/30 text-white text-xs uppercase` for "LIVE PROJECT".
- `StackEdge` — a thin offset bordered rectangle peeking above the main card to suggest a stack.

## Structure
```tsx
<section className="bg-[#0C0C0E] px-6 py-20">
  <FadeUp>
    <div className="relative mx-auto max-w-[1100px]">
      {/* peeking stacked card edge */}
      <div className="absolute -top-3 left-4 right-4 h-6 rounded-t-[28px] border border-white/10 bg-[#141416]" />

      <article className="relative rounded-[28px] border border-white/10 bg-[#141416] p-7">
        {/* HEADER: index + title + live pill */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-end gap-4">
            <span className="text-5xl font-extrabold leading-none text-white">02</span>
            <div className="pb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/55">Personal</p>
              <h3 className="text-lg font-medium text-white">Aura Brand Identity</h3>
            </div>
          </div>
          <OutlinePill>Live Project</OutlinePill>
        </div>

        {/* BENTO IMAGE GRID */}
        <div className="grid gap-4 md:grid-cols-[1fr_1.6fr]">
          <div className="grid gap-4">
            {smallImages.map(img => (
              <div key={img} className="overflow-hidden rounded-2xl">
                <img src={img} alt="" className="aspect-[16/10] w-full object-cover" />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl">
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </article>
    </div>
  </FadeUp>
</section>
```

## Project data (example, from the preview)
```ts
const project = {
  index: "02",
  category: "Personal",
  title: "Aura Brand Identity",
  status: "Live Project",
};
const smallImages = ["/assets/lavender-path.jpg", "/assets/lavender-mountains.jpg"];
const heroImage = "/assets/lavender-sunflowers.jpg"; // misty purple lake + sunflowers in foreground
```

## Motion & acceptance
- One dark portfolio card on near-black background, with a subtle "stacked card" edge peeking above it.
- Header row: giant bold "02" index, "PERSONAL" eyebrow + "Aura Brand Identity" title, and a "LIVE PROJECT" outline pill aligned right.
- Bento image grid: two small stacked thumbnails on the left (lavender field path, lavender field + mountains) and one large hero image on the right (misty purple lake with mountains + sunflowers foreground) — all violet/lavender toned.
- Card + images fade-up on scroll; images zoom slightly on hover (`group-hover:scale-105`, `overflow-hidden` clips).
- Reduced-motion: disable hover-zoom + translate, keep static layout + opacity fade. Grid collapses to a single column (small images then hero) on mobile.
