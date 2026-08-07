# Rocket FAQ — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: FAQ · faq.
> Donkere FAQ-sectie ("UI Rocket"): een FAQ-pill + tweeregelige kop links, een korte intro rechts, een verticale categorie-filter + "Got Questions?" support-kaart in de linkerkolom, en een stapel van vijf afrolbare accordion-rijen rechts.

Build a dark **`RocketFAQ`** section: a small "FAQ" pill and a two-line heading top-left, a short
intro paragraph top-right, a left sidebar with category filters + a "Got Questions?" support card,
and a right column of five rounded accordion rows with chevron toggles.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0C0C0E`; text near-white `#F2F2F3`, muted `#8A8A90`.
- Rows + cards: `bg-white/[0.04] border border-white/[0.06] rounded-xl`; active category pill is lighter.
- Key colors: monochrome (no chroma accent) — small green-ish "FAQ" dot optional `#8B8B8B`; hover row gets a faint top highlight.
- Font: Inter / system sans. Headings medium-bold, rows regular.
- Max width `max-w-6xl`; two-column grid (`~1fr 1.6fr`).

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `Accordion` — controlled open index; chevron rotates `0 → 180deg`; body height animates via framer `AnimatePresence` (`height:auto`).
- `CategoryTab` — `{label}` button; active = lighter pill `bg-white/[0.08]`.

## Structure
```tsx
<section className="bg-[#0C0C0E] py-20 text-[#F2F2F3]">
  <div className="mx-auto max-w-6xl px-8">
    {/* top row: heading | intro */}
    <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">● FAQ</span>
        <h2 className="mt-5 text-3xl font-semibold leading-tight">Answers to the questions<br/>that come up most.</h2>
      </div>
      <p className="self-end text-sm leading-relaxed text-[#8A8A90]">
        Learn how UI Rocket works, what it covers, how the workflow flows, and what you can expect day to day.
      </p>
    </div>

    {/* body: sidebar | accordion */}
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
      {/* sidebar */}
      <div>
        <div className="flex flex-col gap-1">
          {categories.map(c => (
            <button key={c} className={cn("rounded-lg px-4 py-2.5 text-left text-sm",
              c===activeCat ? "bg-white/[0.08] text-white" : "text-[#8A8A90] hover:text-white")}>{c}</button>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.04] p-5">
          <h4 className="text-sm font-medium">Got Questions?</h4>
          <p className="mt-2 text-xs leading-relaxed text-[#8A8A90]">Need help with something? Our team is here to make things easy. Don't hesitate to reach out.</p>
          <a className="mt-4 inline-block text-xs text-white">Email us →</a>
        </div>
      </div>

      {/* accordion */}
      <div className="flex flex-col gap-3">
        {faqs.map((q,i) => (
          <FadeUp key={q.q} delay={0.05*i}>
            <Accordion item={q} open={open===i} onToggle={()=>setOpen(open===i?-1:i)} />
          </FadeUp>
        ))}
      </div>
    </div>
  </div>
</section>
```

```tsx
function Accordion({item, open, onToggle}:{item:Faq; open:boolean; onToggle:()=>void}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.04]">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium">
        {item.q}
        <motion.span animate={{rotate: open?180:0}} className="text-white/40">⌄</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden px-5 text-sm text-[#8A8A90]">
            <p className="pb-4">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## Data (example, from the preview)
```ts
const categories = ["General", "AI & Capabilities", "Integrations & Security"];
const activeCat = "General";

const faqs: Faq[] = [
  { q:"What is UI Rocket?",            a:"UI Rocket is a design-to-launch toolkit for shipping polished interfaces fast." },
  { q:"Who is this for?",              a:"Founders, designers and small teams who want production-ready UI without the overhead." },
  { q:"Do I need prior design experience?", a:"No — the components and presets are made to look great out of the box." },
  { q:"How long does it take?",        a:"Most teams have a first screen live within an afternoon." },
  { q:"Is there a community?",         a:"Yes, an active community space for templates, help and feedback." },
];
```

## Motion & acceptance
- Accordion rows fade-up with a small stagger; opening a row animates `height:auto` and rotates the chevron 180°; only one open at a time.
- Category tabs highlight the active pill; "Email us →" nudges its arrow on hover.
- Acceptance checklist:
  - Near-black background; "● FAQ" pill + two-line heading "Answers to the questions / that come up most." top-left; intro paragraph top-right.
  - Left sidebar: 3 category tabs (General active / AI & Capabilities / Integrations & Security) + "Got Questions?" support card with "Email us →".
  - Right column: 5 rounded accordion rows (What is UI Rocket? / Who is this for? / Do I need prior design experience? / How long does it take? / Is there a community?) with chevron toggles.
  - Single-open accordion with smooth height animation. Responsive: sidebar stacks above accordion. Reduced-motion safe (instant open, no fade-stagger).
