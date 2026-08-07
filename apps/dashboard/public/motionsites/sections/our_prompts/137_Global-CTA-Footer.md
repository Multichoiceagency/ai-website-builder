# Global CTA Footer — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: CTA · cta.
> No-code/internal-tools hero met dark footer: bovenin een floral-foto hero ("Build the tools your team actually needs") met dashboard-mockup rechts, eronder een zwarte footer met vier linkkolommen + waitlist e-mail capture.

Build a combined **`HeroWithCTAFooter`** section for an internal-tools / workflow brand ("Highframe"):
a dark hero over a soft floral macro photo (transparent nav, headline with one italic word, two CTAs,
and a floating product dashboard card on the right), followed by a near-black footer with four link
columns and an email "Sign up for waitlist" capture.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Hero background = a dim floral/garden photo (`/assets/floral-dark.jpg`, `object-cover`)
  with a `bg-black/55` overlay for legibility; footer is solid `#0B0B0C`.
- Colors I see: white text `#FAFAFA`, muted `text-white/60`, white pill CTA (filled) + ghost CTA
  with a play icon; footer headers `text-white/40` uppercase, links `text-white/70`.
- Fonts: a serif-ish display for the headline (`font-serif`, the word "actually" in italic),
  Inter for nav/footer. Max width `max-w-[1200px]`.

## Helpers
- `FadeUp` — framer-motion stagger wrapper.
- `Pill` — filled white CTA `bg-white text-black rounded-full`; `GhostPill` — `border-white/30 text-white` with a `play_circle` icon.
- `FooterCol` — heading + list of links.

## Structure
```tsx
<>
  {/* HERO */}
  <section className="relative isolate overflow-hidden">
    <img src="/assets/floral-dark.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-black/55" />

    <header className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6 text-sm text-white/80">
      <span className="flex items-center gap-2 font-semibold text-white">◎ Highframe</span>
      <nav className="hidden gap-7 md:flex"><a>Product ▾</a><a>Resources ▾</a><a>Pricing</a><a>Customers</a></nav>
      <a className="rounded-full border border-white/30 px-4 py-2">Book a demo</a>
    </header>

    <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-24 pt-12 md:grid-cols-2">
      <div>
        <FadeUp><h1 className="font-serif text-4xl leading-tight text-white md:text-5xl">
          Build the tools your team <span className="italic">actually</span> needs
        </h1></FadeUp>
        <FadeUp delay={0.15}><p className="mt-5 max-w-md text-sm text-white/65">
          Turn any process into an intelligent form that routes data and triggers actions instantly.
        </p></FadeUp>
        <FadeUp delay={0.3}><div className="mt-8 flex gap-3">
          <Pill>Get started for free</Pill>
          <GhostPill>▶ Watch demo</GhostPill>
        </div></FadeUp>
      </div>
      {/* floating dashboard mockup */}
      <FadeUp delay={0.25}>
        <div className="rounded-xl border border-white/10 bg-[#101114] shadow-2xl">
          <img src="/assets/dataflow-dashboard.png" alt="DataFlow orchestrator" className="rounded-xl" />
        </div>
      </FadeUp>
    </div>
  </section>

  {/* FOOTER / GLOBAL CTA */}
  <footer className="bg-[#0B0B0C] py-16 text-white">
    <div className="mx-auto grid max-w-[1200px] gap-10 px-6 md:grid-cols-[repeat(3,1fr)_1.4fr]">
      {footerCols.map(col => <FooterCol key={col.title} {...col} />)}
      <div>
        <span className="flex items-center gap-2 font-semibold">◎ Highframe</span>
        <p className="mt-3 text-sm text-white/55">Skip the dev queue. Build internal workflows, smart forms, and automations without code.</p>
        <div className="mt-5 flex overflow-hidden rounded-full border border-white/15 bg-white/5">
          <input placeholder="Email" className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-white/40" />
          <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">Sign up for waitlist</button>
        </div>
      </div>
    </div>
  </footer>
</>
```

## Footer data (example, from the preview)
```ts
const footerCols = [
  { title: "Product", links: ["Workflow builder","AI automations","Smart forms","Data connections","Internal apps"] },
  { title: "Resources", links: ["Mobile","Manifesto","Press","Docs","Pricing"] },
  { title: "Company", links: ["About","Blog","Careers","Customers"] },
];
```

## Motion & acceptance
- Hero over a darkened floral macro photo with `bg-black/55`; serif headline with the single word "actually" in italic.
- Sub-copy + two CTAs: a filled white "Get started for free" pill and a ghost "▶ Watch demo" pill.
- Right side shows a floating dark dashboard mockup card ("DataFlow / Data Pipeline Orchestrator") with a faint border + shadow.
- Footer is solid near-black with three link columns (Product / Resources / Company) plus a brand block with an email + white "Sign up for waitlist" capture.
- Headline → sub → CTAs → mockup stagger-fade-up; footer fades in on scroll. CTAs lift on hover.
- Reduced-motion: opacity-only, no translate. Grid collapses to single column on mobile; footer columns stack.
