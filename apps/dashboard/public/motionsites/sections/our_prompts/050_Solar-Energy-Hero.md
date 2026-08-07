# Solar Energy Hero — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a full-bleed photographic **`SolarEnergyHero`** for a clean-energy brand ("reposit"):
a sun-lit suburban house with rooftop solar panels behind a transparent top nav, a huge
two-line headline, and a floating Morning/Night toggle pill near the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Full-viewport section (`min-h-screen`), background = a warm daytime photo of a modern house
  with solar panels (`/assets/solar-house.jpg`) `object-cover`; soft hazy/foggy edges.
- Light/airy theme. Key colors read from the image: near-white text `#FFFFFF` on the photo,
  a black pill CTA `#0B0B0C`, dark nav text `#1A1A1A`, muted warm-grey haze.
- Typeface: Inter / system sans, semi-bold for the headline; nav in medium ~13px.
- Add a subtle top gradient `from-white/10 via-transparent to-black/15` so nav + caption stay legible.

## Helpers
- `FadeUp` — `framer-motion` wrapper: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `SegToggle` — controlled 2-option pill (Morning / Night) with a `layoutId` knob that slides
  between segments and updates a `mode` state.

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden">
  <img src="/assets/solar-house.jpg" className="absolute inset-0 h-full w-full object-cover" alt="" />
  <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />

  {/* NAV — transparent over the photo */}
  <header className="relative z-10 flex items-center justify-between px-7 py-5">
    <div className="flex items-center gap-2 text-lg font-semibold text-[#101010]">
      <span>⚡</span> reposit
    </div>
    <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#1A1A1A] md:flex">
      {nav.map(n => <a key={n} href="#" className="transition hover:opacity-60">{n}</a>)}
    </nav>
    <a className="rounded-full bg-[#0B0B0C] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-black/80">
      Get an Instant Quote
    </a>
  </header>

  {/* headline block — centered, high up */}
  <div className="relative z-10 mx-auto max-w-4xl px-6 pt-[7vh] text-center">
    <FadeUp>
      <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-white drop-shadow-md sm:text-6xl md:text-7xl">
        $0 Electricity Bills<br/>
        <span className="text-white/90">for the next</span> 7 years
      </h1>
    </FadeUp>
  </div>

  {/* floating segmented toggle near the bottom */}
  <FadeUp delay={0.3}>
    <div className="absolute bottom-[14%] left-1/2 z-10 -translate-x-1/2">
      <SegToggle
        options={[
          { id:"morning", label:"Morning", sub:"$0 for Electricity" },
          { id:"night",   label:"Night",   sub:"$0 for Electricity" },
        ]}
      />
    </div>
  </FadeUp>

  {/* footer caption */}
  <FadeUp delay={0.45}>
    <p className="absolute bottom-5 left-1/2 z-10 w-full max-w-xl -translate-x-1/2 px-6 text-center text-sm text-white/85 drop-shadow">
      Forget the energy market, weather conditions and seasons; our Smart Controller
      guarantees you get no electricity bill for seven years.
    </p>
  </FadeUp>
</section>
```

## Nav & toggle data (from the preview)
```ts
const nav = ["How It Works", "Our Cases", "About Us", "Careers", "Resources", "Customers"];

// SegToggle renders a frosted white pill with two segments:
// each segment shows a bold label (Morning / Night) + tiny grey sub "$0 for Electricity".
// Active segment background = solid white card; knob slides via layoutId="segKnob".
```

## SegToggle sketch
```tsx
function SegToggle({ options }: { options: {id:string;label:string;sub:string}[] }) {
  const [mode, setMode] = useState(options[0].id);
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white/15 p-1.5 backdrop-blur-md">
      {options.map(o => (
        <button key={o.id} onClick={() => setMode(o.id)}
          className="relative rounded-xl px-7 py-3 text-center">
          {mode === o.id && (
            <motion.span layoutId="segKnob"
              className="absolute inset-0 rounded-xl bg-white shadow-lg" />
          )}
          <span className={cn("relative block text-sm font-semibold",
            mode === o.id ? "text-[#101010]" : "text-white")}>{o.label}</span>
          <span className={cn("relative block text-[11px]",
            mode === o.id ? "text-black/45" : "text-white/70")}>{o.sub}</span>
        </button>
      ))}
    </div>
  );
}
```

## Motion & acceptance
- Headline fades up first; toggle and caption follow with a small stagger (delays 0 / .3 / .45).
- SegToggle knob animates between Morning/Night via `layoutId` (spring); a faint cursor hint can sit over "Night".
- Background photo may do a very slow `scale:[1,1.04,1]` over ~30s for a living feel (optional).
- Respect `prefers-reduced-motion`: disable scale + spring, keep instant toggle and opacity fade only.
- Acceptance checklist:
  - Full-viewport photographic hero of a house with rooftop solar panels, hazy edges.
  - Transparent nav: ⚡ "reposit" logo left, 6 dark links centre, black "Get an Instant Quote" pill right.
  - Big two-line headline "$0 Electricity Bills / for the next 7 years" in white, drop-shadowed.
  - Frosted white Morning/Night segmented toggle floating low-centre, knob slides on click.
  - Small white caption line pinned at the very bottom. Responsive: nav links collapse on mobile.
