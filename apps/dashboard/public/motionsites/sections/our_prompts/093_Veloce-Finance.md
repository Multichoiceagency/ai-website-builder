# Veloce Finance — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vertrouwenwekkende finance landing-hero voor "Veloce Finance" — denk: snelle betalingen / persoonlijke financiën. Een heldere claim links, een dashboard/kaart-mockup rechts, en sociale bewijslast (klantlogo's, een 5-sterren rating, opgetelde stats) die geloofwaardigheid opbouwt naar de CTA.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, ratings, succes-metrics, geloofwaardigheidsmarkers (WCAG AA).
- **Pattern:** Pricing Page + CTA → hier hero + sociale bewijslast met sticky CTA in de nav.
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

Stats tellen omhoog via een GSAP-getween object. De dashboard-kaart krijgt een lichte 3D-tilt-entree (`rotationY`) en de balans-bar "vult" via `scaleX` met `transformOrigin: left`. Logo's faden in als batch. `gsap.matchMedia()` regelt reduced-motion; `useGSAP({ scope })` ruimt op.

```tsx
// countUp.ts
import gsap from "gsap";
export const countUp = (el: HTMLElement, end: number, prefix = "", suffix = "") => {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration: 1.6,
    ease: "power2.out",
    onUpdate: () => (el.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`),
  });
};
```

## Structure

```tsx
import { useRef } from "react";

export default function VeloceFinanceHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="overflow-hidden bg-bg font-body text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
        <span data-fade className="font-display text-xl font-bold">Veloce<span className="text-primary">Finance</span></span>
        <nav data-fade className="hidden items-center gap-8 md:flex">
          <a href="#product" className="hover:text-primary transition-colors">Product</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Tarieven</a>
          <a href="#security" className="hover:text-primary transition-colors">Beveiliging</a>
        </nav>
        <button data-fade className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold text-white transition-transform hover:scale-105">
          Open account
        </button>
      </header>

      {/* HERO */}
      <div className="max-w-content mx-auto grid items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <span data-fade className="inline-block rounded-full bg-secondary/20 px-4 py-1 text-sm font-medium text-primary">
            Betalingen op snelheid
          </span>
          <h1 data-fade className="mt-5 font-display text-5xl font-bold leading-[1.05] md:text-6xl">
            Je geld, <span className="text-primary">razendsnel</span> in beweging.
          </h1>
          <p data-fade className="mt-5 max-w-md text-lg text-ink/70">
            Verstuur, ontvang en beheer geld zonder gedoe. Bankgrade-beveiliging, 0% verborgen kosten.
          </p>
          <div data-fade className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-cta px-7 py-3 font-semibold text-white transition-transform hover:scale-105">
              Start gratis
            </button>
            <button className="cursor-pointer rounded-full border border-primary/30 px-7 py-3 font-semibold text-primary transition-colors hover:bg-primary/10">
              Bekijk demo
            </button>
          </div>
          {/* SOCIAL PROOF */}
          <div data-fade className="mt-10 flex flex-wrap items-center gap-8">
            <div>
              <span className="stat font-display text-3xl font-bold text-primary" data-end="1200000" data-prefix="€">0</span>
              <p className="text-sm text-ink/60">dagelijks verwerkt</p>
            </div>
            <div>
              <span className="stat font-display text-3xl font-bold text-primary" data-end="150" data-suffix="k+">0</span>
              <p className="text-sm text-ink/60">actieve gebruikers</p>
            </div>
            <div className="flex items-center gap-1 text-cta" aria-label="4.9 van 5 sterren">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M10 1l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.8 4.8 17.2l1-5.8L1.5 7.2l5.9-.9z" /></svg>
              ))}
            </div>
          </div>
        </div>

        {/* DASHBOARD CARD */}
        <div data-card className="rounded-3xl border border-primary/10 bg-white p-6 shadow-2xl" style={{ perspective: 1000 }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/60">Totaal saldo</p>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-primary">+ 12,4%</span>
          </div>
          <p className="mt-2 font-display text-4xl font-bold text-ink">€ 48.250</p>
          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-secondary/20">
            <div data-bar className="h-full rounded-full bg-primary" style={{ width: "72%", transformOrigin: "left" }} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {["Sparen", "Beleggen", "Uitgeven"].map((l) => (
              <div key={l} className="rounded-xl bg-bg p-3 text-sm font-medium text-ink/80">{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* LOGO STRIP */}
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-center gap-10 px-6 py-8 opacity-70">
        {["Stripe", "Adyen", "Mollie", "Wise"].map((b) => (
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
    tl.from("[data-fade]", { y: 36, autoAlpha: 0, stagger: 0.08 })
      .from("[data-card]", { y: 50, autoAlpha: 0, rotationY: 12, duration: 1, ease: "power4.out" }, "-=0.5")
      .from("[data-bar]", { scaleX: 0, duration: 1, ease: "power2.out" }, "-=0.4")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.06 }, "-=0.3")
      .add(() => {
        root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) =>
          countUp(el, Number(el.dataset.end), el.dataset.prefix ?? "", el.dataset.suffix ?? "")
        );
      });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-card], [data-logo]", { clearProps: "transform" });
    gsap.set("[data-bar]", { scaleX: 1 });
    gsap.from("[data-fade]", { autoAlpha: 0, duration: 0.4, stagger: 0.03 });
    root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) => {
      el.textContent = `${el.dataset.prefix ?? ""}${Number(el.dataset.end).toLocaleString()}${el.dataset.suffix ?? ""}`;
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero met Outfit/Work Sans en sky-blue + oranje token-palet; sticky CTA in nav.
- [ ] Entree-timeline (`gsap.timeline()`): staggered `y`/`autoAlpha`, dashboard-kaart met `rotationY` tilt, balk-vulling via `scaleX` (transformOrigin left).
- [ ] Stat counters tellen op via GSAP `onUpdate` met prefix/suffix (€, k+).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, bar direct gevuld).
- [ ] Built-in eases (`power3.out`, `power4.out`, `power2.out`); geen width/height/top/left animatie (bar via scaleX).
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA/links hebben `cursor-pointer` + hover 150–300ms.
- [ ] Responsive 375 / 768 / 1024 / 1440px; sterren-rating heeft `aria-label`.
- [ ] Geen emoji-iconen (inline SVG); contrast ≥ 4.5:1.
