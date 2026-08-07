# Conversion — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.
> Donkere "smart bakery"-stijl hero met een rijke, sfeervolle stilleven-foto (bakkerij-ingrediënten op een roze tafelkleed voor een wijnrood gordijn), een transparante mega-nav met dropdowns, een gecursiveerd serif onderschrift bovenin ("for Professionals") en een gigantische serif headline die onderaan over de volle breedte loopt ("THE SMART BAKERY SOLUTION").

Build a moody **`ConversionHero`** section: a full-bleed warm still-life photo (bakery
ingredients on a pink cloth in front of a wine-red velvet curtain), a transparent mega-nav
with dropdown links and a region/language switch, a small centered italic serif eyebrow,
a vertical social rail on the right, and a giant serif headline running edge-to-edge
across the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark-on-photo theme. Background = full-bleed image (`/assets/bakery-stilllife.jpg`,
  wine-red curtain + pink tablecloth + jars/ingredients) via `object-cover`; thin top bar
  darkening `from-black/60 to-transparent` for nav legibility.
- Giant bottom headline = serif display (`font-serif`), uppercase, very tight tracking, runs off the edges.
- Nav items have caret dropdowns; a yellow "EN" language pill sits top-right.
- Fonts: an elegant serif (`font-["Cormorant_Garamond"]` / `font-serif`) for eyebrow + headline; Inter for nav.
- Key colors I see: wine-red `#7A2230`, dusty-pink cloth `#D9A6A0`, warm browns, white text `#FAF8F5`, yellow lang pill `#E7B53A`.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` on mount, stagger).
- `NavDropdown` — nav link + caret that reveals a small panel on hover (`AnimatePresence`).
- `SocialRail` — fixed-right vertical column of round icon buttons (linkedin / chat / etc.).

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden text-[#FAF8F5]">
  <img src="/assets/bakery-stilllife.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />

  {/* MEGA NAV */}
  <header className="relative z-20 flex items-center justify-between px-8 py-5 text-[13px]">
    <button className="flex items-center gap-1 text-white/90">⌖ Hong Kong / Macau <span className="text-white/50">▾</span></button>
    <nav className="hidden items-center gap-7 md:flex">
      <NavDropdown label="About Us" />
      <NavDropdown label="Partnering With Us" />
      <span className="grid h-8 w-8 place-items-center rounded bg-white/10">◈</span>
      <NavDropdown label="Our Products" />
      <NavDropdown label="Let's Connect!" />
    </nav>
    <span className="rounded bg-[#E7B53A] px-2 py-1 text-xs font-semibold text-black">EN</span>
  </header>

  {/* centered italic serif eyebrow */}
  <FadeUp>
    <p className="relative z-10 mt-10 text-center font-serif text-xl italic tracking-wide text-white/90">
      for Professionals
    </p>
  </FadeUp>

  {/* vertical social rail right */}
  <SocialRail className="fixed right-4 top-1/2 z-20 -translate-y-1/2" />

  {/* giant serif headline running edge-to-edge across the bottom */}
  <FadeUp delay={0.2}>
    <h1 className="absolute inset-x-0 bottom-2 z-10 whitespace-nowrap px-4 text-center font-serif text-5xl font-medium uppercase leading-none tracking-tight md:text-7xl">
      The Smart Bakery Solution
    </h1>
  </FadeUp>
</section>
```

## Content data (example, from the preview)
```ts
const hero = {
  region: "Hong Kong / Macau",
  nav: ["About Us", "Partnering With Us", "Our Products", "Let's Connect!"], // each with caret dropdown
  lang: "EN",                 // yellow pill, black text
  eyebrow: "for Professionals", // centered italic serif
  headline: "THE SMART BAKERY SOLUTION", // giant serif, bottom, edge-to-edge
  socials: ["linkedin", "chat"], // round buttons on the right rail
};
```

## Motion & acceptance
- Italic eyebrow fades-up first, then the giant bottom headline fades-up (`FadeUp`, delays 0 / .2).
- Nav dropdowns reveal small panels on hover via `AnimatePresence`; region button + EN pill are interactive.
- Optional: very slow background scale (`animate scale:[1,1.04,1]` 30s) for a living still-life feel.
- Acceptance checklist:
  - Full-bleed warm bakery still-life photo: wine-red velvet curtain, dusty-pink tablecloth, jars + ingredients; thin top darkening for nav.
  - Transparent mega-nav: "⌖ Hong Kong / Macau" region picker left, centered logo glyph + dropdown links (About Us / Partnering With Us / Our Products / Let's Connect!), yellow "EN" pill right.
  - Centered italic serif eyebrow "for Professionals".
  - Vertical social rail of round icon buttons fixed on the right.
  - Giant serif uppercase headline "THE SMART BAKERY SOLUTION" running edge-to-edge across the bottom. Respect `prefers-reduced-motion`.
```
