# Minimal Workflow SaaS — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: SaaS · hero.

Build a light, airy **`MinimalWorkflowHero`** for "Script": a soft off-white/lavender stage with
faint concentric-ring lighting, a slim top nav, a centered serif-ish headline where part of the
line is tinted blue, a black pill "Register Now!" button, and a translucent "learning step" card
floating over a ghosted portrait that fades into the background.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Light theme. Background = soft `#EEF0F5` → white with faint **concentric ring** highlights
  (`bg-[radial-gradient(80%_80%_at_70%_50%,#ffffff,transparent)]` layered over a subtle ring image).
- Text = ink `#1B2230`; a key headline phrase tinted **slate-blue `#3E5C8C`**; body copy `text-slate-500`.
- Primary CTA = solid **black pill** with white text. Font: a refined sans/transitional
  (Inter or `font-["General_Sans"]`), tight tracking on the headline.
- Max content width `max-w-3xl`, generous vertical padding; portrait ghosted at low opacity at the bottom.

## Helpers
- `FadeUp` (framer-motion, opacity+y) for eyebrow/headline/sub/CTA stagger.
- `RingGlow` — faint concentric circles behind the hero (SVG or layered radial gradients).
- `GlassCard` — translucent suggestion card: `bg-white/40 border border-white/60 backdrop-blur-md rounded-2xl`.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#EEF0F5] text-[#1B2230]">
  <RingGlow className="pointer-events-none absolute inset-0 opacity-60" />

  {/* top nav */}
  <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-sm">
    <span className="font-semibold tracking-tight">Script ⇶</span>
    <nav className="hidden gap-8 text-slate-600 md:flex">
      <a className="hover:text-slate-900">Resources</a><a className="hover:text-slate-900">Service</a>
      <a className="hover:text-slate-900">Support</a><a className="hover:text-slate-900">Developers</a>
      <a className="hover:text-slate-900">Updates</a>
    </nav>
    <a className="rounded-full border border-slate-300 bg-white px-5 py-2 text-slate-800 hover:border-slate-400">Join us</a>
  </header>

  {/* centered hero copy */}
  <div className="relative z-10 mx-auto max-w-3xl px-6 pt-16 text-center">
    <FadeUp>
      <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
        Guide everyone on teams
        <br /> tech manuals
        <br />
        <span className="text-[#3E5C8C]">— with a total ease of mind</span>
      </h1>
    </FadeUp>
    <FadeUp delay={0.12}>
      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-500">
        Script offers the best path to register your workflow steps and optimize training on
        your setup systems
      </p>
    </FadeUp>
    <FadeUp delay={0.24}>
      <a className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#15171C] px-6 py-3 text-sm font-medium text-white transition hover:bg-black">
        Register Now! <span aria-hidden>→</span>
      </a>
    </FadeUp>
  </div>

  {/* floating suggestion card over a ghosted portrait */}
  <div className="relative z-10 mx-auto mt-14 max-w-md px-6">
    <GlassCard className="p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">Learn the step</p>
      <p className="mt-1 font-medium text-slate-800">How to code an app in Python</p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-500/80">
        <li>How to build charts with data in Excel</li>
        <li>How to edit profile of users on GitHub</li>
        <li>How to design slides like in Azure</li>
      </ul>
    </GlassCard>
  </div>

  {/* ghosted portrait fading into bg */}
  <img src="/assets/ghost-portrait.png" alt="" className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[55%] -translate-x-1/2 opacity-20" />
  <p className="relative z-10 pb-10 text-center text-xs text-slate-400">All people aligned.</p>
</section>
```

## Nav / card data (example, from the preview)
```ts
const nav = ["Resources", "Service", "Support", "Developers", "Updates"];
const steps = {
  eyebrow: "Learn the step",
  title: "How to code an app in Python",
  items: [
    "How to build charts with data in Excel",
    "How to edit profile of users on GitHub",
    "How to design slides like in Azure",
  ],
};
```

## Motion & acceptance
- Eyebrow/headline/sub/CTA stagger up via `FadeUp` (0 / .12 / .24); ring glow fades in softly behind.
- The glass suggestion card floats up slightly later (`whileInView` from `y:30`); optional gentle continuous bob.
- Headline's last line is rendered in slate-blue; CTA is a black pill with an arrow.
- Respect `prefers-reduced-motion`: disable bob, keep fades only.
- Acceptance checklist:
  - Light lavender/off-white stage with faint concentric-ring lighting on the right.
  - Top nav: "Script ⇶" logo, Resources/Service/Support/Developers/Updates, outlined "Join us" button.
  - Centered multi-line headline with the final phrase tinted slate-blue; muted sub-copy.
  - Black pill "Register Now! →" CTA.
  - Translucent glass "Learn the step" card listing Python/Excel/GitHub/Azure how-tos, floating over a ghosted, low-opacity portrait.
  - "All people aligned." caption at the bottom; reduced-motion safe.
