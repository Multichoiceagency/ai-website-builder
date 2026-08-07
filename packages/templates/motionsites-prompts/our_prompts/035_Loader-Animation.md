# Loader Animation — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Component · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een full-screen pre-loader/intro-component dat tijdens het laden een geanimeerde percentageteller, een voortgangsbalk en oversized merknaam toont, en daarna soepel onthult naar de onderliggende content. Bedoeld als immersieve maar performante entree met skip-optie en respect voor reduced-motion.

## Design system (ui-ux-pro-max)

- **Stijl:** Exaggerated Minimalism — bold minimalisme, oversized typografie, hoog contrast, veel negative space. Patroon: *Immersive/Interactive Experience* (skip-optie, mobiele fallback, dark focus-achtergrond).
- **Kleurenpalet (hex tokens):**
  - Primary `#4F46E5` (indigo)
  - Secondary `#6366F1` (helder indigo)
  - CTA `#F97316` (oranje)
  - Background `#EEF2FF` (licht) of `#0B0B14` (dark focus-variant)
  - Text `#312E81` (diep indigo)
- **Typografie (Google Fonts):** Inter voor headings en body (monospace + heldere typografie als mood). Counter in tabular-nums.
- **Key effects:** `font-size: clamp(3rem, 10vw, 12rem)`, `font-weight: 900`, `letter-spacing: -0.05em`, massive whitespace, voortgangsbalk-scale, reveal-wipe bij voltooiing.
- **Anti-patterns vermijden:** slechte documentatie, geen live preview — hou de loader licht en geef altijd een skip.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Max content width: `max-w-5xl mx-auto px-6` voor de onthulde content; loader is full-viewport.

```bash
npm i gsap @gsap/react clsx tailwind-merge
```

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#4F46E5",
    secondary: "#6366F1",
    cta: "#F97316",
    bg: "#0B0B14",
    ink: "#EEF2FF",
  },
  fontFamily: { sans: ["Inter", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
```

## Helpers

```tsx
// Counter-driver: gsap tweent een proxy-object en schrijft naar de DOM via onUpdate.
// Eén timeline doet count → balk → reveal-wipe. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const setCount = (el: HTMLElement | null, value: number) => {
  if (el) el.textContent = String(Math.round(value)).padStart(3, "0");
};
```

## Structure

```tsx
import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function LoaderAnimation() {
  const root = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  return (
    <section ref={root} className="relative min-h-screen bg-ink font-sans text-bg">
      {/* Loader overlay */}
      <div data-loader className="fixed inset-0 z-50 flex flex-col justify-between bg-bg px-6 py-8 text-ink">
        <div className="flex items-center justify-between">
          <span data-anim className="text-sm font-700 uppercase tracking-[0.3em]">Loading</span>
          <button data-skip className="cursor-pointer text-sm font-700 uppercase tracking-[0.2em] text-cta transition-opacity duration-150 hover:opacity-70">
            Skip →
          </button>
        </div>

        <h1 data-mark className="font-900 leading-none tracking-[-0.05em]" style={{ fontSize: "clamp(3rem, 10vw, 12rem)" }}>
          ZEN<span className="text-primary">.</span>
        </h1>

        <div className="space-y-4">
          <div className="h-px w-full bg-ink/15">
            <div data-bar className="h-px origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
          </div>
          <div className="flex items-end justify-between">
            <span ref={countRef} className="text-6xl font-900 tabular-nums tracking-tight">000</span>
            <span className="text-xl font-700">%</span>
          </div>
        </div>
      </div>

      {/* Onthulde content */}
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
        <h2 className="text-5xl font-900 tracking-tight md:text-7xl">Welkom.</h2>
        <p className="mt-4 max-w-md text-lg text-bg/60">De ervaring is geladen. Scroll om verder te gaan.</p>
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
useGSAP(() => {
  const counter = { value: 0 };
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from("[data-anim], [data-skip]", { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.1 })
      .from("[data-mark]", { y: 40, autoAlpha: 0, scale: 0.96, duration: 0.9, ease: "back.out(1.4)" }, "-=0.2")
      .to(counter, {
        value: 100,
        duration: 2,
        ease: "power1.inOut",
        onUpdate: () => setCount(countRef.current, counter.value),
      }, "-=0.4")
      .to("[data-bar]", { scaleX: 1, duration: 2, ease: "power1.inOut" }, "<")
      .to("[data-loader]", { yPercent: -100, autoAlpha: 0, duration: 0.9, ease: "power4.inOut" }, "+=0.2");
  });

  // Reduced motion: spring direct naar 100% en verberg de loader zonder beweging.
  mm.add("(prefers-reduced-motion: reduce)", () => {
    setCount(countRef.current, 100);
    gsap.set("[data-bar]", { scaleX: 1 });
    gsap.set("[data-loader]", { autoAlpha: 0 });
  });
}, { scope: root });

// Note: animeer NOOIT width/height — de balk gebruikt scaleX, de reveal gebruikt yPercent.
```

## Acceptance

- [ ] Full-screen loader toont oversized merknaam (`clamp(3rem,10vw,12rem)`, `font-weight: 900`) op hoog-contrast achtergrond.
- [ ] Percentageteller telt op via een proxy-object + `onUpdate` (geen DOM-thrash), tabular-nums.
- [ ] Voortgangsbalk gebruikt `scaleX` (origin-left), nooit `width`.
- [ ] Reveal-wipe verbergt de loader via `yPercent` + `autoAlpha` — niet via top/left.
- [ ] Eén `gsap.timeline()` orkestreert count → balk → wipe; eases `power3.out`, `back.out`, `power4.inOut`.
- [ ] Skip-knop aanwezig (`cursor-pointer`, hover 150ms).
- [ ] `gsap.matchMedia()` springt direct naar 100% en verbergt loader bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }` voor cleanup; responsive 375 → 1440px.
