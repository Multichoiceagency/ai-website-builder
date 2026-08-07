# Growth Marketing SaaS — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Lichte, frisse SaaS-hero ("Zipwire.Dev"): witte achtergrond met een groen/wildbloemen-foto onderaan, een transparante nav met taal-switch + groene "Get it Today" knop, een gigantische zwarte headline "PUSH.ROUTE.DEPLOY", een korte subtitel en een centrale QR-code kaart met groene "Try Now" knop.

Build a light SaaS **`GrowthHero`** section: a white page with a green wildflower-field
photo across the bottom, a transparent nav (logo + links + language switch + green
download button), a huge black hero wordmark, a two-line sub-line, and a centered QR-code
card with a green "Try Now" button.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Page background white `#FFFFFF`; bottom edge = a wildflower-meadow photo
  (`/assets/zipwire-flowers.jpg`) that arcs up at the sides (rounded/curved top mask).
- Hero wordmark = very large, black, heavy condensed sans, tight tracking.
- QR card = white rounded `rounded-xl border border-black/10 shadow-lg`, QR image + green CTA pill.
- Fonts: a heavy grotesque (`font-sans font-black`) for the wordmark; Inter for nav/body.
- Key colors I see: white `#FFFFFF`, near-black `#111315`, brand green `#34C759`, muted grey body `#6B7075`.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` on mount, stagger).
- `GreenButton` — `bg-[#34C759] text-white rounded-md` pill with hover darken.
- `LangSwitch` — tiny flag/code chip ("EN") next to the CTA.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-white text-[#111315]">

  {/* NAV */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6 text-sm">
    <span className="text-lg font-extrabold">Zipwire<span className="text-[#34C759]">.</span>Dev</span>
    <nav className="hidden gap-8 text-[#3A3D42] md:flex">
      <a className="hover:text-black">Overview</a><a className="hover:text-black">Docs</a>
      <a className="hover:text-black">Our Team</a><a className="hover:text-black">Upgrade</a>
    </nav>
    <div className="flex items-center gap-3">
      <LangSwitch />
      <GreenButton className="px-4 py-2 text-sm">⤓ Get it Today</GreenButton>
    </div>
  </header>

  {/* centered hero copy */}
  <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 text-center">
    <FadeUp>
      <h1 className="text-5xl font-black uppercase leading-none tracking-tight md:text-7xl">
        Push.Route.Deploy
      </h1>
    </FadeUp>
    <FadeUp delay={0.12}>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-[#6B7075]">
        Get Full Mesh Data Streams, Automatic UDP Hole Punching, Granular Controls, And Many More Cool Tricks!
      </p>
    </FadeUp>

    {/* QR card */}
    <FadeUp delay={0.24}>
      <div className="mt-8 w-fit rounded-xl border border-black/10 bg-white p-3 shadow-lg">
        <img src="/assets/zipwire-qr.png" alt="QR code" className="h-32 w-32" />
        <GreenButton className="mt-2 w-full py-2 text-xs">Try Now</GreenButton>
      </div>
    </FadeUp>
  </div>

  {/* wildflower meadow photo arcing across the bottom */}
  <img src="/assets/zipwire-flowers.jpg" alt=""
    className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[28vh] w-full object-cover [mask-image:radial-gradient(120%_100%_at_50%_120%,#000_60%,transparent)]" />
</section>
```

## Content data (example, from the preview)
```ts
const hero = {
  brand: "Zipwire.Dev",
  nav: ["Overview", "Docs", "Our Team", "Upgrade"],
  cta: "Get it Today",      // green button with download glyph
  lang: "EN",
  headline: "PUSH.ROUTE.DEPLOY",
  sub: "Get Full Mesh Data Streams, Automatic UDP Hole Punching, Granular Controls, And Many More Cool Tricks!",
  qr: { image: "/assets/zipwire-qr.png", cta: "Try Now" },
};
```

## Motion & acceptance
- Wordmark → sub → QR card fade-up with stagger (0 / .12 / .24).
- Green buttons darken on hover; the QR card lifts slightly (`whileHover y:-3`).
- Optional: the flower meadow at the bottom has a very slow parallax / gentle sway on scroll.
- Acceptance checklist:
  - White hero with a green wildflower-meadow photo arcing across the bottom (curved/masked top edge).
  - Transparent nav: "Zipwire.Dev" wordmark (green dot accent), 4 links, "EN" language chip, green "Get it Today" button with download glyph.
  - Giant black uppercase wordmark "PUSH.ROUTE.DEPLOY", tight tracking, centered.
  - Two-line muted-grey sub-line about mesh data streams / UDP hole punching.
  - Centered white QR-code card with a green "Try Now" button. Respect `prefers-reduced-motion`.
```
