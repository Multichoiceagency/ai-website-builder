# Nickel Payments — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vriendelijke, vertrouwenwekkende SaaS-hero voor "Nickel Payments" — een betaalplatform voor bedrijven. Heldere claim links, een payment-flow/dashboard mockup rechts, en sociale bewijslast (verwerkt volume, klantlogo's, rating) richting een emerald CTA. Schoon, modern, approachable.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, succes-metrics, ratings, credibility markers (WCAG AA).
- **Pattern:** Video-First Hero → hier subtiel: optionele mockup-loop, maar social proof + stats voeren de boventoon.
- **Color palette (hex tokens):**
  - `--primary: #6366F1` (indigo)
  - `--secondary: #818CF8` (soft indigo)
  - `--cta: #10B981` (emerald, actie)
  - `--bg: #F5F3FF` (zachte violet-wash)
  - `--text: #1E1B4B` (diep indigo-ink)
- **Font pairing (Google Fonts):** Heading **Plus Jakarta Sans**, Body **Plus Jakarta Sans** (friendly, modern, saas, approachable).
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
        primary: "#6366F1",
        secondary: "#818CF8",
        cta: "#10B981",
        bg: "#F5F3FF",
        ink: "#1E1B4B",
      },
      fontFamily: { sans: ["Plus Jakarta Sans", "sans-serif"] },
      maxWidth: { content: "1200px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

Stats tellen op; de dashboard-kaart komt met een lichte tilt-entree; binnen de kaart "tikt" een succes-checkmark in met een pop (`back.out`). Logo's faden als batch. `gsap.matchMedia()` regelt reduced-motion; `useGSAP({ scope })` ruimt op.

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

export default function NickelPaymentsHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="overflow-hidden bg-bg font-sans text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
        <span data-fade className="text-xl font-extrabold">Nickel<span className="text-primary">.</span></span>
        <nav data-fade className="hidden items-center gap-8 md:flex">
          <a href="#product" className="hover:text-primary transition-colors">Product</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Tarieven</a>
          <a href="#docs" className="hover:text-primary transition-colors">Docs</a>
        </nav>
        <button data-fade className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold text-white transition-transform hover:scale-105">
          Start gratis
        </button>
      </header>

      {/* HERO */}
      <div className="max-w-content mx-auto grid items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <span data-fade className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Betalingen voor moderne teams
          </span>
          <h1 data-fade className="mt-5 text-5xl font-extrabold leading-[1.05] md:text-6xl">
            Accepteer betalingen in <span className="text-primary">minuten</span>, niet maanden.
          </h1>
          <p data-fade className="mt-5 max-w-md text-lg text-ink/70">
            Eén API voor kaarten, iDEAL en abonnementen. Transparante prijzen, geen verrassingen.
          </p>
          <div data-fade className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-cta px-7 py-3 font-semibold text-white transition-transform hover:scale-105">
              Maak een account
            </button>
            <button className="cursor-pointer rounded-full border border-primary/30 px-7 py-3 font-semibold text-primary transition-colors hover:bg-primary/10">
              Lees de docs
            </button>
          </div>
          {/* SOCIAL PROOF */}
          <div data-fade className="mt-10 flex flex-wrap items-center gap-8">
            <div>
              <span className="stat text-3xl font-extrabold text-primary" data-end="2400000000" data-prefix="€">0</span>
              <p className="text-sm text-ink/60">jaarlijks verwerkt</p>
            </div>
            <div className="flex items-center gap-1 text-cta" aria-label="4.8 van 5 sterren">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M10 1l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.8 4.8 17.2l1-5.8L1.5 7.2l5.9-.9z" /></svg>
              ))}
              <span className="ml-2 text-sm font-semibold text-ink">4.8 op G2</span>
            </div>
          </div>
        </div>

        {/* PAYMENT CARD */}
        <div data-card className="rounded-3xl border border-primary/10 bg-white p-6 shadow-2xl" style={{ perspective: 1000 }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink/60">Nieuwe betaling</p>
            <span className="rounded-full bg-cta/15 px-3 py-1 text-xs font-semibold text-cta">Live</span>
          </div>
          <p className="mt-4 text-4xl font-extrabold">€ 89,00</p>
          <div className="mt-6 space-y-3">
            {["Kaartgegevens", "iDEAL", "Bevestigen"].map((l) => (
              <div key={l} className="flex items-center justify-between rounded-xl bg-bg px-4 py-3 text-sm">
                <span className="font-medium text-ink/80">{l}</span>
                <span className="h-2 w-2 rounded-full bg-secondary" />
              </div>
            ))}
          </div>
          <div data-check className="mt-6 flex items-center gap-3 rounded-xl bg-cta/10 px-4 py-3 text-cta">
            <svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span className="font-semibold">Betaling geslaagd</span>
          </div>
        </div>
      </div>

      {/* LOGO STRIP */}
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-center gap-10 px-6 py-8 opacity-70">
        {["Notion", "Linear", "Vercel", "Figma"].map((b) => (
          <span key={b} data-logo className="text-lg font-semibold text-ink/50">{b}</span>
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
      .from("[data-card]", { y: 50, autoAlpha: 0, rotationY: 14, duration: 1, ease: "power4.out" }, "-=0.5")
      .from("[data-check]", { scale: 0.6, autoAlpha: 0, ease: "back.out(2)" }, "-=0.2")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.06 }, "-=0.2")
      .add(() => {
        root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) =>
          countUp(el, Number(el.dataset.end), el.dataset.prefix ?? "", el.dataset.suffix ?? "")
        );
      });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-card], [data-check], [data-logo]", { clearProps: "transform" });
    gsap.from("[data-fade]", { autoAlpha: 0, duration: 0.4, stagger: 0.03 });
    root.current?.querySelectorAll<HTMLElement>(".stat").forEach((el) => {
      el.textContent = `${el.dataset.prefix ?? ""}${Number(el.dataset.end).toLocaleString()}${el.dataset.suffix ?? ""}`;
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero met Plus Jakarta Sans en indigo + emerald token-palet.
- [ ] Entree-timeline (`gsap.timeline()`): staggered `y`/`autoAlpha` content, payment-kaart met `rotationY` tilt, succes-check met `back.out(2)` pop, logo's fade.
- [ ] Stat counter telt op via GSAP `onUpdate` met prefix (€).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, stats direct gezet).
- [ ] Built-in eases (`power3.out`, `power4.out`, `power2.out`, `back.out(2)`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA/links hebben `cursor-pointer` + hover 150–300ms.
- [ ] Responsive 375 / 768 / 1024 / 1440px; sterren-rating heeft `aria-label`; geen emoji-iconen (inline SVG); contrast ≥ 4.5:1.
