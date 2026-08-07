# E-commerce Website — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een conversie-gerichte landing-hero voor een e-commerce winkel: een aantrekkelijke productpropositie, een "Shop nu" CTA, en social proof (reviews, klantaantallen) plus een productbeeld-card. Doel: bezoekers richting de collectie/checkout sturen met vertrouwen.

## Design system (ui-ux-pro-max)

- **Style:** Social Proof-Focused — reviews/ratings, success-metrics, credibility markers.
- **Pattern:** CTA-georiënteerde hero met productkaart + proof-strook.
- **Color palette (hex tokens):**
  - `primary` `#0EA5E9` (sky blue, trust)
  - `secondary` `#38BDF8` (lichtblauw)
  - `cta` `#F97316` (warm oranje, koop-actie)
  - `bg` `#F0F9FF`
  - `text` `#0C4A6E`
- **Font pairing (Google Fonts):** Rubik (heading) + Nunito Sans (body), `wght 300–700`, mood: ecommerce, clean, conversion.
- **Key effects:** review star-ratings, stat counter (count-up), productkaart-reveal met scale, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#0EA5E9",
    secondary: "#38BDF8",
    cta: "#F97316",
    bg: "#F0F9FF",
    ink: "#0C4A6E",
  },
  fontFamily: {
    display: ["Rubik", "system-ui", "sans-serif"],
    sans: ["Nunito Sans", "system-ui", "sans-serif"],
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
- `countTo(el, end, suffix)` voor reviews/klanten-stats.
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)`.

```tsx
function countTo(el: HTMLElement, end: number, suffix = "") {
  const o = { v: 0 };
  return gsap.to(o, { v: end, duration: 1.5, ease: "power2.out",
    onUpdate: () => { el.innerText = Math.round(o.v).toLocaleString("nl-NL") + suffix; } });
}
```

## Structure

```tsx
export function EcommerceHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="font-display text-xl font-bold tracking-tight">Lumora<span className="text-primary">.</span></span>
        <div className="hidden gap-7 text-sm text-ink/70 md:flex">
          <a href="#shop" className="cursor-pointer hover:text-ink">Shop</a>
          <a href="#new" className="cursor-pointer hover:text-ink">Nieuw</a>
          <a href="#sale" className="cursor-pointer hover:text-ink">Sale</a>
        </div>
        <a href="#cart" className="cursor-pointer rounded-lg bg-cta px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600">Winkelmand</a>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-2">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-primary shadow-sm" data-badge>
            Gratis verzending vanaf €50
          </span>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl" data-headline>
            Premium essentials, <span className="text-cta">vandaag</span> in huis.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/70" data-sub>
            Zorgvuldig samengestelde collectie. Snel geleverd, makkelijk geretourneerd.
          </p>
          <div className="mt-8 flex flex-wrap gap-4" data-actions>
            <a href="#shop" className="cursor-pointer rounded-lg bg-cta px-7 py-3 font-bold text-white transition-colors hover:bg-orange-600">Shop nu</a>
            <a href="#collection" className="cursor-pointer rounded-lg border border-ink/20 bg-white px-7 py-3 font-semibold text-ink transition-colors hover:bg-sky-50">Bekijk collectie</a>
          </div>

          {/* social proof */}
          <div className="mt-9 flex flex-wrap items-center gap-8" data-proof>
            <div>
              <span className="font-display text-2xl font-bold text-primary"><span data-count="38000" data-suffix="+">0</span></span>
              <p className="text-sm text-ink/60">tevreden klanten</p>
            </div>
            <div>
              <span aria-hidden className="text-cta">★★★★★</span>
              <p className="text-sm text-ink/60"><strong>4.9</strong> uit 2.100 reviews</p>
            </div>
          </div>
        </div>

        {/* productkaart */}
        <div className="relative" data-product>
          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl">
            <div className="aspect-[4/5] w-full rounded-2xl bg-gradient-to-br from-secondary/40 to-primary/20" />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Aurora Tote</p>
                <p className="text-sm text-ink/60">Bestseller</p>
              </div>
              <p className="font-display text-xl font-bold text-cta">€89</p>
            </div>
          </div>
        </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    tl.from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 })
      .from("[data-badge]", { y: 16, autoAlpha: 0, scale: 0.9, ease: "back.out(1.7)" }, "-=0.1")
      .from("[data-headline]", { y: 40, autoAlpha: 0 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.45")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-proof] > *", { y: 20, autoAlpha: 0, stagger: 0.12 }, "-=0.3")
      .from("[data-product]", { x: 48, autoAlpha: 0, scale: 0.96, duration: 1 }, "-=0.9")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count), el.dataset.suffix ?? "")
        );
      }, "-=0.6");

    // zacht zwevende productkaart
    gsap.to("[data-product]", { y: "+=10", duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-badge], [data-headline], [data-sub], [data-actions] > *, [data-proof] > *, [data-product]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = Number(el.dataset.count).toLocaleString("nl-NL") + (el.dataset.suffix ?? ""); });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Conversie-headline (Rubik display) met `text-cta` accent; prominente "Shop nu" CTA in oranje.
- [ ] Reviews (sterren + 4.9) en klant-counter tonen social proof; productkaart reveal + zacht zweven.
- [ ] Eén `gsap.timeline()`: nav → badge → headline → sub → actions → proof → productkaart.
- [ ] Eases: `power3.out` (entrees), `back.out(1.7)` (badge + CTA's).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; winkelmand-CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast.
