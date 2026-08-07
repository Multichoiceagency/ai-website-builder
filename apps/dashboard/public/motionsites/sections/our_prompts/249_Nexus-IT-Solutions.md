# Nexus IT Solutions — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Hero Section · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een corporate IT-services hero ("Nexus IT Solutions") als enterprise gateway: links een betrouwbare mission-headline met duale CTA (Contact Sales / Login), rechts industrie-tabs of een solutions-card. Klantlogo's en succescijfers leveren de credibility die een B2B-koper zoekt.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, case-studies, succescijfers, conservatieve accenten.
- **Pattern:** Enterprise Gateway → industrie-tabs, logo-carrousel, "I am a…"-path, trust-signals prominent.
- **Color palette (hex tokens):**
  - `primary` `#2563EB` (corporate blue)
  - `secondary` `#3B82F6`
  - `cta` `#F97316` (orange)
  - `bg` `#F8FAFC`
  - `text` `#1E293B`
- **Typografie (Google Fonts):** Inter (headings + body) — professioneel, heldere typografie.
- **Key effects:** logo-grid fade-in, tab-switch, stat counter count-up, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.
- Font in `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#2563EB', secondary:'#3B82F6', cta:'#F97316', bg:'#F8FAFC', ink:'#1E293B' },
  fontFamily: { sans:['Inter','system-ui','sans-serif'] },
  ```

## Helpers

```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

function countUp(el: HTMLElement, to: number, suffix = '') {
  const o = { v: 0 };
  return gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString() + suffix; } });
}
```

Reduced-motion via `gsap.matchMedia()`; uitsluitend transform-aliassen animeren.

## Structure

```tsx
export default function NexusItHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">Nexus<span className="text-primary">IT</span></span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Solutions</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Industries</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Resources</a>
        </div>
        <div data-nav className="flex items-center gap-3">
          <a className="text-sm font-600 text-primary cursor-pointer hover:underline" href="#">Login</a>
          <button className="rounded-lg bg-cta px-4 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Contact sales</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span data-hero className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-600 text-primary">
            Trusted IT partner since 2009
          </span>
          <h1 data-hero className="mt-5 text-4xl font-700 leading-tight md:text-6xl">
            Enterprise IT that <span className="text-primary">just works</span>.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Managed services, cloud-migratie en 24/7 support — Nexus houdt je business veilig en altijd online.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-lg bg-cta px-6 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Contact sales</button>
            <button className="rounded-lg border border-primary/30 px-6 py-3 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">View solutions</button>
          </div>
          <div data-stats className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            {[[500,'+ clients'],[99,'.9% uptime'],[15,' yrs']].map(([n,s],i)=>(
              <div key={i}>
                <p data-count data-to={n} data-suffix={s} className="text-3xl font-700 text-primary">0</p>
                <p className="text-xs text-ink/60">Track record</p>
              </div>
            ))}
          </div>
        </div>

        <div data-card className="rounded-2xl bg-white p-6 shadow-2xl shadow-primary/15">
          <div data-tabs className="mb-5 flex gap-2">
            {['Finance','Healthcare','Retail'].map((t,i)=>(
              <span data-tab key={t} className={cn('cursor-pointer rounded-full px-3 py-1 text-xs font-600 transition',
                i===0 ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20')}>{t}</span>
            ))}
          </div>
          {[['Cloud migration','Zero-downtime move to AWS/Azure'],['Cybersecurity','24/7 SOC monitoring & response'],['Managed IT','Helpdesk + on-site engineers']].map(([t,d],i)=>(
            <div data-item key={i} className="mb-3 flex items-start gap-3 rounded-xl bg-bg p-4">
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
              </span>
              <div>
                <p className="text-sm font-600">{t}</p>
                <p className="text-xs text-ink/60">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['Microsoft','AWS','Cisco','VMware','Fortinet'].map(b=>(<span key={b} className="text-sm font-600 text-ink/50">{b}</span>))}
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
    tl.from('[data-nav]', { y: -16, autoAlpha: 0, stagger: 0.08 })
      .from('[data-hero]', { y: 28, autoAlpha: 0, stagger: 0.12 }, '-=0.3')
      .from('[data-card]', { x: 48, autoAlpha: 0, scale: 0.96, duration: 0.9 }, '-=0.5')
      .from('[data-tab]', { y: 12, autoAlpha: 0, stagger: 0.08, ease: 'back.out(1.7)' }, '-=0.5')
      .from('[data-item]', { x: 24, autoAlpha: 0, stagger: 0.1 }, '-=0.4')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countUp(el, Number(el.dataset.to || 0), el.dataset.suffix || ''));
      }, '-=0.4');
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-card],[data-tab],[data-item],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Corporate blue `#2563EB` + orange CTA `#F97316`, bg `#F8FAFC`, tekst `#1E293B`.
- [ ] Inter geladen voor koppen en body.
- [ ] Enterprise gateway: Login + Contact Sales in nav, industrie-tabs en solutions-items in card.
- [ ] Tabs poppen in met `back.out(1.7)`; stat-counters count-up met `power2.out`.
- [ ] Eén `gsap.timeline()`: nav → hero → card → tabs → items → logos.
- [ ] Alleen transform-aliassen geanimeerd; nooit `width/height/top/left`.
- [ ] `gsap.matchMedia()` zet alles statisch zichtbaar bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen i.p.v. emoji.
