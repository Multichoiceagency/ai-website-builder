# Bold Portfolio Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Portfolio · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een gedurfde portfolio-hero waarin naam/rol als oversized statement neerkomen op een neutrale achtergrond, met een korte intro en een teaser-strook van projecten. Doel: persoonlijkheid en vakmanschap tonen en de bezoeker naar het werk/contact leiden.

## Design system (ui-ux-pro-max)

- **Style:** Bold/monochroom met blauw accent (Social Proof-Focused basis, vertaald naar portfolio: werk centraal, minimale chrome).
- **Pattern:** Portfolio Grid — hero (naam/rol) → project-teasers → contact.
- **Color palette (hex tokens):**
  - `primary` `#18181B` (near-black)
  - `secondary` `#3F3F46` (grijs)
  - `cta` `#2563EB` (blauw accent)
  - `bg` `#FAFAFA`
  - `text` `#09090B`
- **Font pairing (Google Fonts):** Archivo (heading) + Space Grotesk (body), `wght 300–700`, mood: minimal, creatief, clean.
- **Key effects:** oversized type, project-card hover-overlay, fade/clip-reveal, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#18181B",
    secondary: "#3F3F46",
    cta: "#2563EB",
    bg: "#FAFAFA",
    ink: "#09090B",
  },
  fontFamily: {
    display: ["Archivo", "system-ui", "sans-serif"],
    sans: ["Space Grotesk", "system-ui", "sans-serif"],
  },
}
```

```tsx
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
```

## Helpers

- `useGSAP(() => {...}, { scope: rootRef })` voor scoped cleanup.
- Wrap iedere headline-regel in een `overflow-hidden` masker zodat regels "van onder" inkomen (anim. op de `[data-line] > span`).
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)`.

## Structure

```tsx
export function BoldPortfolioHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-bg font-sans text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="font-display text-lg font-bold tracking-tight">M. Visser</span>
        <div className="hidden gap-8 text-sm text-secondary md:flex">
          <a href="#work" className="cursor-pointer hover:text-ink">Work</a>
          <a href="#about" className="cursor-pointer hover:text-ink">About</a>
          <a href="#contact" className="cursor-pointer hover:text-ink">Contact</a>
        </div>
        <a href="#contact" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Hire me</a>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pt-14">
        <p className="mb-6 text-sm uppercase tracking-[0.3em] text-cta" data-eyebrow>Product designer · Amsterdam</p>
        <h1 className="font-display font-extrabold leading-[0.9] tracking-[-0.04em] text-[clamp(3rem,11vw,11rem)]">
          <span className="block overflow-hidden" data-line><span className="block">Ik ontwerp</span></span>
          <span className="block overflow-hidden" data-line><span className="block text-cta">interfaces</span></span>
          <span className="block overflow-hidden" data-line><span className="block">die werken.</span></span>
        </h1>
        <p className="mt-8 max-w-md text-lg text-secondary" data-sub>
          10+ jaar product- en interactiedesign voor merken die details serieus nemen.
        </p>
      </div>

      {/* project teasers */}
      <div className="mx-auto mt-16 grid max-w-7xl grid-cols-2 gap-4 px-6 pb-20 md:grid-cols-4">
        {["Fintech app", "Brand system", "E-commerce", "Dashboard"].map((p, i) => (
          <a key={p} href="#work" className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white" data-card>
            <div className={cn("aspect-[4/5] w-full", i % 2 ? "bg-zinc-100" : "bg-zinc-200")} />
            <div className="absolute inset-0 flex items-end bg-ink/0 p-4 transition-colors duration-300 group-hover:bg-ink/60">
              <span className="translate-y-2 font-display text-sm font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">{p} →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

    tl.from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 })
      .from("[data-eyebrow]", { y: 18, autoAlpha: 0, duration: 0.5 }, "-=0.1")
      // regels komen vanuit het masker omhoog
      .from("[data-line] > span", { yPercent: 110, autoAlpha: 0, stagger: 0.12, ease: "power4.out" }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.5")
      .from("[data-card]", { y: 48, autoAlpha: 0, scale: 0.97, stagger: 0.1, ease: "back.out(1.6)" }, "-=0.4");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-eyebrow], [data-line] > span, [data-sub], [data-card]", { autoAlpha: 1, y: 0, yPercent: 0, scale: 1 });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Oversized naam/rol via `clamp(3rem, 11vw, 11rem)` (Archivo extrabold) met `text-cta` accentregel.
- [ ] Headline-regels reveal'en uit `overflow-hidden` maskers (`yPercent`), niet via opacity-only.
- [ ] Project-teasers hebben hover-overlay (`group-hover`) en stagger-entree.
- [ ] Eén `gsap.timeline()`: nav → eyebrow → lines → sub → cards.
- [ ] Eases: `power3.out`/`power4.out` (entrees), `back.out(1.6)` (cards).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar (geen motion).
- [ ] Alleen transform-aliases (`x/y/yPercent/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; contact-CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast.
