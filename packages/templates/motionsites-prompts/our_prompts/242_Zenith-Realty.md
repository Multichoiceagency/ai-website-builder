# Zenith Realty — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een premium real-estate landing-hero voor "Zenith Realty": een elegante claim links, een zoek-/filter-balk (locatie, type, prijs), een featured-property kaart rechts, en sociale bewijslast (verkochte woningen, tevreden klanten, makelaar-rating) richting de CTA. Vertrouwen + verfijning.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klant-/partnerlogo's, succes-metrics, ratings (WCAG AA).
- **Pattern:** Pricing Page + CTA → vertaald naar hero + zoekbalk + featured listing met sticky CTA.
- **Color palette (hex tokens):**
  - `--primary: #0EA5E9` (sky blue, trust)
  - `--secondary: #38BDF8` (light sky)
  - `--cta: #F97316` (warm oranje, actie)
  - `--bg: #F0F9FF` (luchtige achtergrond)
  - `--text: #0C4A6E` (diep blauw-grijs)
- **Font pairing (Google Fonts):** Heading **Outfit**, Body **Work Sans** (geometric, modern, clean).
- **Key effects:** logo-grid fade-in, stat counter count-up, testimonial fade, review star ratings, hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verstopte contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Installeer: `npm i gsap @gsap/react`.

`tailwind.config.ts`:

```ts
export default {
  theme: {
    extend: {
      colors: {
        primary: "#0EA5E9",
        secondary: "#38BDF8",
        cta: "#F97316",
        bg: "#F0F9FF",
        ink: "#0C4A6E",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Work Sans", "sans-serif"],
      },
      maxWidth: { content: "1200px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

De zoekbalk-velden staggeren in; de featured-kaart komt met een lichte lift + schaduw-grow; stats tellen omhoog. Een zachte, oneindige float op de featured-kaart geeft "premium" gevoel. `gsap.matchMedia()` regelt reduced-motion; `useGSAP({ scope })` ruimt op.

```tsx
// countUp.ts
import gsap from "gsap";
export const countUp = (el: HTMLElement, end: number, suffix = "") => {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration: 1.5,
    ease: "power2.out",
    onUpdate: () => (el.textContent = `${Math.round(obj.val).toLocaleString()}${suffix}`),
  });
};
```

## Structure

```tsx
import { useRef } from "react";

export default function ZenithRealtyHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="overflow-hidden bg-bg font-body text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
        <span data-fade className="font-display text-xl font-bold">Zenith<span className="text-primary">Realty</span></span>
        <nav data-fade className="hidden items-center gap-8 md:flex">
          <a href="#buy" className="hover:text-primary transition-colors">Kopen</a>
          <a href="#rent" className="hover:text-primary transition-colors">Huren</a>
          <a href="#sell" className="hover:text-primary transition-colors">Verkopen</a>
        </nav>
        <button data-fade className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold text-white transition-transform hover:scale-105">
          Plan bezichtiging
        </button>
      </header>

      {/* HERO */}
      <div className="max-w-content mx-auto grid items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <span data-fade className="inline-block rounded-full bg-secondary/20 px-4 py-1 text-sm font-medium text-primary">
            Premium woningen
          </span>
          <h1 data-fade className="mt-5 font-display text-5xl font-bold leading-[1.05] md:text-6xl">
            Vind je <span className="text-primary">droomhuis</span> op het hoogste niveau.
          </h1>
          <p data-fade className="mt-5 max-w-md text-lg text-ink/70">
            Handgeselecteerde woningen, persoonlijke begeleiding en een vlekkeloos verkoopproces.
          </p>

          {/* SEARCH BAR */}
          <div data-fade className="mt-8 rounded-2xl border border-primary/10 bg-white p-3 shadow-lg">
            <div className="grid gap-3 sm:grid-cols-4">
              <input data-field className="col-span-2 rounded-xl bg-bg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Locatie" />
              <select data-field className="rounded-xl bg-bg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                <option>Type</option><option>Appartement</option><option>Villa</option>
              </select>
              <button data-field className="cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cta">
                Zoek
              </button>
            </div>
          </div>

          {/* SOCIAL PROOF */}
          <div data-fade className="mt-10 flex flex-wrap items-center gap-8">
            <div>
              <span className="stat font-display text-3xl font-bold text-primary" data-end="1850" data-suffix="+">0</span>
              <p className="text-sm text-ink/60">woningen verkocht</p>
            </div>
            <div className="flex items-center gap-1 text-cta" aria-label="4.9 van 5 sterren">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M10 1l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.8 4.8 17.2l1-5.8L1.5 7.2l5.9-.9z" /></svg>
              ))}
              <span className="ml-2 text-sm font-semibold text-ink">4.9 · 600+ reviews</span>
            </div>
          </div>
        </div>

        {/* FEATURED PROPERTY */}
        <div data-card className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-2xl">
          <div className="aspect-[4/3] bg-gradient-to-br from-secondary/40 to-primary/30" aria-label="Featured property photo" />
          <div className="p-6">
            <span className="rounded-full bg-cta/15 px-3 py-1 text-xs font-semibold text-cta">Uitgelicht</span>
            <h3 className="mt-3 font-display text-xl font-bold">Penthouse Zenith Towers</h3>
            <p className="text-sm text-ink/60">Amsterdam Zuid · 3 slaapk · 142 m²</p>
            <p className="mt-3 font-display text-2xl font-bold text-primary">€ 1.250.000</p>
          </div>
        </div>
      </div>

      {/* PARTNER LOGOS */}
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-center gap-10 px-6 py-8 opacity-70">
        {["Funda", "Pararius", "NVM", "Knight Frank"].map((b) => (
          <span key={b} data-logo className="font-display text-lg font-semibold text-ink/50">{b}</span>
        ))}
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { countUp } from "./countUp";

useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
    tl.from("[data-fade]", { y: 34, autoAlpha: 0, stagger: 0.08 })
      .from("[data-field]", { y: 16, autoAlpha: 0, stagger: 0.08 }, "-=0.5")
      .from("[data-card]", { y: 50, autoAlpha: 0, scale: 0.96, duration: 1, ease: "back.out(1.4)" }, "-=0.7")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.06 }, "-=0.3")
      .add(() => {
        root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) =>
          countUp(el, Number(el.dataset.end), el.dataset.suffix ?? "")
        );
      });

    gsap.to("[data-card]", { y: -10, duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-card], [data-field], [data-logo]", { clearProps: "transform" });
    gsap.from("[data-fade]", { autoAlpha: 0, duration: 0.4, stagger: 0.03 });
    root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) => {
      el.textContent = `${Number(el.dataset.end).toLocaleString()}${el.dataset.suffix ?? ""}`;
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero met Outfit/Work Sans en sky-blue + oranje token-palet; sticky CTA in nav.
- [ ] Entree-timeline (`gsap.timeline()`): staggered `y`/`autoAlpha` content + zoekvelden, featured-kaart met `scale`/`y` en `back.out(1.4)`, logo's fade.
- [ ] Featured-kaart heeft zachte oneindige float (`repeat: -1, yoyo: true`).
- [ ] Stat counter telt op via GSAP `onUpdate` met suffix (+).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, geen float).
- [ ] Built-in eases (`power3.out`, `power2.out`, `back.out(1.4)`, `sine.inOut`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA/links/inputs hebben `cursor-pointer`/focus-rings + hover 150–300ms.
- [ ] Responsive 375 / 768 / 1024 / 1440px; sterren-rating heeft `aria-label`; geen emoji-iconen; contrast ≥ 4.5:1.
