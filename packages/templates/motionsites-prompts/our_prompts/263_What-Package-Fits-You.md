# What Package Fits You — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Pricing · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een pricing-hero die de bezoeker direct helpt kiezen: een vragende headline ("What package fits you?"), een maandelijks/jaarlijks toggle, drie heldere prijskaarten met een aanbevolen plan en een warme CTA. Doel: keuzehulp en conversie binnen één scherm.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, logo's, ratings, succesmetrics als vertrouwenslaag (B2B/premium, WCAG AA).
- **Pattern:** keuze-/conversiegericht — urgency en duidelijke vergelijking; CTA in hero + bottom anchor.
- **Kleurenpalet (hex tokens):**
  - Primary `#2563EB` (blue)
  - Secondary `#3B82F6`
  - CTA `#F97316` (orange)
  - Background `#F8FAFC`
  - Text `#1E293B`
- **Typografie (Google Fonts):** Inter voor heading én body (professioneel, helder).
- **Key effects:** stat counter count-up, kaart-hover lift, logo-grid fade-in, toggle-microinteractie.

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
    surface: "#F8FAFC",
    ink: "#1E293B",
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Prijskaart-helper met "popular" highlight + check-list (SVG checks, geen emoji).

```tsx
import { cn } from "@/lib/utils";

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 flex-none fill-primary" aria-hidden>
      <path d="M8 13.2L4.8 10l-1.1 1.1L8 15.4l8.3-8.3-1.1-1.1z" />
    </svg>
  );
}

export function PriceCard({ name, price, popular, features }: {
  name: string; price: string; popular?: boolean; features: string[];
}) {
  return (
    <div data-anim="card" className={cn(
      "rounded-3xl border bg-white p-7 transition hover:-translate-y-1",
      popular ? "border-primary shadow-xl shadow-primary/15 ring-2 ring-primary/40" : "border-ink/10 shadow-sm",
    )}>
      {popular && <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">MOST POPULAR</span>}
      <h3 className="text-lg font-bold">{name}</h3>
      <p className="mt-3"><span className="text-4xl font-bold text-primary">{price}</span><span className="text-sm text-ink/60">/mo</span></p>
      <ul className="mt-5 space-y-3 text-sm text-ink/70">
        {features.map((f) => <li key={f} className="flex items-start gap-2"><Check />{f}</li>)}
      </ul>
      <button className={cn(
        "mt-7 w-full cursor-pointer rounded-xl py-3 font-semibold transition",
        popular ? "bg-cta text-white hover:brightness-110" : "ring-1 ring-primary/30 text-primary hover:bg-primary/5",
      )}>
        Choose {name}
      </button>
    </div>
  );
}
```

## Structure

```tsx
export default function PackageFitsHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-sans text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold text-primary">Tierly</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#features" className="cursor-pointer hover:text-primary">Features</a>
          <a href="#pricing" className="cursor-pointer hover:text-primary">Pricing</a>
          <a href="#faq" className="cursor-pointer hover:text-primary">FAQ</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Get started
        </button>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-16 text-center lg:py-20">
        <span data-anim="eyebrow" className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-primary">
          SIMPLE, HONEST PRICING
        </span>
        <h1 data-anim="title" className="mx-auto mt-6 max-w-2xl text-5xl font-bold leading-[1.05] sm:text-6xl">
          What package <span className="text-primary">fits you?</span>
        </h1>
        <p data-anim="sub" className="mx-auto mt-5 max-w-lg text-lg text-ink/70">
          Pick the plan that matches where you are today — upgrade or downgrade
          anytime. Save 25% when you pay yearly.
        </p>

        <div data-anim="toggle" className="mt-8 inline-flex items-center gap-1 rounded-full bg-ink/5 p-1 text-sm font-semibold">
          <button className="cursor-pointer rounded-full bg-white px-5 py-2 text-primary shadow-sm">Monthly</button>
          <button className="cursor-pointer rounded-full px-5 py-2 text-ink/60 hover:text-ink">Yearly −25%</button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-3">
        <PriceCard name="Starter" price="$0" features={["1 workspace", "Up to 3 members", "Community support"]} />
        <PriceCard name="Growth" price="$24" popular features={["Unlimited projects", "Up to 25 members", "Priority support", "Advanced analytics"]} />
        <PriceCard name="Scale" price="$59" features={["SSO & roles", "Unlimited members", "Dedicated manager", "99.9% SLA"]} />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 text-center">
        <div data-anim="stats" className="flex flex-wrap items-center justify-center gap-12">
          <div><span data-counter="12000" className="block text-3xl font-bold text-primary">0</span><span className="text-sm text-ink/60">teams onboard</span></div>
          <div><span data-counter="98" className="block text-3xl font-bold text-primary">0</span><span className="text-sm text-ink/60">% would recommend</span></div>
        </div>
        <div data-anim="logos" className="mt-8 flex flex-wrap items-center justify-center gap-10 opacity-60">
          {["Lumen", "Northwind", "Cobalt", "Maple", "Drift"].map((b) => (
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
      .from("[data-anim='toggle']", { y: 16, autoAlpha: 0, scale: 0.96, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-anim='card']", { y: 36, autoAlpha: 0, scale: 0.97, stagger: 0.12, ease: "back.out(1.6)" }, "-=0.2")
      .from("[data-anim='stats'] > *", { y: 18, autoAlpha: 0, stagger: 0.1 }, "-=0.3")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      const end = Number(el.dataset.counter);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.5, ease: "power1.out", delay: 1,
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

- [ ] Eyebrow, headline, sub, billing-toggle, drie prijskaarten, stats en logo's verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Aanbevolen plan ("Growth") gehighlight; CTA in hero + per kaart; check-marks als SVG (geen emoji).
- [ ] Stat-cijfers tellen op; bij reduced-motion direct eindwaarde, geen entrance.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.6/1.7)`).
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion: reduce`; cleanup via `useGSAP` scope.
- [ ] Inter geladen; blue primary + oranje CTA tokens uit design system.
- [ ] `cursor-pointer` + focus-states op toggle/kaart-CTA's; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
