# Orbis Cards — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Cards · features.

Build a playful **`OrbisCards`** collection section: a deep navy starfield stage, a left heading
("COLLECTION OF *Space* OBJECTS" with the middle word in a green script), a "SEE ALL CREATORS"
link top-right with a green underline, and a row of three rounded glassy cards each showing a 3D
astronaut/blob character over a pastel-cloud sky, with a "Rarity score" and a circular arrow button.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Dark theme. Background = deep **navy `#141A2E`/`#10162B`** starfield (subtle dotted stars, faint marble texture).
- Accent = **lime/green `#9BE34A`** for the script word, the "ALL" underline, and link accents.
- Cards: rounded `rounded-2xl`, glassy edge `border border-white/10 bg-white/[0.04] backdrop-blur`,
  each holding a 3D character render over a soft pastel-blue cloud backdrop (`/assets/clouds.jpg`).
- Text white; headline heavy uppercase sans + a green handwritten script for "Space"
  (`font-["Caveat"] text-[#9BE34A]`). Font Inter for body.

## Helpers
- `FadeUp` (framer-motion, opacity+y) for heading + card stagger.
- `Float` — gentle bob per character render: `animate={{y:[0,-6,0]}}`, `transition={{duration:5,repeat:Infinity, delay}}`.
- `Starfield` — sparse animated dots / twinkle behind everything (very low opacity).

## Structure
```tsx
<section className="relative overflow-hidden bg-[#141A2E] px-6 py-16 text-white">
  <Starfield className="pointer-events-none absolute inset-0 opacity-40" />

  {/* heading row */}
  <div className="relative z-10 mx-auto flex max-w-6xl items-start justify-between">
    <FadeUp>
      <h2 className="text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
        Collection of<br />
        <span className="font-['Caveat'] text-4xl font-bold normal-case text-[#9BE34A] md:text-5xl">Space</span>{" "}
        Objects
      </h2>
    </FadeUp>
    <FadeUp delay={0.1}>
      <a className="text-sm font-semibold uppercase tracking-wide">
        See <span className="border-b-2 border-[#9BE34A] text-white">All</span> Creators ↗
      </a>
    </FadeUp>
  </div>

  {/* three character cards */}
  <div className="relative z-10 mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {objects.map((o, i) => (
      <FadeUp key={o.name} delay={0.15 + i * 0.1}>
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur">
          {/* character over pastel cloud sky */}
          <div className="relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: "url(/assets/clouds.jpg)" }}>
            <Float delay={i * 0.4} className="absolute inset-0 flex items-center justify-center">
              <img src={o.render} alt={o.name} className="h-4/5 w-auto object-contain drop-shadow-2xl" />
            </Float>
          </div>
          {/* footer: rarity score + arrow button */}
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/45">Rarity score:</p>
              <p className="text-lg font-semibold">{o.score}/10</p>
            </div>
            <button className="rounded-full border border-white/20 p-2.5 text-white transition hover:bg-white/10" aria-label="View">
              →
            </button>
          </div>
        </article>
      </FadeUp>
    ))}
  </div>
</section>
```

## Objects data (example, from the preview)
```ts
const heading = { pre: "Collection of", accent: "Space", post: "Objects", link: "See All Creators" };
const objects = [
  { name: "Orange-visor Astronaut", render: "/assets/obj/astro-orange.png", score: "8.7" },
  { name: "Helmet Buddy",           render: "/assets/obj/astro-helmet.png", score: "9"   },
  { name: "Pale Blob",              render: "/assets/obj/blob-pale.png",    score: "8.2"  },
];
```

## Motion & acceptance
- Heading + "See All Creators" fade in; cards `FadeUp` with stagger (.15 / .25 / .35).
- Each 3D character gently `Float`s with an offset delay; cards hover-lift slightly (`whileHover y:-4`), arrow button brightens on hover.
- Starfield twinkles faintly behind; the green script word + green "All" underline are the only colour accents.
- Respect `prefers-reduced-motion`: stop float/twinkle, keep static fades.
- Acceptance checklist:
  - Deep-navy starfield stage; left heading "COLLECTION OF Space OBJECTS" with "Space" in a green handwritten script.
  - Top-right "SEE ALL CREATORS ↗" link with a green underline under "ALL".
  - Three rounded glassy cards, each a 3D astronaut/blob character floating over a pastel-blue cloud sky.
  - Card footer per item: "Rarity score: X/10" + circular outlined arrow button.
  - Lime-green accents only; reduced-motion safe.
