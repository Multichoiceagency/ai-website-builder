# Nimbus Sticky Cards — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Cards · features.

Build a dark, scroll-driven **`NimbusStickyCards`** feature section: a left mono-font index of
chapters, a centered sticky text column (eyebrow → active feature title → body) and, to the right,
a warm-toned panel holding a floating dark "Region policy" UI card. As you scroll, the next chapter
("Elastic scaling") rises in while the previous one parks above.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Page background near-black `#0C0B0A`; the right media panel a warm sand/khaki gradient
  `from-[#C9B98A] to-[#8E7E55]` (`bg-gradient-to-br`).
- KEY COLORS: white text `#F4F2EC`, muted khaki labels `#9A8F72`, floating UI card `#2A2926` with
  mono code text `#CFC9BD`, hairline dividers `border-white/10`.
- Fonts: sans for headings/body, a monospace (`font-mono`) for the left index and the card contents.
- Wide layout `max-w-[1200px]`; three columns: index (narrow) / sticky copy / media panel.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, `whileInView`, `ease:[0.22,1,0.36,1]`, `once`).
- `useActiveChapter` — IntersectionObserver/scroll hook returning the in-view chapter index so the
  left index highlights and the copy column swaps title+body.
- `Float` — slow infinite bob for the floating card (`animate={{y:[0,-8,0]}}`, 6s loop).

## Structure
```tsx
<section className="relative bg-[#0C0B0A] text-[#F4F2EC]">
  <div className="mx-auto grid max-w-[1200px] grid-cols-[150px_1fr_1fr] gap-8 px-8 py-24">

    {/* LEFT: mono chapter index */}
    <nav className="sticky top-24 h-fit space-y-3 font-mono text-[11px] uppercase tracking-widest">
      {chapters.map((c, i) => (
        <button key={c.id} onClick={() => goTo(i)}
          className={cn("flex items-center gap-2", i === active ? "text-white" : "text-white/35")}>
          <span className="text-[6px]">■</span> {c.label}
        </button>
      ))}
    </nav>

    {/* CENTER: sticky copy column */}
    <div className="sticky top-24 h-fit border-t border-white/10 pt-6">
      <h3 className="text-xl text-white/55">{chapters[active].kicker}</h3>
      <h2 className="mt-3 text-3xl font-medium">{chapters[active].title}</h2>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">{chapters[active].body}</p>
      <div className="mt-24 border-t border-white/10 pt-6 text-3xl font-medium text-white/30">
        {chapters[(active + 1) % chapters.length].title}
      </div>
    </div>

    {/* RIGHT: warm media panel with floating UI card */}
    <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-gradient-to-br from-[#C9B98A] to-[#8E7E55]">
      <Float className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-64 rounded-xl border border-black/30 bg-[#2A2926] p-4 font-mono text-[11px] text-[#CFC9BD] shadow-2xl">
          <div className="mb-3 flex gap-1.5"><i className="h-2 w-2 rounded-full bg-white/30"/><i className="h-2 w-2 rounded-full bg-white/30"/><i className="h-2 w-2 rounded-full bg-white/30"/></div>
          <p className="mb-2 text-white/80">Region policy</p>
          {policy.map(r => (
            <div key={r.region} className="flex justify-between py-0.5">
              <span>{r.region}</span><span className="text-white/50">{r.status}</span>
            </div>
          ))}
        </div>
      </Float>
    </div>
  </div>
</section>
```

## Chapters & policy data (example, from the preview)
```ts
const chapters = [
  { id:"infra",   label:"Programmable infra", kicker:"Programmable infra", title:"Data residency",
    body:"Pin departments and client workspaces to approved regions with retention and encryption rules attached from day one." },
  { id:"scale",   label:"Elastic scaling",    kicker:"Elastic scaling",    title:"Elastic scaling",
    body:"Burst capacity per workspace without re-architecting — autoscale policies follow the same residency guarantees." },
  { id:"visib",   label:"Unified visibility", kicker:"Unified visibility", title:"Unified visibility",
    body:"One control plane across regions: audit, cost and access surfaced in a single, filterable timeline." },
];

const policy = [
  { region:"EU Central",   status:"locked" },
  { region:"US East",      status:"allowed" },
  { region:"AP Southeast", status:"review" },
  { region:"Retention",    status:"7 years" },
];
```

## Motion & acceptance
- Scrolling drives `active`: left index item brightens, center kicker/title/body crossfade, and the
  next chapter title sits below in dim grey (`text-white/30`).
- The dark "Region policy" card floats gently (`Float`); appears via `FadeUp` when its panel enters.
- Acceptance checklist:
  - Near-black background; left column is a monospace uppercase chapter list with a tiny ■ bullet.
  - Active chapter highlighted white, others dimmed; clicking scrolls to that chapter.
  - Center sticky column: "Programmable infra" kicker, "Data residency" title, paragraph, plus the upcoming "Elastic scaling" heading dimmed below a divider.
  - Right warm sand-gradient panel (aspect ~4:5) with a floating dark UI card titled "Region policy" listing EU Central/US East/AP Southeast/Retention in mono.
  - Sticky behaviour for index + copy; responsive collapse to stacked on mobile; `prefers-reduced-motion` disables float + slide.
```
