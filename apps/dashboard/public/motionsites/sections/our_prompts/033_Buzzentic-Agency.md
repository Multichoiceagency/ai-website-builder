# Buzzentic Agency — onze versie (concept o.b.v. titel + categorie)

> Geen preview beschikbaar — concept afgeleid uit titel + categorie (Agency · hero), met design-system via ui-ux-pro-max en GSAP-animatie.

Een energieke creative-agency hero met een video-/motion-achtergrond, een vette pull-quote-headline en een glow-CTA. "Buzzentic" ademt buzz en beweging: bold pink met een cyaan accent, dramatische visual en een snel converterend statement.

## Design system (ui-ux-pro-max)

- **Gekozen stijl:** Hero-Centric Design + Video-First Hero (groot herobeeld/video, compelling headline, high-contrast CTA, dramatic visual).
- **Kleurenpalet (hex tokens):**
  - `primary` `#EC4899` (bold pink)
  - `secondary` `#F472B6` (pink-light)
  - `cta` `#06B6D4` (cyan)
  - `bg` `#FDF2F8` (rose mist)
  - `text` `#831843` (deep magenta)
- **Font pairing (Google Fonts):** Inter (heading) + Inter (body) — bold, expressive.
- **Key effects:** smooth scroll reveal, fade-in op hero, subtiele background-parallax, CTA glow/pulse. Dark overlay 60% op video, witte tekst op donker.
- **Anti-patterns vermijden:** corporate minimalism, verborgen portfolio.

## Stack & global setup

- **React 18 + Vite + TypeScript + TailwindCSS + GSAP** (`gsap` + `@gsap/react` `useGSAP`).
- `cn()` uit `@/lib/utils`. Installatie: `npm i gsap @gsap/react clsx tailwind-merge lucide-react`.
- Tailwind tokens:

```ts
extend: {
  colors: { primary: "#EC4899", secondary: "#F472B6", cta: "#06B6D4", rose: "#FDF2F8", ink: "#831843" },
  fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
  maxWidth: { content: "80rem" },
}
```

- Font: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap')`.
- Max content: `max-w-content mx-auto px-6`.

## Helpers

Gedeelde `useGSAP`-scope; `gsap.matchMedia()` voor reduced-motion (pauzeer pulse, zet alles direct zichtbaar). Video krijgt `playsInline muted loop` en valt terug op een poster bij reduced-motion.

```tsx
import { cn } from "@/lib/utils";
function GlowButton({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <button className={cn(
      "relative cursor-pointer rounded-full bg-cta px-7 py-3 font-semibold text-white",
      "shadow-[0_0_28px_rgba(6,182,212,0.55)] transition-transform duration-200 hover:scale-105",
      className
    )} data-glow>{children}</button>
  );
}
```

## Structure

```tsx
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Play, ArrowUpRight } from "lucide-react";

export default function BuzzenticHero() {
  const root = useRef<HTMLElement>(null);
  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-ink font-sans text-white">
      {/* video background + overlay */}
      <video data-video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster="/hero-poster.jpg">
        <source src="/hero.webm" type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-primary/30 to-ink/80" />

      <header className="relative z-10 mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span data-nav className="text-xl font-extrabold tracking-tight">Buzz<span className="text-secondary">entic</span></span>
        <nav className="hidden gap-8 text-sm font-medium md:flex">
          {["Work", "About", "Reels", "Contact"].map((i) => (
            <a key={i} data-nav href={`#${i.toLowerCase()}`} className="cursor-pointer transition-colors duration-200 hover:text-secondary">{i}</a>
          ))}
        </nav>
        <a data-nav href="#contact" className="cursor-pointer rounded-full border border-white/40 px-5 py-2 text-sm font-semibold transition-colors hover:bg-white hover:text-ink">Let's talk</a>
      </header>

      <div className="relative z-10 mx-auto flex max-w-content flex-col items-center px-6 pb-20 pt-24 text-center md:pt-32">
        <span data-hero className="mb-6 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-secondary backdrop-blur">Creative buzz studio</span>
        <h1 data-hero className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight md:text-8xl">
          Wij maken merken die <span className="text-secondary">zoemen.</span>
        </h1>
        <p data-hero className="mt-6 max-w-xl text-lg text-white/80">
          Van film tot campagne — energie die mensen laat stilstaan en doorklikken.
        </p>
        <div data-hero className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <GlowButton>Bekijk onze reels</GlowButton>
          <button className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-6 py-3 font-semibold backdrop-blur transition-colors hover:bg-white/20">
            <Play className="h-4 w-4" /> Showreel
          </button>
        </div>
        <div data-stat className="mt-16 flex flex-wrap justify-center gap-10">
          {[["3.2x", "engagement"], ["240+", "campagnes"], ["18", "awards"]].map(([n, l]) => (
            <div key={l} className="text-center"><div className="text-3xl font-extrabold text-secondary">{n}</div><div className="text-sm text-white/60">{l}</div></div>
          ))}
        </div>
        <a data-hero href="#contact" className="mt-12 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-white/70 hover:text-white">
          Start jouw project <ArrowUpRight className="h-4 w-4" />
        </a>
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
    tl.from("[data-video]", { scale: 1.12, autoAlpha: 0, duration: 1.4, ease: "power2.out" })
      .from("[data-nav]", { y: -18, autoAlpha: 0, stagger: 0.07 }, "-=1")
      .from("[data-hero]", { y: 48, autoAlpha: 0, stagger: 0.12 }, "-=0.7")
      .from("[data-stat] > div", { y: 26, autoAlpha: 0, scale: 0.9, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.5");

    // CTA glow pulse (transform/opacity only)
    gsap.to("[data-glow]", { scale: 1.04, autoAlpha: 0.92, duration: 1.1, ease: "sine.inOut", repeat: -1, yoyo: true });
  });

  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-video], [data-nav], [data-hero], [data-stat] > div, [data-glow]", { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  });
}, { scope: root });
```

## Acceptance

- [ ] Video-achtergrond met 60% donkere overlay; witte tekst leesbaar; poster-fallback bij reduced-motion.
- [ ] Entrance: video-scale → nav → hero-copy → stats (`back.out`); CTA pulseert subtiel (transform/opacity).
- [ ] Alle animatie via `gsap.timeline()` + transform-aliases; geen width/height/top/left.
- [ ] `gsap.matchMedia()` schakelt pulse + entrance uit bij `prefers-reduced-motion: reduce`.
- [ ] Bold-pink palet, cyaan glow-CTA, Inter bold/expressive correct toegepast.
- [ ] Portfolio/reels prominent gelinkt (geen verborgen portfolio); geen corporate-minimal look.
- [ ] `cursor-pointer`, focus-states, hover 150–300ms; geen emoji-iconen; responsive 375/768/1024/1440px.
