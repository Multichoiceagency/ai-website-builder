# Yacht Club — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Landing Page · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een premium hero voor een exclusieve jachtclub/charter: een grootse maritieme headline, lidmaatschaps-CTA en een elegante "featured fleet"-card met social proof (leden, harbors, rating). Rustig luxe-gevoel met sky/azuur tinten die zee en lucht oproepen.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Social Proof-Focused (members, success-metrics, credibility markers, rating).
- **Kleurenpalet (hex tokens):**
  - `primary` `#0EA5E9` (azure)
  - `secondary` `#38BDF8` (azure-light)
  - `cta` `#F97316` (sunset orange)
  - `bg` `#F0F9FF` (sea mist)
  - `text` `#0C4A6E` (deep marine)
- **Font pairing (Google Fonts):** Outfit (heading) + Work Sans (body) — geometric, modern, contemporary.
- **Key effects:** logo/harbor grid fade-in, stat count-up, subtiele parallax-waterglow, rating-sterren. Hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#0EA5E9", secondary: "#38BDF8", cta: "#F97316", mist: "#F0F9FF", marine: "#0C4A6E" },
  fontFamily: { heading: ["Outfit", "sans-serif"], sans: ["Work Sans", "system-ui", "sans-serif"] },
  maxWidth: { content: "80rem" },
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope. `gsap.matchMedia()` voor reduced-motion. Waterglow is een geblurde radial die met transform/opacity ademt — nooit width/height.

```tsx
import { cn } from "@/lib/utils";
function Chip({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={cn("inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/70 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary backdrop-blur", className)}>{children}</span>;
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Anchor, Star } from "lucide-react";

export default function YachtClubHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-gradient-to-b from-mist to-white font-sans text-marine">
      <div data-glow className="pointer-events-none absolute -bottom-32 left-1/2 h-96 w-[55rem] -translate-x-1/2 rounded-full bg-secondary/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"><Anchor className="h-5 w-5 text-primary" /> Azure<span className="text-primary">Club</span></span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Fleet", "Membership", "Harbors"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer transition-colors duration-200 hover:text-primary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#join" className="cursor-pointer rounded-full bg-cta px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105">Word lid</a>
      </header>

      <div className="relative z-10 mx-auto grid max-w-content items-center gap-12 px-6 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <Chip data-hero><Star className="h-3.5 w-3.5 fill-cta text-cta" /> Private members club</Chip>
          <h1 data-hero className="mt-6 font-heading text-5xl font-semibold leading-[1.03] tracking-tight md:text-7xl">
            Waar de horizon jouw clubhuis is.
          </h1>
          <p data-hero className="mt-6 max-w-md text-lg text-marine/70">
            Toegang tot een gecureerde vloot, privé-havens en gastvrijheid op zeeniveau.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-3">
            <a href="#join" className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cta px-6 py-3 font-semibold text-white transition-transform duration-200 hover:scale-105">
              Vraag lidmaatschap aan <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#fleet" className="cursor-pointer rounded-full border border-marine/15 bg-white px-6 py-3 font-semibold transition-colors hover:border-primary/40">Bekijk de vloot</a>
          </div>
          <div data-stat className="mt-12 flex gap-10">
            {[["120", "leden"], ["18", "havens"], ["4.9", "rating"]].map(([n, l]) => (
              <div key={l}><div className="font-heading text-3xl font-semibold text-primary">{n}</div><div className="text-sm text-marine/60">{l}</div></div>
            ))}
          </div>
        </div>

        {/* featured fleet card */}
        <div data-card className="rounded-3xl border border-white bg-white p-4 shadow-[0_30px_80px_rgba(14,165,233,0.2)]">
          <div data-yacht className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-primary/30 via-secondary/20 to-marine/20" />
          <div className="mt-4 flex items-center justify-between px-1">
            <div>
              <div className="font-heading text-lg font-semibold">Azure 88 Flagship</div>
              <div className="text-sm text-marine/60">Beschikbaar deze maand</div>
            </div>
            <div className="text-right"><div className="text-xs text-marine/50">vanaf</div><div className="font-heading text-lg font-semibold text-primary">€2.400/dag</div></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} data-thumb className="aspect-[4/3] rounded-lg bg-secondary/20" />)}
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
    tl.from("[data-nav]", { y: -18, autoAlpha: 0, stagger: 0.08 })
      .from("[data-hero]", { y: 42, autoAlpha: 0, stagger: 0.11 }, "-=0.3")
      .from("[data-card]", { x: 60, autoAlpha: 0, scale: 0.96 }, "-=0.6")
      .from("[data-yacht]", { autoAlpha: 0, scale: 1.04 }, "-=0.5")
      .from("[data-thumb]", { autoAlpha: 0, y: 16, stagger: 0.08, ease: "back.out(1.7)" }, "-=0.3")
      .from("[data-stat] > div", { y: 22, autoAlpha: 0, stagger: 0.1 }, "-=0.5");

    gsap.to("[data-glow]", { y: -24, scale: 1.06, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-hero], [data-card], [data-yacht], [data-thumb], [data-stat] > div, [data-glow]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Featured-fleet card met hero-yacht-beeld, prijs en 3 thumbnails; waterglow ademt onderaan.
- [ ] Entrance: nav → hero-copy → card → yacht-beeld → thumbnails (`back.out`) → stats, gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt beweging uit bij `prefers-reduced-motion: reduce`.
- [ ] Azure-palet + sunset-CTA; Outfit/Work Sans typografie; `max-w-content` toegepast.
- [ ] Social proof (leden, havens, rating) zichtbaar; lidmaatschap-CTA bereikbaar.
- [ ] `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen; responsive 375/768/1024/1440px.
