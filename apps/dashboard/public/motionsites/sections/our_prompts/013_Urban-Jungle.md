# Urban Jungle — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een frisse, natuur-geïnspireerde landing-hero voor een "Urban Jungle" merk (denk: indoor plant- & lifestyle store): een groot statement-koptekstblok links, een gelaagde plant-collage rechts, en sociale bewijslast (reviews, klantlogo's, stats) die vertrouwen opbouwt richting de CTA. Het sky-blue + warm-oranje palet houdt het luchtig terwijl het accent de "Shop the jungle" actie laat opvallen.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials prominent, klantlogo's, ratings, succes-metrics, geloofwaardigheidsmarkers (WCAG AA, goede performance).
- **Pattern:** Pricing Page + CTA variatie → hier vertaald naar hero + sociale bewijslast met sticky CTA in de nav.
- **Color palette (hex tokens):**
  - `--primary: #0EA5E9` (sky blue, trust)
  - `--secondary: #38BDF8` (light sky)
  - `--cta: #F97316` (warm oranje, actie)
  - `--bg: #F0F9FF` (luchtige achtergrond)
  - `--text: #0C4A6E` (diep blauw-grijs)
- **Font pairing (Google Fonts):** Heading **Outfit** (geometric, modern, clean), Body **Work Sans**.
- **Key effects:** logo-grid fade-in, stat counter count-up, testimonial fade, review star ratings, zachte hover-transities 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verstopte contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge).
- Installeer: `npm i gsap @gsap/react`.

`tailwind.config.ts` color tokens + fonts:

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

Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

Een kleine `Reveal`-conventie: geef elk te animeren element een `data-reveal` attribuut zodat GSAP ze als batch kan oppakken. Gebruik altijd `gsap.matchMedia()` zodat `prefers-reduced-motion` wordt gerespecteerd. Cleanup verloopt automatisch via `useGSAP({ scope })`.

```tsx
// useCountUp.ts — telt een stat omhoog binnen GSAP
import gsap from "gsap";
export const countUp = (el: HTMLElement, end: number) => {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration: 1.4,
    ease: "power2.out",
    onUpdate: () => (el.textContent = Math.round(obj.val).toLocaleString()),
  });
};
```

## Structure

```tsx
import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function UrbanJungleHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <div ref={root} className="min-h-screen bg-bg font-body text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
        <span data-reveal className="font-display text-xl font-bold">Urban<span className="text-primary">Jungle</span></span>
        <nav className="hidden items-center gap-8 md:flex" data-reveal>
          <a href="#shop" className="hover:text-primary transition-colors">Shop</a>
          <a href="#care" className="hover:text-primary transition-colors">Care guide</a>
          <a href="#reviews" className="hover:text-primary transition-colors">Reviews</a>
        </nav>
        <button data-reveal className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold text-white transition-transform hover:scale-105">
          Shop the jungle
        </button>
      </header>

      {/* HERO */}
      <section className="max-w-content mx-auto grid items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <span data-reveal className="inline-block rounded-full bg-secondary/20 px-4 py-1 text-sm font-medium text-primary">
            Breng de stad tot leven
          </span>
          <h1 data-reveal className="mt-5 font-display text-5xl font-bold leading-[1.05] md:text-6xl">
            Maak van je flat een <span className="text-primary">urban jungle</span>.
          </h1>
          <p data-reveal className="mt-5 max-w-md text-lg text-ink/70">
            Handgekozen kamerplanten, bezorgd in perfecte staat. Plus verzorgingsgids op maat van jouw lichtomstandigheden.
          </p>
          <div data-reveal className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-cta px-7 py-3 font-semibold text-white transition-transform hover:scale-105">
              Start je collectie
            </button>
            <button className="cursor-pointer rounded-full border border-primary/30 px-7 py-3 font-semibold text-primary transition-colors hover:bg-primary/10">
              Bekijk planten
            </button>
          </div>
          {/* SOCIAL PROOF */}
          <div data-reveal className="mt-10 flex flex-wrap items-center gap-8">
            <div>
              <span className="stat font-display text-3xl font-bold text-primary" data-end="24000">0</span>
              <p className="text-sm text-ink/60">tevreden plantouders</p>
            </div>
            <div>
              <span className="stat font-display text-3xl font-bold text-primary" data-end="98">0</span>
              <p className="text-sm text-ink/60">% overleeft het 1e jaar</p>
            </div>
            <div className="flex items-center gap-1 text-cta" aria-label="4.9 van 5 sterren">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M10 1l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.8 4.8 17.2l1-5.8L1.5 7.2l5.9-.9z" /></svg>
              ))}
            </div>
          </div>
        </div>

        {/* PLANT COLLAGE */}
        <div className="relative aspect-square">
          <div data-reveal className="leaf absolute left-0 top-6 h-44 w-44 rounded-3xl bg-secondary/30 shadow-lg" />
          <div data-reveal className="leaf absolute right-2 top-0 h-56 w-56 rounded-3xl bg-primary/20 shadow-xl" />
          <div data-reveal className="leaf absolute bottom-0 left-12 h-64 w-64 rounded-3xl bg-cta/15 shadow-2xl" />
        </div>
      </section>

      {/* LOGO STRIP */}
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-center gap-10 px-6 py-8 opacity-70">
        {["GreenCo", "Botanica", "LeafLife", "PotMaker"].map((b) => (
          <span key={b} data-logo className="font-display text-lg font-semibold text-ink/50">{b}</span>
        ))}
      </div>
    </div>
  );
}
```

## Animation (GSAP)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { countUp } from "./useCountUp";

useGSAP(() => {
  const mm = gsap.matchMedia();

  // Volledige animatie
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
    tl.from("[data-reveal]", { y: 40, autoAlpha: 0, stagger: 0.08 })
      .from(".leaf", { scale: 0.7, autoAlpha: 0, rotation: -6, stagger: 0.12, ease: "back.out(1.7)" }, "-=0.5")
      .from("[data-logo]", { y: 18, autoAlpha: 0, stagger: 0.06 }, "-=0.3")
      .add(() => {
        root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) =>
          countUp(el, Number(el.dataset.end))
        );
      });
  });

  // Gereduceerde beweging: alleen fades, geen transform
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-reveal], .leaf, [data-logo]", { autoAlpha: 1, clearProps: "transform" });
    gsap.from("[data-reveal]", { autoAlpha: 0, duration: 0.4, stagger: 0.03 });
    root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) => {
      el.textContent = Number(el.dataset.end).toLocaleString();
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero rendert met Outfit/Work Sans en het sky-blue + oranje token-palet.
- [ ] Entree-timeline gebruikt `gsap.timeline()` met staggered `y`/`autoAlpha` reveals en `back.out(1.7)` voor de plant-collage.
- [ ] Stat counters tellen op via GSAP (`onUpdate`), geen CSS-trucs.
- [ ] `gsap.matchMedia()` schakelt naar fade-only bij `prefers-reduced-motion: reduce`; geen transform-animatie.
- [ ] Alle eases zijn built-in (`power3.out`, `power2.out`, `back.out(1.7)`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA en links hebben `cursor-pointer` + hover-transities.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; sterren-rating heeft `aria-label`.
- [ ] Geen emoji-iconen (inline SVG), tekstcontrast ≥ 4.5:1.
