# Targo Logistics Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een vertrouwenwekkende SaaS-hero voor een logistiek/track-and-trace platform: heldere value-headline, track-shipment input-bar als primaire actie, live KPI-stats (on-time %, shipments, fleet) en een geanimeerde route-lijn met een rijdend pakketicoon. Doel: shippers laten starten met realtime tracking.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — credibility-markers en KPI's prominent voor een B2B-logistiekplatform.
- **Kleurtokens (hex):**
  - Primary `#2563EB` (tracking blue)
  - Secondary `#3B82F6`
  - CTA `#F97316` (delivery orange)
  - Background `#EFF6FF`
  - Text `#1E40AF`
- **Font pairing (Google Fonts):** Heading & Body **Plus Jakarta Sans** (300–700) — clean, modern SaaS mood.
- **Key effects:** stat counter-up, logo-grid fade-in, route-path draw (SVG `strokeDashoffset`), rijdend pakketicoon langs de route, kaart fade-up.
- **Anti-patterns (vermijden):** complexe navigatie, verborgen contact-info, emoji als icoon (Lucide SVG).

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` → `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width `max-w-7xl mx-auto px-6`.
- Fonts via `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', bg:'#EFF6FF', ink:'#1E40AF' },
  fontFamily: { sans: ['"Plus Jakarta Sans"','sans-serif'] },
  ```
- Install: `npm i gsap @gsap/react`. SVG route-pad gebruikt `gsap.set(path,{strokeDasharray, strokeDashoffset})`.

## Helpers

```tsx
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
```

- `useGSAP(() => {...}, { scope: rootRef })` voor cleanup.
- Route-draw: bereken `len = path.getTotalLength()`, zet `strokeDasharray/Offset = len`, anim `strokeDashoffset: 0`.
- `gsap.matchMedia()` voor responsive + reduced-motion.

## Structure

```tsx
export function TargoLogisticsHero() {
  const rootRef = useRef<HTMLElement>(null);
  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg font-sans text-ink">
      <nav data-nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="text-lg font-extrabold tracking-tight">Targo</span>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {['Platform','Carriers','Pricing','Support'].map((l) => (
            <a key={l} href="#" className="text-ink/70 transition-colors hover:text-ink">{l}</a>
          ))}
        </div>
        <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
          Get started
        </button>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2">
        <div>
          <span data-eyebrow className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Real-time visibility
          </span>
          <h1 data-title className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Every shipment,<br /><span className="text-cta">tracked in real time.</span>
          </h1>
          <p data-sub className="mt-6 max-w-md text-lg text-ink/70">
            Targo connects carriers, warehouses and customers on one live map — fewer delays, happier customers.
          </p>

          {/* track-shipment input als primaire actie */}
          <form data-track className="mt-8 flex max-w-md overflow-hidden rounded-xl border border-primary/20 bg-white shadow-sm">
            <input
              placeholder="Enter tracking number…"
              className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-ink/40"
            />
            <button className="bg-cta px-6 py-3 font-semibold text-white transition-transform hover:scale-105 cursor-pointer">
              Track
            </button>
          </form>

          <div data-stats className="mt-10 grid grid-cols-3 gap-6">
            {[['99.4%','On-time'],['2.1M','Shipments'],['58','Countries']].map(([n,l]) => (
              <div key={l}>
                <div data-stat data-target={n} className="text-2xl font-extrabold text-primary">{n}</div>
                <div className="text-xs uppercase tracking-wide text-ink/55">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* route-visual */}
        <div data-map className="relative aspect-[4/3] w-full rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg backdrop-blur">
          <svg viewBox="0 0 400 300" className="h-full w-full">
            <path data-route d="M30 250 C 120 180, 160 90, 260 70 S 360 40, 380 30"
              fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
            <circle data-truck r="9" fill="#F97316" cx="30" cy="250" />
            <circle cx="30" cy="250" r="6" fill="#2563EB" />
            <circle cx="380" cy="30" r="6" fill="#1E40AF" />
          </svg>
        </div>
      </div>

      <div data-logos className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-60">
        {['Maersk','DHL','FedEx','DSV','Kuehne'].map((p) => (
          <span key={p} className="text-sm font-semibold tracking-wide text-ink/50">{p}</span>
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

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('[data-nav]', { y: -24, autoAlpha: 0 })
      .from('[data-eyebrow]', { y: 16, autoAlpha: 0 }, '-=0.4')
      .from('[data-title]', { y: 36, autoAlpha: 0, duration: 1 }, '-=0.3')
      .from('[data-sub]', { y: 20, autoAlpha: 0 }, '-=0.6')
      .from('[data-track]', { y: 20, autoAlpha: 0, scale: 0.97, ease: 'back.out(1.6)' }, '-=0.5')
      .from('[data-stats] > *', { y: 18, autoAlpha: 0, stagger: 0.12 }, '-=0.4')
      .from('[data-map]', { x: 50, autoAlpha: 0, scale: 0.96, ease: 'back.out(1.4)', duration: 1 }, '-=0.9')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.08 }, '-=0.4');

    // route draw + rijdend pakket
    const route = rootRef.current?.querySelector<SVGPathElement>('[data-route]');
    if (route) {
      const len = route.getTotalLength();
      gsap.set(route, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(route, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', delay: 1 });
      gsap.to('[data-truck]', {
        duration: 1.8, delay: 1, ease: 'power2.inOut',
        motionPath: undefined, // val terug op handmatige interpolatie hieronder
      });
      // simpele truck-beweging langs het pad zonder MotionPathPlugin
      const o = { p: 0 };
      gsap.to(o, { p: 1, duration: 1.8, delay: 1, ease: 'power2.inOut', onUpdate: () => {
        const pt = route.getPointAtLength(len * o.p);
        gsap.set('[data-truck]', { attr: { cx: pt.x, cy: pt.y } });
      }});
    }

    // counter-up
    document.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
      const raw = el.dataset.target || '';
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!num) return;
      const c = { v: 0 };
      gsap.to(c, { v: num, duration: 1.4, delay: 1, ease: 'power2.out',
        snap: { v: raw.includes('.') ? 0.1 : 1 },
        onUpdate: () => { el.textContent = raw.replace(/[0-9.]+/, c.v.toFixed(raw.includes('.') ? 1 : 0)); } });
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-eyebrow],[data-title],[data-sub],[data-track],[data-stats] > *,[data-map],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    const route = rootRef.current?.querySelector<SVGPathElement>('[data-route]');
    if (route) gsap.set(route, { strokeDashoffset: 0 });
    gsap.set('[data-truck]', { attr: { cx: 380, cy: 30 } });
  });
}, { scope: rootRef });
```

## Acceptance

- [ ] Logistiek-hero met tracking-blue + delivery-orange, Plus Jakarta Sans, track-input als primaire CTA.
- [ ] Live KPI-stats tellen op via GSAP counter; klantlogo-strip fade-in.
- [ ] SVG route-pad tekent zich uit (`strokeDashoffset`) en pakketicoon rijdt langs het pad via `getPointAtLength`.
- [ ] Entrance via één `gsap.timeline()` met staggered `y`/`autoAlpha`; eases `power3.out` + `back.out`.
- [ ] `gsap.matchMedia()` zet bij `prefers-reduced-motion: reduce` alles zichtbaar, route volledig getekend, truck op eindpunt.
- [ ] Alleen transform-aliassen + `autoAlpha` (+ SVG-attr voor de truck); geen width/height/top/left-animatie.
- [ ] `cursor-pointer` + focusstaten; responsive 375/768/1024/1440px; geen emoji-iconen.
