# Interior Features — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Features · features.
> Donkere interieur-design feature-rij: drie afgeronde kaarten met dimly-lit woonkamer-foto's, een gekleurd icoon + titel per kaart, korte subtekst, en een centrale kaart die uitgelicht/scherper is.

Build a moody, dark **`InteriorFeatures`** section for an interior-design / room-planning tool:
an intro line up top, then a horizontal row of three rounded image-cards (collaborate / build in
real time / plan to scale) where the middle card is brought forward and the side cards are slightly
dimmed and clipped at the edges (carousel feel).

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = warm charcoal `#1C1A18` with a very faint top vignette
  (`bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,255,255,0.05),transparent)]`).
- Colors I see: warm cream card chrome `#E9E2D5`-ish text, body `text-white/65`,
  accent icon dots green `#4ADE80`, amber/orange `#F59E0B`, soft lilac chip `#A78BFA`.
- Cards: rounded `rounded-3xl`, photo on top, dark caption strip below; side cards `opacity-60 scale-[0.92]`,
  center card full `opacity-100 scale-100` with a subtle ring.
- Font Inter. Max width `max-w-[1200px]`, gap between cards `gap-6`.

## Helpers
- `FadeUp` — framer-motion, `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`, stagger by index.
- `IconDot` — small rounded square with a brand-colored glyph (Material Symbols `groups` / `bolt` / `straighten`).
- `FeatureCard` — image + caption block, accepts `featured` to control scale/opacity/ring.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#1C1A18] py-20">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,255,255,0.05),transparent)]" />

  {/* intro line, right-aligned-ish at top */}
  <FadeUp>
    <p className="mx-auto mb-12 max-w-xl px-6 text-center text-sm leading-relaxed text-white/55">
      From the first sketch to the final finish, the whole design process stays connected on one shared canvas.
    </p>
  </FadeUp>

  {/* three-card row, center card forward */}
  <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6">
    {cards.map((c, i) => (
      <FadeUp key={c.title} delay={i * 0.12} className="flex-1">
        <article className={cn(
          "overflow-hidden rounded-3xl border border-white/10 bg-black/40 transition",
          c.featured ? "scale-100 opacity-100 ring-1 ring-white/20" : "scale-[0.92] opacity-60"
        )}>
          <div className="relative aspect-[3/4]">
            <img src={c.img} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="space-y-2 p-5">
            <div className="flex items-center gap-2">
              <IconDot color={c.color} icon={c.icon} />
              <h3 className="text-base font-semibold text-[#E9E2D5]">{c.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{c.desc}</p>
          </div>
        </article>
      </FadeUp>
    ))}
  </div>
</section>
```

## Cards data (example, from the preview)
```ts
const cards = [
  { title: "Design the room together", icon: "groups", color: "#A78BFA", img: "/assets/room-collab.jpg",
    desc: "Nudge furniture with your studio on one shared canvas." },
  { title: "Build the room in real time", icon: "bolt", color: "#4ADE80", featured: true, img: "/assets/room-build.jpg",
    desc: "Move pieces, explore finishes, and align with your studio on one shared canvas." },
  { title: "Plan with real-world scale", icon: "straighten", color: "#F59E0B", img: "/assets/room-plan.jpg",
    desc: "Place furniture, check dimensions, and visualize how everything fits." },
];
```

## Motion & acceptance
- Three rounded cards in a row; center card is scaled to 100% / full opacity with a faint ring, side cards `scale-[0.92] opacity-60` and clipped by the container edges (carousel-on-canvas look).
- Each card: dim warm interior photo on top, caption strip below with a colored icon dot (lilac / green / amber), bold cream title, and a 1–2 line muted description.
- Intro paragraph fades in above the row; cards stagger-fade-up (0 / .12 / .24).
- Hover on a side card lifts it toward `opacity-100 scale-95`; the visible cursor pointer in the preview hints at interactivity.
- Reduced-motion: drop scale/translate transitions, keep static layout + opacity. Cards stack vertically on mobile (`flex-col`).
