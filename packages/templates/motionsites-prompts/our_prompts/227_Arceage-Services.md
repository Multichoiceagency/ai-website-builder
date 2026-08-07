# Arceage Services — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Services · features.
> Agrarische services-sectie ("Arceage"): een zachte, wazige groene veld-achtergrond met een groot mixed serif/sans statement links-boven, een korte sub, een witte "Schedule Service"-pil rechts, en onderaan drie icoon-features met titel + korte beschrijving.

Build an atmospheric **`ArceageServices`** section: a softly blurred green field background, a large
mixed serif/sans headline upper-left (with an italic-serif accent word), a short subline, a white
"Schedule Service" pill on the right, and a bottom row of three icon features each with a title and
a short description.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark-over-photo theme. Background = a soft, out-of-focus green field photo (`/assets/field-blur.jpg`, `object-cover`)
  with a gentle dark overlay (`bg-black/25`) so white text reads.
- Key colors: near-white text `#F2F4EE`, muted body `#C7CFC0`, soft sage-green field tones `#5B7A52`/`#3F5638`.
- Font: bold sans for the headline with an italic serif accent (e.g. "Maximum Yield" in `font-serif italic`); small sans body.
- Max content width `max-w-6xl`; section roughly one viewport tall.

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `Feature` — `{icon, title, desc}` block: small line icon, title, short grey description.
- `Icon` — thin-stroke SVG/symbol helper (leaf, tractor, bug) at `~22px`.

## Structure
```tsx
<section className="relative flex min-h-screen flex-col justify-between overflow-hidden">
  <img src="/assets/field-blur.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-black/25" />

  {/* top: headline + subline | CTA */}
  <div className="relative z-10 mx-auto flex w-full max-w-6xl items-start justify-between px-8 pt-20">
    <div className="max-w-2xl">
      <FadeUp>
        <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-[#F2F4EE] sm:text-5xl">
          A Highly Efficient, Precision-Driven Harvesting Process Built For <span className="font-serif font-normal italic">Maximum Yield</span>
        </h2>
      </FadeUp>
      <FadeUp delay={0.12}>
        <p className="mt-5 text-sm text-[#C7CFC0]">Precision in every pass.</p>
      </FadeUp>
    </div>
    <FadeUp delay={0.2}>
      <a className="hidden shrink-0 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#1F2A1A] md:inline-block">Schedule Service</a>
    </FadeUp>
  </div>

  {/* bottom: three features */}
  <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 border-t border-white/15 px-8 py-12 md:grid-cols-3">
    {features.map((f,i) => (
      <FadeUp key={f.title} delay={0.1*i}>
        <div>
          <div className="text-[#F2F4EE]">{f.icon}</div>
          <h3 className="mt-5 text-base font-medium text-[#F2F4EE]">{f.title}</h3>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#C7CFC0]">{f.desc}</p>
        </div>
      </FadeUp>
    ))}
  </div>
</section>
```

## Features data (example, from the preview)
```ts
const features = [
  { icon:"❦", title:"Sustainable Crop Care",
    desc:"Nurturing your fields with eco-friendly practices to ensure healthy growth and robust yields." },
  { icon:"🚜", title:"Advanced Machinery",
    desc:"Deploying state-of-the-art tractors and harvesters for maximum efficiency and speed." },
  { icon:"✲", title:"Smart Pest Management",
    desc:"Protecting your harvest by monitoring and managing field ecosystems with precision." },
];
```

## Motion & acceptance
- Headline + subline + CTA fade-up (0/.12/.2); the three features stagger in left→right (0/.1/.2).
- Optional: the blurred field background slowly drifts/scales (`1 → 1.05`, ~30s) for a living-field feel.
- "Schedule Service" pill lifts/darkens on hover.
- Acceptance checklist:
  - Soft, out-of-focus green field background with a light dark overlay for legibility.
  - Large mixed headline "A Highly Efficient, Precision-Driven Harvesting Process Built For *Maximum Yield*" with the last words in italic serif; "Precision in every pass." subline.
  - White "Schedule Service" pill aligned to the upper-right.
  - Bottom hairline divider, then 3 icon features: Sustainable Crop Care / Advanced Machinery / Smart Pest Management, each with a short description.
  - Responsive: CTA hides/moves below on mobile, features stack. Reduced-motion safe (kill bg drift, keep fades).
