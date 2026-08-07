# Reveal Hero — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Een full-bleed product-hero (lucht-zuiveraar merk "Pureflow One"): een groot zwart-wit portret van een persoon centraal, een gepilde donkere top-nav, en een kort headline-blok links-onder met een dubbele CTA.

Build a full-viewport **`RevealHero`** React section: a desaturated frontal portrait fills
the frame, a floating dark pill navigation sits at the top, and a low-left text block carries
an eyebrow, a tight two-line headline and a primary "Discover" pill plus a "View Specs" link.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Light/clean theme. Background = the photo itself (`/assets/pureflow-portrait.jpg`, `object-cover`)
  with a near-white top fade so the nav reads; bottom slightly darkened for the CTA.
- Key colors I see: near-white sky/skin highlights `#F3F4F2`, deep charcoal text + nav `#15171A`,
  a small green accent dot `#22C55E` on the "Reserve Yours" pill, and a soft lens-flare warm glow on the right.
- Font: Inter / system sans. Headline is medium-bold, tight tracking. Nav labels small.
- Max content width `max-w-7xl`, generous side padding (`px-6 md:px-10`).

## Helpers
- `FadeUp` — framer-motion wrapper: `initial={{opacity:0,y:18}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `PillNav` — rounded-full dark bar containing centered links + active highlight.
- `GlowFlare` — absolutely positioned soft radial highlight (`bg-[radial-gradient(circle,rgba(255,250,235,0.7),transparent_70%)] blur-2xl`).

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-[#F3F4F2]">
  {/* portrait background */}
  <img src="/assets/pureflow-portrait.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/15" />
  <GlowFlare className="absolute right-[6%] top-[55%] h-64 w-64" />

  {/* top row: logo · pill nav · reserve */}
  <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#15171A] text-white">◑</div>

    <PillNav className="hidden items-center gap-1 rounded-full bg-[#15171A]/95 px-2 py-1.5 text-sm text-white/80 md:flex">
      <a className="rounded-full bg-white px-4 py-1.5 font-medium text-black">Device</a>
      <a className="px-4 py-1.5">Real Stories</a>
      <a className="px-4 py-1.5">Science</a>
      <a className="px-4 py-1.5">Plans</a>
      <a className="px-4 py-1.5">Reach Us</a>
    </PillNav>

    <a className="flex items-center gap-2 rounded-full bg-[#15171A] px-4 py-2 text-sm text-white">
      <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Reserve Yours
    </a>
  </header>

  {/* low-left copy block */}
  <div className="absolute bottom-[14%] left-6 z-10 max-w-md md:left-10">
    <FadeUp><p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#15171A]/70">Pureflow One</p></FadeUp>
    <FadeUp delay={0.12}>
      <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-[#15171A] sm:text-5xl">
        Clean Air, Clear<br/>Mind. Anywhere.
      </h1>
    </FadeUp>
    <FadeUp delay={0.24}>
      <div className="mt-6 flex items-center gap-5">
        <a className="rounded-full bg-[#15171A] px-6 py-3 text-sm font-medium text-white transition hover:bg-black">Discover</a>
        <a className="flex items-center gap-1.5 text-sm font-medium text-[#15171A]/80">▶ View Specs</a>
      </div>
    </FadeUp>
  </div>
</section>
```

## Nav data (example, from the preview)
```ts
const nav = ["Device", "Real Stories", "Science", "Plans", "Reach Us"];
const active = "Device";
```

## Motion & acceptance
- Eyebrow + headline + CTA row stagger in via `FadeUp` (delays 0 / .12 / .24).
- Subtle parallax: the portrait may scale `1 → 1.04` very slowly (`30s`) for a living feel; flare breathes opacity `0.5 ↔ 0.8`.
- "Discover" pill darkens on hover; "View Specs" link nudges its ▶ a few px right on hover.
- Acceptance checklist:
  - Full-viewport desaturated frontal portrait fills the frame, `object-top`.
  - Top row = round logo (left), centered dark pill nav with white "Device" active chip, dark "Reserve Yours" pill with green dot (right).
  - Low-left block: "PUREFLOW ONE" eyebrow, two-line "Clean Air, Clear Mind. Anywhere." headline, dark "Discover" pill + "▶ View Specs" link.
  - Soft warm lens-flare glow on the right edge; white top fade keeps nav legible.
  - Responsive: pill nav hides on mobile (hamburger optional). Reduced-motion safe (kill scale/flare, keep fades).
