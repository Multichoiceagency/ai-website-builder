# NexaCore Process — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Process · features.
> Donkere process/steps-sectie met een twee-toon headline (wit + paars/blauw gradient regel), een korte subtitel, en vier verticale "stap"-kaarten (Planning → Procurement → Logistics → Commissioning), de laatste gehighlight met een gradient "Learn more" knop. Centraal een warme licht-glow achter de kaarten.

Build a dark **`NexaCoreProcess`** section: a centered two-tone headline, a muted
sub-line, and a row of four tall step cards (Planning, Procurement, Logistics,
Commissioning) each with a chip label, a bold statement, a checked feature list, and the
last card highlighted with a gradient "Learn more" button. A warm radial glow sits behind
the cards.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#08070A` with a warm centered glow behind the cards
  `radial-gradient(50% 40% at 50% 45%, rgba(255,170,90,0.25), transparent)`.
- Cards = `bg-[#120F18]/80 border border-white/8 rounded-2xl` with a faint violet top-glow inside.
- Headline second line uses a purple→blue gradient text clip; sub-line muted grey.
- Fonts: Inter; headline semibold, statements semibold-small.
- Key colors I see: black `#08070A`, warm amber glow `#FFAA5A`, violet `#9A6BFF`, blue `#5B8DEF`, green check `#37D67A`, white text.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` whileInView, `once`, stagger via index).
- `Chip` — small rounded pill `bg-white/5 border border-white/10` with a dot/icon + label.
- `CheckItem` — row with a circular green check icon + small text.
- `GradientButton` — `bg-gradient-to-r from-[#9A6BFF] to-[#5B8DEF] rounded-full` (only on the highlighted card).

## Structure
```tsx
<section className="relative overflow-hidden bg-[#08070A] px-6 py-24 text-white">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_45%,rgba(255,170,90,0.25),transparent)]" />

  <div className="relative z-10 mx-auto max-w-6xl">
    <FadeUp>
      <h2 className="text-center text-3xl font-semibold leading-tight md:text-4xl">
        Relied on by enterprise teams<br/>
        <span className="bg-gradient-to-r from-[#9A6BFF] via-[#7C8BFF] to-[#5B8DEF] bg-clip-text text-transparent">
          from groundbreak to go-live.
        </span>
      </h2>
    </FadeUp>
    <FadeUp delay={0.1}>
      <p className="mx-auto mt-4 max-w-xl text-center text-sm text-white/45">
        Built for operational clarity through constant change. Proven across 530+ MW of critical infrastructure.
      </p>
    </FadeUp>

    {/* four step cards */}
    <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <FadeUp key={s.label} delay={i * 0.1}>
          <div className={cn("flex h-full flex-col rounded-2xl border border-white/8 bg-[#120F18]/80 p-6",
            s.highlight && "ring-1 ring-white/15")}>
            <Chip label={s.label} />
            <h3 className="mt-10 text-base font-semibold leading-snug">{s.statement}</h3>
            <ul className="mt-5 space-y-2 text-xs text-white/70">
              {s.features.map(f => <CheckItem key={f}>{f}</CheckItem>)}
            </ul>
            {s.highlight && <GradientButton className="mt-6">Learn more</GradientButton>}
          </div>
        </FadeUp>
      ))}
    </div>
  </div>
</section>
```

## Steps data (example, from the preview)
```ts
const steps = [
  { label: "Planning",      statement: "Turn new programs into structured plans without the noise.",
    features: ["Embedded program leads", "Decision-ready roadmaps"] },
  { label: "Procurement",   statement: "Source and qualify vendors with far less friction.",
    features: ["Cross-org scope alignment", "End-to-end accountability"] },
  { label: "Logistics",     statement: "Move the right materials on time without surprises.",
    features: ["Spec and fit validations", "Change order ownership"] },
  { label: "Commissioning", statement: "Activate systems with complete context, not guesswork.",
    features: ["Uninterrupted workflows", "Verified clean handoffs"], highlight: true },
];
```

## Motion & acceptance
- Headline + sub fade-up first, then the four cards stagger in left→right (delay `i*0.1`).
- Cards lift slightly on hover (`whileHover y:-4`); the warm radial glow stays fixed behind them.
- Gradient "Learn more" button on the last (Commissioning) card; green checks tick in with the card.
- Acceptance checklist:
  - Near-black background with a warm amber radial glow centered behind the card row.
  - Centered two-line headline: white "Relied on by enterprise teams" + purple→blue gradient "from groundbreak to go-live."; muted grey sub-line about "530+ MW".
  - Four tall step cards: Planning / Procurement / Logistics / Commissioning, each with a chip label, bold statement, and 2 green-checked features.
  - Last card highlighted (subtle ring) with a purple→blue gradient "Learn more" pill button.
  - Responsive: 4 → 2 → 1 columns. Respect `prefers-reduced-motion` (disable lift/stagger, keep fade).
```
