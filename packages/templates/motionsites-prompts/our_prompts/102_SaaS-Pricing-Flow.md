# SaaS Pricing Flow — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Pricing · hero.
> Dark glassmorphic pricing met een gigantische "Pricing" achtergrond-wordmark, drie glazen kaarten (Free / Standard / Pro), pill-nav en een Monthly/Yearly toggle.

Build a dark **`PricingFlow`** section for a SaaS brand ("Forma AI"): a floating pill nav,
an oversized faded "Pricing" wordmark behind the content, three glass cards with the middle/last
highlighted, and a monthly↔yearly switch.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#05060A` with a soft electric-blue radial glow
  bottom-left → top-right (`radial-gradient(60% 60% at 20% 80%, rgba(37,99,235,0.35), transparent)`).
- Glass cards: `bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl`,
  highlighted card gets a brighter blue edge + inner glow.
- Font Inter. Prices use a large tight weight. `print-color-adjust:exact` not needed (web).

## Helpers
- `FadeUp` (framer-motion) and `Toggle` (controlled monthly/yearly, animates a knob with `layout`).
- `Check` — small circular check icon (Material Symbols `check`, blue tint).

## Structure
```tsx
<section className="relative isolate overflow-hidden bg-[#05060A] py-20">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_80%,rgba(37,99,235,0.35),transparent)]" />

  {/* floating pill nav */}
  <nav className="relative z-10 mx-auto mb-10 flex w-fit items-center gap-6 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/80 backdrop-blur">
    <span className="font-semibold text-white">◎</span>
    <a>Home</a><a className="text-white">Pricing</a><a>FAQ</a><a>Contact</a>
    <a className="rounded-full bg-white/90 px-3 py-1 text-black">Download</a>
  </nav>

  {/* giant faded wordmark behind */}
  <h2 className="pointer-events-none absolute left-1/2 top-24 -z-0 -translate-x-1/2 select-none text-[18vw] font-bold leading-none text-white/5">Pricing</h2>

  <div className="relative z-10 mx-auto max-w-[1100px] px-6">
    <div className="mb-8 text-right text-sm text-white/60">Forma AI</div>

    {/* three cards */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {plans.map(p => (
        <FadeUp key={p.name} delay={p.i*0.1}>
          <div className={cn("flex h-full flex-col rounded-3xl border p-7 backdrop-blur-xl",
            p.featured ? "border-blue-400/40 bg-blue-500/[0.08] shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)]"
                       : "border-white/10 bg-white/[0.04]")}>
            <span className="text-xs uppercase tracking-widest text-white/50">{p.name}</span>
            <div className="mt-3 text-4xl font-semibold text-white">{p.price}<span className="text-base font-normal text-white/50">{p.suffix}</span></div>
            <p className="mt-2 text-sm text-white/55">{p.desc}</p>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-white/80">
              {p.features.map(f => <li className="flex items-center gap-2"><Check/> {f}</li>)}
            </ul>
            <button className={cn("mt-7 rounded-full py-3 text-sm font-medium",
              p.featured ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/15")}>Choose Plan</button>
          </div>
        </FadeUp>
      ))}
    </div>

    {/* monthly / yearly toggle */}
    <div className="mt-8 flex items-center gap-3 text-sm text-white/70"><Toggle/> Yearly</div>
  </div>
</section>
```

## Plans data (example, from the preview)
```ts
const plans = [
  { i:0, name:"Free",     price:"Free",    suffix:"",   desc:"For creators taking their first steps with Forma.",
    features:["Up to 3 projects in the cloud","Image export up to 1080p","Basic editing tools","Free templates and icons","Access via web and mobile app"] },
  { i:1, name:"Standard", price:"$9,99",   suffix:"/m", desc:"For freelancers and small teams who need more freedom.",
    features:["Up to 50 projects in the cloud","Export up to 4K","Advanced editing toolkit","Team collaboration (up to 5 members)","Access to premium template library"] },
  { i:2, name:"Pro",      price:"$19,99",  suffix:"/m", featured:true, desc:"For studios, agencies and professional creators.",
    features:["Unlimited projects","Export up to 8K + animations","AI-powered content generation tools","Unlimited team members","Brand customization"] },
];
```

## Motion & acceptance
- Cards fade-up with stagger (0/.1/.2); featured (Pro) card has blue edge + outer glow; hovered cards lift slightly (`whileHover y:-4`).
- Giant `Pricing` wordmark sits behind cards at `text-white/5`, `~18vw`, non-interactive.
- Floating pill nav (logo, Home/Pricing/FAQ/Contact, white "Download" pill).
- Monthly/Yearly toggle bottom-left animates its knob; switching updates the prices (optional: yearly = ~2 months free).
- Dark `#05060A` bg with blue radial glow; glass cards `backdrop-blur-xl`; check-listed features. Responsive 1→3 cols. Reduced-motion safe.
```
