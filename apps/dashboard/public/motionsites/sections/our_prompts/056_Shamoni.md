# Shamoni — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een strakke, vertrouwenwekkende landing-hero voor "Shamoni" — een modern fintech/services-merk — met een heldere headline, klantlogo's, ratings en een warme oranje CTA tegenover een professioneel blauw. Doel: een eerste indruk van betrouwbaarheid en directe actie.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, logo's, reviews/ratings, succesmetrics prominent (B2B/premium, WCAG AA).
- **Pattern:** Video-First Hero — dark overlay (60%), brand-accent CTA, witte tekst op donker.
- **Kleurenpalet (hex tokens):**
  - Primary `#2563EB` (blue)
  - Secondary `#3B82F6`
  - CTA `#F97316` (orange)
  - Background `#F8FAFC`
  - Text `#1E293B`
- **Typografie (Google Fonts):** Inter voor heading én body (professioneel, helder).
- **Key effects:** testimonial-carousel, logo-grid fade-in, stat counter count-up, review-star ratings.

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
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Kleine star-rating helper (SVG, geen emoji).

```tsx
import { cn } from "@/lib/utils";

export function Stars({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5 text-cta", className)} aria-label={`${count} out of 5`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}
```

## Structure

```tsx
export default function ShamoniHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-sans text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold text-primary">Shamoni</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-medium md:flex">
          <a href="#product" className="cursor-pointer hover:text-primary">Product</a>
          <a href="#pricing" className="cursor-pointer hover:text-primary">Pricing</a>
          <a href="#company" className="cursor-pointer hover:text-primary">Company</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Get started
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <div data-anim="rating" className="flex items-center gap-3">
            <Stars />
            <span className="text-sm text-ink/60">4.9 from 2,300+ teams</span>
          </div>
          <h1 data-anim="title" className="mt-6 text-5xl font-bold leading-[1.07] sm:text-6xl">
            Money moves,<br />
            <span className="text-primary">handled with care.</span>
          </h1>
          <p data-anim="sub" className="mt-6 max-w-md text-lg text-ink/70">
            Shamoni unifies payments, invoicing and reconciliation into one calm
            dashboard — so your finance team can finally breathe.
          </p>
          <div data-anim="cta" className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-lg bg-cta px-7 py-3.5 font-semibold text-white shadow-lg shadow-cta/25 transition hover:brightness-110">
              Create free account
            </button>
            <button className="cursor-pointer rounded-lg px-7 py-3.5 font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/5">
              Talk to sales
            </button>
          </div>
        </div>

        <div data-anim="panel" className="relative">
          <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-primary/10 ring-1 ring-ink/5">
            <p className="text-xs uppercase tracking-widest text-ink/40">This month</p>
            <span data-counter="482900" className="mt-2 block text-4xl font-bold text-primary">0</span>
            <span className="text-sm text-ink/60">processed in EUR</span>
            <div data-anim="stats" className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface p-4"><span data-counter="99" className="block text-2xl font-bold">0</span><span className="text-xs text-ink/60">% on-time</span></div>
              <div className="rounded-xl bg-surface p-4"><span data-counter="1200" className="block text-2xl font-bold">0</span><span className="text-xs text-ink/60">clients</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <p className="text-xs uppercase tracking-widest text-ink/40">Trusted by finance teams at</p>
        <div data-anim="logos" className="mt-5 flex flex-wrap items-center gap-10 opacity-60">
          {["Lumen", "Corewave", "Halcyon", "Mintly", "Aperture"].map((b) => (
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
      .from("[data-anim='rating']", { y: 14, autoAlpha: 0 }, "-=0.3")
      .from("[data-anim='title']", { y: 28, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='sub']", { y: 20, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='cta']", { y: 16, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='panel']", { x: 40, autoAlpha: 0, scale: 0.97, ease: "back.out(1.7)" }, "-=0.7")
      .from("[data-anim='stats'] > *", { y: 18, autoAlpha: 0, stagger: 0.1 }, "-=0.4")
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

- [ ] Rating, headline, sub, CTA's, stats-panel en logo's verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Bedrag + stat-cijfers tellen op; bij reduced-motion direct eindwaarde.
- [ ] Sterren als SVG (geen emoji); CTA in oranje `#F97316`, primary in blue `#2563EB`.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.7)`).
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion: reduce`; cleanup via `useGSAP` scope.
- [ ] Inter geladen; palet-tokens exact uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
