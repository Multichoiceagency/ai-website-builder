# Capabilities Overview — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Features · features.

Build a light **`CapabilitiesOverview`** bento section: a serif intro line top-left with a white "Start a Program ↗"
pill top-right, then a multi-column bento grid of image/info tiles — a large gradient "Program Background" timeline
card on the left, a "Mission Voice" quote + a "2K Highly Qualified Engineers" photo tile in the middle, and a
"Core Systems" photo card with floating action chips plus a "Reach Engineering" contact tile on the right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = off-white `#F4F5F6`; tiles `rounded-2xl` with subtle borders/shadows.
- Key colors seen: paper `#F4F5F6`, ink `#15171A` headline, muted grey `#6B7177` body, rocket-launch gradient
  card (lilac→peach `#C9C3E8`→`#E8C7A8`), photo overlays with white text, glass action chips `bg-white/10`.
- Fonts: a clean grotesk/serif for the headline; Inter for tile labels and body. Tiny uppercase labels
  `tracking-[0.16em]` for "PROGRAM BACKGROUND", "MISSION VOICE", "CORE SYSTEMS", "REACH ENGINEERING".
- Max content width `max-w-6xl`; CSS grid bento (`grid-cols-12` with col-spans).

## Helpers
- `FadeUp` (framer-motion) for the intro and each tile (stagger by index).
- `Tile` — base rounded card wrapper; `PhotoTile` overlays a label + caption on an image.
- `ActionChip` — small glass pill button over the Core Systems photo (`bg-white/10 border border-white/20
  backdrop-blur rounded-full px-3 py-1.5 text-xs text-white`).
- `TimelineCard` — gradient card with a year-list (2024/2025/2026) of milestones over a rocket photo.

## Structure
```tsx
<section className="bg-[#F4F5F6] py-16 text-[#15171A]">
  <div className="mx-auto max-w-6xl px-6">
    {/* intro row */}
    <div className="mb-8 flex items-start justify-between gap-6">
      <FadeUp>
        <h2 className="max-w-2xl font-serif text-3xl leading-tight md:text-4xl">
          Propulsion programs need a partner that can move from concept to certified hardware.
        </h2>
        <p className="mt-4 max-w-xl text-sm text-[#6B7177]">
          EngineTech combines precision manufacturing, hot-fire validation, materials engineering, and mission
          support that aircraft and spacecraft programs cannot afford uncertainty.
        </p>
      </FadeUp>
      <button className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow">Start a Program ↗</button>
    </div>

    {/* bento grid */}
    <div className="grid grid-cols-12 gap-4">
      {/* left: timeline / program background */}
      <FadeUp className="col-span-12 md:col-span-4">
        <TimelineCard img="/assets/rocket.jpg" label="Program Background" rows={timeline} />
      </FadeUp>

      {/* middle: quote + engineers photo stacked */}
      <div className="col-span-12 grid grid-rows-2 gap-4 md:col-span-4">
        <FadeUp delay={0.08}>
          <Tile className="bg-white p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#6B7177]">Mission Voice</p>
            <p className="mt-3 text-sm leading-relaxed">"EngineTech brought the discipline we needed: clear design reviews, repeatable test data, and hardware that arrived ready for integration."</p>
            <p className="mt-4 text-sm font-semibold">Dr. Lena Morris <span className="block font-normal text-[#6B7177]">Propulsion Lead, Orbital Systems Group</span></p>
          </Tile>
        </FadeUp>
        <FadeUp delay={0.16}>
          <PhotoTile img="/assets/engineer.jpg" big="2K" caption="Highly Qualified Engineers" />
        </FadeUp>
      </div>

      {/* right: core systems photo + reach engineering */}
      <div className="col-span-12 grid grid-rows-[1.4fr_1fr] gap-4 md:col-span-4">
        <FadeUp delay={0.24}>
          <PhotoTile img="/assets/core-systems.jpg" label="Core Systems">
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
              {["Turbopumps","Hot-fire","Launch","Analysis","Control"].map(c => <ActionChip key={c}>{c}</ActionChip>)}
            </div>
          </PhotoTile>
        </FadeUp>
        <FadeUp delay={0.32}>
          <Tile className="relative bg-white p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#6B7177]">Reach Engineering</p>
            <p className="mt-3 text-sm">programs@enginetech.com</p>
            <p className="text-sm text-[#6B7177]">+1 415 018 4270</p>
            <button className="absolute bottom-5 right-5 rounded-full bg-[#15171A] p-2.5 text-white">↗</button>
          </Tile>
        </FadeUp>
      </div>
    </div>
  </div>
</section>
```

## Data (example, from the preview)
```ts
const timeline = [
  { year:"2026", title:"Reusable upper-stage demonstrator", note:"Thermal qualification" },
  { year:"2025", title:"Hybrid-electric aircraft platform",  note:"Combustor redesign" },
  { year:"2024", title:"Orbital transfer vehicle",           note:"Flight article delivery" },
];
const coreChips = ["Turbopumps","Hot-fire","Launch","Analysis","Control"];
const reach = { email:"programs@enginetech.com", phone:"+1 415 018 4270" };
```

## Motion & acceptance
- Intro + each bento tile fade-up with stagger by index; tiles get a subtle `whileHover y:-3` lift.
- Glass action chips over the Core Systems photo are interactive (hover brightens `bg-white/20`).
- Acceptance checklist:
  - [ ] Off-white bento layout; serif intro headline left, white "Start a Program ↗" pill top-right.
  - [ ] Left timeline card (gradient rocket photo) with 2024/2025/2026 milestone rows under "Program Background".
  - [ ] Middle: "Mission Voice" quote card (Dr. Lena Morris) + photo tile with big "2K / Highly Qualified Engineers".
  - [ ] Right: "Core Systems" photo card with floating glass chips (Turbopumps/Hot-fire/Launch/Analysis/Control).
  - [ ] Right-bottom "Reach Engineering" contact tile with email, phone, and round ↗ button.
  - [ ] `prefers-reduced-motion`: disable lift/fade-up motion, keep static bento.
