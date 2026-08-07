# Learnly — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Lichte e-learning hero: zwart logo + centrale nav links, een grote drieregelige headline "Study. Train. Rise.", een zoek/aanmeld-input met oranje knop, en rechts drie verticale mentor-portretkaarten met labels.

Build a clean, light **`LearnlyHero`** section for an online-mentorship platform ("Learnly"):
a top nav (bold logo, centered links, "Enter" + black "Try It Now" pill), a left column with a
big three-word stacked headline and a search field + orange CTA, and a right column of three
vertical portrait cards (mentors) with module labels, plus a centered tagline below.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = off-white `#F4F5F3` (`bg-[#F4F5F3]`), no gradient.
- Colors I see: near-black ink `#15171A` for headline/logo/tagline, accent orange `#F5A623`
  (CTA button + small "100 topics" chip), card label chips dark navy `#1E2230` and orange.
- Fonts: heavy grotesque/sans for the headline (`font-sans font-extrabold`, very tight tracking),
  Inter for nav/body. Headline is huge: `text-6xl`/`text-7xl`, three lines each ending in a period.
- Max width `max-w-[1200px]`; two-column layout `md:grid-cols-2` with the cards overflowing slightly.

## Helpers
- `FadeUp` — framer-motion stagger wrapper for headline lines + cards.
- `MentorCard` — rounded portrait card with a bottom-left label; supports `tall` (front card) vs side cards.
- `Pill` — rounded-full button (black filled for "Try It Now").

## Structure
```tsx
<section className="bg-[#F4F5F3] text-[#15171A]">
  {/* NAV */}
  <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
    <span className="text-xl font-extrabold tracking-tight">Learnly<span className="text-[#F5A623]">.</span></span>
    <nav className="hidden gap-7 text-sm text-[#15171A]/70 md:flex">
      <a>Chase dreams</a><a>Collection</a><a>Trades</a><a>Students</a>
    </nav>
    <div className="flex items-center gap-4 text-sm">
      <a>Enter</a>
      <Pill className="rounded-full bg-[#15171A] px-5 py-2 text-white">Try It Now</Pill>
    </div>
  </header>

  {/* TWO-COLUMN HERO */}
  <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 pt-8 md:grid-cols-2">
    {/* LEFT: stacked headline + search */}
    <div>
      <FadeUp>
        <h1 className="text-6xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
          Study.<br/>Train.<br/>Rise.
        </h1>
      </FadeUp>
      <FadeUp delay={0.2}>
        <div className="mt-10 flex max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
          <input placeholder="Chase your dreams" className="flex-1 bg-transparent px-4 py-3 text-sm outline-none" />
          <button className="bg-[#F5A623] px-6 text-sm font-semibold text-white">Up</button>
        </div>
      </FadeUp>
    </div>

    {/* RIGHT: 3 vertical mentor cards */}
    <div className="flex items-end justify-end gap-3">
      {mentors.map((m, i) => (
        <FadeUp key={m.label} delay={0.1 + i * 0.1}>
          <MentorCard {...m} />
        </FadeUp>
      ))}
    </div>
  </div>

  {/* CENTERED TAGLINE */}
  <FadeUp delay={0.4}>
    <p className="py-16 text-center text-xl font-bold md:text-2xl">Boundless passes to 100+ mentorships.</p>
  </FadeUp>
</section>
```

## Mentors data (example, from the preview)
```ts
const mentors = [
  { label: "Editing Module", topics: "100 Topics", img: "/assets/mentor-1.jpg", tall: true },
  { label: "Editing", img: "/assets/mentor-2.jpg" },
  { label: "Commerce", img: "/assets/mentor-3.jpg" },
];
```
- The front (tall) card shows a smiling mentor, "Editing Module" bottom-left and a small "100 Topics" chip bottom-right.
- The two narrower side cards have vertical/rotated labels ("Editing", "Commerce") on dark chips.

## Motion & acceptance
- Light off-white canvas; huge three-line headline "Study. / Train. / Rise." each ending in a period, near-black extrabold.
- Search field (white, rounded) with an orange "Up" submit button; orange accent also on the logo dot and "100 Topics" chip.
- Right column = three vertical portrait cards aligned to the bottom, the leftmost taller/front, the others narrower and slightly behind.
- Centered bold tagline "Boundless passes to 100+ mentorships." below the hero.
- Headline lines stagger-fade-up, then search, then cards (left→right), then tagline. Cards lift on `whileHover y:-4`.
- Reduced-motion: opacity-only fades, no translate. Mobile stacks the right cards below the headline in a horizontal scroll row.
