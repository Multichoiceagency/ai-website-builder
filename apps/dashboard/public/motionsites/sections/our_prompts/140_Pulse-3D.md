# Pulse 3D — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: 3D Website · hero.

Build a bold pink **`Pulse3D`** hero: a hot-pink panel patterned with faint calligraphic glyphs,
a left logo with a short tagline plus a right-aligned top nav, a stack of three large white
rounded "benefit" pills on the left, and a playful 3D rabbit character (sunglasses, skull tee,
pointing) anchored on the right edge.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light-on-color theme. Background = vivid magenta/rose `#F0285A` → deeper `#E11D54` radial,
  overlaid with a low-opacity decorative calligraphy texture (`/assets/glyphs.png`, `opacity-10`).
- KEY COLORS: hot pink bg `#F0285A`, white pills `#FFFFFF` with near-black ink text `#171717`,
  white nav text `#FFFFFF`. Character is grey/black with cream shorts + pink shoes.
- Font: a friendly geometric sans (Poppins/Inter), pill labels semi-bold; nav small.
- Full-bleed section `min-h-screen`, content `max-w-[1280px]` centered.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, staggered delay, `ease:[0.22,1,0.36,1]`).
- `PillRow` — white rounded card with hover lift (`whileHover={{x:6}}`) and a soft shadow.
- `Float` — slow bob for the 3D character (`animate={{y:[0,-14,0]}}`, ~5s loop).

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-[#F0285A] text-white">
  {/* decorative glyph texture */}
  <img src="/assets/glyphs.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10" />

  <div className="relative z-10 mx-auto max-w-[1280px] px-8">
    {/* TOP BAR: logo + tagline | nav */}
    <header className="flex items-start justify-between pt-7">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#F0285A]">◑</span>
        <p className="max-w-[180px] text-[11px] leading-snug text-white/85">
          Full Workflow Automation. We Manage Everything. You Unwind.
        </p>
      </div>
      <nav className="flex gap-8 pt-2 text-sm text-white/90">
        <a>Projects</a><a>Expertise</a><a>About</a><a>Manifesto</a>
      </nav>
    </header>

    {/* LEFT: stack of three white benefit pills */}
    <div className="mt-24 max-w-xl space-y-6">
      {perks.map((p, i) => (
        <FadeUp key={p} delay={0.1 + i * 0.12}>
          <PillRow>
            <span className="block px-9 py-7 text-2xl font-medium text-[#171717]">{p}</span>
          </PillRow>
        </FadeUp>
      ))}
    </div>
  </div>

  {/* RIGHT: 3D rabbit character pinned to the edge */}
  <Float className="pointer-events-none absolute bottom-0 right-0 z-[5] h-[88vh] w-auto">
    <img src="/assets/rabbit-3d.png" alt="" className="h-full w-auto object-contain" />
  </Float>
</section>
```

## Perks data (example, from the preview)
```ts
const perks = [
  "Private Discord & Networking",
  "Weekly Market Alpha Drops",
  "Exclusive Web3 Tooling Access",
];
```

## PillRow sketch
```tsx
function PillRow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ x: 6 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-[28px] bg-white shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)]">
      {children}
    </motion.div>
  );
}
```

## Motion & acceptance
- Pills fade-up + stagger on load; each nudges right on hover. Character bobs slowly (`Float`).
- Optional: faint glyph texture drifts very slowly (`animate backgroundPosition`) for life.
- Acceptance checklist:
  - Full-screen hot-pink background with a low-opacity calligraphic glyph texture.
  - Top-left: circular logo mark + 3-line tagline "Full Workflow Automation. We Manage Everything. You Unwind."
  - Top-right nav: Projects / Expertise / About / Manifesto in white.
  - Left column: three large white rounded pills with dark text — "Private Discord & Networking", "Weekly Market Alpha Drops", "Exclusive Web3 Tooling Access".
  - Right edge: a 3D rabbit (sunglasses, black skull tee, cream shorts, pink shoes) pointing left, anchored to the bottom-right and bleeding off the frame.
  - Responsive: character hides/shrinks on small screens, pills stack full width; `prefers-reduced-motion` disables float + slide.
```
