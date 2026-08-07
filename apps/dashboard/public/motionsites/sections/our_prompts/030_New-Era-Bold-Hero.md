# New Era Bold Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Agency · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een gedurfde agency-hero die draait om één enorme, schermvullende statement-zin ("A NEW ERA") met massa whitespace, hoge contrast en een dunne metadata-balk eronder. Pure exaggerated minimalism: de typografie is het ontwerp.

## Design system (ui-ux-pro-max)

- **Stijl:** Exaggerated Minimalism — bold minimalism, oversized typografie, hoog contrast, negatieve ruimte, statement design (Excellent performance, WCAG AA).
- **Pattern:** AI Personalization Landing → hier vereenvoudigd tot een dynamische, oversized hero met één scherpe CTA.
- **Color palette (hex tokens):**
  - `--primary: #EC4899` (bold pink)
  - `--secondary: #F472B6` (soft pink)
  - `--cta: #06B6D4` (cyan accent)
  - `--bg: #FDF2F8` (zachte pink-wash)
  - `--text: #831843` (diep magenta)
- **Font pairing (Google Fonts):** Heading **Outfit** (gebruikt op 900 weight als display-substituut voor Clash Display), Body **Rubik**.
- **Key effects:** `font-size: clamp(3rem, 10vw, 12rem)`, `font-weight: 900`, `letter-spacing: -0.05em`, massive whitespace.
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
        primary: "#EC4899",
        secondary: "#F472B6",
        cta: "#06B6D4",
        bg: "#FDF2F8",
        ink: "#831843",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Rubik", "sans-serif"],
      },
      maxWidth: { content: "1400px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-8`.

## Helpers

Voor de oversized titel splitsen we de woorden in losse spans zodat ze per regel kunnen "opklappen" (clip-mask reveal via `yPercent`). Houd de mask op de wrapper met `overflow-hidden`. `gsap.matchMedia()` verzorgt de reduced-motion variant; `useGSAP({ scope })` ruimt automatisch op.

```tsx
// SplitLine.tsx — een woord in een overflow-mask
export const SplitLine = ({ children }: { children: React.ReactNode }) => (
  <span className="block overflow-hidden">
    <span className="line block">{children}</span>
  </span>
);
```

## Structure

```tsx
import { useRef } from "react";
import { SplitLine } from "./SplitLine";

export default function NewEraBoldHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-body text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-8 py-6">
        <span data-fade className="font-display text-lg font-extrabold tracking-tight">STUDIO/NE</span>
        <button data-fade className="cursor-pointer rounded-full bg-cta px-6 py-2 font-semibold text-white transition-transform hover:scale-105">
          Start a project
        </button>
      </header>

      {/* OVERSIZED STATEMENT */}
      <div className="max-w-content mx-auto px-8 pt-[12vh]">
        <h1 className="font-display font-black uppercase leading-[0.85] tracking-[-0.05em]" style={{ fontSize: "clamp(3rem, 13vw, 13rem)" }}>
          <SplitLine>A new</SplitLine>
          <SplitLine><span className="text-primary">era</span> of</SplitLine>
          <SplitLine>design.</SplitLine>
        </h1>

        {/* METADATA BAR */}
        <div data-meta className="mt-12 flex flex-col gap-6 border-t border-ink/15 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md text-lg text-ink/70">
            Wij bouwen merken die de norm verzetten. Branding, web en motion voor durfals.
          </p>
          <div className="flex items-center gap-6">
            <a href="#work" className="cursor-pointer font-display text-base font-semibold underline-offset-4 hover:underline">
              Bekijk werk
            </a>
            <span className="h-2 w-2 rounded-full bg-cta" />
            <span className="text-sm uppercase tracking-widest text-ink/50">Est. 2024</span>
          </div>
        </div>
      </div>

      {/* OVERSIZED BACKGROUND ACCENT */}
      <div data-accent className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-secondary/40 blur-3xl" />
    </section>
  );
}
```

## Animation (GSAP)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from("[data-fade]", { y: -20, autoAlpha: 0, duration: 0.6, stagger: 0.1 })
      .from(".line", { yPercent: 110, duration: 1, stagger: 0.12, ease: "power4.out" }, "-=0.2")
      .from("[data-meta]", { y: 30, autoAlpha: 0, duration: 0.7 }, "-=0.4")
      .from("[data-accent]", { scale: 0.6, autoAlpha: 0, duration: 1.2, ease: "back.out(1.7)" }, "-=0.8");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set(".line, [data-meta], [data-accent]", { clearProps: "transform" });
    gsap.from("[data-fade], .line, [data-meta]", { autoAlpha: 0, duration: 0.4, stagger: 0.04 });
    gsap.set("[data-accent]", { autoAlpha: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Oversized titel gebruikt `clamp()` font-size, `font-weight: 900`, `tracking-[-0.05em]` en Outfit als display-font.
- [ ] Lijnen klappen op via `yPercent` binnen `overflow-hidden` masks in een `gsap.timeline()`.
- [ ] Entree gebruikt staggered `autoAlpha`/`y` en `back.out(1.7)` voor de blur-accent.
- [ ] `gsap.matchMedia()` levert een fade-only variant bij `prefers-reduced-motion: reduce` (transforms gecleared).
- [ ] Alleen built-in eases (`power3.out`, `power4.out`, `back.out(1.7)`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA + links hebben `cursor-pointer` en hover-feedback.
- [ ] Massive whitespace behouden; responsive 375 / 768 / 1024 / 1440px.
- [ ] Geen emoji-iconen; tekstcontrast ≥ 4.5:1.
