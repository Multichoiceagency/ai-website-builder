# FinancialFocus — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Hero · hero.

Build a dark fintech **`FinancialFocusHero`** for a bank brand ("wavebank"): a top nav with a
script logo + "Order Card" + hamburger, a giant ghost "wave" wordmark behind everything, several
photoreal floating credit cards arranged diagonally, and a bottom-left headline with mixed weights.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0A0A0B` (radial vignette darker at edges).
- Key colors from the image: white text `#FFFFFF`, a bright lime-green script accent `#7CFC4D`
  on "Get More", muted grey body `#9A9A9E`, the giant background wordmark in barely-there grey
  `rgba(255,255,255,0.04)`. Cards are photoreal (orange, blue→purple, frosted white) with chip + glints.
- Typeface: a flowing **script** for the logo + "Get More" accent (`font-["Caveat"]`/cursive),
  bold sans (Inter) for the main headline. Max width full-bleed; content padded `px-8`.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:24}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.8, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `FloatCard` — each card bobs + tilts slightly: `animate={{y:[0,-12,0], rotate:[r, r+1.5, r]}}`,
  `transition={{duration:7+i, repeat:Infinity, ease:"easeInOut"}}`.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
  {/* NAV */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <span className="font-['cursive'] text-2xl"><span className="italic">wave</span>bank</span>
    <div className="flex items-center gap-3">
      <a className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-white/90">Order Card</a>
      <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white">☰</button>
    </div>
  </header>

  {/* giant ghost wordmark behind everything */}
  <span className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 select-none font-['cursive'] text-[28vw] leading-none text-white/[0.04]">
    wave
  </span>

  {/* diagonal stack of floating cards */}
  <div className="pointer-events-none absolute inset-0 z-10">
    {cards.map((c, i) => (
      <FloatCard key={c.id} i={i} className={c.pos}>
        <div className={cn("h-44 w-72 rounded-2xl p-5 shadow-2xl", c.bg)}>
          <div className="flex h-full flex-col justify-between">
            <div className="font-['cursive'] text-lg">{c.brand}</div>
            <div>
              <div className="mb-1 h-6 w-9 rounded bg-white/30" /> {/* chip */}
              <p className="font-mono text-sm tracking-widest">{c.num}</p>
              <p className="font-mono text-[10px] tracking-wider text-white/70">{c.holder} · CVV: {c.cvv}</p>
            </div>
          </div>
        </div>
      </FloatCard>
    ))}
  </div>

  {/* bottom-left headline */}
  <div className="absolute bottom-10 left-8 z-20 max-w-lg">
    <FadeUp>
      <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
        <span className="font-['cursive'] text-[#7CFC4D]">Get More</span> With<br/>
        Our Bank Cards – Easy<br/>Secure, Rewarding
      </h1>
    </FadeUp>
    <FadeUp delay={0.15}>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
        Experience effortless banking with our cards that offer security, simplicity,
        and exciting rewards tailored for you.
      </p>
    </FadeUp>
  </div>

  {/* small brand sign bottom-right */}
  <div className="absolute bottom-8 right-8 z-20 flex items-end gap-3 text-right">
    <span className="font-['cursive'] text-3xl">w.</span>
    <p className="max-w-[180px] text-[11px] uppercase tracking-wide text-white/50">
      A bank is a trusted partner in your financial journey and growth.
    </p>
  </div>
</section>
```

## Cards data (from the preview)
```ts
const cards = [
  { id:1, brand:"",          num:"4154 7831 9984 5124", holder:"SOPHIA MARTINEZ", cvv:"189",
    bg:"bg-gradient-to-br from-orange-500 to-amber-700", pos:"absolute left-1/2 top-0 -translate-x-1/2 rotate-[-3deg]" },
  { id:2, brand:"",          num:"4232 8908 1121 4892", holder:"ZACHARY MERCER",  cvv:"382",
    bg:"bg-gradient-to-br from-zinc-700 to-zinc-900",    pos:"absolute left-[44%] top-16 rotate-[2deg]" },
  { id:3, brand:"wavebank",  num:"",                     holder:"",               cvv:"",
    bg:"bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-900", pos:"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] scale-110" },
  { id:4, brand:"",          num:"5563 8847 1023 7468", holder:"EMILY ROBINSON",  cvv:"205",
    bg:"bg-gradient-to-br from-slate-200 to-slate-400 text-black", pos:"absolute left-[42%] bottom-24 rotate-[3deg]" },
];
```

## Motion & acceptance
- Cards float + tilt independently via `FloatCard` (unique durations) so the diagonal stack feels alive.
- The center wavebank card is the hero card (larger, `scale-110`) with a glowing radial flare on its face.
- Headline + sub fade up bottom-left (delays 0 / .15); giant "wave" wordmark stays faint and static behind.
- Respect `prefers-reduced-motion`: disable float/tilt, keep static positions + opacity fades.
- Acceptance checklist:
  - Near-black full-viewport hero; nav with script "wavebank" logo, white "Order Card" pill, hamburger.
  - Giant barely-visible "wave" ghost wordmark centered behind the content.
  - 3–4 photoreal floating credit cards in a diagonal stack (orange, dark, center blue→purple hero, frosted white), each with chip + masked number + holder/CVV.
  - Bottom-left headline mixing lime-green script "Get More" with bold white sans; muted sub-copy beneath.
  - Small bottom-right brand sign ("w." + tagline). Responsive: cards reduce/restack on mobile.
