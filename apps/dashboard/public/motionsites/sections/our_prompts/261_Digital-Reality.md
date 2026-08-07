# Digital Reality — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Social Media · social-media), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vibrant, energieke social-media hero voor "Digital Reality", een creator-/community-platform: bold geometrische blokken, een futuristische headline en een prominente "Join the community" CTA met engagement-stats. Doel: jong, energiek publiek aantrekken en aanmeldingen/volgers stimuleren.

## Design system (ui-ux-pro-max)

- **Style:** Vibrant & Block-based — bold, energiek, playful, geometrische blokken, hoog kleurcontrast, duotone.
- **Pattern:** Video-/sfeer-first hero met overlay-CTA en engagement-proof.
- **Color palette (hex tokens):**
  - `primary` `#E11D48` (vibrant rose)
  - `secondary` `#FB7185` (soft rose)
  - `cta` `#2563EB` (engagement blue)
  - `bg` `#FFF1F2`
  - `text` `#881337`
- **Font pairing (Google Fonts):** Orbitron (heading, `400–700`) + Exo 2 (body, `300–700`), mood: futuristisch, digital, tech.
- **Key effects:** grote secties (48px+ gaps), animated patterns, bold hover (color shift), grote type (32px+), 200–300ms transitions, scroll-snap.
- **Anti-patterns vermijden:** zware skeuomorphism, accessibility negeren (zorg voor WCAG-contrast).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#E11D48",
    secondary: "#FB7185",
    cta: "#2563EB",
    bg: "#FFF1F2",
    ink: "#881337",
  },
  fontFamily: {
    display: ["Orbitron", "system-ui", "sans-serif"],
    sans: ["Exo 2", "system-ui", "sans-serif"],
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
- `countTo(el, end, suffix)` voor engagement-stats (followers/posts).
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
export function DigitalRealityHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative min-h-screen overflow-hidden bg-bg font-sans text-ink">
      {/* animated geometric blocks */}
      <div className="pointer-events-none absolute -left-10 top-24 h-40 w-40 rotate-12 rounded-3xl bg-primary/20" data-shape />
      <div className="pointer-events-none absolute right-12 top-40 h-28 w-28 -rotate-6 rounded-2xl bg-cta/20" data-shape />
      <div className="pointer-events-none absolute bottom-16 left-1/3 h-24 w-24 rotate-45 rounded-xl bg-secondary/30" data-shape />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="font-display text-base font-bold uppercase tracking-[0.2em]">Digital<span className="text-primary">Reality</span></span>
        <a href="#join" className="cursor-pointer rounded-full bg-cta px-6 py-2.5 text-sm font-bold text-white transition-colors duration-300 hover:bg-blue-700">Join now</a>
      </nav>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase tracking-widest text-white" data-badge>
          The creator universe
        </span>
        <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight md:text-7xl">
          <span className="block" data-line>Enter your</span>
          <span className="block bg-gradient-to-r from-primary to-cta bg-clip-text text-transparent" data-line>digital reality.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-lg text-lg text-ink/70" data-sub>
          Maak, deel en groei in één community waar creators de regels schrijven.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-5" data-actions>
          <a href="#join" className="cursor-pointer rounded-full bg-cta px-8 py-3.5 font-bold text-white transition-colors duration-300 hover:bg-blue-700">Join the community</a>
          <a href="#explore" className="cursor-pointer rounded-full border-2 border-primary px-8 py-3.5 font-bold text-primary transition-colors duration-300 hover:bg-primary hover:text-white">Explore</a>
        </div>
      </div>

      {/* engagement blocks */}
      <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-3 gap-5 px-6 pb-24 md:gap-12">
        {[{ n: 2400000, l: "Creators", s: "+" }, { n: 58, l: "M posts", s: "M" }, { n: 190, l: "Landen", s: "" }].map((s) => (
          <div key={s.l} className="rounded-3xl border-2 border-primary/15 bg-white p-6 text-center shadow-lg" data-stat>
            <span className="block font-display text-2xl font-bold text-primary md:text-4xl" data-count={s.n} data-suffix={s.s}>0</span>
            <span className="mt-2 block text-xs uppercase tracking-widest text-ink/50">{s.l}</span>
          </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    tl.from("[data-shape]", { scale: 0, rotation: "+=45", autoAlpha: 0, stagger: 0.1, ease: "back.out(1.7)" }, 0)
      .from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 }, 0)
      .from("[data-badge]", { y: 18, autoAlpha: 0, scale: 0.9, ease: "back.out(1.7)" }, "-=0.1")
      .from("[data-line]", { y: 60, autoAlpha: 0, stagger: 0.14, ease: "power4.out" }, "-=0.1")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.4")
      .from("[data-actions] > *", { y: 22, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-stat]", { y: 36, autoAlpha: 0, scale: 0.95, stagger: 0.12, ease: "back.out(1.6)" }, "-=0.2")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count), el.dataset.suffix ?? "")
        );
      }, "-=0.2");

    // langzaam roterende/drijvende geometrische blokken
    gsap.to("[data-shape]", { rotation: "+=20", y: "+=12", duration: 6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-shape], [data-nav], [data-badge], [data-line], [data-sub], [data-actions] > *, [data-stat]", { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = Number(el.dataset.count).toLocaleString("nl-NL") + (el.dataset.suffix ?? ""); });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Vibrant block-based hero (Orbitron display) met gradient-headline en geometrische blokken.
- [ ] Engagement-stats (creators/posts/landen) tellen op via GSAP; bold hover color-shifts op CTA's.
- [ ] Eén `gsap.timeline()`: shapes + nav → badge → lines → sub → actions → stats.
- [ ] Eases: `power3.out`/`power4.out` (entrees), `back.out(1.6/1.7)` (shapes, CTA's, stats).
- [ ] Geometrische blokken drijven/roteren subtiel in een aparte loop-tween.
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/rotation/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 200–300ms; "Join the community"-CTA prominent.
- [ ] WCAG-contrast geborgd (let op vibrant kleuren); responsive op 375 / 768 / 1024 / 1440px.
