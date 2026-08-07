# Daisy Sweet — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Product · features.
> Split fashion/perfume product hero ("Daisy love / Sweet"): a flat sky-blue left panel with a small floating product card + scent-note list, and a full-bleed right image of a model holding pink daisies behind oversized glossy daisy props.

Build a two-panel **`DaisySweetProduct`** section: a clean blue color-block left half (top labels,
a centered small product image card, a bottom scent-notes list + dark "Shop Now" pill) and a
right half filled by an editorial photo of a model with pink daisies and glossy flower props.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/colorful theme. Left panel = flat sky-blue `#5BA7D9`; right = full-bleed photo
  `/assets/daisy-model.jpg` `object-cover`.
- Typeface: clean sans (Inter/Helvetica). Top labels & notes tiny uppercase; product caption small;
  CTA = dark pill `bg-[#111] text-white rounded-full`.
- Product card = small white card with the bottle on a white ground, subtle shadow.
- Floating pink petals drift on the blue panel as a light decorative accent.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for labels, product card, notes, CTA.
- `Petals` — a few absolutely-positioned pink petal sprites with slow `y`/`rotate` drift loops.
- `Reveal` — image clip/scale-in for the right photo (`scale:1.06 → 1`, opacity).

## Structure
```tsx
<section className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
  {/* LEFT blue panel */}
  <div className="relative flex flex-col bg-[#5BA7D9] px-8 py-8 text-white">
    <Petals />
    {/* top labels */}
    <div className="relative z-10 flex items-start justify-between text-[11px] uppercase tracking-[0.18em] text-white/90">
      <span>Daisy love</span><span>Sweet</span>
    </div>

    {/* centered product card */}
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
      <FadeUp>
        <div className="rounded-md bg-white p-6 shadow-xl">
          <img src="/assets/daisy-bottle.png" alt="Eau So Sweet" className="h-44 w-auto object-contain" />
        </div>
      </FadeUp>
      <FadeUp delay={0.1}>
        <p className="mt-4 text-center text-xs text-white/90">Eau So Sweet</p>
        <p className="text-center text-[11px] text-white/70">100 ml / 3.3 oz</p>
      </FadeUp>
    </div>

    {/* bottom scent notes + CTA */}
    <div className="relative z-10 flex items-end justify-between gap-6">
      <FadeUp delay={0.15}>
        <ul className="space-y-1 text-[11px] leading-tight text-white/90">
          {notes.map(n => (
            <li key={n.label}>
              <span className="block text-[10px] uppercase tracking-wide text-white/60">{n.tier}</span>
              <span className="font-semibold uppercase tracking-wide">{n.label}</span>
            </li>
          ))}
        </ul>
      </FadeUp>
      <FadeUp delay={0.25}>
        <button className="rounded-full bg-[#111] px-6 py-2.5 text-xs uppercase tracking-wide text-white">Shop Now</button>
      </FadeUp>
    </div>
  </div>

  {/* RIGHT full-bleed model photo */}
  <Reveal className="relative min-h-[50vh] overflow-hidden md:min-h-screen">
    <img src="/assets/daisy-model.jpg" alt="" className="h-full w-full object-cover" />
  </Reveal>
</section>
```

## Scent notes data (example, from the preview)
```ts
const notes = [
  { tier: "Fruity top",     label: "White Raspberries" },
  { tier: "Floral heart",   label: "Daisy Tree Petals" },
  { tier: "Feminine base",  label: "Sugar Musks" },
];
```

## Motion & acceptance
- Right photo reveals with a gentle scale-in (`Reveal`); left labels, product card, notes and CTA
  fade-up with stagger.
- Pink petals drift slowly on the blue panel (`Petals`); product card subtly floats/breathes.
- 50/50 split: flat sky-blue left (top "Daisy love" / "Sweet" labels, centered white product card
  "Eau So Sweet · 100 ml / 3.3 oz", bottom scent-note list + dark "Shop Now" pill) and full-bleed
  model-with-pink-daisies photo right.
- Scent notes read Fruity top → White Raspberries, Floral heart → Daisy Tree Petals, Feminine base
  → Sugar Musks (uppercase).
- Respect `prefers-reduced-motion` (no petals drift, photo renders static, opacity-only).
- Responsive: stacks to image-on-top / blue-panel-below on mobile; CTA stays a dark pill.
```
