# Slam Dunk — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een energieke landing-hero met sport-/basketbal-thema "Slam Dunk": een groot statement, een prominente actie-CTA en social-proof (sterren, gebruikersaantallen, partnerlogo's). Doel: hype opbouwen en de bezoeker laten aanmelden/downloaden.

## Design system (ui-ux-pro-max)

- **Style:** Social Proof-Focused — reviews/ratings, user avatars, success-metrics, credibility markers.
- **Pattern:** Video-/actie-first hero met overlay-CTA en proof-strook.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (blauw)
  - `secondary` `#3B82F6` (lichtblauw)
  - `cta` `#F97316` (warm oranje)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Font pairing (Google Fonts):** Inter (heading + body, `wght 400–800`), mood: professioneel, energiek-clear.
- **Key effects:** stat counter (count-up), review star-ratings, avatar-stack fade-in, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#2563EB",
    secondary: "#3B82F6",
    cta: "#F97316",
    bg: "#F8FAFC",
    ink: "#1E293B",
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
}
```

```tsx
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
```

## Helpers

- `useGSAP(() => {...}, { scope: rootRef })` voor scoped cleanup.
- `countTo(el, end)` voor stat count-up (animeer object-waarde, schrijf in `onUpdate`).
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)`.

```tsx
function countTo(el: HTMLElement, end: number, suffix = "") {
  const o = { v: 0 };
  return gsap.to(o, { v: end, duration: 1.5, ease: "power2.out",
    onUpdate: () => { el.innerText = Math.round(o.v) + suffix; } });
}
```

## Structure

```tsx
export function SlamDunkHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-cta/30 blur-[120px]" data-glow />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="text-xl font-extrabold tracking-tight">SLAM<span className="text-cta">DUNK</span></span>
        <a href="#join" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600">Doe mee</a>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-cta" data-eyebrow>Game on</p>
          <h1 className="text-5xl font-extrabold leading-[1.0] tracking-tight md:text-7xl" data-headline>
            Elke wedstrijd<br /><span className="text-cta">live</span> in je hand.
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/70" data-sub>
            Scores, highlights en stats — sneller dan het net door de ring valt.
          </p>
          <div className="mt-8 flex flex-wrap gap-4" data-actions>
            <a href="#download" className="cursor-pointer rounded-full bg-cta px-7 py-3 font-bold text-white transition-colors hover:bg-orange-600">Download de app</a>
            <a href="#more" className="cursor-pointer rounded-full border border-white/30 px-7 py-3 font-semibold transition-colors hover:bg-white/10">Bekijk demo</a>
          </div>

          {/* social proof */}
          <div className="mt-10 flex items-center gap-5" data-proof>
            <div className="flex -space-x-3">
              {[0,1,2,3].map((i) => (
                <span key={i} className="h-9 w-9 rounded-full border-2 border-ink bg-secondary" data-avatar />
              ))}
            </div>
            <div className="text-sm">
              <span className="font-bold text-cta" aria-hidden>★★★★★</span>
              <p className="text-white/70"><span data-count="50">0</span>k+ fans aan boord</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4" data-statgrid>
          {[{ n: 30, l: "Teams" }, { n: 99, l: "% uptime" }, { n: 24, l: "u/dag live" }].map((s) => (
            <div key={s.l} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur" data-stat>
              <span className="block text-3xl font-extrabold text-cta" data-count={s.n}>0</span>
              <span className="mt-1 block text-xs text-white/60">{s.l}</span>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    tl.from("[data-glow]", { autoAlpha: 0, scale: 0.8, duration: 1.2, ease: "power2.out" }, 0)
      .from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 }, 0)
      .from("[data-eyebrow]", { y: 16, autoAlpha: 0, duration: 0.5 }, "-=0.1")
      .from("[data-headline]", { y: 50, autoAlpha: 0 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.45")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-avatar]", { x: -12, autoAlpha: 0, stagger: 0.08 }, "-=0.3")
      .from("[data-proof] > div:last-child", { x: 16, autoAlpha: 0 }, "<")
      .from("[data-stat]", { y: 30, autoAlpha: 0, scale: 0.95, stagger: 0.12, ease: "back.out(1.7)" }, "-=0.3")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count))
        );
      }, "-=0.2");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-glow], [data-nav], [data-eyebrow], [data-headline], [data-sub], [data-actions] > *, [data-avatar], [data-stat]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = el.dataset.count ?? "0"; });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Energieke headline (Inter extrabold) met `text-cta` accent op donkere `ink` canvas.
- [ ] Avatar-stack en sterren tonen social proof; stat-counters tellen op via GSAP.
- [ ] Eén `gsap.timeline()`: glow + nav → headline → sub → actions → proof → stats.
- [ ] Eases: `power3.out` (entrees), `back.out(1.7)` (CTA's + stats).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast op donkere achtergrond.
