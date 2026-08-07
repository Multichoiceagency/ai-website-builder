# Cinematic Landing Page — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Full-bleed cinematische hero met een warme, filmische foto van een persoon met krullend rood haar in een rommelige interieur-scène; bovenop een transparante nav, een grote witte sans-serif headline links-boven, en een over-de-volle-breedte justified onderschrift onderaan.

Build a cinematic **`CinematicHero`** section: a full-bleed warm photographic background,
a transparent top nav (wordmark + center links + white "BUY MATCH PASS" pill), a large
two-line headline top-left, an outlined "EXPLORE OUR STADIUMS" button, and a big
justified strap-line spanning the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark/photo theme. Background = full-bleed image (`/assets/cinematic.jpg`, warm reds/greens,
  shallow-DOF interior) via `object-cover`; overlay a subtle bottom gradient
  `from-transparent via-transparent to-black/50` so the bottom strap-line stays legible.
- Fonts: a tight grotesque/sans for the big headline (`font-sans font-semibold`); uppercase nav `tracking-[0.15em]`.
- Big bottom strap-line uses very tight tracking and justified alignment so words run edge-to-edge.
- Key colors I see: warm image tones, white text `#FFFFFF`, white pill `#FFFFFF`/black text, faded grey for the last strap-line.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` on mount, stagger via delay).
- `OutlineButton` — bordered rounded button `border border-white/40 rounded-full` with a trailing → arrow in a circle.
- `JustifiedStrap` — bottom paragraph styled `text-justify` with `[text-align-last:justify]` so each line fills the width.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden text-white">
  <img src="/assets/cinematic.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />

  {/* NAV */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6 text-[11px] uppercase tracking-[0.15em]">
    <span className="text-lg font-bold tracking-[0.2em]">WTSX</span>
    <nav className="hidden gap-7 text-white/80 md:flex">
      <a className="hover:text-white">Leagues</a><a className="hover:text-white">Stadiums</a>
      <a className="hover:text-white">Training</a><a className="hover:text-white">Competitions</a>
      <a className="hover:text-white">Tickets</a>
    </nav>
    <a className="rounded-full bg-white px-4 py-2 font-semibold text-black">Buy Match Pass</a>
  </header>

  {/* headline top-left + outline CTA top-right */}
  <div className="relative z-10 flex items-start justify-between px-8 pt-6">
    <FadeUp>
      <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
        Championing<br/>The Pitch Of Legends
      </h1>
    </FadeUp>
    <FadeUp delay={0.2}>
      <OutlineButton className="mt-2 hidden md:inline-flex">Explore Our Stadiums</OutlineButton>
    </FadeUp>
  </div>

  {/* big justified strap-line bottom */}
  <FadeUp delay={0.4}>
    <JustifiedStrap className="absolute inset-x-0 bottom-8 z-10 px-8 text-3xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
      Complete Football Programs For Professional Player Development. We Build The Foundations
      <span className="text-white/35"> For Next-Generation Strikers, Midfielders And…</span>
    </JustifiedStrap>
  </FadeUp>
</section>
```

## Content data (example, from the preview)
```ts
const hero = {
  brand: "WTSX",
  nav: ["Leagues", "Stadiums", "Training", "Competitions", "Tickets"],
  cta: "Buy Match Pass",       // white pill, black text
  headline: ["Championing", "The Pitch Of Legends"],
  secondary: "Explore Our Stadiums", // outlined pill + arrow
  strap: "Complete Football Programs For Professional Player Development. We Build The Foundations For Next-Generation Strikers, Midfielders And…",
};
```

## Motion & acceptance
- Headline + secondary button + strap-line fade-up with stagger (0 / .2 / .4) on mount.
- Optional: very slow background scale (`animate scale:[1,1.05,1]` 30s) for a living-film feel; outline button arrow nudges right on hover.
- The bottom strap-line is justified edge-to-edge; the trailing clause fades to `text-white/35` (cut off, cinematic).
- Acceptance checklist:
  - Full-bleed warm cinematic photo background with a bottom darkening gradient.
  - Transparent nav: WTSX wordmark, 5 center links, white "Buy Match Pass" pill (black text).
  - Two-line white headline top-left ("Championing / The Pitch Of Legends"), tight tracking.
  - Outlined "Explore Our Stadiums" pill with a circled arrow, top-right.
  - Large justified strap-line across the bottom, last clause faded grey. Respect `prefers-reduced-motion`.
```
