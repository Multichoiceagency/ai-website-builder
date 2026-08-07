# SpeakUp Venture Hero — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Lichte, optimistische venture-studio hero: zwart logo + nav, grote groene serif headline "Crafting the improbable", korte subtekst + zwarte CTA links, en rechts/onder een fotorealistische grasheuvel met wilde bloemen en een ontluikend kiemplantje.

Build a fresh, light **`SpeakUpHero`** for a venture-studio brand ("SpeakUp"):
a top nav (black square logo, centered links, dark "Begin a venture" pill), a left column with a
large two-line green serif headline + short body + black CTA, and a photoreal grassy flower-hill
with a single sprouting seedling occupying the right/bottom of the frame.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = clean white `#FFFFFF`; the bottom-right is filled by a photoreal
  grass-and-wildflowers hill image (`/assets/flower-hill.png`) blending into white at the top edge.
- Colors I see: forest green headline `#2E7D32`, near-black ink `#141414` for nav/body/CTA,
  multicolored flower accents in the photo (no need to theme them). White negative space dominates the left.
- Fonts: an elegant serif for the headline (`font-serif`, weight ~400, very large `text-6xl`/`text-7xl`),
  Inter for nav + body. Max width `max-w-[1200px]`.

## Helpers
- `FadeUp` — framer-motion stagger wrapper (headline → body → CTA).
- `Pill` — dark rounded-full button (`bg-[#141414] text-white`).
- `Sprout` — optional very slow scale/breathe on the seedling image for a "growing" feel.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-white text-[#141414]">
  {/* NAV */}
  <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
    <span className="flex items-center gap-2 text-lg font-bold"><span className="grid h-6 w-6 place-items-center rounded bg-[#141414] text-white">◧</span> SPEAKUP</span>
    <nav className="hidden gap-7 text-sm text-[#141414]/70 md:flex">
      <a>Projects</a><a>The Team</a><a>Products</a><a>Our Story</a><a>Say Hello!</a>
    </nav>
    <Pill className="rounded-full bg-[#141414] px-5 py-2 text-sm text-white">Begin a venture</Pill>
  </header>

  {/* HERO COPY (left) */}
  <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-10 md:pt-20">
    <FadeUp>
      <h1 className="max-w-2xl font-serif text-6xl font-normal leading-[1.05] text-[#2E7D32] md:text-7xl">
        Crafting the<br/>improbable
      </h1>
    </FadeUp>
    <FadeUp delay={0.15}>
      <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#141414]/70">
        We bring your boldest digital visions to reality. Because it cannot be done is where we all begin now
      </p>
    </FadeUp>
    <FadeUp delay={0.3}>
      <Pill className="mt-8 inline-block rounded-full bg-[#141414] px-6 py-3 text-sm text-white">Begin a venture</Pill>
    </FadeUp>
  </div>

  {/* FLOWER HILL + SEEDLING (right/bottom) */}
  <Sprout className="pointer-events-none absolute bottom-0 right-0 z-0 w-[60%] md:w-[55%]">
    <img src="/assets/flower-hill.png" alt="" className="w-full" />
  </Sprout>
</section>
```

## Nav data (example, from the preview)
```ts
const nav = ["Projects","The Team","Products","Our Story","Say Hello!"];
const cta = "Begin a venture";
```

## Motion & acceptance
- Clean white canvas with a large forest-green serif headline "Crafting the / improbable" split over two lines.
- Top nav: black square logo + "SPEAKUP" wordmark, centered links (Projects / The Team / Products / Our Story / Say Hello!), and a dark "Begin a venture" pill (repeated as the in-body CTA).
- Right/bottom of the frame is a photoreal grass hill covered in multicolored wildflowers with a single green seedling sprouting at the top of the hill.
- Headline → body → CTA stagger-fade-up; the seedling/hill image gently scales (`scale:[1,1.02,1]`, ~12s) to imply growth.
- Reduced-motion: disable the breathe/scale, keep opacity-only entrance. On mobile the flower-hill drops below the copy as a full-width band.
