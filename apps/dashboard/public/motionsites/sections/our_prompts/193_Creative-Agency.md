# Creative Agency — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.

Build a high-impact **`CreativeAgencyHero`** manifesto section: a clean white stage with a thin
strip of a fiery red/abstract image bleeding in at the very top, a massive centered all-caps
black headline ("WE CRAFT QUIET RITUALS OF BEAUTY SHAPED BY YOU YOUR LIGHT"), a short centered
intro paragraph, and an understated underlined "Learn More" text link — bold editorial typography.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Light theme. Background = white `#FFFFFF`; a slim full-width image band of a glowing red/orange
  abstract (`/assets/ember-strip.jpg`) pinned to the very top edge (`h-10 sm:h-12`, `object-cover`).
- Headline = near-black `#0D0D0D`, a heavy condensed/grotesk display
  (`font-["Anton"]` or `font-extrabold`), uppercase, very tight leading (`leading-[0.92]`).
- Body copy = `text-zinc-500`, small; "Learn More" = ink, uppercase-ish with an underline.
- Max content width `max-w-4xl`, dead-centered, lots of whitespace.

## Helpers
- `FadeUp` (framer-motion, opacity+y) for headline lines (per-line stagger) + sub + link.
- `LineReveal` — optional clip/mask reveal per headline line: `initial={{y:"110%"}}`,
  `whileInView={{y:0}}`, each line in an `overflow-hidden` wrapper.

## Structure
```tsx
<section className="relative flex min-h-screen flex-col items-center bg-white px-6 text-center">
  {/* thin ember image strip at the very top */}
  <img src="/assets/ember-strip.jpg" alt="" className="absolute inset-x-0 top-0 h-10 w-full object-cover sm:h-12" />

  {/* massive all-caps headline */}
  <div className="mx-auto mt-28 max-w-4xl">
    {["WE CRAFT QUIET","RITUALS OF BEAUTY","SHAPED BY YOU","YOUR LIGHT"].map((line, i) => (
      <div key={line} className="overflow-hidden">
        <FadeUp delay={i * 0.08}>
          <h1 className="font-['Anton'] text-5xl font-extrabold uppercase leading-[0.92] tracking-tight text-[#0D0D0D] sm:text-6xl md:text-7xl">
            {line}
          </h1>
        </FadeUp>
      </div>
    ))}
  </div>

  {/* intro paragraph */}
  <FadeUp delay={0.4}>
    <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-zinc-500">
      Aurelia is a quiet beauty sanctuary for women, offering devoted care for skin, body, and hair.
      We guide each guest through tailored consultations to design treatments that answer every unique need.
    </p>
  </FadeUp>

  {/* understated text link */}
  <FadeUp delay={0.5}>
    <a className="mt-8 inline-block border-b border-zinc-800 pb-1 text-sm font-medium text-zinc-900 transition hover:text-zinc-500">
      Learn More
    </a>
  </FadeUp>
</section>
```

## Copy data (example, from the preview)
```ts
const hero = {
  headlineLines: ["WE CRAFT QUIET", "RITUALS OF BEAUTY", "SHAPED BY YOU", "YOUR LIGHT"],
  intro:
    "Aurelia is a quiet beauty sanctuary for women, offering devoted care for skin, body, and hair. We guide each guest through tailored consultations to design treatments that answer every unique need.",
  cta: "Learn More",
};
```

## Motion & acceptance
- Headline lines reveal one-by-one via masked `LineReveal` / `FadeUp` (per-line delay ~0.08), then intro + link fade up (.4 / .5).
- Keep the layout minimal: black type on white, the only colour is the thin red ember strip at the top edge.
- "Learn More" gets a subtle underline-color shift on hover; otherwise no buttons/cards.
- Respect `prefers-reduced-motion`: disable line-mask slide, keep opacity fades only.
- Acceptance checklist:
  - White stage with a thin full-width fiery red/abstract image strip pinned to the very top.
  - Massive centered all-caps black headline across 4 lines, condensed/heavy display face, very tight leading.
  - Centered muted intro paragraph (~3 lines) beneath the headline.
  - Single underlined "Learn More" text link as the only CTA.
  - Editorial, whitespace-heavy, monochrome except the top strip; reduced-motion safe.
