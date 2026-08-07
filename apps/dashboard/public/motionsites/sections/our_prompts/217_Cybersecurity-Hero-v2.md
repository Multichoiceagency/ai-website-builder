# Cybersecurity Hero v2 — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a dark, glowing **`CybersecurityHero`** for a data-security SaaS ("Xero"): a centered top
nav with login/sign-up, a horizontal 3-step icon flow at the top of a rounded panel, a big
two-line headline over a vivid blue→magenta gradient grid glow, a pill CTA, and a logo row.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Outer background = near-black `#08080B`. The hero panel is a large rounded card
  with a vivid bottom-up **blue→purple→magenta** gradient glow and a faint perspective grid.
- Key colors from the image: white text `#FFFFFF`, muted lilac sub-text `#C9C2E8`,
  glow gradient `#2563EB → #7C3AED → #EC4899` (electric blue → violet → pink) sitting behind a
  subtle grid; icon chips are dark glass `bg-white/10 border-white/15`.
- Typeface: Inter; headline regular/medium with tight tracking. Max content width `max-w-6xl`.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `StepFlow` — three glass icon chips connected by a thin line; the middle/active one highlighted.
- `Grid` — CSS background grid (`linear-gradient` repeating) masked to fade upward.

## Structure
```tsx
<section className="relative min-h-screen bg-[#08080B] px-6 pt-6 text-white">
  {/* NAV */}
  <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between py-4">
    <span className="text-lg font-semibold">Xero</span>
    <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
      {nav.map(n => <a key={n} className="transition hover:text-white">{n}</a>)}
    </nav>
    <div className="flex items-center gap-2">
      <a className="rounded-full px-4 py-2 text-sm text-white/80 transition hover:bg-white/5">Login</a>
      <a className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">Sign Up</a>
    </div>
  </header>

  {/* glowing hero panel */}
  <FadeUp>
    <div className="relative mx-auto mt-4 max-w-6xl overflow-hidden rounded-3xl border border-white/10">
      {/* gradient glow + grid */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_120%,#EC4899_0%,#7C3AED_35%,#2563EB_60%,#08080B_85%)]" />
      <Grid className="absolute inset-0 opacity-30" />

      <div className="relative z-10 flex flex-col items-center px-6 py-20 text-center">
        {/* 3-step icon flow */}
        <StepFlow steps={steps} active={1} />

        <FadeUp delay={0.15}>
          <h1 className="mt-12 text-4xl font-medium leading-tight tracking-tight sm:text-5xl md:text-6xl">
            The simple way<br/>
            <span className="text-white/85">encryption your data</span>
          </h1>
        </FadeUp>
        <FadeUp delay={0.25}>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#C9C2E8]">
            Fully managed data encrypting service and annotation platform for teams of all industries.
          </p>
        </FadeUp>
        <FadeUp delay={0.35}>
          <a className="mt-8 rounded-full bg-white px-7 py-3 text-sm font-medium text-black transition hover:bg-white/90">
            Get Started
          </a>
        </FadeUp>
      </div>
    </div>
  </FadeUp>

  {/* logo row */}
  <FadeUp delay={0.45}>
    <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-10 py-4 text-sm text-white/50">
      {logos.map(l => <span key={l} className="transition hover:text-white/80">{l}</span>)}
    </div>
  </FadeUp>
</section>
```

## StepFlow helper
```tsx
function StepFlow({ steps, active }: { steps:{icon:string}[]; active:number }) {
  return (
    <div className="flex items-center gap-4">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-4">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur",
            i===active ? "border-white/40 bg-white/20 shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)]"
                       : "border-white/15 bg-white/10 text-white/70")}>
            {s.icon}
          </span>
          {i < steps.length-1 && <span className="h-px w-16 bg-white/20" />}
        </div>
      ))}
    </div>
  );
}
```

## Data (from the preview)
```ts
const nav   = ["Method", "Pricing", "Docs"];
const steps = [{ icon:"▤" }, { icon:"↻" }, { icon:"🛡" }];  // layers → sync → shield, middle active
const logos = ["Expedia", "asana", "zenefits", "HubSpot", "loom"];
```

## Motion & acceptance
- Hero panel fades up; inside it the step flow, headline, sub and CTA stagger (delays .15 / .25 / .35); logo row last (.45).
- The gradient glow can slowly breathe (`scale`/`opacity`) and the active step chip pulses its white halo.
- A small cursor/hand hint can sit on the active (middle) step like the preview.
- Respect `prefers-reduced-motion`: disable glow breathing + chip pulse, keep opacity fades.
- Acceptance checklist:
  - Near-black page; centered nav with "Xero" logo, Method/Pricing/Docs links, "Login" + white "Sign Up".
  - Large rounded hero panel with a blue→violet→magenta bottom-up gradient glow + faint perspective grid.
  - Horizontal 3-step icon flow (layers / sync / shield) with the middle chip highlighted + glowing.
  - Two-line headline "The simple way / encryption your data" over the glow; muted lilac sub-copy; white "Get Started" pill.
  - Greyscale logo row (Expedia, asana, zenefits, HubSpot, loom) below the panel. Responsive: nav + logos wrap on mobile.
