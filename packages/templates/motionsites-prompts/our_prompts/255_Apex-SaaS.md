# Apex SaaS — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vibrant, block-based SaaS-hero voor "Apex" — een analytics/performance-platform. Bold headline, een product-mockup in een gekleurd blok, kerncijfers en een emerald CTA tegen indigo. Doel: in één scherm laten zien dat het platform teams naar de top (apex) van hun metrics brengt.

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
- **Key effects:** grote secties (48px+ gaps), animated patterns, bold hover (color shift), scroll-snap, grote type, 200–300ms.

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

Scope-ref + reduced-motion via `gsap.matchMedia()`. Mini-bar helper voor het mockup-chart (count-up op de hoogte vermijden — we animeren `scaleY` van de transform).

```tsx
import { cn } from "@/lib/utils";

export function Bar({ h, className }: { h: number; className?: string }) {
  // h = procentuele hoogte; we zetten height in style en animeren scaleY via GSAP
  return (
    <div
      data-bar
      style={{ height: `${h}%`, transformOrigin: "bottom" }}
      className={cn("w-6 rounded-t-md bg-cta", className)}
    />
  );
}
```

## Structure

```tsx
export default function ApexSaaSHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-sans text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold text-primary">Apex</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-semibold md:flex">
          <a href="#product" className="cursor-pointer hover:text-primary">Product</a>
          <a href="#solutions" className="cursor-pointer hover:text-primary">Solutions</a>
          <a href="#pricing" className="cursor-pointer hover:text-primary">Pricing</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Get Apex
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span data-anim="eyebrow" className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary">
            PERFORMANCE ANALYTICS
          </span>
          <h1 data-anim="title" className="mt-6 text-5xl font-bold leading-[1.02] sm:text-6xl">
            Reach the<br /><span className="text-primary">apex</span> of every metric.
          </h1>
          <p data-anim="sub" className="mt-6 max-w-md text-lg text-ink/70">
            Unify product, growth and revenue data into one decisive dashboard —
            so your team always knows the next move.
          </p>
          <div data-anim="cta" className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-cta px-7 py-3.5 font-semibold text-white shadow-lg shadow-cta/30 transition hover:brightness-110">
              Start free
            </button>
            <button className="cursor-pointer rounded-full px-7 py-3.5 font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/5">
              Book demo
            </button>
          </div>
          <div data-anim="stats" className="mt-10 flex gap-10">
            <div><span data-counter="3" className="text-3xl font-bold text-primary">0</span><span className="text-3xl font-bold text-primary">x</span><p className="text-sm text-ink/60">faster reporting</p></div>
            <div><span data-counter="98" className="text-3xl font-bold text-primary">0</span><span className="text-3xl font-bold text-primary">%</span><p className="text-sm text-ink/60">data accuracy</p></div>
          </div>
        </div>

        <div data-anim="panel" className="rounded-3xl bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl shadow-primary/30">
          <div className="rounded-[22px] bg-white p-6">
            <p className="text-xs uppercase tracking-widest text-ink/40">Weekly revenue</p>
            <div className="mt-4 flex h-40 items-end gap-3">
              <Bar h={45} /><Bar h={62} /><Bar h={38} /><Bar h={80} /><Bar h={56} /><Bar h={92} /><Bar h={70} />
            </div>
            <p className="mt-4 text-sm font-semibold text-cta">▲ +24% vs last week</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <p className="text-xs uppercase tracking-widest text-ink/40">Used by data teams at</p>
        <div data-anim="logos" className="mt-5 flex flex-wrap items-center gap-10 opacity-60">
          {["Quanta", "Northstar", "Beacon", "Pulse", "Axiom"].map((b) => (
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
      .from("[data-anim='eyebrow']", { y: 16, autoAlpha: 0 }, "-=0.3")
      .from("[data-anim='title']", { y: 28, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='sub']", { y: 20, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='cta']", { y: 16, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='stats'] > *", { y: 18, autoAlpha: 0, stagger: 0.1 }, "-=0.4")
      .from("[data-anim='panel']", { x: 40, autoAlpha: 0, scale: 0.97, ease: "back.out(1.7)" }, "-=0.7")
      .from("[data-bar]", { scaleY: 0, autoAlpha: 0, stagger: 0.07, ease: "back.out(1.6)" }, "-=0.4")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      const end = Number(el.dataset.counter);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.4, ease: "power1.out", delay: 0.9,
        snap: { innerText: 1 },
        onUpdate() { el.innerText = String(Math.floor(Number(el.innerText))); },
      });
    });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-bar]", { autoAlpha: 1, x: 0, y: 0, scale: 1, scaleY: 1 });
    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      el.innerText = String(el.dataset.counter);
    });
  });
}, { scope });
```

## Acceptance

- [ ] Eyebrow, headline, sub, CTA's, stats, product-panel (chart) en logo's verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Chart-bars groeien via `scaleY` (transform, geen height-animatie) met `back.out`; cijfers tellen op.
- [ ] Reduced-motion zet alles statisch zichtbaar (bars op `scaleY:1`, cijfers op eindwaarde).
- [ ] Alleen transform-aliases (`x`,`y`,`scale`,`scaleY`,`autoAlpha`) + ingebouwde eases (`power3.out`, `back.out`).
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion: reduce`; cleanup via `useGSAP` scope.
- [ ] Plus Jakarta Sans geladen; indigo + emerald CTA tokens uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
