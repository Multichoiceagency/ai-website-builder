# Waitlist Hero — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Donkere waitlist-hero: minimal nav ("micro" logo, Login + "Join the Waitlist" pill), een drieluik (triptych) van een dramatische zonsondergang-bergpanorama met een zwarte pill-divider/lens in het midden, en onderaan groot wit "Organized." + een tagline.

Build a cinematic **`WaitlistHero`** for a productivity tool ("micro"):
a slim dark nav (lowercase logo, "Login", bordered "Join the Waitlist"), a full-width triptych of a
golden-hour mountain-and-lake panorama split into three panels by thin gaps with a black rounded
"lens" capsule centered over the seam, and a bottom row with a huge white "Organized." word, a short
left blurb + "Join the Waitlist" button, and an italic tagline on the right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0A0A0B`; the triptych image is a warm sunset panorama
  (`/assets/sunset-mountains.jpg`) shown across three panels with small `gap-1` dark seams.
- Colors I see: white text `#FFFFFF`, muted `text-white/55`, the photo's warm orange/teal sunset tones;
  the central capsule is matte black with a faint inner sheen (`bg-black rounded-full shadow-inner`).
- Fonts: a large heavy sans for "Organized." (`font-extrabold`, `text-6xl`/`text-7xl`),
  Inter for nav + blurb; tagline in italic. Max width `max-w-[1200px]`.

## Helpers
- `FadeUp` — framer-motion stagger wrapper.
- `Triptych` — three panels sharing one cropped image (`background-position` offsets) with thin gaps.
- `LensCapsule` — centered black rounded-full overlay sitting on the middle seam.
- `Pill` — bordered rounded-full button for "Join the Waitlist".

## Structure
```tsx
<section className="relative min-h-screen bg-[#0A0A0B] px-4 py-5 text-white">
  {/* NAV */}
  <header className="mx-auto flex max-w-[1200px] items-center justify-between px-2 pb-5">
    <span className="text-lg font-semibold lowercase">micro</span>
    <div className="flex items-center gap-4 text-sm">
      <a className="text-white/70">Login</a>
      <Pill className="rounded-full border border-white/25 px-4 py-1.5">Join the Waitlist</Pill>
    </div>
  </header>

  {/* TRIPTYCH PANORAMA */}
  <FadeUp>
    <div className="relative mx-auto max-w-[1200px]">
      <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
        {[0,1,2].map(i => (
          <div key={i} className="relative aspect-[3/4] overflow-hidden">
            <img src="/assets/sunset-mountains.jpg" alt=""
                 className="absolute h-full w-[300%] max-w-none object-cover"
                 style={{ left: `${-i * 100}%` }} />
          </div>
        ))}
      </div>
      {/* central black lens capsule */}
      <LensCapsule className="absolute left-1/2 top-1/2 h-28 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow-inner" />
    </div>
  </FadeUp>

  {/* BOTTOM ROW */}
  <div className="mx-auto mt-8 grid max-w-[1200px] items-end gap-6 px-2 md:grid-cols-2">
    <FadeUp delay={0.15}>
      <div>
        <p className="max-w-xs text-xs leading-relaxed text-white/55">
          An all-in-one tool for email, CRM, project management and more that automatically organizes itself.
        </p>
        <Pill className="mt-4 inline-block rounded-full border border-white/25 px-5 py-2 text-sm">Join the Waitlist</Pill>
      </div>
    </FadeUp>
    <FadeUp delay={0.25}>
      <div className="text-right">
        <h1 className="text-6xl font-extrabold leading-none md:text-7xl">Organized.</h1>
        <p className="mt-2 text-sm italic text-white/45">So you don't have to be.</p>
      </div>
    </FadeUp>
  </div>
</section>
```

## Copy data (example, from the preview)
```ts
const copy = {
  blurb: "An all-in-one tool for email, CRM, project management and more that automatically organizes itself.",
  word: "Organized.",
  tagline: "So you don't have to be.",
  cta: "Join the Waitlist",
};
```

## Motion & acceptance
- Slim dark nav: lowercase "micro" logo (left), "Login" + bordered "Join the Waitlist" pill (right).
- A three-panel triptych of one golden-hour mountain/lake sunset photo, split by thin dark gaps, with a matte-black rounded "lens" capsule centered over the middle seam.
- Bottom row: short left blurb + "Join the Waitlist" pill, and a large white "Organized." headline with an italic "So you don't have to be." tagline on the right.
- Triptych fades up first; blurb (left) and headline (right) stagger in after; the lens capsule can subtly pulse/scale.
- Reduced-motion: disable pulse + translate, opacity-only. On mobile the triptych can become a single image and the bottom row stacks (headline above blurb).
