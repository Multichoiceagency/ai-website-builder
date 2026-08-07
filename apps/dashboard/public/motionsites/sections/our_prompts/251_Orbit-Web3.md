# Orbit Web3 — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Web3 · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een futuristische Web3-hero voor "Orbit": een crypto/DeFi-platform met een neon-paarse esthetiek, een orbital glow-visual, connect-wallet-CTA en on-chain stats (TVL, holders, chains). Donker, technisch en vol energie.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Video-First / dramatic hero met crypto-web3-mood (futuristic, blockchain, digital).
- **Kleurenpalet (hex tokens):**
  - `primary` `#8B5CF6` (violet)
  - `secondary` `#A78BFA` (violet-light)
  - `cta` `#FBBF24` (gold value)
  - `bg` `#0F0F23` (deep space)
  - `text` `#F8FAFC` (off-white)
- **Font pairing (Google Fonts):** Orbitron (heading) + Exo 2 (body) — crypto, web3, futuristic, tech.
- **Key effects:** orbital glow/pulse, stat count-up, logo grid fade-in, neon-randen. Hover 150–300ms.
- **Anti-patterns vermijden:** complexe navigatie, verborgen contactinfo.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#8B5CF6", secondary: "#A78BFA", cta: "#FBBF24", space: "#0F0F23", offwhite: "#F8FAFC" },
  fontFamily: { display: ["Orbitron", "sans-serif"], sans: ["Exo 2", "system-ui", "sans-serif"] },
  maxWidth: { content: "80rem" },
}
```

- Fonts: `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&family=Exo+2:wght@300;400;500;600&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope. `gsap.matchMedia()` voor reduced-motion (pauzeer orbit-rotatie + glow). De orbitringen draaien met `rotation` (transform-only).

```tsx
import { cn } from "@/lib/utils";
function NeonButton({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <button data-glow className={cn(
    "cursor-pointer rounded-full bg-cta px-7 py-3 font-semibold text-space",
    "shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-transform duration-200 hover:scale-105",
    className)}>{children}</button>;
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Wallet, ArrowRight } from "lucide-react";

export default function OrbitWeb3Hero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-space font-sans text-offwhite">
      {/* orbital backdrop */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div data-ring className="h-[34rem] w-[34rem] rounded-full border border-primary/25" />
        <div data-ring className="absolute inset-8 rounded-full border border-secondary/20" />
        <div data-ring className="absolute inset-20 rounded-full border border-primary/15" />
      </div>
      <div data-glow className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="font-display text-lg font-bold tracking-widest">ORBIT</span>
        <nav className="hidden gap-8 text-sm md:flex">
          {["Stake", "Bridge", "Docs"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer text-offwhite/70 transition-colors duration-200 hover:text-secondary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#connect" className="cursor-pointer rounded-full border border-secondary/40 px-5 py-2 text-sm font-semibold transition-colors hover:bg-secondary/15">Launch app</a>
      </header>

      <div className="relative z-10 mx-auto flex max-w-content flex-col items-center px-6 pb-24 pt-24 text-center md:pt-32">
        <span data-hero className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 font-display text-xs tracking-widest text-secondary">
          MULTI-CHAIN DEFI
        </span>
        <h1 data-hero className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl">
          Jouw kapitaal in een baan om de keten.
        </h1>
        <p data-hero className="mt-6 max-w-xl text-lg text-offwhite/70">
          Stake, bridge en earn over meerdere chains — non-custodial en supersnel.
        </p>
        <div data-hero className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <NeonButton><span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4" /> Connect wallet</span></NeonButton>
          <a href="#docs" className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-semibold transition-colors hover:border-secondary/50">
            Lees docs <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        {/* on-chain stats */}
        <div data-stat className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-4">
          {[["$1.2B","TVL"],["84k","holders"],["12","chains"]].map(([n, l]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
              <div className="font-display text-2xl font-bold text-cta md:text-3xl">{n}</div>
              <div className="mt-1 text-sm text-offwhite/60">{l}</div>
            </div>
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });
    tl.from("[data-nav]", { y: -18, autoAlpha: 0, stagger: 0.08 })
      .from("[data-ring]", { autoAlpha: 0, scale: 0.85, stagger: 0.12 }, "-=0.2")
      .from("[data-hero]", { y: 44, autoAlpha: 0, stagger: 0.12 }, "-=0.5")
      .from("[data-stat] > div", { y: 26, autoAlpha: 0, scale: 0.9, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4");

    // continuous orbital rotation (transform-only) + glow pulse + neon CTA
    gsap.to("[data-ring]", { rotation: 360, duration: 40, ease: "none", repeat: -1, transformOrigin: "50% 50%" });
    gsap.to("[data-glow]", { scale: 1.12, autoAlpha: 0.85, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-nav], [data-ring], [data-hero], [data-stat] > div, [data-glow]", { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Orbitale ringen roteren continu (`rotation`, transform-only) met een pulserende paarse glow.
- [ ] Entrance: nav → ringen → hero-copy → on-chain stats (`back.out`), gestaggerd.
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` stopt rotatie + pulse en toont alles direct bij `prefers-reduced-motion: reduce`.
- [ ] Violet/space-palet + gouden neon-CTA; Orbitron/Exo 2 typografie; `max-w-content` toegepast.
- [ ] On-chain stats (TVL, holders, chains) zichtbaar; connect-wallet-CTA bereikbaar.
- [ ] `cursor-pointer`, hover 150–300ms, focus zichtbaar; geen emoji-iconen; responsive 375/768/1024/1440px.
