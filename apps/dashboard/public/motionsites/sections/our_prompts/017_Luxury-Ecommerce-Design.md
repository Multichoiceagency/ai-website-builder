# Luxury Ecommerce (skincare) — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Ecommerce · hero.
> Editorial luxe skincare storefront: split-image hero, "best sellers" productcarrousel, en drie full-bleed categorie-tegels (face / beauty tools / body).

Build a light, editorial **`SkincareStorefront`** page composed of three stacked sections:
`AnnouncementHero`, `BestSellers`, and `CategoryTiles`.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `embla-carousel-react` for the slider, `cn()` from `@/lib/utils`.
- Light theme. Page background warm off-white `#F4EEE9` (token `--cream`). Text near-black `#1A1714`.
- Type: a clean grotesk (Inter / "Geist") for UI; a slightly condensed weight for the big editorial headline. Lowercase styling on headline.
- Generous whitespace, 12-col mental grid, max content width `1280px`, thin hairline dividers `border-black/10`.

## Helpers
- `FadeUp` (framer-motion, `y:24→0`, `duration:0.7`, `ease:[0.22,1,0.36,1]`, `viewport once`).
- `Pill` / ghost button: `rounded-full bg-white px-5 py-2 text-xs shadow-sm hover:shadow`.

## 1) AnnouncementHero
```tsx
<header className="bg-cream">
  <div className="border-b border-black/10 py-2 text-center text-[11px] tracking-wide text-black/60">free shipping for orders over 50€</div>
  <nav className="flex items-center justify-between px-6 py-4">
    <span className="font-semibold tracking-[0.15em]">STRETCH</span>
    <ul className="hidden gap-8 text-sm md:flex"><li>shop</li><li>learn</li><li>journal</li><li>theme</li></ul>
    <div className="flex items-center gap-4 text-sm">🌐 EUR · account · search · cart</div>
  </nav>
  {/* split hero: editorial portrait left, product-on-ocean right */}
  <div className="grid grid-cols-1 md:grid-cols-2">
    <div className="relative">
      <img src="/assets/face-citrus.jpg" className="h-[70vh] w-full object-cover" alt=""/>
      <div className="absolute inset-0 flex flex-col justify-center p-10">
        <FadeUp><h1 className="max-w-md text-4xl font-medium lowercase leading-[1.05] text-white md:text-5xl">ethical beauty,<br/><span className="underline decoration-amber-300 decoration-2 underline-offset-8">sustainable impact.</span></h1></FadeUp>
        <FadeUp delay={0.1}><p className="mt-4 max-w-xs text-sm text-white/85">Committed to sustainable beauty and minimizing our impact on the planet.</p></FadeUp>
        <FadeUp delay={0.2}><a className="mt-6 w-fit rounded-full bg-white px-6 py-2.5 text-sm text-black">about us</a></FadeUp>
      </div>
    </div>
    <img src="/assets/product-ocean.jpg" className="h-[70vh] w-full object-cover" alt=""/>
  </div>
</header>
```
- Right image carries small slider dots bottom-right (carousel of hero shots).

## 2) BestSellers (embla carousel)
```tsx
<section className="bg-cream py-16">
  <div className="mx-auto max-w-[1280px] px-6">
    <h2 className="mb-8 flex items-center gap-2 text-2xl"><span className="text-lg">●</span> best sellers <span className="text-black/40">sets</span></h2>
    {/* horizontal embla track of product cards */}
    <div className="flex gap-6 overflow-hidden">
      {products.map(p => (
        <article className="min-w-[230px]">
          <span className="text-[10px] uppercase tracking-wide text-black/50">{p.tag}<br/>{p.sub}</span>
          <div className="my-3 flex h-72 items-center justify-center"><img src={p.img} className="max-h-full" alt=""/></div>
          <p className="text-sm">{p.name}</p>
          <p className="text-sm text-black/60">€{p.price} {p.old && <s className="text-black/30">€{p.old}</s>}</p>
        </article>
      ))}
    </div>
    <div className="mt-6 flex justify-center"><span className="h-0.5 w-24 bg-black/20"/></div>
  </div>
</section>
```
- Products data (example): cleansing gel €6, unifying serum spray €34, super glow set €92 (old €130), radiance day oil €59, deep moisture …
- Each card: tiny uppercase eyebrow (e.g. "UNIFY / TIGHTEN PORES"), centered bottle on cream, name, price (+ optional strikethrough).

## 3) CategoryTiles
```tsx
<section className="grid grid-cols-1 md:grid-cols-3">
  {[{label:"face",img:"/assets/cat-face.jpg",cta:"shop face"},
    {label:"beauty tools",img:"/assets/cat-tools.jpg",cta:"shop beauty tools"},
    {label:"body",img:"/assets/cat-body.jpg",cta:"shop body"}].map(c=>(
    <div className="relative h-[60vh]">
      <img src={c.img} className="h-full w-full object-cover" alt=""/>
      <span className="absolute left-6 top-8 text-4xl lowercase text-white [writing:vertical] md:text-5xl">{c.label}</span>
      <a className="absolute bottom-6 left-6 rounded-full bg-white/90 px-5 py-2 text-xs">{c.cta}</a>
    </div>
  ))}
</section>
```
- Big lowercase label runs along the tile (vertical/oversized), small white pill CTA bottom-left.

## Motion & acceptance
- All headings/cards fade-up on scroll (stagger 0/.1/.2); best-sellers track is draggable (embla), with a centered progress bar.
- Light cream theme throughout, editorial lowercase headline with amber underline accent, split hero (portrait + product-on-ocean), product carousel with euro pricing + strikethrough, 3 full-bleed category tiles with oversized labels + pill CTAs.
- Responsive: hero & tiles stack to 1 col on mobile; carousel scrolls horizontally. Reduced-motion safe.
