# Scroll Landing Page — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Interactive · hero.
> Donkere, dromerige scroll-landing met een nachtelijk natuur-/bos-achtergrond (paardenbloemen, verlichte planten), een transparante nav, een grote centrale headline-vraag, een pill "Get course" knop, en twee browser-mockups die uit de begroeiing oprijzen onderaan.

Build a dark interactive **`ScrollLanding`** section: a dreamy night-nature background
(dandelions + glowing plants), a transparent nav, a pill announcement chip, a large
centered headline question, a "Get course" pill, and two overlapping browser/app
mockups rising out of the foliage at the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = full-bleed image (`/assets/scroll-nature.jpg`, near-black night forest
  with glowing dandelions/flowers) via `object-cover`; subtle center radial lift behind the headline.
- Mockups = rounded `rounded-xl border border-white/10` browser windows, overlapping, half-emerging from the grass.
- Fonts: a clean sans (Inter); headline regular-weight, large, white.
- Key colors I see: black/forest-green background, white text `#F4F4F4`, muted grey body, soft warm flower highlights, orange wildflowers in foreground.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` whileInView, `once`).
- `Rise` — mockups rise + fade as they enter: `initial={{opacity:0,y:60}}`, `whileInView={{opacity:1,y:0}}`, spring.
- `Chip` — small rounded `bg-white/10 border border-white/15` announcement pill.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-black text-[#F4F4F4]">
  <img src="/assets/scroll-nature.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_35%,rgba(255,255,255,0.06),transparent)]" />

  {/* NAV */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6 text-sm">
    <span className="flex items-center gap-2 font-semibold"><span>✦</span> UI Rocket</span>
    <nav className="hidden gap-7 text-white/70 md:flex">
      <a className="hover:text-white">About</a><a className="hover:text-white">Features</a>
      <a className="hover:text-white">What you get</a><a className="hover:text-white">Pricing</a>
    </nav>
    <div className="flex items-center gap-4 text-sm">
      <a className="text-white/70 hover:text-white">Login</a>
      <a className="rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur hover:bg-white/25">Get started</a>
    </div>
  </header>

  {/* centered hero copy */}
  <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 text-center">
    <FadeUp><Chip>Founder member sale special</Chip></FadeUp>
    <FadeUp delay={0.12}>
      <h1 className="mt-6 text-4xl font-normal leading-[1.1] tracking-tight md:text-5xl">
        Are you a designer or builder<br/>who wants to stay ahead of AI?
      </h1>
    </FadeUp>
    <FadeUp delay={0.24}>
      <p className="mt-4 max-w-md text-sm text-white/65">Learn to turn your ideas into stunning websites with AI.</p>
    </FadeUp>
    <FadeUp delay={0.36}>
      <a className="mt-7 rounded-full bg-white/15 px-6 py-2.5 text-sm text-white backdrop-blur hover:bg-white/25">Get course</a>
    </FadeUp>
  </div>

  {/* two overlapping mockups rising from the grass */}
  <div className="relative z-10 mx-auto mt-12 flex max-w-5xl items-end justify-center px-6">
    <Rise className="w-[44%] -mr-10 translate-y-6">
      <img src="/assets/scroll-mock-1.jpg" alt="" className="rounded-xl border border-white/10 shadow-2xl" />
    </Rise>
    <Rise className="w-[56%]">
      <img src="/assets/scroll-mock-2.jpg" alt="" className="rounded-xl border border-white/10 shadow-2xl" />
    </Rise>
  </div>
</section>
```

## Content data (example, from the preview)
```ts
const hero = {
  brand: "UI Rocket",
  nav: ["About", "Features", "What you get", "Pricing"],
  chip: "Founder member sale special",
  headline: "Are you a designer or builder who wants to stay ahead of AI?",
  sub: "Learn to turn your ideas into stunning websites with AI.",
  cta: "Get course",
  mockups: ["/assets/scroll-mock-1.jpg", "/assets/scroll-mock-2.jpg"],
};
```

## Motion & acceptance
- Chip → headline → sub → CTA fade-up with stagger (0 / .12 / .24 / .36).
- The two mockups rise (`Rise`, y:60→0) with a spring as they scroll into view, overlapping; one nudged up/left, the other forward.
- Optional scroll-linked parallax: foreground flowers move faster than the background as the user scrolls.
- Acceptance checklist:
  - Full-bleed dark night-nature background (dandelions / glowing plants / orange wildflowers) with a soft center glow behind the headline.
  - Transparent nav: "✦ UI Rocket" left, 4 center links, Login + "Get started" pill right.
  - Centered chip "Founder member sale special", large two-line headline question, muted sub, "Get course" glass pill.
  - Two overlapping browser/app mockups rising out of the foliage at the bottom.
  - Respect `prefers-reduced-motion`: disable rise/parallax, keep fade only.
```
