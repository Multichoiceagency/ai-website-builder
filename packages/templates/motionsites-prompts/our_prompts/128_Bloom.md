# Bloom — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · landing.

Build a full-bleed, cinematic **`BloomHero`** React section: a dark video/photo backdrop of cherry-blossom
branches surrounding a soft dark center, with a single centered serif statement in which one word ("ecosystem")
is wrapped in a glowing lilac pill highlight.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark/atmospheric theme. Background = full-viewport looping video (or hi-res image) of pink cherry blossoms
  framing a dark vignette center: `/assets/blossom-loop.mp4` `object-cover`, plus a radial vignette overlay
  `bg-[radial-gradient(45%_45%_at_50%_50%,rgba(0,0,0,0.55),transparent)]` for text legibility.
- Key colors seen: blossom pink `#E9C4CD`, leaf green `#3E5230`, deep center `#0C0A0A`, text near-white `#F4EFEF`,
  highlight pill lilac `#B58CF2`/`#C7A7FF` with soft glow.
- Font: a refined serif for the statement (e.g. `font-["Cormorant_Garamond"]`/serif, weight 400–500),
  centered, generous `leading-relaxed`.
- Section is `min-h-screen w-full`.

## Helpers
- `FadeUp` — framer-motion wrapper, `initial={{opacity:0,y:18}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:1, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Highlight` — inline lilac pill around a single word: `rounded-full bg-[#B58CF2] px-3 py-0.5 text-[#1a1226]
  shadow-[0_0_24px_rgba(181,140,242,0.6)]`, optional gentle pulse on the glow.

## Structure
```tsx
<section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0C0A0A]">
  {/* blossom backdrop */}
  <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" poster="/assets/blossom.jpg">
    <source src="/assets/blossom-loop.mp4" type="video/mp4" />
  </video>
  {/* center vignette for legibility */}
  <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(0,0,0,0.55),transparent)]" />

  {/* centered serif statement */}
  <FadeUp className="relative z-10 mx-auto max-w-2xl px-6 text-center">
    <p className="font-serif text-2xl font-normal leading-relaxed text-[#F4EFEF] drop-shadow sm:text-3xl md:text-[34px]">
      To gracefully cultivate a newly balanced{" "}
      <Highlight>ecosystem</Highlight>{" "}
      we dissolve all boundaries between technology and nature.
    </p>
  </FadeUp>
</section>
```

## Copy data (example, from the preview)
```ts
const statement = {
  before: "To gracefully cultivate a newly balanced",
  highlight: "ecosystem",
  after: "we dissolve all boundaries between technology and nature.",
};
```

## Motion & acceptance
- Statement fades up gently on enter; the lilac pill's glow can subtly pulse (`box-shadow` opacity 0.4↔0.7 over ~3s).
- The blossom video loops slowly behind the dark center; optional very slow background `scale:[1,1.05,1]` over 30s.
- A soft radial vignette keeps the serif copy readable over the busy floral edges.
- Acceptance checklist:
  - [ ] Full-viewport blossom backdrop (cherry branches all around, dark center) via looping video/image.
  - [ ] Single centered serif statement, near-white, with radial vignette behind it.
  - [ ] One word ("ecosystem") wrapped in a glowing lilac rounded-full pill with shadow glow.
  - [ ] No nav/buttons — pure statement hero; imagery is the focus.
  - [ ] `prefers-reduced-motion`: pause the video (show poster), stop glow pulse, keep opacity fade only.
