# Social Media Posts — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Social Media · social-media), met design-system via ui-ux-pro-max en GSAP-animatie.

Een energieke social-media-hero die een feed/grid van post-cards (story-tiles, reels, carrousel) showcaset, met een bold statement-headline en CTA om content te plannen of te genereren. Bedoeld voor een tool die social posts maakt en schedulet, met hoge engagement-uitstraling.

## Design system (ui-ux-pro-max)

- **Stijl:** Vibrant & Block-based — bold, energetic, playful, block-layout, geometrische vormen, hoog kleurcontrast, duotone. Patroon: *Video-First Hero* (key features als overlay, brand-accent CTA).
- **Kleurenpalet (hex tokens):**
  - Primary `#E11D48` (vibrant rose)
  - Secondary `#FB7185` (zacht rose)
  - CTA `#2563EB` (engagement blue)
  - Background `#FFF1F2` (rose-wit)
  - Text `#881337` (diep wijnrood)
- **Typografie (Google Fonts):** Inter voor headings en body (modern + bold). Large type 32px+.
- **Key effects:** grote secties (48px+ gaps), animated block-patterns, bold hover (kleur-shift), scroll-snap, 200–300ms transitions, duotone tiles.
- **Anti-patterns vermijden:** zware skeuomorphisme, toegankelijkheid negeren (zorg voor WCAG-contrast).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` helper uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```bash
npm i gsap @gsap/react clsx tailwind-merge lucide-react
```

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
  fontFamily: { sans: ["Inter", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
```

## Helpers

```tsx
// Floating-loop helper voor post-tiles + scoped entrance. matchMedia voor reduced-motion.
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const floatLoop = (selector: string) =>
  gsap.to(selector, {
    y: -12,
    duration: 2.2,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    stagger: { each: 0.25, from: "random" },
  });
```

## Structure

```tsx
import { useRef } from "react";
import { Heart, MessageCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SocialMediaHero() {
  const root = useRef<HTMLElement>(null);
  const tiles = ["#E11D48", "#FB7185", "#2563EB", "#F59E0B", "#10B981", "#8B5CF6"];

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-bg font-sans text-ink">
      <nav data-anim className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-800 tracking-tight">Post<span className="text-primary">Flow</span></span>
        <button className="cursor-pointer rounded-full bg-cta px-6 py-2.5 text-sm font-700 text-white transition-colors duration-200 hover:bg-blue-700">
          Probeer gratis
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-10 pb-24 lg:grid-cols-2">
        <div>
          <span data-anim className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-700 text-white">
            Plan · Maak · Groei
          </span>
          <h1 data-anim className="mt-6 text-5xl font-800 leading-[0.98] tracking-tight md:text-7xl">
            Posts die <span className="text-cta">stoppen</span> met scrollen
          </h1>
          <p data-anim className="mt-6 max-w-md text-lg font-500 text-ink/70">
            Genereer, plan en publiceer social content voor elk kanaal — vanuit één felle, snelle workspace.
          </p>
          <div data-anim className="mt-8 flex flex-wrap gap-4">
            <button className="group flex cursor-pointer items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-700 text-white transition-transform duration-200 hover:scale-105">
              Start je feed
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="cursor-pointer rounded-full border-2 border-ink/15 px-7 py-3.5 font-700 transition-colors duration-200 hover:border-primary hover:text-primary">
              Bekijk templates
            </button>
          </div>
        </div>

        <div data-grid className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {tiles.map((c, i) => (
            <div data-tile key={i} className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${c}, ${c}99)` }}>
              <div className="absolute inset-0 flex items-end justify-between p-3 text-white">
                <span className="flex items-center gap-1 text-xs font-700"><Heart className="h-3.5 w-3.5" /> {12 + i}k</span>
                <span className="flex items-center gap-1 text-xs font-700"><MessageCircle className="h-3.5 w-3.5" /> {3 + i}k</span>
              </div>
            </div>
          ))}
        </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });

    tl.from("[data-anim]", { y: 26, autoAlpha: 0, stagger: 0.12 })
      .from("[data-tile]", {
        y: 40,
        autoAlpha: 0,
        scale: 0.85,
        rotation: -4,
        stagger: { each: 0.08, from: "start" },
        ease: "back.out(1.7)",
        duration: 0.8,
      }, "-=0.4");

    // Doorlopend zweven na de entrance — y-transform only.
    floatLoop("[data-tile]");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-tile]", { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Hero gebruikt Inter en de vibrant rose/blauwe tokens (bold, hoog contrast).
- [ ] Post-grid onthult met `y`, `scale`, `rotation`, `autoAlpha` via één `gsap.timeline()`.
- [ ] Tiles zweven daarna door met een `y`-loop (`sine.inOut`, yoyo, random stagger) — geen layout-properties.
- [ ] Entrance-eases zijn `power3.out` en `back.out(1.7)` (built-in).
- [ ] `gsap.matchMedia()` zet alles statisch en stopt de float-loop bij `prefers-reduced-motion: reduce`.
- [ ] CTA's `cursor-pointer`, hover-transitions 200ms; like/comment-iconen als SVG (Lucide).
- [ ] `useGSAP` `{ scope: root }` voor cleanup; responsive 375 / 768 / 1024 / 1440px, WCAG-contrast bewaakt.
