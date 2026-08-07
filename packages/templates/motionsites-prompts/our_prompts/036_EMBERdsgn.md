# EMBER.dsgn — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een hero voor een design-studio met de merknaam "EMBER.dsgn", opgebouwd rond een vertrouwen-gedreven layout: groot statement, een rij van client-logo's en compacte social-proof stats. Doel: de studio neerzetten als bewezen partner en de bezoeker naar een intake leiden.

## Design system (ui-ux-pro-max)

- **Style:** Social Proof-Focused — testimonials/logo's prominent, success-metrics, credibility markers.
- **Pattern:** Video-/sfeer-first hero met overlay-CTA en proof-strook.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (blauw)
  - `secondary` `#3B82F6` (lichtblauw)
  - `cta` `#F97316` (warm oranje)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Font pairing (Google Fonts):** Inter voor heading én body (`wght 300–700`), mood: professioneel, clear.
- **Key effects:** logo-grid fade-in, stat counter (number count-up), subtiele testimonial-fade, hover-transitions 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-6xl mx-auto px-6`.

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
- `countTo(el, end)` helper: animeer een tussenwaarde-object met GSAP en schrijf `innerText` in `onUpdate`.
- `gsap.matchMedia()` voor `(prefers-reduced-motion: reduce)` — counters springen direct naar eindwaarde.

```tsx
function countTo(el: HTMLElement, end: number) {
  const obj = { val: 0 };
  return gsap.to(obj, {
    val: end, duration: 1.6, ease: "power2.out",
    onUpdate: () => { el.innerText = Math.round(obj.val).toString(); },
  });
}
```

## Structure

```tsx
export function EmberDsgnHero() {
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6" data-nav>
        <span className="text-lg font-bold tracking-tight">EMBER<span className="text-cta">.dsgn</span></span>
        <a href="#contact" className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Start a project</a>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pb-12 pt-16 text-center">
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-primary" data-eyebrow>Design studio</p>
        <h1 className="mx-auto max-w-4xl text-balance text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl" data-headline>
          Design die merken laat <span className="text-cta">opgloeien</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-500" data-sub>
          Wij ontwerpen producten en merken die meetbaar presteren.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4" data-actions>
          <a href="#contact" className="cursor-pointer rounded-full bg-cta px-7 py-3 font-semibold text-white transition-colors hover:bg-orange-600">Plan een intake</a>
          <a href="#work" className="cursor-pointer rounded-full border border-slate-300 px-7 py-3 font-semibold text-ink transition-colors hover:bg-slate-100">Bekijk werk</a>
        </div>
      </div>

      {/* social proof: logos */}
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-6 text-center text-xs uppercase tracking-widest text-slate-400">Vertrouwd door teams bij</p>
        <div className="grid grid-cols-2 items-center gap-8 opacity-70 sm:grid-cols-4">
          {["Northwind", "Lumio", "Vault", "Cascade"].map((b) => (
            <span key={b} className="text-center text-lg font-semibold text-slate-500" data-logo>{b}</span>
          ))}
        </div>
      </div>

      {/* social proof: stats */}
      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-3 gap-6 px-6 pb-20">
        {[{ n: 120, l: "Projecten" }, { n: 48, l: "Awards" }, { n: 98, l: "% retentie" }].map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" data-stat>
            <span className="block text-4xl font-extrabold text-primary" data-count={s.n}>0</span>
            <span className="mt-1 block text-sm text-slate-500">{s.l}</span>
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

    tl.from("[data-nav]", { y: -24, autoAlpha: 0, duration: 0.5 })
      .from("[data-eyebrow]", { y: 16, autoAlpha: 0, duration: 0.5 }, "-=0.1")
      .from("[data-headline]", { y: 40, autoAlpha: 0 }, "-=0.2")
      .from("[data-sub]", { y: 24, autoAlpha: 0 }, "-=0.45")
      .from("[data-actions] > *", { y: 20, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-logo]", { y: 16, autoAlpha: 0, stagger: 0.08 }, "-=0.2")
      .from("[data-stat]", { y: 30, autoAlpha: 0, stagger: 0.12 }, "-=0.2")
      .add(() => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countTo(el, Number(el.dataset.count))
        );
      }, "-=0.2");
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-eyebrow], [data-headline], [data-sub], [data-actions] > *, [data-logo], [data-stat]", { autoAlpha: 1, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => { el.innerText = el.dataset.count ?? "0"; });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Headline (Inter, extrabold) met `text-cta` accent; oranje CTA + blauwe nav-CTA conform palette.
- [ ] Logo-strook fade-in met stagger; stat-counters tellen op naar eindwaarde via GSAP `onUpdate`.
- [ ] Eén `gsap.timeline()` choreografeert nav → headline → sub → actions → logos → stats.
- [ ] Eases: `power3.out` voor entrees, `back.out(1.7)` voor CTA-knoppen.
- [ ] `gsap.matchMedia()` met `(prefers-reduced-motion: reduce)` zet alles direct zichtbaar en counters op eindwaarde.
- [ ] Alleen transform-aliases (`x/y/scale/autoAlpha`); geen width/height/top/left.
- [ ] `cursor-pointer` + focus-states + hover-transitions 150–300ms; contact-CTA prominent.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; WCAG AA contrast.
