# Agency Services — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Services · features.

Build a clean, light **`AgencyServices`** list section: a vertical stack of numbered service
rows, each with a giant outlined/heavy index number, a bold uppercase title, a two-line muted
description, and a thin hairline divider between rows — with a faded ghost number teasing the next item.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = light grey `#F0F0F0` (near-white), no imagery.
- Key colors from the image: near-black heavy numerals + titles `#141414`, muted grey body `#7A7A7A`,
  thin hairline dividers `#D6D6D6`, faded "ghost" upcoming number `#E2E2E2`.
- Typeface: a heavy condensed/extrabold sans for the numbers (`font-extrabold`, large), Inter for
  titles (uppercase, bold) and body. Max content width `max-w-4xl`, generous row spacing.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.6, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `ServiceRow` — reusable row: index number + title + description, with an animated hairline.
- (optional) `HoverShift` — title slides right slightly on hover (`whileHover x:6`).

## Structure
```tsx
<section className="relative bg-[#F0F0F0] px-6 py-16 md:py-24">
  <div className="mx-auto max-w-4xl">
    {services.map((s, i) => (
      <FadeUp key={s.num} delay={i*0.08}>
        <div className="group grid grid-cols-[120px_1fr] items-start gap-6 border-t border-[#D6D6D6] py-8 first:border-t-0">
          {/* heavy index number */}
          <span className="text-6xl font-extrabold leading-none tracking-tight text-[#141414] md:text-7xl">
            {s.num}
          </span>

          {/* title + description */}
          <div className="pt-1">
            <h3 className="text-xl font-bold uppercase tracking-tight text-[#141414] transition-transform group-hover:translate-x-1 md:text-2xl">
              {s.title}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#7A7A7A]">
              {s.desc}
            </p>
          </div>
        </div>
      </FadeUp>
    ))}

    {/* faded ghost number teasing the next service */}
    <div className="grid grid-cols-[120px_1fr] border-t border-[#D6D6D6] py-8">
      <span className="text-6xl font-extrabold leading-none text-[#E2E2E2] md:text-7xl">05</span>
    </div>
  </div>
</section>
```

## Services data (from the preview)
```ts
const services = [
  // 01 is partly cropped at the top of the preview — implied "Modeling / 3D"
  { num:"01", title:"3D MODELING",   desc:"Custom 3D models tailored to your client needs, ideal for games, products, and visualizations." },
  { num:"02", title:"RENDERING",     desc:"High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life." },
  { num:"03", title:"MOTION DESIGN", desc:"Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences." },
  { num:"04", title:"BRANDING",      desc:"Crafting cohesive visual identities — from logos to full brand systems — that communicate a clear and memorable presence." },
];
// "05" rendered as a faded ghost numeral to imply more services below.
```

## Motion & acceptance
- Each row fades up with a small stagger (delay = index × .08).
- Hairline divider can "draw" in from left (`scaleX` 0→1, origin-left) just before its row content appears.
- On hover the title nudges right (`translate-x-1`) and the big numeral can darken slightly.
- The "05" ghost numeral stays light grey (`#E2E2E2`) to tease scrolling further.
- Respect `prefers-reduced-motion`: disable divider draw + hover shift, keep opacity fades.
- Acceptance checklist:
  - Light-grey section, single centered column, max ~`max-w-4xl`.
  - Vertical list of numbered rows: huge extrabold index (01–04), bold UPPERCASE title, two-line muted description.
  - Thin hairline divider above every row; rows generously spaced.
  - A faded "05" ghost numeral at the bottom teasing the next item.
  - Top row (01) appears slightly cropped/clipped like the preview. Responsive: number column shrinks on mobile.
