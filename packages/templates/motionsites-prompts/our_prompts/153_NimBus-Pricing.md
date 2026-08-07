# NimBus Pricing — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Pricing · hero.
> Donkere cloud-storage pricing ("Nimbus Grid"): een groot links-uitgelijnd statement met sub-tekst, een rechts-uitgelijnde mono prijslijst met hairline-rijen, drie plan-kolommen met outline-knoppen, en een rij van goudgele "datacenter"-blokken die onderaan opdoemen.

Build a dark **`NimbusPricing`** section for a cloud-storage brand ("Nimbus Grid"): a bold left
headline + paragraph, a right-aligned monospaced price list with per-row hairlines, a 3-column
plan row (Starter / Team / Enterprise) with pill outline CTAs, and a bottom skyline of glowing
gold storage blocks.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = warm near-black `#161410`; text near-white `#EFEDE8`, muted `#9C988E`.
- Hairlines `border-white/10`. Price values in `font-mono`, right-aligned.
- Key accent: warm gold/amber `#C9A86A` for the bottom block "skyline" and subtle button edges.
- Font: bold sans for the headline, mono for the price ledger, small sans for plan copy.
- Max width `max-w-6xl`.

## Helpers
- `FadeUp` (framer-motion) reveal wrapper.
- `PriceRow` — `{label, price}` flex row: left label, right mono price, bottom hairline.
- `PlanCol` — `{name, desc, cta}` block with title, grey description, pill outline button.
- `SkylineBlocks` — bottom row of rounded gold rectangles at varying heights with a soft glow.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#161410] text-[#EFEDE8]">
  <div className="mx-auto max-w-6xl px-8 pt-16">
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
      {/* left: headline + paragraph */}
      <FadeUp>
        <div>
          <h2 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            cloud storage<br/>your teams<br/>actually use.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#9C988E]">
            Scale capacity up for active projects and cool it down when workspaces go quiet.
            Nimbus Grid keeps storage, transfer, and policy costs visible before they become invoices.
          </p>
        </div>
      </FadeUp>

      {/* right: mono price ledger */}
      <FadeUp delay={0.15}>
        <div className="font-mono text-sm">
          {priceRows.map(r => (
            <div key={r.label} className="flex items-center justify-between border-b border-white/10 py-4">
              <span className="text-[#CFCBC2]">{r.label}</span>
              <span className="text-[#EFEDE8]">{r.price}</span>
            </div>
          ))}
        </div>
      </FadeUp>
    </div>

    {/* plan columns */}
    <div className="mt-20 grid grid-cols-1 gap-10 md:grid-cols-3">
      {plans.map((p,i) => (
        <FadeUp key={p.name} delay={0.1*i}>
          <div>
            <h3 className="text-xl font-medium">{p.name}</h3>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#9C988E]">{p.desc}</p>
            <button className="mt-5 rounded-full border border-white/25 px-5 py-2 text-[10px] uppercase tracking-[0.18em] text-[#EFEDE8] transition hover:border-[#C9A86A] hover:text-[#C9A86A]">{p.cta}</button>
          </div>
        </FadeUp>
      ))}
    </div>
  </div>

  {/* bottom glowing gold skyline */}
  <SkylineBlocks className="mt-16 h-24" />
</section>
```

## Data (example, from the preview)
```ts
const priceRows = [
  { label:"Warm collaboration tier", price:"$0.012 / GiB / month" },
  { label:"Cold retained archive",   price:"$0.004 / GiB / month" },
  { label:"Regional accelerated transfer", price:"$0.018 / GiB moved" },
  { label:"Customer-managed key vault",    price:"included" },
];

const plans = [
  { name:"Starter",    desc:"For small teams consolidating shared project files.",         cta:"Start Small" },
  { name:"Team",       desc:"For departments scaling collaboration and regional transfer.", cta:"Build Team Plan" },
  { name:"Enterprise", desc:"For organizations prioritizing governance, residency, and support.", cta:"Talk to Sales" },
];
```

## Motion & acceptance
- Headline + ledger fade-up (0/.15); price rows can stagger their hairlines drawing in.
- Plan columns stagger (0/.1/.2); bottom skyline blocks rise from below with a subtle staggered `y`, gold glow breathing.
- Acceptance checklist:
  - Warm near-black `#161410` background; bold left headline "cloud storage / your teams / actually use." + grey paragraph.
  - Right-aligned monospaced price ledger with 4 hairline rows (Warm collaboration tier $0.012… / Cold retained archive $0.004… / Regional accelerated transfer $0.018… / Customer-managed key vault included).
  - 3 plan columns (Starter / Team / Enterprise) each with grey description + pill outline CTA (Start Small / Build Team Plan / Talk to Sales).
  - Bottom row of glowing gold rounded "datacenter" blocks at varying heights.
  - Responsive: two-column top stacks, plans stack. Reduced-motion safe (kill rise/glow, keep fades).
