# Planet Orbit — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een levendige, block-based SaaS-hero voor "Planet Orbit" — een team-/workspace-platform. Bold headline, geometrische blokken, een ronddraaiend orbit-visual en een emerald CTA tegen indigo. Doel: een speelse maar professionele introductie van het product en zijn kernwaarden.

## Design system (ui-ux-pro-max)

- **Stijl:** Vibrant & Block-based — bold, energetic, geometrische vormen, block-layout, high color contrast (startups/SaaS; ensure WCAG).
- **Pattern:** Video-First Hero — dark overlay (60%), brand-accent CTA, witte tekst op donker.
- **Kleurenpalet (hex tokens):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8`
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF`
  - Text `#1E1B4B`
- **Typografie (Google Fonts):** Plus Jakarta Sans voor heading én body (friendly, modern, saas).
- **Key effects:** grote secties (48px+ gaps), animated patterns, bold hover (color shift), scroll-snap, grote type (32px+), 200–300ms.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#6366F1",
    secondary: "#818CF8",
    cta: "#10B981",
    surface: "#F5F3FF",
    ink: "#1E1B4B",
  },
  fontFamily: { sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Feature-block helper (gekleurde card).

```tsx
import { cn } from "@/lib/utils";

export function FeatureBlock({ title, body, tone, className }: {
  title: string; body: string; tone: "indigo" | "emerald" | "violet"; className?: string;
}) {
  const tones = {
    indigo: "bg-primary text-white",
    emerald: "bg-cta text-white",
    violet: "bg-secondary text-ink",
  } as const;
  return (
    <div data-anim="block" className={cn("rounded-3xl p-6 transition hover:-translate-y-1", tones[tone], className)}>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm opacity-90">{body}</p>
    </div>
  );
}
```

## Structure

```tsx
export default function PlanetOrbitHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-sans text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold text-primary">Planet Orbit</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-semibold md:flex">
          <a href="#features" className="cursor-pointer hover:text-primary">Features</a>
          <a href="#teams" className="cursor-pointer hover:text-primary">Teams</a>
          <a href="#pricing" className="cursor-pointer hover:text-primary">Pricing</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Try free
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span data-anim="eyebrow" className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary">
            THE TEAM OS
          </span>
          <h1 data-anim="title" className="mt-6 text-5xl font-bold leading-[1.02] sm:text-6xl">
            Keep every team<br /><span className="text-primary">in orbit.</span>
          </h1>
          <p data-anim="sub" className="mt-6 max-w-md text-lg text-ink/70">
            Docs, tasks and goals revolving around one source of truth — so your
            whole company moves in sync, not in circles.
          </p>
          <div data-anim="cta" className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-cta px-7 py-3.5 font-semibold text-white shadow-lg shadow-cta/30 transition hover:brightness-110">
              Start free
            </button>
            <button className="cursor-pointer rounded-full px-7 py-3.5 font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/5">
              Watch tour
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          {/* orbit-visual: kern + ronddraaiende ring met node-blokken */}
          <div data-anim="core" className="relative h-64 w-64 rounded-full bg-gradient-to-br from-primary to-secondary shadow-2xl shadow-primary/40" />
          <div data-orbit className="absolute h-80 w-80 rounded-full border-2 border-dashed border-primary/30">
            <span className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-lg bg-cta" />
            <span className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-lg bg-secondary" />
            <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-lg bg-primary" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 md:grid-cols-3">
        <FeatureBlock tone="indigo" title="Aligned goals" body="OKRs that connect to daily work automatically." />
        <FeatureBlock tone="emerald" title="One workspace" body="Docs, tasks and chat in a single calm surface." />
        <FeatureBlock tone="violet" title="Live insight" body="Real-time dashboards your leadership actually reads." />
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

    tl.from("[data-anim='nav']", { y: -20, autoAlpha: 0, stagger: 0.08 })
      .from("[data-anim='eyebrow']", { y: 16, autoAlpha: 0 }, "-=0.3")
      .from("[data-anim='title']", { y: 28, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='sub']", { y: 20, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='cta']", { y: 16, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='core']", { scale: 0.6, autoAlpha: 0, ease: "back.out(1.7)" }, "-=0.6")
      .from("[data-orbit]", { scale: 0.7, autoAlpha: 0, rotation: -30 }, "-=0.5")
      .from("[data-anim='block']", { y: 30, autoAlpha: 0, scale: 0.96, stagger: 0.12, ease: "back.out(1.6)" }, "-=0.3");

    // continue ronddraaiende orbit (alleen bij no-preference)
    gsap.to("[data-orbit]", { rotation: 360, duration: 24, ease: "none", repeat: -1 });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-orbit]", { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 });
  });
}, { scope });
```

## Acceptance

- [ ] Eyebrow, headline, sub, CTA's, orbit-visual en drie feature-blokken verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Orbit-ring draait continu rond (`rotation: 360`, `ease: "none"`) — alleen bij no-preference.
- [ ] Reduced-motion zet alles statisch zichtbaar, geen rotatie of looping.
- [ ] Alleen transform-aliases (incl. `rotation`, `scale`) + ingebouwde eases (`power3.out`, `back.out(1.7)`).
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion: reduce`; cleanup via `useGSAP` scope.
- [ ] Plus Jakarta Sans geladen; indigo + emerald CTA tokens uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast (let op tekst op gekleurde blokken).
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
