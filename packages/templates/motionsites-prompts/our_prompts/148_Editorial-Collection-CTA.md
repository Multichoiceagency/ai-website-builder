# Editorial Collection CTA — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: CTA · cta.

Build a refined, editorial **`CollectionCTA`** newsletter section: a near-white canvas with an oversized
mixed serif/italic headline top-left, a short intro line, an inline underlined email input + "Subscribe →",
and a photoreal still-life of a perfume bottle nested in flowers, peach and a fluttering butterfly resting on a
weathered driftwood ledge across the bottom-right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = soft warm white `#F3F2EF`.
- Key colors seen: paper `#F3F2EF`, ink `#161513` headline, muted grey body `#8A8884`, driftwood beige/tan
  `#C9B79A`, perfume lilac `#C9B6E6`, peach/coral flowers, butterfly maroon-and-white.
- Fonts: a high-contrast serif display for the headline ("Stay in the collection") mixing roman + *italic*
  (e.g. `font-["Playfair_Display"]`/serif), Inter for body and the uppercase "SUBSCRIBE" label `tracking-[0.18em]`.
- Max content width `max-w-6xl`; section padding `py-20`; copy block left-aligned.

## Helpers
- `FadeUp` (framer-motion) for headline/intro/form.
- `Float` — slow bob for the butterfly: `animate={{y:[0,-6,0], rotate:[-3,3,-3]}}`,
  `transition={{duration:6, repeat:Infinity, ease:"easeInOut"}}`.
- `InlineSubscribe` — underline-style email field + ghost "Subscribe →" submit.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#F3F2EF] py-20">
  <div className="relative z-10 mx-auto max-w-6xl px-8">
    {/* oversized serif/italic headline */}
    <FadeUp>
      <h2 className="font-serif text-6xl leading-[0.95] tracking-tight text-[#161513] md:text-7xl">
        Stay <span className="italic">in</span><br/>
        <span className="font-light">the collection</span>
      </h2>
    </FadeUp>

    {/* short intro */}
    <FadeUp delay={0.1}>
      <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-[#8A8884]">
        Editions and invitations from the Bentley fragrance studio, sent twice a season.
      </p>
    </FadeUp>

    {/* inline underline subscribe */}
    <FadeUp delay={0.2}>
      <form className="mt-6 flex max-w-md items-center justify-between border-b border-[#161513]/25 pb-2">
        <input type="email" placeholder="your@email.com"
               className="w-full bg-transparent text-sm text-[#161513] placeholder-[#8A8884] outline-none" />
        <button className="whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-[#161513]">Subscribe →</button>
      </form>
    </FadeUp>
  </div>

  {/* photoreal still-life across bottom-right */}
  <img src="/assets/driftwood-stilllife.png" alt="Perfume bottle with flowers on driftwood"
       className="pointer-events-none absolute bottom-0 right-0 w-[62%] max-w-3xl select-none" />
  <Float className="pointer-events-none absolute right-[28%] top-[34%]">
    <img src="/assets/butterfly.png" alt="" className="w-10" />
  </Float>
</section>
```

## Copy data (example, from the preview)
```ts
const cta = {
  headline: ["Stay", "in", "the collection"],
  intro: "Editions and invitations from the Bentley fragrance studio, sent twice a season.",
  placeholder: "your@email.com",
  button: "Subscribe",
};
```

## Motion & acceptance
- Headline, intro and form fade-up with stagger (0/.1/.2); the still-life can rise in with a slightly later, longer fade.
- Butterfly floats gently via `Float`; input underline brightens on focus (`border-[#161513]/60`).
- Acceptance checklist:
  - [ ] Warm off-white `#F3F2EF` canvas; left-aligned editorial layout.
  - [ ] Oversized serif headline mixing roman + italic + light weight ("Stay *in* / the collection").
  - [ ] Short muted intro line + inline underline email input with uppercase "SUBSCRIBE →" submit.
  - [ ] Photoreal perfume-bottle-on-driftwood still-life (flowers, peach, butterfly) bottom-right, bleeding off-edge.
  - [ ] Butterfly gently floats; no card chrome — pure editorial still-life CTA.
  - [ ] `prefers-reduced-motion`: disable butterfly float, keep opacity fades only.
