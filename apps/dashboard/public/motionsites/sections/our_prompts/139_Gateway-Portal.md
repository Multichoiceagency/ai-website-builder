# Gateway Portal — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing page · hero.

Build a bright sky-blue **`GatewayPortalHero`** React section: a vivid blue gradient sky with soft clouds, a
minimal top nav, a two-line centered headline + subhead, and a fanned-out 3D testimonial card carousel where the
center card is white/active and the side cards recede in faded glass perspective, with prev/next arrows below.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme on a vivid sky. Background = blue radial/linear gradient
  `bg-[radial-gradient(120%_90%_at_50%_-10%,#7FD0FF_0%,#2AA8F2_45%,#1E8FE0_100%)]` with two soft cloud PNGs
  bottom-left and bottom-right (`/assets/cloud-l.png`, `/assets/cloud-r.png`, `opacity-80`).
- Key colors seen: sky blues `#2AA8F2`/`#1E8FE0`/`#7FD0FF`, white card `#FFFFFF`, ink card text `#1B2733`,
  white nav/headline text with subtle `drop-shadow`, glow halo behind center card.
- Font Inter; headline a clean medium weight; testimonial body small.
- Section `min-h-screen`, content centered, `max-w-6xl`.

## Helpers
- `FadeUp` (framer-motion) for headline/subhead.
- `CardFan` — perspective carousel: maps cards to offset/rotateY/scale/opacity by distance from the active index;
  active card is upright white, neighbours `rotateY ±18°`, `scale 0.9`, `opacity 0.5`, translucent.
- `ArrowBtn` — round white/translucent buttons for prev/next.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_-10%,#7FD0FF_0%,#2AA8F2_45%,#1E8FE0_100%)] text-white">
  <img src="/assets/cloud-l.png" alt="" className="pointer-events-none absolute bottom-10 left-0 w-64 opacity-80" />
  <img src="/assets/cloud-r.png" alt="" className="pointer-events-none absolute bottom-24 right-0 w-72 opacity-70" />

  {/* TOP NAV — script wordmark left, CTA + menu right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <span className="text-xl italic tracking-tight">Auragate</span>
    <div className="flex items-center gap-3">
      <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1B2733] shadow">Watch Demo</button>
      <button className="rounded-full bg-white/90 p-2 text-[#1B2733] shadow">≡</button>
    </div>
  </header>

  {/* centered headline + subhead */}
  <div className="relative z-10 mx-auto max-w-2xl px-6 pt-4 text-center">
    <FadeUp>
      <h1 className="text-4xl font-semibold leading-tight drop-shadow-sm sm:text-5xl">
        Real wonders.<br/>Real worlds.
      </h1>
    </FadeUp>
    <FadeUp delay={0.12}>
      <p className="mx-auto mt-4 max-w-md text-sm text-white/85">
        See how Auragate helps others, and find out what it can do for you.
      </p>
    </FadeUp>
  </div>

  {/* fanned 3D testimonial carousel */}
  <div className="relative z-10 mx-auto mt-12 flex h-[420px] items-center justify-center [perspective:1200px]">
    <CardFan items={quotes} active={active} onChange={setActive} />
  </div>

  {/* prev / next */}
  <div className="relative z-10 flex items-center justify-center gap-4 pb-16">
    <ArrowBtn dir="prev" onClick={prev}>‹</ArrowBtn>
    <ArrowBtn dir="next" onClick={next}>›</ArrowBtn>
  </div>
</section>
```

## Quotes data (example, from the preview)
```ts
const quotes = [
  { text: "My wonder has been growing so fast that it is hard to believe the difference. Auragate gave me exactly the vision I needed." },
  { text: "The first two scenes felt alive. I tried everything we dreamed up and it worked.", active: true },
  { text: "The wonder of it all really moved me, it even brought a tear to my eyes every time." },
  { text: "I finally feel like my worlds were truly real." },
];
```

## Motion & acceptance
- Headline + subhead fade-up with stagger; clouds drift very slowly (`x:[0,12,0]` over ~20s).
- `CardFan` animates with `framer-motion` `layout`: changing `active` smoothly re-fans the deck (rotateY/scale/opacity
  per card distance); the center card is opaque white with a soft glow halo, neighbours translucent and angled.
- Prev/next arrows and side-card clicks change the active index.
- Acceptance checklist:
  - [ ] Vivid blue sky gradient background with two soft cloud PNGs at the bottom corners.
  - [ ] Minimal nav: italic "Auragate" wordmark left, white "Watch Demo" pill + hamburger right.
  - [ ] Two-line centered headline ("Real wonders. Real worlds.") + supporting subhead, white drop-shadowed.
  - [ ] Fanned 3D card carousel: opaque white active card center, faded translucent angled side cards.
  - [ ] Round prev/next arrow buttons centered below the deck.
  - [ ] `prefers-reduced-motion`: cards snap (no rotateY animation), clouds static, opacity fades only.
