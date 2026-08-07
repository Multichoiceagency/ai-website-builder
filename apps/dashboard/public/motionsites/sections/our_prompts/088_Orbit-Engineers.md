# Orbit Engineers — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Agency · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een gedurfde agency-hero voor "Orbit Engineers" — een product- en engineering-studio. Eén grote headline, een expressieve value-proposition, een cyan CTA tegen bold pink, en een werk/credibility-strook. Doel: meteen tonen dat dit een creatieve, technische studio is die durft.

## Design system (ui-ux-pro-max)

- **Stijl:** Hero-Centric Design — grote hero, compelling headline, high-contrast CTA, dramatisch visueel (best voor agency/tech).
- **Pattern:** Video-First Hero — dark overlay (60%), brand-accent CTA, witte tekst op donker.
- **Kleurenpalet (hex tokens):**
  - Primary `#EC4899` (bold pink)
  - Secondary `#F472B6`
  - CTA `#06B6D4` (cyan)
  - Background `#FDF2F8`
  - Text `#831843`
- **Typografie (Google Fonts):** Inter voor heading én body (bold, expressive).
- **Key effects:** smooth scroll reveal, fade-in op hero, subtiele background-parallax, CTA glow/pulse.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: "#EC4899",
    secondary: "#F472B6",
    cta: "#06B6D4",
    surface: "#FDF2F8",
    ink: "#831843",
  },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
}
```

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
```

## Helpers

Scope-ref + reduced-motion via `gsap.matchMedia()`. CTA met glow/pulse die respect houdt voor reduced-motion (pulse alleen in no-preference branch).

```tsx
import { cn } from "@/lib/utils";

export function GlowButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button data-glow className={cn(
      "cursor-pointer rounded-full bg-cta px-7 py-3.5 font-semibold text-white shadow-lg shadow-cta/40 transition hover:brightness-110",
      className,
    )}>
      {children}
    </button>
  );
}
```

## Structure

```tsx
export default function OrbitEngineersHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface font-sans text-ink">
      {/* parallax blobs */}
      <div data-parallax className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div data-parallax className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-cta/20 blur-3xl" />

      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-extrabold tracking-tight text-primary">Orbit Engineers</span>
        <div data-anim="nav" className="hidden gap-8 text-sm font-semibold md:flex">
          <a href="#work" className="cursor-pointer hover:text-primary">Work</a>
          <a href="#services" className="cursor-pointer hover:text-primary">Services</a>
          <a href="#studio" className="cursor-pointer hover:text-primary">Studio</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Start a project
        </button>
      </nav>

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-32">
        <span data-anim="eyebrow" className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary">
          PRODUCT & ENGINEERING STUDIO
        </span>
        <h1 data-anim="title" className="mt-6 max-w-4xl text-6xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
          We build the<br />
          <span className="text-primary">things</span> that<br />
          others demo.
        </h1>
        <p data-anim="sub" className="mt-8 max-w-xl text-lg text-ink/70">
          From spark to shipped: design, engineering and launch under one roof.
          We partner with founders who refuse to play it safe.
        </p>
        <div data-anim="cta" className="mt-10 flex flex-wrap items-center gap-4">
          <GlowButton>Start a project</GlowButton>
          <button className="cursor-pointer rounded-full px-7 py-3.5 font-semibold text-primary ring-2 ring-primary/30 transition hover:bg-primary/5">
            See our work
          </button>
        </div>

        <div data-anim="stats" className="mt-16 grid max-w-2xl grid-cols-3 gap-6">
          <div><span data-counter="120" className="block text-4xl font-extrabold text-primary">0</span><span className="text-sm text-ink/60">products shipped</span></div>
          <div><span data-counter="14" className="block text-4xl font-extrabold text-primary">0</span><span className="text-sm text-ink/60">years in orbit</span></div>
          <div><span data-counter="38" className="block text-4xl font-extrabold text-primary">0</span><span className="text-sm text-ink/60">engineers</span></div>
        </div>

        <div className="mt-16">
          <p className="text-xs uppercase tracking-widest text-ink/40">Shipped with</p>
          <div data-anim="logos" className="mt-5 flex flex-wrap items-center gap-10 opacity-60">
            {["Nimbus", "Forge", "Helio", "Cobalt", "Verge"].map((b) => (
              <span key={b} className="text-lg font-bold">{b}</span>
            ))}
          </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });

    tl.from("[data-anim='nav']", { y: -20, autoAlpha: 0, stagger: 0.08 })
      .from("[data-anim='eyebrow']", { y: 16, autoAlpha: 0 }, "-=0.3")
      .from("[data-anim='title']", { y: 40, autoAlpha: 0 }, "-=0.4")
      .from("[data-anim='sub']", { y: 22, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='cta']", { y: 18, autoAlpha: 0 }, "-=0.5")
      .from("[data-anim='stats'] > *", { y: 22, autoAlpha: 0, scale: 0.95, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    // subtiele drijvende parallax-blobs + CTA glow-pulse
    gsap.to("[data-parallax]", { y: 24, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 0.4 });
    gsap.to("[data-glow]", { scale: 1.04, duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1.2 });

    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      const end = Number(el.dataset.counter);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.6, ease: "power1.out", delay: 1,
        snap: { innerText: 1 },
        onUpdate() { el.innerText = Math.floor(Number(el.innerText)).toLocaleString(); },
      });
    });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-anim], [data-parallax], [data-glow]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
      el.innerText = Number(el.dataset.counter).toLocaleString();
    });
  });
}, { scope });
```

## Acceptance

- [ ] Grote headline, sub, CTA's, stats en logo's verschijnen gestaggerd via één `gsap.timeline()`.
- [ ] Background-blobs driften subtiel; CTA heeft glow/pulse — beide alleen bij no-preference.
- [ ] Stat-cijfers tellen op; bij reduced-motion direct eindwaarde en geen looping animaties.
- [ ] Alleen transform-aliases + ingebouwde eases (`power3.out`, `back.out(1.7)`, `sine.inOut`).
- [ ] `gsap.matchMedia()` schakelt alle motion uit bij `prefers-reduced-motion: reduce`; cleanup via scope.
- [ ] Inter geladen; bold pink primary + cyan CTA tokens uit design system.
- [ ] `cursor-pointer` + focus-states; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
