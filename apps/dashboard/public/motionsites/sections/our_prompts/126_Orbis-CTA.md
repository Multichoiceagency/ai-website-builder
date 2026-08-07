# Orbis CTA — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: CTA · cta.
> Speelse 3D-render CTA: een retro robot-tv-karakter met groen scherm (skull-radar) links op een dromerig nachtelijk koraal-/onderwaterlandschap, en rechts een meerregelige call-to-action met neon-accent ("JOIN US. Go beyond.").

Build an immersive **`OrbisCTA`** section: a full-bleed 3D coral-night scene, a cute
robot-with-CRT-screen character on the left (its body has small clickable social icons),
and a bold multi-line CTA headline on the right with a lime/magenta accent line.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = a rendered scene image (`/assets/orbis-coral.jpg`, deep midnight-blue
  `#15203A` with pink/red coral foreground) via `object-cover`; soft top gradient
  `from-[#0E1530]/40 to-transparent` for nav/legibility.
- Robot character = a separate transparent PNG (`/assets/orbis-robot.png`) anchored bottom-left so it can float independently.
- Fonts: a heavy condensed display (`font-["Anton"]` / `font-black uppercase`) for the CTA; Inter for small labels.
- Key colors I see: midnight-blue `#15203A`, lime accent `#A3E635`, magenta accent `#E879F9`, coral pink `#F472A0`, white text.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` whileInView, `once`).
- `Float` — slow bob for the robot: `animate={{y:[0,-10,0]}}`, `transition={{duration:6, repeat:Infinity, ease:"easeInOut"}}`.
- `IconBtn` — small rounded social button (mail / github / etc.) that sits on the robot's body and shows a pointer cursor + hover glow.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden bg-[#15203A] text-white">
  <img src="/assets/orbis-coral.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-b from-[#0E1530]/40 via-transparent to-[#0E1530]/30" />

  {/* robot character bottom-left */}
  <Float className="absolute bottom-0 left-[4%] z-10 w-[40vw] max-w-[460px]">
    <img src="/assets/orbis-robot.png" alt="Orbis robot" className="w-full drop-shadow-2xl" />
    {/* clickable social icons on its body */}
    <div className="absolute bottom-[26%] left-[34%] flex flex-col gap-2">
      <IconBtn icon="mail" />
      <IconBtn icon="twitter" />
      <IconBtn icon="github" />
    </div>
  </Float>

  {/* CTA copy right of center */}
  <div className="relative z-10 ml-auto flex min-h-screen max-w-xl flex-col justify-center px-8 md:pr-16">
    <FadeUp>
      <p className="font-black uppercase leading-[0.95] tracking-tight">
        <span className="block text-3xl text-white md:text-4xl">Join us.</span>
        <span className="-mt-1 block font-serif text-3xl italic text-[#A3E635] md:text-4xl">Go beyond<span className="text-[#E879F9]">.</span></span>
      </p>
    </FadeUp>
    <FadeUp delay={0.15}>
      <h2 className="mt-3 font-black uppercase leading-[1.05] tracking-tight text-2xl md:text-3xl">
        Reveal what&apos;s hidden.<br/>Define what&apos;s next.<br/>Follow the signal.
      </h2>
    </FadeUp>
  </div>
</section>
```

## CTA data (example, from the preview)
```ts
const cta = {
  eyebrow: { line1: "Join us.", line2: "Go beyond." }, // line2 = lime italic, period magenta
  headlineLines: ["Reveal what's hidden.", "Define what's next.", "Follow the signal."],
  socials: ["mail", "twitter", "github"], // small icons mounted on the robot body
};
```

## Motion & acceptance
- Robot bobs gently up/down on a 6s loop (`Float`); coral scene stays fixed behind it.
- CTA eyebrow + headline fade-up with stagger (0 / .15); the lime "Go beyond" line uses an italic serif for contrast against the black condensed lines.
- Robot's CRT screen can pulse a soft green glow (`animate boxShadow`/opacity loop) to feel "alive / scanning".
- Social icons on the robot body show pointer cursor + hover glow.
- Acceptance checklist:
  - Full-bleed midnight-blue 3D coral/underwater scene; pink coral in the foreground.
  - Retro robot-TV character bottom-left with a glowing green skull-radar screen, floating on a slow loop.
  - Right-aligned bold condensed-uppercase CTA: "Join us." + lime italic "Go beyond." + 3 white headline lines.
  - Small social icon buttons mounted on the robot's body (mail / twitter / github), pointer cursor.
  - Respect `prefers-reduced-motion`: disable float + screen pulse, keep static scene + fade.
```
