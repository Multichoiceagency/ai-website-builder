# xPortfolio Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een cinematic portfolio-hero voor een creatieve maker: een full-bleed showreel-video achter een donkere overlay, een groot naam/rol-statement, en een horizontale strook van recente projecten die onderaan in beeld glijdt. Hero-centric, dramatisch, met smooth scroll reveal.

## Design system (ui-ux-pro-max)

- **Stijl:** Hero-Centric Design — grote hero, compelling headline, high-contrast CTA, dramatisch beeld (WCAG AA).
- **Pattern:** Video-First Hero — donkere overlay 60% op showreel, brand-accent CTA, witte tekst op donker.
- **Color palette (hex tokens):**
  - `--primary: #2563EB` (royal blue)
  - `--secondary: #3B82F6` (bright blue)
  - `--cta: #F97316` (warm oranje accent)
  - `--bg: #F8FAFC` (licht canvas voor onderliggende secties)
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
      maxWidth: { content: "1280px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

De projecten-strook bestaat uit kaarten die met een stagger van rechts inglijden. Voor de showreel doen we een subtiele oneindige parallax-zoom. We splitsen de naam in twee regels voor een mask-reveal. `gsap.matchMedia()` levert de reduced-motion variant; `useGSAP({ scope })` regelt cleanup.

```tsx
// MaskLine.tsx — regel binnen overflow-mask voor opklap-reveal
export const MaskLine = ({ children }: { children: React.ReactNode }) => (
  <span className="block overflow-hidden">
    <span className="line block">{children}</span>
  </span>
);
```

## Structure

```tsx
import { useRef } from "react";

const projects = [
  { title: "Aurora Brand", tag: "Branding" },
  { title: "Nova App", tag: "Product UI" },
  { title: "Pulse Film", tag: "Motion" },
  { title: "Form Studio", tag: "Web" },
];

export default function XPortfolioHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="relative flex min-h-screen flex-col overflow-hidden font-sans text-white">
      {/* SHOWREEL BG */}
      <video data-bg className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster="/reel-poster.jpg" aria-hidden="true">
        <source src="/showreel.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-ink/65" aria-hidden="true" />

      {/* NAV */}
      <header className="relative z-10 max-w-content mx-auto flex w-full items-center justify-between px-6 py-5">
        <span data-fade className="text-lg font-bold tracking-tight">x<span className="text-cta">Portfolio</span></span>
        <button data-fade className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold transition-transform hover:scale-105">
          Werk samen
        </button>
      </header>

      {/* HERO */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="max-w-content mx-auto w-full px-6">
          <span data-fade className="text-sm uppercase tracking-[0.3em] text-secondary">Creative Director & Designer</span>
          <h1 className="mt-4 text-6xl font-black leading-[0.9] md:text-8xl">
            <MaskLine>Ik ontwerp</MaskLine>
            <MaskLine><span className="text-cta">ervaringen</span>.</MaskLine>
          </h1>
          <p data-fade className="mt-6 max-w-lg text-lg text-white/75">
            Brand, product en motion design voor merken die durven opvallen.
          </p>
        </div>
      </div>

      {/* PROJECT STRIP */}
      <div className="relative z-10 pb-10">
        <div className="max-w-content mx-auto flex gap-4 overflow-x-auto px-6">
          {projects.map((p) => (
            <article key={p.title} data-card className="min-w-[220px] rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur transition-colors hover:border-cta">
              <p className="text-xs uppercase tracking-widest text-cta">{p.tag}</p>
              <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
            </article>
          ))}
        </div>
      </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
    tl.from("[data-bg]", { scale: 1.18, autoAlpha: 0, duration: 1.6, ease: "power2.out" })
      .from("[data-fade]", { y: 28, autoAlpha: 0, stagger: 0.1 }, "-=1.1")
      .from(".line", { yPercent: 110, duration: 1, stagger: 0.12, ease: "power4.out" }, "-=1.0")
      .from("[data-card]", { x: 60, autoAlpha: 0, stagger: 0.1, ease: "back.out(1.5)" }, "-=0.4");

    gsap.to("[data-bg]", { scale: 1.08, duration: 14, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-bg]", { autoAlpha: 1, scale: 1 });
    gsap.set(".line, [data-card]", { clearProps: "transform" });
    gsap.from("[data-fade], .line, [data-card]", { autoAlpha: 0, duration: 0.4, stagger: 0.04 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Showreel-video met `bg-ink/65` overlay, witte tekst, `aria-hidden` op video/overlay.
- [ ] Naam-regels klappen op via `yPercent` in `overflow-hidden` masks binnen één `gsap.timeline()`.
- [ ] Project-kaarten glijden in met `x`/`autoAlpha` stagger en `back.out(1.5)`.
- [ ] Subtiele oneindige parallax-zoom op de video (`repeat: -1, yoyo: true`).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, geen zoom).
- [ ] Built-in eases (`power3.out`, `power4.out`, `back.out(1.5)`, `sine.inOut`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA/kaarten hebben `cursor-pointer` + hover-feedback.
- [ ] Responsive 375 / 768 / 1024 / 1440px; geen emoji-iconen; contrast ≥ 4.5:1.
