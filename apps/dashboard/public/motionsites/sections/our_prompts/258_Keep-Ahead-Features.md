# Keep Ahead Features — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Features Section · features), met design-system via ui-ux-pro-max en GSAP-animatie.

Een energieke features-sectie ("Keep Ahead") die in 3–5 blokken laat zien hoe een product de gebruiker voorop houdt: een kop met value-prop, een vibrant block-grid van feature-kaarten met SVG-iconen, en een afsluitende CTA-band. Bold, block-based en speels met color-shift hovers.

## Design system (ui-ux-pro-max)

- **Stijl:** Vibrant & Block-based — bold, energetic, playful, block layout, geometric shapes, hoog contrast (zorg voor WCAG).
- **Pattern:** Hero + Features + CTA — value-prop, 3–5 key features in kaarten (bg #FAFAFA), contrasterende CTA, sticky navbar-CTA.
- **Color palette (hex tokens):**
  - `--primary: #2563EB` (royal blue)
  - `--secondary: #3B82F6` (bright blue)
  - `--cta: #F97316` (warm oranje, actie)
  - `--bg: #F8FAFC` (licht canvas)
  - `--text: #1E293B` (slate ink)
- **Font pairing (Google Fonts):** Heading **Inter**, Body **Inter** (Modern + Friendly typography).
- **Key effects:** grote secties (48px+ gaps), animated patterns, bold hover (color shift), grote type (32px+), 200–300ms.
- **Anti-patterns vermijden:** generieke profielen, geen safety/contrast.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`.
- Installeer: `npm i gsap @gsap/react`.

`tailwind.config.ts`:

```ts
export default {
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#3B82F6",
        cta: "#F97316",
        bg: "#F8FAFC",
        ink: "#1E293B",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      maxWidth: { content: "1200px" },
    },
  },
};
```

Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
```

Max content width: `max-w-content mx-auto px-6`. Gebruik ScrollTrigger voor reveal-on-scroll (`npm i gsap` levert de plugin mee; registreer met `gsap.registerPlugin(ScrollTrigger)`).

## Helpers

Feature-kaarten reveal-en op scroll met een batch-stagger; iconen poppen met `back.out`. Een subtiel achtergrond-pattern (geometric blob) drijft langzaam. Omdat dit een features-sectie is (geen above-the-fold hero) gebruiken we ScrollTrigger zodat de animatie afspeelt zodra de sectie in beeld komt. `gsap.matchMedia()` zet alles terug naar fade-only bij reduced-motion; `useGSAP({ scope })` ruimt op.

```tsx
// FeatureCard.tsx
import { cn } from "@/lib/utils";
type Props = { icon: React.ReactNode; title: string; body: string; className?: string };
export const FeatureCard = ({ icon, title, body, className }: Props) => (
  <article data-card className={cn("group rounded-2xl border border-ink/10 bg-[#FAFAFA] p-7 transition-colors hover:border-primary hover:bg-white", className)}>
    <div data-icon className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-cta group-hover:text-white">
      {icon}
    </div>
    <h3 className="mt-5 text-xl font-bold">{title}</h3>
    <p className="mt-2 text-ink/70">{body}</p>
  </article>
);
```

## Structure

```tsx
import { useRef } from "react";
import { FeatureCard } from "./FeatureCard";

const Bolt = () => (<svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>);
const Shield = () => (<svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z" /></svg>);
const Chart = () => (<svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m4 14v-7m4 7V9m4 10v-4m4 4V7" /></svg>);

export default function KeepAheadFeatures() {
  const root = useRef<HTMLDivElement>(null);

  return (
    <section ref={root} className="relative overflow-hidden bg-bg py-24 font-sans text-ink">
      {/* BG PATTERN */}
      <div data-blob className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" aria-hidden="true" />

      <div className="max-w-content mx-auto px-6">
        {/* HEADING */}
        <div className="max-w-2xl">
          <span data-fade className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-bold uppercase tracking-wide text-primary">
            Waarom Keep Ahead
          </span>
          <h2 data-fade className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
            Blijf je concurrentie altijd <span className="text-primary">een stap voor</span>.
          </h2>
          <p data-fade className="mt-5 text-lg text-ink/70">
            Krachtige tools die snelheid, inzicht en veiligheid combineren — zodat jij voorop blijft.
          </p>
        </div>

        {/* FEATURE GRID */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <FeatureCard icon={<Bolt />} title="Bliksemsnel" body="Realtime sync en sub-seconde laadtijden houden je team in flow." />
          <FeatureCard icon={<Shield />} title="Veilig by design" body="End-to-end encryptie en SOC 2-compliance, standaard ingebouwd." />
          <FeatureCard icon={<Chart />} title="Slimme inzichten" body="Voorspellende analytics die kansen tonen vóór je ze mist." />
        </div>

        {/* CTA BAND */}
        <div data-cta className="mt-16 flex flex-col items-center justify-between gap-6 rounded-3xl bg-primary p-10 text-white md:flex-row">
          <div>
            <h3 className="text-2xl font-bold">Klaar om voorop te lopen?</h3>
            <p className="mt-1 text-white/80">Probeer alle features gratis, 14 dagen lang.</p>
          </div>
          <button className="cursor-pointer rounded-full bg-cta px-8 py-3.5 font-semibold text-white transition-transform hover:scale-105">
            Start gratis trial
          </button>
        </div>
      </div>
    </section>
  );
}
```

## Animation (GSAP)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out", duration: 0.8 },
      scrollTrigger: { trigger: root.current, start: "top 75%" },
    });
    tl.from("[data-fade]", { y: 34, autoAlpha: 0, stagger: 0.1 })
      .from("[data-card]", { y: 50, autoAlpha: 0, stagger: 0.12, ease: "back.out(1.4)" }, "-=0.3")
      .from("[data-icon]", { scale: 0, rotation: -15, autoAlpha: 0, stagger: 0.12, ease: "back.out(2)" }, "-=0.6")
      .from("[data-cta]", { y: 40, autoAlpha: 0, duration: 0.9 }, "-=0.3");

    // langzaam drijvend achtergrond-pattern
    gsap.to("[data-blob]", { y: 30, x: -20, duration: 8, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-card], [data-icon], [data-cta]", { clearProps: "transform" });
    gsap.from("[data-fade], [data-card], [data-cta]", {
      autoAlpha: 0, duration: 0.4, stagger: 0.04,
      scrollTrigger: { trigger: root.current, start: "top 80%" },
    });
  });
}, { scope: root });
```

## Acceptance

- [ ] Vibrant block-grid met 48px+ gaps, grote (32px+) headings en feature-kaarten op `#FAFAFA`.
- [ ] Scroll-triggered reveal: één `gsap.timeline()` met staggered `y`/`autoAlpha` kaarten (`back.out(1.4)`) en iconen-pop (`back.out(2)`).
- [ ] CTA-band reveal-t met de timeline; sticky navbar-CTA-concept benoemd.
- [ ] Achtergrond-pattern drijft subtiel (`repeat: -1, yoyo: true`).
- [ ] `gsap.matchMedia()` levert fade-only bij `prefers-reduced-motion: reduce` (transforms gecleared, geen drift).
- [ ] Built-in eases (`power3.out`, `back.out(1.4)`, `back.out(2)`, `sine.inOut`); geen width/height/top/left animatie.
- [ ] Cleanup via `useGSAP({ scope: root })`; kaarten/CTA hebben `cursor-pointer` + bold color-shift hover (200–300ms).
- [ ] Responsive 375 / 768 / 1024 / 1440px; SVG-iconen (geen emoji); contrast ≥ 4.5:1.
