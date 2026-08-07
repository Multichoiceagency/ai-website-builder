# Impressive Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een dramatische, video-first hero met een schermvullende achtergrond-loop, een donkere overlay, een krachtige value-proposition en een glowende CTA. Hero-centric design: één heldere boodschap, één onmiskenbare actie.

## Design system (ui-ux-pro-max)

- **Stijl:** Hero-Centric Design — grote hero, compelling headline, high-contrast CTA, product showcase, dramatisch beeld (WCAG AA).
- **Pattern:** Video-First Hero — donkere overlay 60% op video, brand-accent CTA, witte tekst op donker (86% hogere engagement; voeg captions toe, comprimeer de video).
- **Color palette (hex tokens):**
  - `--primary: #2563EB` (royal blue)
  - `--secondary: #3B82F6` (bright blue)
  - `--cta: #F97316` (warm oranje)
  - `--bg: #F8FAFC` (licht canvas voor non-video secties)
  - `--text: #1E293B` (slate ink)
- **Font pairing (Google Fonts):** Heading **Inter**, Body **Inter** (Professional + Clear typography).
- **Key effects:** smooth scroll reveal, fade-in op hero, subtiele background-parallax, CTA glow/pulse.
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
        primary: "#2563EB",
        secondary: "#3B82F6",
        cta: "#F97316",
        bg: "#F8FAFC",
        ink: "#1E293B",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      maxWidth: { content: "1200px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

De CTA krijgt een herhalende glow-pulse die los staat van de entree-timeline (`repeat: -1, yoyo: true`). De video-achtergrond schaalt subtiel voor een parallax-gevoel. Reduced-motion zet zowel de pulse als de scale uit via `gsap.matchMedia()`. `useGSAP({ scope })` regelt cleanup.

```tsx
// glowPulse.ts — losse, oneindige CTA-glow
import gsap from "gsap";
export const glowPulse = (el: HTMLElement) =>
  gsap.to(el, {
    boxShadow: "0 0 36px rgba(249,115,22,0.7)",
    duration: 1.2,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });
```

## Structure

```tsx
import { useRef } from "react";

export default function ImpressiveHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="relative flex min-h-screen flex-col overflow-hidden font-sans text-white">
      {/* VIDEO BG */}
      <video
        data-bg
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay muted loop playsInline
        poster="/hero-poster.jpg"
        aria-hidden="true"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-ink/60" aria-hidden="true" />

      {/* NAV */}
      <header className="relative z-10">
        <div className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
          <span data-fade className="text-xl font-bold">Impressive</span>
          <nav data-fade className="hidden items-center gap-8 md:flex">
            <a href="#features" className="hover:text-secondary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-secondary transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-secondary transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* HERO CONTENT */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="max-w-content mx-auto px-6 text-center">
          <span data-fade className="inline-block rounded-full border border-white/30 px-4 py-1 text-sm font-medium backdrop-blur">
            Nieuw · v2.0 live
          </span>
          <h1 data-fade className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] md:text-7xl">
            Maak een <span className="text-cta">onvergetelijke</span> eerste indruk.
          </h1>
          <p data-fade className="mx-auto mt-6 max-w-xl text-lg text-white/80">
            Een hero die kijkers stilzet en bezoekers converteert — cinematic, snel en pixel-perfect.
          </p>
          <div data-fade className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button data-glow className="cursor-pointer rounded-full bg-cta px-8 py-3.5 font-semibold text-white transition-transform hover:scale-105">
              Probeer gratis
            </button>
            <button className="cursor-pointer rounded-full border border-white/40 px-8 py-3.5 font-semibold transition-colors hover:bg-white/10">
              Bekijk demo
            </button>
          </div>
        </div>
      </div>

      {/* SCROLL HINT */}
      <div data-fade className="relative z-10 pb-8 text-center text-sm uppercase tracking-widest text-white/60">
        Scroll om te ontdekken
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { glowPulse } from "./glowPulse";

useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
    tl.from("[data-bg]", { scale: 1.15, autoAlpha: 0, duration: 1.6, ease: "power2.out" })
      .from("[data-fade]", { y: 36, autoAlpha: 0, stagger: 0.12 }, "-=1.1");

    // subtiele, oneindige parallax-zoom op de video
    gsap.to("[data-bg]", { scale: 1.08, duration: 12, ease: "sine.inOut", repeat: -1, yoyo: true });

    const glowEl = root.current?.querySelector<HTMLElement>("[data-glow]");
    if (glowEl) glowPulse(glowEl);
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-bg]", { autoAlpha: 1, scale: 1 });
    gsap.from("[data-fade]", { autoAlpha: 0, duration: 0.4, stagger: 0.04 });
    // geen pulse, geen parallax
  });
}, { scope: root });
```

## Acceptance

- [ ] Video-achtergrond met `bg-ink/60` overlay, witte tekst en `aria-hidden` op video/overlay.
- [ ] Entree-timeline: video fade + subtiele `scale` zoom, daarna staggered `y`/`autoAlpha` content (`gsap.timeline()`).
- [ ] CTA heeft een oneindige glow-pulse (`repeat: -1, yoyo: true`) los van de entree-timeline.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` zowel parallax als pulse uit; alleen fades blijven.
- [ ] Built-in eases (`power3.out`, `power2.out`, `sine.inOut`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA/links hebben `cursor-pointer` + hover-transities.
- [ ] Video heeft `poster`, `muted`, `playsInline`; advies captions toe te voegen.
- [ ] Responsive 375 / 768 / 1024 / 1440px; geen emoji-iconen.
