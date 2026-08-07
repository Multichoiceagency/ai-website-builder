# Scenic Travel — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a soft, minimal **`ScenicTravel`** landing hero: a bare top bar (star logo left, hamburger
right), a faint centered "Find your tour" title, a "Popular" label, then a horizontally scrolling
row of tall rounded destination cards (each a scenic photo with name + "price / person") and a
small text footer nav bottom-left.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background warm blush/sand `#EFE7E1`; cards are full-bleed photos with `rounded-xl`.
- KEY COLORS: ink `#2A2724`, muted grey caption `#8C857E`, faint title grey `#B9B0A8`
  (the "Find your tour" heading is low-contrast), card photo greens/blues from the imagery.
- Font: clean sans (Inter); the hero title is large but pale; card titles small + dark.
- Content `max-w-[1280px]`; card row uses `overflow-x-auto` snap, bleeding off the right edge.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, `whileInView`, `once`).
- `useDragScroll` — pointer/drag horizontal scroll for the card row with momentum + snap.
- `TourCard` — fixed-width tall card (`w-[200px] shrink-0`) image + name + price caption below.

## Structure
```tsx
<section className="min-h-screen bg-[#EFE7E1] px-8 py-6 text-[#2A2724]">
  {/* bare top bar */}
  <header className="flex items-center justify-between">
    <span className="text-xl">★</span>
    <button aria-label="Menu" className="text-2xl leading-none">≡</button>
  </header>

  {/* faint centered hero title */}
  <FadeUp>
    <h1 className="mt-10 text-center text-4xl font-light text-[#B9B0A8] md:text-5xl">Find your tour</h1>
  </FadeUp>

  {/* Popular label */}
  <p className="mx-auto mt-10 max-w-[1280px] text-[12px] font-medium uppercase tracking-wide text-black/50">Popular</p>

  {/* scrolling destination cards */}
  <div ref={rowRef} className="mt-3 flex items-end gap-4 overflow-x-auto pb-4 [scrollbar-width:none] snap-x">
    {tours.map((t, i) => (
      <article key={t.name} className={cn("shrink-0 snap-start", t.tall ? "w-[210px]" : "w-[190px]")}>
        <div className={cn("overflow-hidden rounded-xl bg-[#C8C2BA]", t.tall ? "h-[210px]" : "h-[150px]")}>
          <img src={t.image} alt="" className="h-full w-full object-cover" />
        </div>
        <h3 className="mt-3 text-[13px] font-semibold">{t.name}</h3>
        <p className="text-[12px] text-[#8C857E]">{t.price} / person</p>
      </article>
    ))}
  </div>

  {/* footer text nav */}
  <nav className="mt-16 flex flex-col gap-2 text-[13px] font-medium text-[#2A2724]">
    <a>About</a><a>/Destinations</a><a>Booking</a><a>FAQ</a><a>Account</a>
  </nav>
</section>
```

## Tours data (example, from the preview)
```ts
const tours = [
  { name: "Cold Islands Norway",            price: "$1,800", image: "/tours/norway-fjord.jpg",  tall: true  },
  { name: "Serengeti National Park, Tanzania", price: "$2,400", image: "/tours/serengeti.jpg",  tall: true  },
  { name: "Switzerland",                    price: "$3,200", image: "/tours/switzerland.jpg",    tall: true  },
  { name: "Cold Islands Norway",            price: "$1,800", image: "/tours/norway-cove.jpg",    tall: false },
  { name: "Mountain View",                  price: "$2,100", image: "/tours/savanna.jpg",        tall: false },
];
```

## Motion & acceptance
- Title + cards fade-up on enter; the card row is drag-/scroll-able with snap and bleeds off the
  right to hint at more destinations.
- Cards lift slightly on hover (`whileHover y:-4`); a custom hand cursor over the row is a nice touch.
- Acceptance checklist:
  - Warm blush/sand background, very airy spacing.
  - Top bar: ★ star logo left, ≡ hamburger right (no full nav).
  - Pale, low-contrast centered hero title "Find your tour".
  - Small uppercase "Popular" label above the card row.
  - Horizontal row of rounded scenic photo cards at varied heights, bleeding off the right edge.
  - Each card: photo + dark name + grey "price / person" (Cold Islands Norway $1,800, Serengeti National Park Tanzania $2,400, Switzerland $3,200, etc.).
  - Bottom-left vertical text nav: About / /Destinations / Booking / FAQ / Account.
  - Responsive: cards keep width and scroll on mobile; `prefers-reduced-motion` keeps native scroll, drops lift/slide.
```
