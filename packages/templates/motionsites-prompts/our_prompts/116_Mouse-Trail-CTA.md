# Mouse Trail CTA — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: CTA · cta.
> Lichte, rustige CTA-sectie binnen een afgerond licht-grijs paneel: een groot serif "Partner with us", een donkere pill-knop met avatar ("Start chat with Viktor"), en een paar zwevende kaartjes die de muiscursor volgen (mouse-trail).

Build a minimal light **`MouseTrailCTA`** section: a rounded off-white card panel,
a centered serif headline, a dark rounded chat pill with a small avatar, and a couple
of small image cards that trail/lag behind the cursor near the button.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Outer page background `#E9EAEC`; the section is a single rounded panel
  `bg-[#F2F3F4] rounded-[28px]` with soft `shadow-[0_1px_0_rgba(0,0,0,0.04)]`, generous padding.
- Content is centered, max width ~720px, lots of whitespace (it reads airy/quiet).
- Fonts: a high-contrast serif display for the headline (`font-["Playfair_Display"]` / `font-serif`),
  Inter for the button label.
- Key colors I see: panel `#F2F3F4`, near-black headline `#1A1C1F`, dark-teal pill `#16242B`, white pill text.

## Helpers
- `FadeUp` — framer-motion wrapper (`initial opacity:0,y:16` → `whileInView opacity:1,y:0`, `viewport once`).
- `useMouse` — hook returning a `motionValue` x/y; cards follow via `useSpring` with low stiffness so they LAG (trail).
- `TrailCard` — small rounded image card that reads the springed mouse position with a per-card offset/delay.

## Structure
```tsx
<section className="flex min-h-screen items-center justify-center bg-[#E9EAEC] p-6">
  <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] bg-[#F2F3F4] px-8 py-28 text-center">

    {/* trailing cards (lag behind cursor, sit near the button) */}
    <TrailCard src="/assets/card-1.jpg" offset={{x:0,y:0}}   stiffness={120} />
    <TrailCard src="/assets/card-2.jpg" offset={{x:18,y:24}} stiffness={80}  />

    <FadeUp>
      <h2 className="font-serif text-5xl font-medium tracking-tight text-[#1A1C1F] md:text-6xl">
        Partner with us
      </h2>
    </FadeUp>

    <FadeUp delay={0.15}>
      <button className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#16242B] py-2.5 pl-2 pr-6 text-sm font-medium text-white shadow-lg transition hover:bg-[#1d3038]">
        <img src="/assets/viktor.jpg" alt="Viktor" className="h-9 w-9 rounded-full object-cover" />
        Start chat with Viktor
      </button>
    </FadeUp>
  </div>
</section>
```

```tsx
// TrailCard — follows the cursor with spring lag
function TrailCard({ src, offset, stiffness }: TrailCardProps) {
  const { x, y } = useMouse();
  const sx = useSpring(x, { stiffness, damping: 18 });
  const sy = useSpring(y, { stiffness, damping: 18 });
  return (
    <motion.img
      src={src} alt="" aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none absolute right-[18%] top-1/2 h-24 w-32 rounded-2xl object-cover shadow-2xl"
    />
  );
}
```

## Content data (example, from the preview)
```ts
const cta = {
  headline: "Partner with us",
  buttonLabel: "Start chat with Viktor",
  avatar: "/assets/viktor.jpg",
  trailCards: ["/assets/card-1.jpg", "/assets/card-2.jpg"], // dark photographic thumbnails
};
```

## Motion & acceptance
- The small image cards spring-follow the cursor with different stiffness so they trail/lag and overlap slightly near the chat pill.
- Headline + button fade-up on mount (`FadeUp`, delays 0 / .15).
- Button lifts on hover (`hover:bg` shade + slight `whileHover y:-2`); avatar stays pinned inside the pill.
- Acceptance checklist:
  - One large rounded light panel (`#F2F3F4`) centered on a slightly darker page (`#E9EAEC`).
  - Centered high-contrast serif headline "Partner with us", near-black.
  - Dark rounded chat pill with circular avatar + "Start chat with Viktor", white text.
  - Two small photographic cards that trail the cursor with spring lag and sit to the right of the button, casting soft shadows.
  - Quiet, airy, lots of whitespace. Respect `prefers-reduced-motion`: disable cursor-trail, render cards statically stacked + fade only.
```
