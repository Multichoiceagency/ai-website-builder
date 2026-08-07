# WISA Space — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een technische, brutalist-getinte hero voor "WISA Space" — een spatiaal werk-/bookingplatform — met monospace typografie, een raw amber accent en een opvallende booking-blue CTA. De sectie communiceert in één blik beschikbaarheid van ruimtes en nodigt uit tot direct boeken.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused, uitgevoerd met een raw/brutalist monospace karakter (credibility via metrics en logo's).
- **Pattern:** Video-First Hero — dark overlay (60%), brand-accent CTA, witte tekst op donker.
- **Kleurenpalet (hex tokens):**
  - Primary `#F59E0B` (amber)
  - Secondary `#FBBF24`
  - CTA `#2563EB` (booking blue)
  - Background `#FFFBEB`
  - Text `#78350F`
- **Typografie (Google Fonts):** Space Mono voor heading én body (mood: brutalist, raw, technical, monospace, stark).
- **Key effects:** logo-grid fade-in, stat counter count-up, testimonial-carousel, harde hover-transities.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-6xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#F59E0B",
    secondary: "#FBBF24",
    cta: "#2563EB",
    surface: "#FFFBEB",
    ink: "#78350F",
  },
  fontFamily: { mono: ["'Space Mono'", "ui-monospace", "monospace"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. Brutalist "border-box" badge-helper.

```tsx
import { cn } from "@/lib/utils";

export function MonoBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("border-2 border-ink px-3 py-1 font-mono text-xs uppercase tracking-widest", className)}>
      {children}
    </span>
  );
}
```

## Structure

```tsx
export default function WISASpaceHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative min-h-screen overflow-hidden bg-surface font-mono text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between border-b-2 border-ink px-6 py-5">
        <span data-anim="nav" className="text-xl font-bold">WISA_SPACE</span>
        <div data-anim="nav" className="hidden gap-6 text-sm md:flex">
          <a href="#rooms" className="cursor-pointer hover:text-primary">[rooms]</a>
          <a href="#pricing" className="cursor-pointer hover:text-primary">[pricing]</a>
          <a href="#about" className="cursor-pointer hover:text-primary">[about]</a>
        </div>
        <button data-anim="nav" className="cursor-pointer border-2 border-ink bg-cta px-4 py-2 text-sm font-bold text-white transition hover:translate-x-0.5 hover:translate-y-0.5">
          BOOK NOW →
        </button>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div data-anim="eyebrow"><MonoBadge>workspace / 24-7</MonoBadge></div>
          <h1 data-anim="title" className="mt-8 text-6xl font-bold uppercase leading-none sm:text-7xl">
            Space that<br /><span className="text-primary">works</span> as fast<br />as you do.
          </h1>
          <p data-anim="sub" className="mt-8 max-w-md text-base leading-relaxed text-ink/80">
            // private studios, meeting pods & quiet desks. live availability,
            keyless entry, billed by the minute.
          </p>
          <div data-anim="cta" className="mt-10 flex flex-wrap gap-4">
            <button className="cursor-pointer border-2 border-ink bg-cta px-7 py-3.5 font-bold text-white shadow-[4px_4px_0_0_#78350F] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
              RESERVE A SPACE
            </button>
            <button className="cursor-pointer border-2 border-ink px-7 py-3.5 font-bold transition hover:bg-primary/10">
              VIEW MAP
            </button>
          </div>
        </div>

        <div data-anim="panel" className="border-2 border-ink bg-white p-6 shadow-[8px_8px_0_0_#78350F]">
          <p className="text-xs uppercase tracking-widest text-ink/60">live availability</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between border-b border-ink/20 pb-2"><span>Studio A · loft</span><span className="text-primary">3 left</span></li>
            <li className="flex justify-between border-b border-ink/20 pb-2"><span>Pod B · 4-seat</span><span className="text-primary">open</span></li>
            <li className="flex justify-between"><span>Quiet desk · 12</span><span className="text-cta">booked</span></li>
          </ul>
          <div data-anim="stats" className="mt-8 grid grid-cols-2 gap-4">
            <div><span data-counter="38" className="block text-3xl font-bold text-primary">0</span><span className="text-xs">locations</span></div>
            <div><span data-counter="12000" className="block text-3xl font-bold text-primary">0</span><span className="text-xs">members</span></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl border-t-2 border-ink px-6 py-8">
        <div data-anim="logos" className="flex flex-wrap items-center gap-8 text-sm opacity-70">
          {["// nomadco", "// deskbase", "// poolside", "// quanta"].map((b) => (
            <span key={b}>{b}</span>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.75 } });

    tl.from("[data-anim='nav']", { y: -24, autoAlpha: 0, stagger: 0.08 })
      .from("[data-anim='eyebrow']", { x: -20, autoAlpha: 0 }, "-=0.2")
      .from("[data-anim='title']", { y: 32, autoAlpha: 0 }, "-=0.3")
      .from("[data-anim='sub']", { y: 20, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='cta']", { y: 16, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='panel']", { x: 48, autoAlpha: 0, ease: "back.out(1.7)" }, "-=0.7")
      .from("[data-anim='stats'] > *", { y: 18, autoAlpha: 0, stagger: 0.12 }, "-=0.4")
      .from("[data-anim='logos'] > *", { y: 10, autoAlpha: 0, stagger: 0.07 }, "-=0.3");

    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      const end = Number(el.dataset.counter);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.5, ease: "power1.out", delay: 0.8,
        snap: { innerText: 1 },
        onUpdate() { el.innerText = Math.floor(Number(el.innerText)).toLocaleString(); },
      });
    });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim]", { autoAlpha: 1, x: 0, y: 0 });
    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      el.innerText = Number(el.dataset.counter).toLocaleString();
    });
  });
}, { scope });
```

## Acceptance

- [ ] Brutalist monospace look met amber primary + booking-blue CTA en harde drop-shadows.
- [ ] Nav, title, sub, CTA, live-panel, stats en logo's animeren gestaggerd via één `gsap.timeline()`.
- [ ] Stat-cijfers tellen op; bij reduced-motion direct op eindwaarde, geen entrance.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.7)`); geen width/height/top/left.
- [ ] `gsap.matchMedia()` regelt `prefers-reduced-motion`; cleanup via `useGSAP` scope.
- [ ] Space Mono geladen; palet-tokens exact uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast op tekst.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
