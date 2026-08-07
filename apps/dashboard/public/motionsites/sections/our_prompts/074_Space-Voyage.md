# Space Voyage — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een landing-hero voor "Space Voyage" — een ruimte-/reisbelevingsmerk dat tickets per pakket verkoopt. De hero combineert een filmische headline met een prijs-georiënteerde laag (drie launch-pakketten) en een warme CTA tegen een sky-blue trust-palet.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused, uitgevoerd in een technisch monospace karakter.
- **Pattern:** Pricing Page + CTA — highlight het starter/aanbevolen pakket, toon annual-korting, CTA per kaart + sticky nav-CTA.
- **Kleurenpalet (hex tokens):**
  - Primary `#0EA5E9` (sky blue)
  - Secondary `#38BDF8`
  - CTA `#F97316` (warm)
  - Background `#F0F9FF`
  - Text `#0C4A6E`
- **Typografie (Google Fonts):** Space Mono voor heading én body (technical, minimal, stark).
- **Key effects:** stat counter count-up, logo-grid fade-in, kaart-hover lift, testimonial-micro-animaties.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-6xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#0EA5E9",
    secondary: "#38BDF8",
    cta: "#F97316",
    surface: "#F0F9FF",
    ink: "#0C4A6E",
  },
  fontFamily: { mono: ["'Space Mono'", "ui-monospace", "monospace"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Pakket-kaart-helper met "recommended" highlight.

```tsx
import { cn } from "@/lib/utils";

export function PlanCard({ name, price, featured, children }: {
  name: string; price: string; featured?: boolean; children: React.ReactNode;
}) {
  return (
    <div data-anim="plan" className={cn(
      "rounded-2xl border-2 p-6 transition hover:-translate-y-1",
      featured ? "border-primary bg-white shadow-xl shadow-primary/20" : "border-ink/15 bg-white/70",
    )}>
      {featured && <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">RECOMMENDED</span>}
      <h3 className="font-bold uppercase">{name}</h3>
      <p className="mt-2 text-3xl font-bold text-primary">{price}</p>
      <div className="mt-4 space-y-2 text-sm text-ink/70">{children}</div>
    </div>
  );
}
```

## Structure

```tsx
export default function SpaceVoyageHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-mono text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold">SPACE_VOYAGE</span>
        <div data-anim="nav" className="hidden gap-6 text-sm md:flex">
          <a href="#fleet" className="cursor-pointer hover:text-primary">[fleet]</a>
          <a href="#packages" className="cursor-pointer hover:text-primary">[packages]</a>
          <a href="#faq" className="cursor-pointer hover:text-primary">[faq]</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-lg bg-cta px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
          Reserve seat
        </button>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-16 text-center lg:py-24">
        <span data-anim="eyebrow" className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary">
          LAUNCH WINDOW · Q3 2027
        </span>
        <h1 data-anim="title" className="mx-auto mt-6 max-w-3xl text-5xl font-bold uppercase leading-[1.05] sm:text-6xl">
          Book your seat<br /><span className="text-primary">beyond the line.</span>
        </h1>
        <p data-anim="sub" className="mx-auto mt-6 max-w-xl text-base text-ink/70">
          // sub-orbital flights, zero-g windows & a crew that's flown it before.
          choose a package — save 25% on annual launch credits.
        </p>
        <div data-anim="stats" className="mx-auto mt-10 flex max-w-md justify-center gap-10">
          <div><span data-counter="42" className="block text-3xl font-bold text-primary">0</span><span className="text-xs">launches</span></div>
          <div><span data-counter="900" className="block text-3xl font-bold text-primary">0</span><span className="text-xs">voyagers</span></div>
          <div><span data-counter="100" className="block text-3xl font-bold text-primary">0</span><span className="text-xs">% safe return</span></div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-3">
        <PlanCard name="Orbit" price="$45k">
          <p>1 sub-orbital flight</p><p>2-day training</p>
          <button className="mt-4 w-full cursor-pointer rounded-lg border-2 border-ink py-2.5 font-bold transition hover:bg-primary/5">Choose Orbit</button>
        </PlanCard>
        <PlanCard name="Voyager" price="$120k" featured>
          <p>3 flights + zero-g</p><p>1-week training</p>
          <button className="mt-4 w-full cursor-pointer rounded-lg bg-cta py-2.5 font-bold text-white transition hover:brightness-110">Choose Voyager</button>
        </PlanCard>
        <PlanCard name="Pioneer" price="$320k">
          <p>Private capsule</p><p>Full crew program</p>
          <button className="mt-4 w-full cursor-pointer rounded-lg border-2 border-ink py-2.5 font-bold transition hover:bg-primary/5">Choose Pioneer</button>
        </PlanCard>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div data-anim="logos" className="flex flex-wrap items-center justify-center gap-8 text-sm opacity-60">
          {["// aerolux", "// stellargate", "// nova-air", "// kosmos"].map((b) => <span key={b}>{b}</span>)}
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
      .from("[data-anim='title']", { y: 30, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='sub']", { y: 20, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='stats'] > *", { y: 18, autoAlpha: 0, stagger: 0.1 }, "-=0.4")
      .from("[data-anim='plan']", { y: 32, autoAlpha: 0, scale: 0.97, stagger: 0.12, ease: "back.out(1.6)" }, "-=0.3")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      const end = Number(el.dataset.counter);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.5, ease: "power1.out", delay: 0.9,
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

- [ ] Eyebrow, headline, sub, stats én drie pakket-kaarten verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Aanbevolen pakket ("Voyager") visueel gehighlight; CTA per kaart + sticky nav-CTA.
- [ ] Stat-cijfers tellen op; bij reduced-motion direct eindwaarde, geen entrance.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.6)`); geen width/height/top/left.
- [ ] `gsap.matchMedia()` dekt `prefers-reduced-motion`; cleanup via `useGSAP` scope.
- [ ] Space Mono geladen; sky-blue + warme CTA tokens uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
