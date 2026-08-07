# LaunchEx Submissions — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Features · features.
> Light, symmetrical "Submissions" feature section with an eyebrow + heading, a centered liquid-chrome 3D blob, and two columns of subtle glass feature cards flanking it.

Build a balanced **`SubmissionsFeatures`** section: a soft grey panel with a small bracketed eyebrow,
a bold dark heading, a centered iridescent liquid-metal 3D orb, and three feature cards on the left
and three on the right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = light grey `#DBDBDB` panel with a slightly rounded inner frame and a
  faint inner border `border border-black/5`.
- Center art = a glossy chrome/iridescent liquid blob (`/assets/liquid-orb.png`), ~26vw, centered.
- Typeface: clean grotesque (Inter). Eyebrow = tiny letter-spaced `[SUBMISSIONS]` in muted slate;
  heading bold steely-blue `#2E4A5C`; card titles dark, captions muted grey.
- Cards: near-flat `bg-white/40 border border-black/5 rounded-md` very subtle, low elevation.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper, used on eyebrow/heading and each card with stagger.
- `Float` — slow infinite vertical drift + tiny rotate for the orb (`y:[0,-12,0]`, 10s).
- `FeatureCard` — `{ title, sub }` → titled card with muted subline.

## Structure
```tsx
<section className="relative w-full bg-[#CFCFCF] px-6 py-20">
  <div className="relative mx-auto max-w-[1200px] rounded-xl border border-black/5 bg-[#DBDBDB] px-8 py-16">
    {/* eyebrow + heading */}
    <div className="text-center">
      <FadeUp>
        <p className="text-[11px] tracking-[0.35em] text-[#5C6B75]">[ SUBMISSIONS ]</p>
      </FadeUp>
      <FadeUp delay={0.1}>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#2E4A5C] sm:text-5xl">SUBMISSIONS</h2>
      </FadeUp>
    </div>

    {/* 3-column layout: left cards / orb / right cards */}
    <div className="mt-14 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex flex-col gap-4">
        {leftCards.map((c, i) => (
          <FadeUp key={c.title} delay={0.15 + i * 0.08}><FeatureCard {...c} /></FadeUp>
        ))}
      </div>

      <Float className="mx-auto">
        <img src="/assets/liquid-orb.png" alt="" className="h-[26vw] max-h-[320px] w-auto object-contain" />
      </Float>

      <div className="flex flex-col gap-4">
        {rightCards.map((c, i) => (
          <FadeUp key={c.title} delay={0.15 + i * 0.08}><FeatureCard {...c} /></FadeUp>
        ))}
      </div>
    </div>
  </div>
</section>

function FeatureCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-md border border-black/5 bg-white/40 px-5 py-4 text-center transition hover:bg-white/70">
      <p className="text-sm font-semibold text-[#2A3A45]">{title}</p>
      <p className="mt-0.5 text-xs text-[#7A8690]">{sub}</p>
    </div>
  );
}
```

## Cards data (example, from the preview)
```ts
const leftCards = [
  { title: "Lead",                sub: "AI venture for commerce" },
  { title: "Emerging innovations", sub: "in food commerce" },
  { title: "The best innovations", sub: "for learners and young students" },
];
const rightCards = [
  { title: "Innovations for advanced", sub: "career training" },
  { title: "The finest innovations",   sub: "in finance" },
  { title: "Categories",               sub: "coming soon" },
];
```

## Motion & acceptance
- Eyebrow + heading fade-up first; left and right cards stagger in (~0.08s each).
- Center orb floats slowly (`Float`) with gentle vertical drift + micro-rotate; optional specular
  glint shimmer.
- Bracketed `[ SUBMISSIONS ]` eyebrow + bold steely-blue "SUBMISSIONS" heading, centered.
- Symmetric 3-col layout: 3 left cards / liquid-metal orb / 3 right cards; cards are low-contrast
  glassy with title + muted subline, lighten on hover.
- Light grey rounded inner panel framed in the page. Respect `prefers-reduced-motion`
  (freeze orb, opacity-only). Responsive: collapses to a single column with the orb centered.
```
