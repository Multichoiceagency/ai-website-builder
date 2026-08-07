# Velorah Focus — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Social Media · social-media), met design-system via ui-ux-pro-max en GSAP-animatie.

Een energieke social-media hero voor "Velorah Focus" — een app/tool die helpt focussen en content plannen. Bold block-layout met een korte video-loop, levendige rose-tinten, een grote claim en social-proof chips (followers, engagement) plus duidelijke "Download"/"Start gratis" CTA's.

## Design system (ui-ux-pro-max)

- **Stijl:** Vibrant & Block-based — bold, energetic, playful, block layout, geometric shapes, hoog kleurcontrast, duotone (zorg voor WCAG).
- **Pattern:** Video-First Hero — korte loop, donkere overlay waar nodig, brand-accent CTA.
- **Color palette (hex tokens):**
  - `--primary: #E11D48` (vibrant rose)
  - `--secondary: #FB7185` (soft rose)
  - `--cta: #2563EB` (engagement blue)
  - `--bg: #FFF1F2` (zachte rose-wash)
  - `--text: #881337` (diep wijnrood)
- **Font pairing (Google Fonts):** Heading **Inter**, Body **Inter** (Modern + Bold typography).
- **Key effects:** grote secties (48px+ gaps), animated patterns, bold hover (color shift), scroll-snap, grote type (32px+), 200–300ms.
- **Anti-patterns vermijden:** zware skeuomorfisme, accessibility negeren.

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
        primary: "#E11D48",
        secondary: "#FB7185",
        cta: "#2563EB",
        bg: "#FFF1F2",
        ink: "#881337",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      maxWidth: { content: "1200px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`.

## Helpers

De social-proof chips poppen één voor één in met een `back.out` bounce; de geometric blocks rechts schalen en draaien licht voor speelse energie. Een zachte, oneindige zweef-beweging op de telefoon-mockup geeft leven. `gsap.matchMedia()` zet alles terug naar fade-only bij reduced-motion; `useGSAP({ scope })` ruimt op.

```tsx
// Chip.tsx — social-proof badge
import { cn } from "@/lib/utils";
export const Chip = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span data-chip className={cn("rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-md", className)}>
    {children}
  </span>
);
```

## Structure

```tsx
import { useRef } from "react";
import { Chip } from "./Chip";

export default function VelorahFocusHero() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="relative overflow-hidden bg-bg font-sans text-ink">
      {/* NAV */}
      <header className="max-w-content mx-auto flex items-center justify-between px-6 py-5">
        <span data-fade className="text-xl font-extrabold">Velorah<span className="text-primary">Focus</span></span>
        <button data-fade className="cursor-pointer rounded-full bg-cta px-5 py-2 font-semibold text-white transition-colors hover:bg-primary">
          Download
        </button>
      </header>

      {/* HERO GRID */}
      <div className="max-w-content mx-auto grid items-center gap-16 px-6 py-16 lg:grid-cols-2">
        <div>
          <span data-fade className="inline-block rounded-full bg-primary/15 px-4 py-1 text-sm font-bold uppercase tracking-wide text-primary">
            Voor creators
          </span>
          <h1 data-fade className="mt-5 text-5xl font-black leading-[1.0] md:text-6xl">
            Blijf in <span className="text-primary">focus</span>. Groei je socials.
          </h1>
          <p data-fade className="mt-5 max-w-md text-lg text-ink/70">
            Plan content, blok afleiding en zie je engagement stijgen — alles in één strakke app.
          </p>
          <div data-fade className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-primary px-7 py-3 font-bold text-white transition-transform hover:scale-105">
              Start gratis
            </button>
            <button className="cursor-pointer rounded-full border-2 border-cta px-7 py-3 font-bold text-cta transition-colors hover:bg-cta hover:text-white">
              Bekijk reel
            </button>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Chip><span className="text-primary">+248K</span> creators</Chip>
            <Chip><span className="text-cta">3.4×</span> meer engagement</Chip>
            <Chip>4.9★ in de App Store</Chip>
          </div>
        </div>

        {/* PHONE + BLOCKS */}
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
          <div data-block className="absolute -left-6 top-8 h-24 w-24 rounded-2xl bg-secondary/60" />
          <div data-block className="absolute -right-4 top-24 h-16 w-16 rounded-full bg-cta/40" />
          <div data-phone className="relative h-full w-full overflow-hidden rounded-[2.5rem] border-8 border-white bg-ink shadow-2xl">
            <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster="/velorah-poster.jpg" aria-hidden="true">
              <source src="/velorah.mp4" type="video/mp4" />
            </video>
          </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
    tl.from("[data-fade]", { y: 32, autoAlpha: 0, stagger: 0.09 })
      .from("[data-phone]", { y: 50, autoAlpha: 0, scale: 0.94, duration: 1 }, "-=0.6")
      .from("[data-block]", { scale: 0, rotation: -20, autoAlpha: 0, stagger: 0.12, ease: "back.out(2)" }, "-=0.7")
      .from("[data-chip]", { y: 18, autoAlpha: 0, scale: 0.8, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4");

    // speelse, oneindige zweef
    gsap.to("[data-phone]", { y: -12, duration: 2.4, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-phone], [data-block], [data-chip]", { clearProps: "transform" });
    gsap.from("[data-fade], [data-phone], [data-block], [data-chip]", { autoAlpha: 0, duration: 0.4, stagger: 0.04 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Vibrant block-layout met rose-palet, 48px+ gaps en grote (32px+) type.
- [ ] Entree via één `gsap.timeline()`: staggered `y`/`autoAlpha` content, phone fade+scale, blocks met `back.out(2)`, chips met `back.out(1.7)`.
- [ ] Telefoon-mockup heeft oneindige zweef-loop (`repeat: -1, yoyo: true`).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, geen zweef).
- [ ] Built-in eases (`power3.out`, `back.out(2)`, `back.out(1.7)`, `sine.inOut`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; CTA's/chips hebben `cursor-pointer` en hover color-shift (200–300ms).
- [ ] Video heeft `poster`, `muted`, `playsInline`, `aria-hidden`; rating-chip leesbaar.
- [ ] Responsive 375 / 768 / 1024 / 1440px; geen emoji-iconen; contrast ≥ 4.5:1.
