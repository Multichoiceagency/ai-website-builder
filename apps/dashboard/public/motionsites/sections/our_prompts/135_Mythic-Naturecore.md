# Mythic Naturecore — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: landing page · hero.
> Cinematische, mistige bos-hero met god-rays: een floating glazen "frame" over de volledige boslucht-achtergrond, een gesplitste transparante nav, en een groot light-serif statement "FORGE BEYOND THE REAL" centraal.

Build a full-bleed atmospheric **`MythicNaturecore`** hero: a sunlit misty forest with volumetric
light rays as the background, a slightly tilted glass "device frame" floating in the center, a split
transparent nav inside it, and a large light-serif headline with a small sub and a thin scroll line.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark/cinematic. Background = forest photo (`/assets/forest-rays.jpg`, `object-cover`) on near-black `#0A0F0A`;
  the surrounding page is darkened so the inner frame reads as a window.
- Inner frame: large rounded glass panel `rounded-[2rem] border border-white/15 backdrop-blur-[2px]`
  with a soft drop shadow, slightly rotated (`rotate-[-1deg]`) for a 3D-card feel.
- Key colors: deep forest greens `#1F3A28`/`#3E6B45`, warm ray highlights `#D8E4C2`, near-white text `#F4F6EF`.
- Font: light serif display for the headline (`font-serif`, weight 300), wide uppercase letter-spacing on nav.

## Helpers
- `FadeUp` (framer-motion) reveal wrapper, slow `0.9s` ease.
- `GodRays` — overlay gradient streaks (`bg-gradient-to-b from-white/20 via-transparent` rotated) with gentle opacity breathing.
- `Sparkles` — a few tiny floating dots near the headline (optional, subtle).

## Structure
```tsx
<section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0F0A] p-6">
  {/* full background forest */}
  <img src="/assets/forest-rays.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
  <div className="absolute inset-0 bg-black/30" />

  {/* floating glass frame */}
  <div className="relative z-10 w-full max-w-5xl rotate-[-1deg] overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
    <img src="/assets/forest-rays.jpg" alt="" className="absolute inset-0 h-full w-full scale-110 object-cover" />
    <GodRays className="absolute inset-0" />
    <div className="absolute inset-0 bg-black/20" />

    {/* split transparent nav */}
    <header className="relative z-10 flex items-center justify-between px-8 py-6 text-[10px] uppercase tracking-[0.3em] text-white/85">
      <nav className="flex gap-6"><a>Worlds</a><a>Atelier ✦</a><a>Immersions</a></nav>
      <nav className="flex gap-6"><a>Craft</a><a>Codex</a><a>Connect</a></nav>
    </header>

    {/* centered headline */}
    <div className="relative z-10 flex flex-col items-center px-6 py-28 text-center">
      <FadeUp>
        <h1 className="font-serif text-4xl font-light tracking-[0.08em] text-[#F4F6EF] sm:text-6xl">
          FORGE BEYOND THE REAL
        </h1>
      </FadeUp>
      <FadeUp delay={0.2}>
        <p className="mt-5 max-w-md text-xs leading-relaxed text-white/70">
          Singular voyages to astonishing destinations, shaped for
          those who seek beauty beyond the ordinary and the known.
        </p>
      </FadeUp>
    </div>

    {/* thin scroll line bottom-right of the frame */}
    <div className="absolute bottom-8 right-8 h-16 w-px bg-white/40" />
  </div>
</section>
```

## Nav data (example, from the preview)
```ts
const navLeft  = ["Worlds", "Atelier", "Immersions"];
const navRight = ["Craft", "Codex", "Connect"];
```

## Motion & acceptance
- Headline + sub fade-up (delays 0 / .2); god-rays gently breathe opacity (`0.6 ↔ 1` over ~10s).
- The framed background image scales `1.1 → 1.15` very slowly behind the static frame for living-forest depth.
- Optional tiny sparkles drift upward near the headline.
- Acceptance checklist:
  - Full-bleed misty forest with volumetric light rays; darkened page so the inner frame reads as a window.
  - Floating rounded glass frame, slightly tilted (`rotate-[-1deg]`), with its own forest crop + rays inside.
  - Split transparent nav inside the frame (Worlds / Atelier ✦ / Immersions  —  Craft / Codex / Connect), uppercase wide tracking.
  - Centered light-serif headline "FORGE BEYOND THE REAL" + small centered sub paragraph.
  - Thin vertical scroll line at the frame's bottom-right. Reduced-motion safe (kill scale/rays/sparkles, keep fades).
