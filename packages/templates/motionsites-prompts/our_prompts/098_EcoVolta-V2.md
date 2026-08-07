# EcoVolta V2 — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een tweede iteratie hero voor "EcoVolta" — een clean-energy / EV-charging merk. Een vertrouwenwekkende headline over duurzame energie, een live-impact paneel (CO₂ bespaard, sessies), social-proof logo's en een warme oranje CTA tegen professioneel blauw.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, logo's, succesmetrics, credibility-markers (B2B/premium, WCAG AA).
- **Pattern:** Video-First Hero — dark overlay (60%), brand-accent CTA, witte tekst op donker.
- **Kleurenpalet (hex tokens):**
  - Primary `#2563EB` (blue)
  - Secondary `#3B82F6`
  - CTA `#F97316` (orange)
  - Background `#F8FAFC`
  - Text `#1E293B`
- **Typografie (Google Fonts):** Inter voor heading én body (professioneel, helder).
- **Key effects:** stat counter count-up, logo-grid fade-in, testimonial-carousel, zachte hover 150–300ms.

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
    surface: "#F8FAFC",
    ink: "#1E293B",
    leaf: "#16A34A", // accent voor eco-impact
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Impact-stat helper met count-up.

```tsx
import { cn } from "@/lib/utils";

export function ImpactStat({ value, suffix, label, className }: {
  value: number; suffix?: string; label: string; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-white p-5 ring-1 ring-ink/5", className)}>
      <p className="text-3xl font-bold text-primary">
        <span data-counter={value}>0</span>{suffix}
      </p>
      <p className="mt-1 text-sm text-ink/60">{label}</p>
    </div>
  );
}
```

## Structure

```tsx
export default function EcoVoltaHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-sans text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold text-primary">EcoVolta</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#network" className="cursor-pointer hover:text-primary">Network</a>
          <a href="#business" className="cursor-pointer hover:text-primary">For business</a>
          <a href="#app" className="cursor-pointer hover:text-primary">App</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Find a charger
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span data-anim="eyebrow" className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-4 py-1.5 text-xs font-semibold text-leaf">
            <span className="h-2 w-2 rounded-full bg-leaf" /> 100% RENEWABLE GRID
          </span>
          <h1 data-anim="title" className="mt-6 text-5xl font-bold leading-[1.06] sm:text-6xl">
            Charge clean.<br />
            <span className="text-primary">Drive further.</span>
          </h1>
          <p data-anim="sub" className="mt-6 max-w-md text-lg text-ink/70">
            EcoVolta V2 brings faster chargers, smarter routing and transparent
            green-energy proof — so every kilometre counts twice.
          </p>
          <div data-anim="cta" className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-lg bg-cta px-7 py-3.5 font-semibold text-white shadow-lg shadow-cta/25 transition hover:brightness-110">
              Find a charger
            </button>
            <button className="cursor-pointer rounded-lg px-7 py-3.5 font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/5">
              For fleets
            </button>
          </div>
        </div>

        <div data-anim="panel" className="grid grid-cols-2 gap-4">
          <ImpactStat value={2400} suffix="t" label="CO₂ saved this year" data-anim="stat" />
          <ImpactStat value={185000} label="charge sessions" data-anim="stat" />
          <ImpactStat value={620} label="charge points" data-anim="stat" />
          <ImpactStat value={99} suffix="%" label="uptime" data-anim="stat" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <p className="text-xs uppercase tracking-widest text-ink/40">Powering fleets at</p>
        <div data-anim="logos" className="mt-5 flex flex-wrap items-center gap-10 opacity-60">
          {["Moveco", "Greenline", "Urbis", "Voltar", "Pathway"].map((b) => (
            <span key={b} className="text-lg font-semibold">{b}</span>
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

    tl.from("[data-anim='nav']", { y: -20, autoAlpha: 0, stagger: 0.08 })
      .from("[data-anim='eyebrow']", { y: 14, autoAlpha: 0 }, "-=0.3")
      .from("[data-anim='title']", { y: 28, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='sub']", { y: 20, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='cta']", { y: 16, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='stat']", { y: 24, autoAlpha: 0, scale: 0.96, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.5")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      const end = Number(el.dataset.counter);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.6, ease: "power1.out", delay: 0.9,
        snap: { innerText: 1 },
        onUpdate() { el.innerText = Math.floor(Number(el.innerText)).toLocaleString(); },
      });
    });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      el.innerText = Number(el.dataset.counter).toLocaleString();
    });
  });
}, { scope });
```

## Acceptance

- [ ] Eyebrow, headline, sub, CTA's, impact-stats en logo's verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Impact-cijfers (CO₂, sessies, uptime) tellen op; bij reduced-motion direct eindwaarde.
- [ ] Eco-accent (leaf-groen) gebruikt voor de renewable-badge; CTA in oranje `#F97316`.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.7)`).
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion: reduce`; cleanup via `useGSAP` scope.
- [ ] Inter geladen; palet-tokens exact uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
