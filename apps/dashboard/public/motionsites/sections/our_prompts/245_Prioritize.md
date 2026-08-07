# Prioritize — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een hero voor "Prioritize", een productiviteits-/taakprioriterings-tool: een heldere belofte over focus, een "Probeer gratis" CTA, en social proof plus een UI-preview-card met een mini takenlijst. Doel: vertrouwen wekken en aanmelden stimuleren.

## Design system (ui-ux-pro-max)

- **Style:** Social Proof-Focused — testimonials/ratings, success-metrics, credibility markers.
- **Pattern:** Video-/UI-first hero met overlay-CTA en proof-strook.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (blauw)
  - `secondary` `#3B82F6` (lichtblauw)
  - `cta` `#F97316` (warm oranje)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Font pairing (Google Fonts):** Inter (heading + body, `wght 300–700`), mood: professioneel, clear.
- **Key effects:** UI-card reveal, checkbox-tick animatie, stat counter (count-up), hover-transitions 150–300ms.
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
- `countTo(el, end, suffix)` voor de stat (bv. "gebruikers").
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
export function PrioritizeHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6" data-nav>
        <span className="text-lg font-bold tracking-tight">Prioritize</span>
        <a href="#start" className="cursor-pointer rounded-lg bg-cta px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">Probeer gratis</a>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-2">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-primary shadow-sm" data-badge>
            Nieuw · smart prioritering
          </span>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl" data-headline>
            Doe eerst wat <span className="text-primary">echt</span> telt.
          </h1>
          <p className="mt-6 max-w-md text-lg text-slate-500" data-sub>
            Prioritize rangschikt je taken automatisch op impact, zodat focus vanzelf komt.
          </p>
          <div className="mt-8 flex flex-wrap gap-4" data-actions>
            <a href="#start" className="cursor-pointer rounded-lg bg-cta px-7 py-3 font-semibold text-white transition-colors hover:bg-orange-600">Start gratis</a>
            <a href="#tour" className="cursor-pointer rounded-lg border border-slate-300 bg-white px-7 py-3 font-semibold text-ink transition-colors hover:bg-slate-100">Bekijk tour</a>
          </div>
          <p className="mt-7 text-sm text-slate-500" data-proof>
            <span className="font-bold text-primary"><span data-count="80000" data-suffix="+">0</span></span> teams werken al gefocust.
          </p>
        </div>

        {/* UI preview card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl" data-card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Vandaag</p>
          <ul className="space-y-2">
            {["Pitch afronden", "Review PR #142", "Klant bellen", "Sprint plannen"].map((t, i) => (
              <li key={t} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5" data-task>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded border", i === 0 ? "border-primary bg-primary text-white" : "border-slate-300")} data-check>
                  {i === 0 && <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M7.5 13.5 4 10l1.4-1.4 2.1 2.1 5.1-5.1L14 7z" /></svg>}
                </span>
                <span className={cn("text-sm", i === 0 && "text-slate-400 line-through")}>{t}</span>
                {i === 1 && <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-[0.6rem] font-bold text-cta">Hoog</span>}
              </li>
            ))}
          </ul>
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

    tl.from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 })
      .from("[data-badge]", { y: 16, autoAlpha: 0, scale: 0.9, ease: "back.out(1.7)" }, "-=0.1")
      .from("[data-headline]", { y: 40, autoAlpha: 0 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.45")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-proof]", { y: 16, autoAlpha: 0 }, "-=0.4")
      .from("[data-card]", { x: 48, autoAlpha: 0, scale: 0.96, duration: 1 }, "-=0.9")
      .from("[data-task]", { y: 16, autoAlpha: 0, stagger: 0.1 }, "-=0.6")
      // checkbox-tick: pop op de eerste check
      .from("[data-check]:first-of-type", { scale: 0, ease: "back.out(2.5)", duration: 0.4 }, "-=0.2")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count), el.dataset.suffix ?? "")
        );
      }, "-=0.5");

    gsap.to("[data-card]", { y: "+=8", duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-badge], [data-headline], [data-sub], [data-actions] > *, [data-proof], [data-card], [data-task], [data-check]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = Number(el.dataset.count).toLocaleString("nl-NL") + (el.dataset.suffix ?? ""); });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Heldere focus-headline (Inter extrabold) met `text-primary` accent; oranje CTA.
- [ ] UI-preview card met takenlijst reveal't, eerste checkbox "pop"-tikt, kaart zweeft subtiel.
- [ ] Stat-counter telt op via GSAP; social-proof regel zichtbaar.
- [ ] Eén `gsap.timeline()`: nav → badge → headline → sub → actions → proof → card → tasks → check.
- [ ] Eases: `power3.out` (entrees), `back.out(1.7)`/`back.out(2.5)` (CTA's + tick).
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar; counter op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer`, focus-states, hover-transitions 150–300ms; CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast.
