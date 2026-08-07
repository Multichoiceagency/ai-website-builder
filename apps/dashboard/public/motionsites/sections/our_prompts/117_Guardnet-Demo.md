# Guardnet Demo — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Info · about.

Build a dark **`GuardnetAbout`** section: a near-black canvas with a single glowing organic blob (amber→blue
gradient orb) floating center, two short copy blocks flanking it (left small caption, right paragraph), and a
row of four glass "trusted-by" logo cards across the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0A0A0B`. Center orb is the only light source.
- Key colors seen: black `#0A0A0B`, warm amber/orange top-edge `#E8932E`/`#C56A1F`, electric blue bottom-edge
  `#3A57E8`/`#5B7CFF`, body text muted grey `#A7A7AD`, headings near-white `#ECECEE`.
- Font Inter; small body copy `text-[13px]` with relaxed `leading-relaxed`.
- Max content width `max-w-6xl`, section padding `py-20`.

## Helpers
- `FadeUp` (framer-motion) for copy/cards.
- `Blob` — the gradient orb: a rounded organic shape (`rounded-[45%_55%_60%_40%/50%_45%_55%_50%]`) filled with a
  radial/linear amber→black→blue gradient, slow `scale`/`rotate` breathing, heavy `blur` halo behind it.
- `LogoCard` — glass chip: `bg-white/[0.03] border border-white/10 rounded-xl backdrop-blur` with icon + name.

## Structure
```tsx
<section className="relative isolate overflow-hidden bg-[#0A0A0B] py-20 text-white">
  {/* center glowing orb */}
  <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2">
    <Blob className="h-[360px] w-[360px] blur-[2px]
      bg-[radial-gradient(60%_60%_at_50%_25%,#E8932E_0%,#7a4a12_30%,#0A0A0B_60%),radial-gradient(70%_70%_at_50%_90%,#3A57E8_0%,transparent_55%)]" />
  </div>

  <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-2">
    {/* left small caption, vertically mid */}
    <FadeUp className="md:col-start-1 md:row-start-1 md:self-center md:max-w-[220px]">
      <p className="text-[13px] leading-relaxed text-white/55">
        Shielding users' info with premier tech, granting them with safety in all places.
      </p>
    </FadeUp>

    {/* right paragraph, top-aligned */}
    <FadeUp delay={0.1} className="md:col-start-2 md:row-start-1 md:max-w-[300px] md:justify-self-end">
      <p className="text-[13px] leading-relaxed text-white/70">
        By teaming up with a defender service, a business can dramatically improve the safeguard of its
        important info. This covers applying strong obfuscation protocols, gateway barriers, and observation
        engines to shield against unauthorized entries, info escapes, and malicious cyberhacks.
      </p>
    </FadeUp>
  </div>

  {/* trusted-by logo row */}
  <div className="relative z-10 mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
    {logos.map((l, i) => (
      <FadeUp key={l.name} delay={i * 0.08}>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-7 backdrop-blur">
          <span className="text-white/80">{l.icon}</span>
          <span className="text-sm font-medium text-white/90">{l.name}</span>
        </div>
      </FadeUp>
    ))}
  </div>
</section>
```

## Logos data (example, from the preview)
```ts
const logos = [
  { name: "Apex",         icon: "★" },
  { name: "forge",        icon: "◎" },
  { name: "Eastern Delta", icon: "W" },
  { name: "Skybank",      icon: "❖" },
];
```

## Motion & acceptance
- The orb breathes: slow `scale:[1,1.05,1]` + tiny `rotate:[-2,2,-2]` over ~16s, with a large blurred halo so the
  amber top + blue bottom bleed into the black.
- Copy blocks fade-up (left caption, right paragraph); logo cards stagger in (0/.08/.16/.24).
- Acceptance checklist:
  - [ ] Near-black `#0A0A0B` background, single centered organic gradient orb (amber top, blue bottom) as only light.
  - [ ] Left short caption mid-height, right longer paragraph top-aligned, both muted grey.
  - [ ] Bottom row of four glass logo cards (Apex / forge / Eastern Delta / Skybank) with icon + name.
  - [ ] Glassmorphic cards: `bg-white/[0.03]`, `border-white/10`, `backdrop-blur`, rounded.
  - [ ] `prefers-reduced-motion`: freeze the orb (static gradient), keep opacity fades only.
