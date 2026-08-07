# Luxury Focus — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: E-commerce · landing.

Build an upscale, split-screen **`LuxuryFocus`** product page: a white left half with a "Back to
series" link, eyebrow, serif product title, fine-print description, a centered studio packshot of a
pink-sapphire earring, and a bottom bar with a dark "Add to Atelier Bag" button, qty stepper and
price; the right half is a dark, cinematic on-model close-up photo of the earring worn.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Editorial split theme. Left panel white `#FFFFFF`; right panel a dark cinematic image with a
  `bg-[#0B0B0C]` fallback behind the model photo.
- KEY COLORS: ink `#1A1A1A`, muted grey caption `#8A8A8A`, near-black CTA `#171717` with white
  text, pink sapphire accent `#E8A6C4` reads from the product photo only (no colored UI).
- Fonts: a serif display for the product title (`font-["Cormorant_Garamond"]`/Playfair), sans for
  labels, price + buttons.
- Full-height `min-h-screen`, two equal columns `md:grid-cols-2`.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, staggered delay, `ease:[0.22,1,0.36,1]`).
- `QtyStepper` — controlled `- 1 +` counter (`min 1`), animates the value on change.
- `KenBurns` — very slow scale/pan on the right model image for cinematic life.

## Structure
```tsx
<section className="grid min-h-screen grid-cols-1 md:grid-cols-2">
  {/* LEFT: product detail (white) */}
  <div className="relative flex flex-col bg-white px-10 py-8 text-[#1A1A1A]">
    <a className="text-[11px] uppercase tracking-[0.2em] text-black/55">← Back to series</a>

    <div className="mx-auto mt-10 max-w-md text-center">
      <FadeUp><p className="text-[11px] uppercase tracking-[0.3em] text-black/45">Aura fine earrings</p></FadeUp>
      <FadeUp delay={0.1}>
        <h1 className="mt-3 font-serif text-3xl font-medium leading-tight">18K White Gold &amp; Pink Sapphire</h1>
      </FadeUp>
      <FadeUp delay={0.18}>
        <p className="mx-auto mt-4 max-w-sm text-[12px] leading-relaxed text-black/50">
          A bespoke pair of masterfully crafted drop-stud earrings, showcasing exceptional step-cut
          pink sapphires encircled by a radiant, light-catching halo of hand-set micro-diamonds.
        </p>
      </FadeUp>
    </div>

    {/* centered packshot */}
    <FadeUp delay={0.26}>
      <img src="/products/sapphire-earring.png" alt="Pink sapphire earring"
        className="mx-auto my-auto max-h-[46vh] w-auto object-contain" />
    </FadeUp>

    {/* bottom bar: CTA + stepper + price */}
    <div className="mt-auto flex items-center gap-4 pt-6">
      <button className="flex-1 rounded-sm bg-[#171717] py-4 text-[12px] font-medium uppercase tracking-[0.15em] text-white">
        Add to Atelier Bag
      </button>
      <QtyStepper />
      <span className="font-serif text-2xl">$1,850</span>
    </div>
  </div>

  {/* RIGHT: cinematic on-model photo (dark) */}
  <div className="relative hidden overflow-hidden bg-[#0B0B0C] md:block">
    <KenBurns src="/products/sapphire-on-model.jpg" className="h-full w-full object-cover" />
  </div>
</section>
```

## Product data (example, from the preview)
```ts
const product = {
  series: "Aura Fine Earrings",
  title: "18K White Gold & Pink Sapphire",
  description: "A bespoke pair of masterfully crafted drop-stud earrings, showcasing exceptional step-cut pink sapphires encircled by a radiant, light-catching halo of hand-set micro-diamonds.",
  price: "$1,850",
  cta: "Add to Atelier Bag",
  packshot: "/products/sapphire-earring.png",
  onModel: "/products/sapphire-on-model.jpg",
};
```

## Motion & acceptance
- Left text + packshot fade-up with stagger (eyebrow → title → description → product image → bottom bar).
- Right model photo has a slow Ken-Burns zoom/pan; qty stepper animates value changes.
- Acceptance checklist:
  - Even 50/50 split: white product detail left, dark cinematic on-model photo right.
  - Top-left "← Back to series" link, uppercase tracked.
  - Centered eyebrow "Aura Fine Earrings", serif title "18K White Gold & Pink Sapphire", small grey description paragraph.
  - Centered studio packshot of the pink-sapphire earring on white.
  - Bottom bar: full-width dark "Add to Atelier Bag" button, "- 1 +" qty stepper, serif price "$1,850".
  - Right photo: macro shot of the earring worn on an ear, dark moody lighting.
  - Responsive: stacks to single column on mobile (image below detail); `prefers-reduced-motion` disables Ken-Burns + slide.
```
