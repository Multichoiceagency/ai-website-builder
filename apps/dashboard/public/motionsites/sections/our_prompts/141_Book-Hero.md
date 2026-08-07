# Book Hero — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Dark book-store hero ("Foliom") with a giant serif wordmark and a perspective row of 3D-tilted book covers fanning across the bottom, plus genre filter pills.

Build a dramatic black **`BookHero`** section: a huge white serif "Foliom" wordmark centered up
top, a horizontally scrolling/fanned row of tilted book covers anchored to the bottom edge, a thin
nav, and a row of rounded genre filter pills.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = pure/near black `#070707`. Text white `#FAFAFA`.
- Wordmark uses an elegant serif (`font-["Playfair_Display"]`/`font-serif`, weight 500), enormous
  (`text-[14vw]`), centered.
- Book covers = real cover images in a tilted perspective row (`perspective-[1600px]`, each card
  `rotateY(-18deg)` slightly overlapping), bottom-anchored so only the top ~60% shows.
- Pills: outline `border border-white/20 rounded-full text-xs`; primary CTA = white pill `bg-white text-black`.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for nav/wordmark/pills.
- `BookRow` — maps covers into a tilted, overlapping flex row; each card `whileHover` straightens
  (`rotateY:0, y:-12`) and lifts.
- `Pill` — rounded outline tag helper.

## Structure
```tsx
<section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#070707] text-white">
  {/* NAV: brand left, center links, actions right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6 text-sm">
    <span className="flex items-center gap-2 font-medium">▍ Foliom</span>
    <nav className="hidden gap-8 text-white/70 md:flex">
      {["Catalogs","Editions","Hub","Info"].map(l => <a key={l} className="hover:text-white">{l}</a>)}
    </nav>
    <div className="flex items-center gap-5 text-sm">
      <a className="text-white/70 hover:text-white">Join us</a>
      <button className="rounded-full bg-white px-4 py-2 text-black">Build Your List</button>
    </div>
  </header>

  {/* giant serif wordmark */}
  <div className="relative z-10 mt-6 text-center">
    <FadeUp>
      <h1 className="font-serif text-[14vw] font-medium leading-none tracking-tight">Foliom</h1>
    </FadeUp>
  </div>

  {/* tilted fanned book row, bottom-anchored */}
  <div className="relative z-0 mt-auto" style={{ perspective: "1600px" }}>
    <div className="flex items-end justify-center gap-[-1rem] px-4">
      {books.map((b, i) => (
        <motion.img key={b.id} src={b.cover} alt={b.title}
          className="h-[34vh] w-auto -ml-6 rounded-sm shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
          style={{ transform: "rotateY(-18deg)" }}
          whileHover={{ rotateY: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }} />
      ))}
    </div>
  </div>

  {/* genre filter pills, bottom-center over the books */}
  <div className="relative z-20 flex justify-center gap-3 pb-7 pt-5">
    {genres.map(g => <Pill key={g}>{g}</Pill>)}
  </div>
</section>
```

## Books & genres data (example, from the preview)
```ts
const genres = ["Romance", "Short Story", "Memoir", "Classic", "Fantasy"];

const books = [
  { id:1, title:"Online and Romances", cover:"/assets/books/online-romances.jpg" },
  { id:2, title:"The Light Houses",     cover:"/assets/books/light-houses.jpg" },
  { id:3, title:"Shadows & Lies",       cover:"/assets/books/shadows.jpg" },
  { id:4, title:"Genre",                cover:"/assets/books/genre-orange.jpg" },
  { id:5, title:"Maria",                cover:"/assets/books/maria.jpg" },
  { id:6, title:"The Cottage",          cover:"/assets/books/cottage.jpg" },
];
```

## Motion & acceptance
- Wordmark + nav fade-up on load; book row slides/fades up from the bottom edge.
- Each tilted cover straightens and lifts on hover (`rotateY:0, y:-16`, spring); covers overlap in a
  fanned perspective row anchored to the bottom.
- Big white serif "Foliom" centered; thin nav (brand, Catalogs/Editions/Hub/Info, "Join us" + white
  "Build Your List" pill).
- Bottom-center genre pills (Romance / Short Story / Memoir / Classic / Fantasy), outline style.
- Pure-black bg, heavy cover drop-shadows. Respect `prefers-reduced-motion` (static tilt, no
  hover spring, opacity-only entry). Responsive: nav links hide on mobile, covers scroll horizontally.
```
