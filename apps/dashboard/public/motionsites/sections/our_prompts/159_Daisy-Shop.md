# Daisy Shop — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Ecommerce · hero.
> Speelse e-commerce landing voor een geur-merk: bovenaan een fris fruit-/model fotoblok met "SWEET DAISY / PERSONAL SCENT FINDER" en een zwevende product-add-to-cart kaart; daaronder een felblauw paneel met een zwevend parfumflesje en een tweede roze model-/bloemfoto.

Build a colorful e-commerce **`DaisyShop`** section: a top hero photo (model with citrus
slices) carrying a bold two-tone title and a floating "add to cart" product chip, then a
split panel below — an electric-blue tile with a floating perfume bottle, and a pink
model/flower photo tile.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/playful theme. Page background white `#FFFFFF`; accent panel electric blue `#2E9BF0`.
- Hero = full-width photo (`/assets/daisy-hero.jpg`, citrus + skin tones); title overlaid bottom-left.
- Floating product card = white rounded chip with a tiny bottle thumbnail, name + size + "ADD TO CART".
- Fonts: a heavy geometric sans for the title (`font-sans font-extrabold uppercase`); Inter for product text.
- Key colors I see: white `#FFFFFF`, electric blue `#2E9BF0`, near-black title `#16181C`, muted grey subtitle `#A9ABB0`, soft pink photo tones.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` whileInView, `once`).
- `Float` — gentle bob for the perfume bottle / product chip: `animate={{y:[0,-8,0]}}`, 5s loop.
- `ProductChip` — rounded white card: thumb + title + meta + "ADD TO CART" link.

## Structure
```tsx
<section className="bg-white">
  {/* TOP HERO PHOTO */}
  <div className="relative h-[60vh] w-full overflow-hidden">
    <img src="/assets/daisy-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    <FadeUp>
      <h1 className="absolute bottom-10 left-8 z-10 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">
        <span className="block text-[#16181C]">Sweet Daisy</span>
        <span className="block text-[#A9ABB0]">Personal Scent</span>
        <span className="block text-[#A9ABB0]">Finder</span>
      </h1>
    </FadeUp>

    {/* floating add-to-cart chip top-right */}
    <Float className="absolute right-8 top-1/2 z-10">
      <ProductChip name="Eau So Fresh" meta="100 ml / 3.4 oz" />
    </Float>
  </div>

  {/* SPLIT PANEL */}
  <div className="grid grid-cols-1 md:grid-cols-2">
    {/* blue tile with floating bottle */}
    <div className="relative flex min-h-[48vh] items-center justify-center bg-[#2E9BF0] p-10">
      <div className="absolute left-8 top-8 text-xs text-white/90">Daisy love</div>
      <div className="absolute right-8 top-8 text-xs text-white/90">Sweet</div>
      <Float>
        <img src="/assets/daisy-bottle.png" alt="Daisy perfume" className="h-64 w-auto rounded-md bg-white p-4 shadow-2xl" />
      </Float>
    </div>
    {/* pink model + flower photo tile */}
    <div className="relative min-h-[48vh]">
      <img src="/assets/daisy-model.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    </div>
  </div>
</section>
```

```tsx
function ProductChip({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-xl">
      <img src="/assets/daisy-bottle-thumb.png" alt="" className="h-10 w-10 rounded object-contain" />
      <div className="text-left text-xs">
        <div className="font-semibold text-[#16181C]">{name}</div>
        <div className="text-[#A9ABB0]">{meta}</div>
        <button className="mt-1 font-semibold tracking-wide text-[#16181C]">ADD TO CART</button>
      </div>
    </div>
  );
}
```

## Product data (example, from the preview)
```ts
const product = { name: "Eau So Fresh", meta: "100 ml / 3.4 oz", price: undefined };
const panel = { tag: "Daisy love", tagRight: "Sweet", bottle: "/assets/daisy-bottle.png" };
```

## Motion & acceptance
- Title fades-up over the hero photo; the product chip and the blue-tile bottle bob gently (`Float`, 5s).
- Add-to-cart link underlines / nudges on hover; tiles can have a subtle hover-zoom on their photos (`group-hover:scale-105`).
- Acceptance checklist:
  - Top hero photo (model + citrus) with a two-tone extrabold uppercase title bottom-left: "Sweet Daisy" (black) over "Personal Scent / Finder" (grey).
  - Floating white "add to cart" product chip (bottle thumb + "Eau So Fresh" + "100 ml / 3.4 oz" + "ADD TO CART") on the hero, right side.
  - Split panel below: electric-blue (`#2E9BF0`) tile with "Daisy love" / "Sweet" labels and a floating perfume bottle on a white card; pink model/flower photo tile beside it.
  - Responsive: split panel stacks to 1 column on mobile. Respect `prefers-reduced-motion` (disable float, keep fade).
```
