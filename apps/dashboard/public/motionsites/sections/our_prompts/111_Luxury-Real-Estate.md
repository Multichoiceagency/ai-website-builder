# Luxury Real Estate — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Donkere, editoriale real-estate hero ("Velar."): een groot manifest-statement bovenaan, drie stat-kolommen met scheidingslijnen, en een rij van vijf architectuur-thumbnails die onderaan het frame uitsteken.

Build a dark editorial **`LuxuryRealEstate`** hero for a property brand ("Velar."): a wordmark
+ hamburger, a large serif/sans manifesto paragraph, a 3-column stats row separated by hairlines,
and a bottom strip of five architecture cards bleeding off the lower edge.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black warm charcoal `#1B1A18`; text near-white `#EDEBE7`, muted labels `#9A958C`.
- Hairline dividers `border-white/10`. Cards rounded-2xl, `object-cover`, real estate photos.
- Font: clean sans (Inter) for body + stats; optional light serif for the manifesto. Generous line-height.
- Max content width `max-w-6xl`, lots of top whitespace.

## Helpers
- `FadeUp` (framer-motion) staggered reveal wrapper (`y:24`, `ease:[0.22,1,0.36,1]`).
- `Stat` — `{value, label}` block with big number + small uppercase-ish caption.
- `CardStrip` — flex row of equal-width image cards, last ones clipped by the section bottom.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#1B1A18] pt-7 text-[#EDEBE7]">
  {/* top bar */}
  <header className="mx-auto flex max-w-6xl items-center justify-between px-6">
    <span className="text-lg font-semibold tracking-tight">Velar<span className="text-[#9A958C]">.</span></span>
    <button aria-label="Menu" className="flex flex-col gap-1.5"><span className="h-px w-6 bg-white/70"/><span className="h-px w-6 bg-white/70"/></button>
  </header>

  {/* manifesto */}
  <div className="mx-auto max-w-6xl px-6 pt-12">
    <FadeUp>
      <p className="max-w-2xl pl-[20%] text-2xl leading-snug text-[#EDEBE7] sm:text-3xl">
        Every estate we present is hand-chosen through a frame of permanence, refinement,
        and timeless detail. Standards are not a flourish. It is our discipline.
      </p>
    </FadeUp>

    {/* stats row */}
    <div className="mt-12 grid max-w-3xl grid-cols-3 divide-x divide-white/10">
      {stats.map((s,i) => (
        <FadeUp key={s.label} delay={0.1*i}>
          <div className="px-6">
            <div className="text-4xl font-light tracking-tight">{s.value}</div>
            <div className="mt-2 text-xs text-[#9A958C]">{s.label}</div>
          </div>
        </FadeUp>
      ))}
    </div>
  </div>

  {/* bottom image strip — bleeds off the lower edge */}
  <div className="mt-16 flex gap-2 px-2">
    {cards.map((c,i) => (
      <FadeUp key={i} delay={0.06*i}>
        <div className="h-44 w-[19vw] overflow-hidden rounded-t-2xl sm:h-56">
          <img src={c} alt="" className="h-full w-full object-cover" />
        </div>
      </FadeUp>
    ))}
  </div>
</section>
```

## Data (example, from the preview)
```ts
const stats = [
  { value: "120+", label: "Portfolio Holdings" },
  { value: "12",   label: "Global Locations" },
  { value: "98%",  label: "Patron Loyalty Rate" },
];

const cards = [
  "/assets/estate-1.jpg", // minimalist concrete villa
  "/assets/estate-2.jpg", // white cubic modern house
  "/assets/estate-3.jpg", // grey stone facade
  "/assets/estate-4.jpg", // blue-glass terraces
  "/assets/estate-5.jpg", // warm-lit cantilever at dusk
];
```

## Motion & acceptance
- Manifesto fades up first; the three stats stagger in (0/.1/.2); image cards stagger in left→right.
- Optional: cards lift slightly on hover (`whileHover y:-6`) and the image scales `1.05` inside its clip.
- Acceptance checklist:
  - Dark warm-charcoal `#1B1A18` background; "Velar." wordmark top-left, hamburger top-right.
  - Indented large manifesto paragraph ("Every estate we present…discipline.").
  - 3-column stats with vertical hairline dividers: 120+ Portfolio Holdings · 12 Global Locations · 98% Patron Loyalty Rate.
  - Bottom row of 5 rounded-top architecture thumbnails bleeding off the section's lower edge.
  - Responsive: stats stack on small screens, card strip becomes horizontally scrollable. Reduced-motion safe.
