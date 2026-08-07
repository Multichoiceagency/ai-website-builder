# Kova Testimonial — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Testimonial · testimonials.

Build a warm, minimalist **`KovaTestimonial`** section: a left text column with a bold serif
headline, a small brand chip, a paragraph quote, author name/role and a dark pill "All Stories"
button; on the right a delicate single-line pencil portrait illustration on the same cream
background.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background a warm off-white linen `#EDEAE3`; no card — content sits directly on it.
- KEY COLORS: ink `#23221F`, muted grey body `#6E6B64`, dark green/near-black pill `#23291F`,
  faint grey line-art `#B9B5AC` for the illustration.
- Fonts: a serif display for the headline (`font-["Newsreader"]`/Georgia), sans for labels/body.
- Max content width `max-w-[1100px]`; two columns ~6/5 with the portrait right.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, `whileInView`, `ease:[0.22,1,0.36,1]`, `once`).
- `BrandChip` — small rounded-square monogram badge ("A") + brand name beside it.
- `DrawPortrait` — the SVG line portrait; optional `pathLength` draw-in animation on view.

## Structure
```tsx
<section className="bg-[#EDEAE3] py-24">
  <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 px-8 md:grid-cols-[1.1fr_0.9fr]">

    {/* LEFT: copy */}
    <div>
      <FadeUp>
        <h2 className="font-serif text-3xl font-semibold leading-tight text-[#23221F] md:text-[34px]">
          Trusted by ambitious, fast-moving teams
        </h2>
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="mt-6 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[#23291F] text-[11px] font-bold text-white">A</span>
          <span className="text-sm font-medium text-[#23221F]">Arcvex</span>
        </div>
      </FadeUp>

      <FadeUp delay={0.18}>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#6E6B64]">
          "With Kova, I have full visibility into our team's spending in real time. It feels like
          having a sharp financial advisor available at every hour, helping us stay on budget and
          make wiser calls."
        </p>
      </FadeUp>

      <FadeUp delay={0.26}>
        <div className="mt-6 leading-tight">
          <p className="text-sm font-semibold text-[#23221F]">Maya Reeves</p>
          <p className="text-[12px] text-[#8C887F]">Director, Arcvex</p>
        </div>
      </FadeUp>

      <FadeUp delay={0.34}>
        <a className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#23291F] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2E3527]">
          All Stories →
        </a>
      </FadeUp>
    </div>

    {/* RIGHT: line portrait */}
    <FadeUp delay={0.2}>
      <DrawPortrait className="ml-auto h-[360px] w-auto text-[#B9B5AC]" />
    </FadeUp>
  </div>
</section>
```

## Data (example, from the preview)
```ts
const testimonial = {
  headline: "Trusted by ambitious, fast-moving teams",
  brand: "Arcvex",
  quote: "With Kova, I have full visibility into our team's spending in real time. It feels like having a sharp financial advisor available at every hour, helping us stay on budget and make wiser calls.",
  name: "Maya Reeves",
  role: "Director, Arcvex",
  cta: "All Stories",
};
```

## Motion & acceptance
- Left column fades-up with stagger (headline → chip → quote → author → button).
- Portrait fades in; optionally its strokes "draw" via `pathLength` 0→1 (`transition duration:1.6`).
- Button has a subtle hover darken + arrow nudge.
- Acceptance checklist:
  - Warm linen/cream background, no card boundary.
  - Bold serif headline "Trusted by ambitious, fast-moving teams" top-left.
  - Small "A" monogram chip + "Arcvex" brand label.
  - Grey paragraph quote in quotation marks, then bold "Maya Reeves" + grey "Director, Arcvex".
  - Dark rounded "All Stories →" pill button beneath.
  - Right side: a single-line pencil portrait of a person in a suit, low-contrast grey on the same cream bg.
  - Responsive: portrait drops below copy on mobile; `prefers-reduced-motion` skips draw + slide.
```
