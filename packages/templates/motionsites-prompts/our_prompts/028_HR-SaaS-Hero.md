# HR SaaS Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een hero voor een HR-/people-management SaaS: links de propositie (recruitment, onboarding en payroll in één platform) met sociale bewijskracht, rechts een dashboard-preview met employee-cards en een live stat. Logobalk en succescijfers versterken het vertrouwen.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, klantlogo's, reviews/ratings, succesmetrics en avatar-stacks.
- **Pattern:** Video-First Hero → hier een rustige geanimeerde dashboard-card (betere performance dan autoplay-video).
- **Color palette (hex tokens):**
  - `primary` `#6366F1` (indigo)
  - `secondary` `#818CF8`
  - `cta` `#10B981` (emerald)
  - `bg` `#F5F3FF`
  - `text` `#1E1B4B`
- **Typografie (Google Fonts):** Plus Jakarta Sans (kop + body, `wght 300;400;500;600;700`) — friendly, modern, professioneel.
- **Key effects:** logo-grid fade-in, stat counter count-up, review-sterren, avatar-stack reveal, hover-transitions 150–300ms.

## Stack & global setup

- React 18 + Vite + TypeScript + TailwindCSS + **GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Max content width: `max-w-7xl mx-auto px-6`.
- Font in `index.html`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- Tailwind tokens:
  ```ts
  colors: { primary:'#6366F1', secondary:'#818CF8', cta:'#10B981', bg:'#F5F3FF', ink:'#1E1B4B' },
  fontFamily: { sans:['"Plus Jakarta Sans"','system-ui','sans-serif'] },
  ```

## Helpers

```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

// number count-up zonder layout props
function countTo(el: HTMLElement, to: number, suffix = '') {
  const o = { v: 0 };
  return gsap.to(o, { v: to, duration: 1.3, ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString() + suffix; } });
}
```

Reduced-motion via `gsap.matchMedia()`. Alleen transform-aliassen animeren.

## Structure

```tsx
export default function HrSaasHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative overflow-hidden bg-bg text-ink">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <span data-nav className="text-lg font-700">PeopleHub</span>
        <div data-nav className="hidden md:flex gap-8 text-sm font-500">
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Hiring</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Payroll</a>
          <a className="cursor-pointer hover:text-primary transition-colors" href="#">Pricing</a>
        </div>
        <button data-nav className="rounded-xl bg-cta px-4 py-2 text-sm font-600 text-white cursor-pointer hover:brightness-110 transition">Get started</button>
      </nav>

      <div className="max-w-7xl mx-auto grid gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div data-hero className="flex items-center gap-3">
            <div className="flex -space-x-2" data-avatars>
              {[0,1,2,3].map(i=>(<span key={i} className="h-7 w-7 rounded-full border-2 border-bg bg-secondary" />))}
            </div>
            <span className="text-sm text-ink/60">Used by 3,000+ HR teams</span>
          </div>
          <h1 data-hero className="mt-5 text-4xl font-700 leading-tight md:text-6xl">
            Hire, onboard & pay <span className="text-primary">all in one</span> place.
          </h1>
          <p data-hero className="mt-5 max-w-md text-lg text-ink/70">
            Automatiseer recruitment, contracten en salarisrun met één HR-platform dat met je team meegroeit.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-xl bg-cta px-6 py-3 font-600 text-white cursor-pointer hover:brightness-110 transition">Start 14-day trial</button>
            <button className="rounded-xl border border-primary/30 px-6 py-3 font-600 text-primary cursor-pointer hover:bg-primary/5 transition">Watch tour</button>
          </div>
          <div data-stats className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-8">
            {[[92,'% retention'],[14,'-day onboard'],[100000,'+ employees']].map(([n,s],i)=>(
              <div key={i}>
                <p data-count data-to={n} data-suffix={s} className="text-3xl font-700 text-primary">0</p>
                <p className="text-xs text-ink/60">HR outcome</p>
              </div>
            ))}
          </div>
        </div>

        <div data-card className="rounded-2xl bg-white p-5 shadow-2xl shadow-primary/15">
          <div className="flex items-center justify-between pb-4">
            <span className="text-sm font-600">Team overview</span>
            <span className="rounded-full bg-cta/15 px-2 py-1 text-xs font-600 text-cta">Live</span>
          </div>
          {[['Anna — Designer','Onboarding'],['Sven — Engineer','Active'],['Maya — Sales','Review']].map(([n,s],i)=>(
            <div data-row key={i} className="mb-3 flex items-center justify-between rounded-xl bg-bg px-3 py-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-secondary" />
                <span className="text-sm font-500">{n}</span>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div data-logos className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-10 px-6 pb-16 opacity-70">
        {['Slack','HubSpot','Asana','Monday','Workday'].map(b=>(<span key={b} className="text-sm font-600 text-ink/50">{b}</span>))}
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
      .from('[data-avatars] span', { scale: 0, autoAlpha: 0, stagger: 0.06, ease: 'back.out(1.7)' }, '-=0.5')
      .from('[data-card]', { x: 48, autoAlpha: 0, scale: 0.96, duration: 0.9 }, '-=0.6')
      .from('[data-row]', { x: 24, autoAlpha: 0, stagger: 0.1 }, '-=0.5')
      .from('[data-logos] span', { y: 14, autoAlpha: 0, stagger: 0.06 }, '-=0.3')
      .add(() => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) =>
          countTo(el, Number(el.dataset.to || 0), el.dataset.suffix || ''));
      }, '-=0.4');
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('[data-nav],[data-hero],[data-avatars] span,[data-card],[data-row],[data-logos] span', { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.to || 0).toLocaleString() + (el.dataset.suffix || '');
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Indigo primary `#6366F1` + emerald CTA `#10B981`, bg `#F5F3FF`, tekst `#1E1B4B`.
- [ ] Plus Jakarta Sans als enige font (kop + body).
- [ ] Avatar-stack popt in met `back.out(1.7)`; stat-counters count-up met `power2.out`.
- [ ] Eén `gsap.timeline()` orkestreert nav → hero → avatars → card → rows → logos.
- [ ] Uitsluitend transform-aliassen geanimeerd; geen `width/height/top/left`.
- [ ] `gsap.matchMedia()` reduceert motion volledig bij `prefers-reduced-motion: reduce`.
- [ ] `useGSAP` met `{ scope: root }`; clickables `cursor-pointer` + hover 150–300ms.
- [ ] Responsive op 375 / 768 / 1024 / 1440px; SVG-iconen in plaats van emoji in productie.
