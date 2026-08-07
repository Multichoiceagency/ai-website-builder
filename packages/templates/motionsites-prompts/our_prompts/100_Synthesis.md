# Synthesis — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Donkere, ultra-minimalistische editorial bio-hero: serif logo linksboven, uppercase nav rechtsboven, en drie gecentreerde paragrafen met een laatste vervaagde paragraaf op een bijna-zwarte achtergrond.

Build a quiet, near-black **`SynthesisHero`** section for a personal/portfolio brand ("Elias Norden"):
a slim transparent top bar (serif wordmark + 3 uppercase links) and a centered column of three
short bio paragraphs where the last fades to a dimmer grey for an editorial cadence.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme only. Background = near-black `#0A0B0F` (`bg-[#0A0B0F]`), no gradient, no imagery — pure type.
- Colors I actually see: brand text near-white `#F4F2EF`, active body copy `text-white/85`,
  last (faded) paragraph `text-white/45`, nav links muted `text-white/55` with `hover:text-white/85`.
- Fonts: a serif display for the wordmark (`font-["Cormorant_Garamond"]` / italic "Norden"),
  Inter/`font-sans` for nav + body. Body copy is calm, ~`text-xl`/`leading-relaxed`.
- Max content width for the bio column `max-w-2xl`, fully centered; generous vertical padding.

## Helpers
- `FadeUp` — framer-motion wrapper, `initial={{opacity:0,y:18}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `NavLink` — `<a>` with `text-[11px] uppercase tracking-[0.22em] text-white/55 hover:text-white/85 transition`.

## Structure
```tsx
<section className="relative min-h-screen w-full bg-[#0A0B0F] text-white">
  {/* TOP BAR — serif wordmark left, uppercase nav right */}
  <header className="flex items-center justify-between px-8 py-6 md:px-12">
    <a className="text-lg tracking-tight text-[#F4F2EF]">
      Elias <span className="font-['Cormorant_Garamond'] italic font-medium">Norden</span>
    </a>
    <nav className="flex gap-8">
      <NavLink>Articles</NavLink>
      <NavLink>Allocations</NavLink>
      <NavLink>Inquire</NavLink>
    </nav>
  </header>

  {/* CENTERED BIO COLUMN */}
  <div className="mx-auto flex max-w-2xl flex-col items-center gap-7 px-6 pt-[12vh] text-center">
    {paragraphs.map((p, i) => (
      <FadeUp key={i} delay={i * 0.15}>
        <p className={cn(
          "text-lg leading-relaxed md:text-xl md:leading-relaxed",
          i === paragraphs.length - 1 ? "text-white/45" : "text-white/85"
        )}>
          {p}
        </p>
      </FadeUp>
    ))}
  </div>
</section>
```

## Bio data (example, from the preview)
```ts
const paragraphs = [
  "Elias is committed to a tomorrow where people enjoy more vibrant, rewarding decades beside loved ones.",
  "In pursuit of this purpose, in 2021 he co-founded the Healthspan Research Alliance, a global nonprofit backing early-stage science on prolonging the healthy human lifespan.",
  "Elias is also a managing partner and co-founder of VitalVC, a venture capital firm backing bold pioneers in biotech and lifespans.",
];

const nav = ["Articles", "Allocations", "Inquire"];
```

## Motion & acceptance
- Paragraphs stagger in via `FadeUp` (delays 0 / .15 / .30); the third paragraph stays visibly dimmer (`text-white/45`) — a deliberate editorial fade, not an animation bug.
- No background image or gradient — the void-black canvas and centered serif/sans typography are the whole composition.
- Wordmark mixes upright "Elias" with italic serif "Norden"; nav is uppercase `tracking-[0.22em]`, muted with a hover lift.
- Body column is centered, `max-w-2xl`, with comfortable line-height and gap between paragraphs.
- Reduced-motion: skip the y-translation, keep a soft opacity fade only. Layout reflows to a single readable column on mobile.
