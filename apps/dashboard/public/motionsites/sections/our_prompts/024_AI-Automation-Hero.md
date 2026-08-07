# AI Automation Hero — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (AI / SaaS · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een conversiegerichte SaaS-hero die een AI-automatiseringsplatform introduceert: een krachtige headline, een live "workflow runs"-statbalk met count-up cijfers, social-proof logo's en een prominente emerald CTA. Bedoeld om B2B-bezoekers binnen één scherm te overtuigen dat het platform repetitief werk wegautomatiseert.

## Design system (ui-ux-pro-max)

- **Stijl:** Social Proof-Focused — testimonials, client-logo's, succesmetrics en credibility-markers prominent (best voor B2B SaaS, WCAG AA).
- **Pattern:** Video-First Hero met dark overlay (60%) en heldere brand-accent CTA.
- **Kleurenpalet (hex tokens):**
  - Primary `#6366F1` (indigo)
  - Secondary `#818CF8`
  - CTA `#10B981` (emerald)
  - Background `#F5F3FF`
  - Text `#1E1B4B`
- **Typografie (Google Fonts):** Plus Jakarta Sans voor heading én body (mood: friendly, modern, saas, clean).
- **Key effects:** logo-grid fade-in, stat counter (number count-up), testimonial-carousel micro-animaties, zachte hover-transities 150–300ms.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` voor `useGSAP`).
- `cn()` helper uit `@/lib/utils` (clsx + tailwind-merge).
- Max content width: `max-w-7xl mx-auto px-6`.

```ts
// tailwind.config.ts (kleur-tokens)
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
/* index.css */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

## Helpers

Kleine `Reveal`-wrapper + scope-ref voor `useGSAP`. Reduced-motion altijd via `gsap.matchMedia()`.

```tsx
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export function useSectionScope() {
  return useRef<HTMLElement>(null);
}

export function StatCard({ label, target, className }: { label: string; target: number; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white/70 backdrop-blur px-5 py-4 ring-1 ring-primary/10", className)}>
      <span data-counter={target} className="block text-3xl font-bold text-primary">0</span>
      <span className="text-sm text-ink/60">{label}</span>
    </div>
  );
}
```

## Structure

```tsx
export default function AIAutomationHero() {
  const scope = useRef<HTMLElement>(null);

  return (
    <section ref={scope} className="relative overflow-hidden bg-surface text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span data-anim="nav" className="text-lg font-bold text-primary">Flowtomate</span>
        <div data-anim="nav" className="hidden items-center gap-8 text-sm font-medium md:flex">
          <a href="#features" className="cursor-pointer hover:text-primary">Features</a>
          <a href="#pricing" className="cursor-pointer hover:text-primary">Pricing</a>
          <a href="#docs" className="cursor-pointer hover:text-primary">Docs</a>
        </div>
        <button data-anim="nav" className="cursor-pointer rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
          Start free
        </button>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span data-anim="eyebrow" className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary">
            AI WORKFLOW AUTOMATION
          </span>
          <h1 data-anim="title" className="mt-6 text-5xl font-bold leading-[1.05] sm:text-6xl">
            Automate the busywork.<br />
            <span className="text-primary">Ship the breakthroughs.</span>
          </h1>
          <p data-anim="sub" className="mt-6 max-w-md text-lg text-ink/70">
            Connect your stack, describe the outcome, and let AI agents run your
            repetitive operations end-to-end — no code required.
          </p>
          <div data-anim="cta" className="mt-8 flex flex-wrap gap-4">
            <button className="cursor-pointer rounded-full bg-cta px-7 py-3.5 font-semibold text-white shadow-lg shadow-cta/30 transition hover:brightness-110">
              Start free trial
            </button>
            <button className="cursor-pointer rounded-full px-7 py-3.5 font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/5">
              Book a demo
            </button>
          </div>
          <div data-anim="stats" className="mt-10 grid grid-cols-3 gap-4">
            <StatCard label="Workflow runs / day" target={184000} />
            <StatCard label="Hours saved / mo" target={9200} />
            <StatCard label="Teams onboarded" target={640} />
          </div>
        </div>

        <div data-anim="panel" className="relative">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl shadow-primary/30">
            <div className="rounded-[22px] bg-ink p-6 text-white/90">
              {/* preview van een live automation-run */}
              <p className="text-xs uppercase tracking-widest text-secondary">Live run · agent-07</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex justify-between"><span>Ingest invoices</span><span className="text-cta">done</span></li>
                <li className="flex justify-between"><span>Classify & route</span><span className="text-cta">done</span></li>
                <li className="flex justify-between"><span>Notify finance</span><span className="text-secondary">running…</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <p className="text-xs uppercase tracking-widest text-ink/40">Trusted by modern ops teams</p>
        <div data-anim="logos" className="mt-5 flex flex-wrap items-center gap-10 opacity-60">
          {["Northbeam", "Cartel", "Loopwork", "Vela", "Brightside"].map((b) => (
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
      .from("[data-anim='stats'] > *", { y: 24, autoAlpha: 0, scale: 0.96, stagger: 0.1 }, "-=0.4")
      .from("[data-anim='panel']", { x: 40, autoAlpha: 0, scale: 0.97, ease: "back.out(1.7)" }, "-=0.7")
      .from("[data-anim='logos'] > *", { y: 12, autoAlpha: 0, stagger: 0.06 }, "-=0.3");

    // count-up op de stat-cijfers
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

- [ ] Headline, sub, CTA's, stats, live-panel en logo's verschijnen met gestaggerde GSAP-entrance.
- [ ] Stat-cijfers tellen op (count-up) en staan direct op eindwaarde bij reduced-motion.
- [ ] Alleen transform-aliases (`x`,`y`,`autoAlpha`,`scale`) + ingebouwde eases (`power3.out`, `back.out(1.7)`).
- [ ] Eén `gsap.timeline()`, geen chained delays; cleanup via `useGSAP` scope.
- [ ] `gsap.matchMedia()` schakelt motion uit bij `prefers-reduced-motion: reduce`.
- [ ] Palet- en font-tokens uit het design system; CTA in emerald `#10B981`.
- [ ] `cursor-pointer` + zichtbare focus op alle interactieve elementen; WCAG AA contrast.
- [ ] Responsive op 375 / 768 / 1024 / 1440px.
