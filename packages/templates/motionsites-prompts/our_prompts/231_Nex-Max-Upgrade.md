# Nex Max Upgrade — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Pricing · pricing.

Build a dark **`NexMaxUpgrade`** pricing section: a near-black canvas with a soft blue→amber sunrise glow in the
bottom-right corner, a centered headline ("Power up with Nex Max") + subline, two pricing cards (Base $0 vs.
highlighted Max $25/month with "MAX" + "14-day sample run" badges and a checklist), a centered white "Download Nex
to start" pill, and a fine-print usage-policy footnote.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0C0D0F` with a corner glow bottom-right
  `bg-[radial-gradient(70%_80%_at_100%_120%,#3A6BFF_0%,#9A86FF_25%,#E8A24A_45%,transparent_70%)]`.
- Key colors seen: black `#0C0D0F`, card surface `#16171A` / highlighted `#1B1C20`, hairline `#FFFFFF14`,
  heading near-white `#E8E8EA`, muted body `#9A9AA0`, price white, glow blue `#3A6BFF` + amber `#E8A24A`,
  download pill white `#FFFFFF`.
- Font Inter; headline `text-3xl` light; prices large tight (`text-5xl font-semibold`); checklist `text-sm`.
- Max content width `max-w-3xl`; cards `rounded-2xl border`; section `py-20` centered.

## Helpers
- `FadeUp` (framer-motion) for headline, cards, CTA.
- `PlanCard` — rounded card; the Max card gets a brighter surface + badges; renders a `✓`-prefixed feature list.
- `Badge` — small rounded chip ("MAX", "14-day sample run").
- `Check` — inline checkmark glyph before each feature line.

## Structure
```tsx
<section className="relative isolate overflow-hidden bg-[#0C0D0F] py-20 text-white">
  {/* corner sunrise glow */}
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_100%_120%,#3A6BFF_0%,#9A86FF_25%,#E8A24A_45%,transparent_70%)] opacity-90" />

  <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
    <FadeUp>
      <h2 className="text-3xl font-light text-[#E8E8EA] md:text-4xl">Power up with <span className="text-white">Nex Max</span></h2>
      <p className="mt-3 text-sm text-white/55">Access more tools with a single bundle.</p>
    </FadeUp>

    {/* two pricing cards */}
    <div className="mt-12 grid grid-cols-1 gap-5 text-left md:grid-cols-2">
      {/* Base */}
      <FadeUp>
        <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#16171A] p-7">
          <span className="text-sm text-white/55">Base</span>
          <div className="mt-3 text-5xl font-semibold text-white">$0</div>
          <p className="mt-6 text-sm font-medium text-white/85">Contains</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-white/70">
            <li className="flex items-center gap-2"><Check/> Talk with your tabs</li>
            <li className="flex items-center gap-2"><Check/> Custom Macros</li>
            <li className="flex items-center gap-2"><Check/> An elite web-based tool</li>
          </ul>
        </div>
      </FadeUp>

      {/* Max (highlighted) */}
      <FadeUp delay={0.1}>
        <div className="flex h-full flex-col rounded-2xl border border-white/15 bg-[#1B1C20] p-7 shadow-[0_0_60px_-20px_rgba(58,107,255,0.5)]">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-black">MAX</span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">14-day sample run</span>
          </div>
          <div className="mt-4 text-5xl font-semibold text-white">$25<span className="ml-1 text-sm font-normal text-white/55">a month</span></div>
          <p className="mt-6 text-sm font-medium text-white/85">Has all the tools from Base, plus</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-white/70">
            <li className="flex items-center gap-2"><Check/> Nex unlocked. Chat as much as you want, without meeting limits.*</li>
          </ul>
        </div>
      </FadeUp>
    </div>

    {/* download CTA */}
    <FadeUp delay={0.2}>
      <button className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black">
        ✦ Download Nex to start
      </button>
      <p className="mt-4 text-xs text-white/40">* if your usage aligns with our <a className="underline">Usage Policy</a>, naturally.</p>
    </FadeUp>
  </div>
</section>
```

## Plans data (example, from the preview)
```ts
const plans = [
  { name:"Base", price:"$0", suffix:"", heading:"Contains",
    features:["Talk with your tabs","Custom Macros","An elite web-based tool"] },
  { name:"Max", price:"$25", suffix:"a month", featured:true,
    badges:["MAX","14-day sample run"], heading:"Has all the tools from Base, plus",
    features:["Nex unlocked. Chat as much as you want, without meeting limits.*"] },
];
const footnote = "if your usage aligns with our Usage Policy, naturally.";
```

## Motion & acceptance
- Headline, cards and CTA fade-up with stagger (0/.1/.2); the Max card has a blue outer glow; cards `whileHover y:-3`.
- Corner sunrise glow (blue→lilac→amber) sits bottom-right behind the content; non-interactive.
- Acceptance checklist:
  - [ ] Near-black `#0C0D0F` canvas with a blue→amber radial sunrise glow in the bottom-right corner.
  - [ ] Centered light headline "Power up with Nex Max" + "Access more tools with a single bundle." subline.
  - [ ] Two pricing cards: Base ($0, "Contains" + 3 features) and highlighted Max ($25 a month, "MAX" + "14-day sample run" badges).
  - [ ] Max card checklist line about unlocked chat without meeting limits, plus a glow/brighter surface.
  - [ ] Centered white "✦ Download Nex to start" pill + small Usage-Policy footnote with underlined link.
  - [ ] `prefers-reduced-motion`: disable lift/fade-up, keep static layout (glow stays as static gradient).
