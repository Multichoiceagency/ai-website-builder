# Halo Benefits — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Why Us · features.

Build a soft, light **`HaloBenefits`** section for a crypto product ("USD Halo"): a pale grey
stage, a left intro block ("Meet USD Halo." + dark pill "Discover it →") with a right paragraph,
a row of three benefit cards (one wide lavender card with a 3D mushroom/coin render, two dark
purple cards), and a muted "Funded by premier partners" logo strip at the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Light theme. Background = pale grey `#E7E7E9`.
- Cards: a wide **soft-lavender `#C9BFE6`/`#D8CFEC`** card holding a glossy 3D render (purple
  mushroom + coin), plus two **deep aubergine `#2E2640`** cards with light text.
- Text: headings ink `#1B1B22`; the dark cards use `text-white` heading + `text-white/60` body.
- Primary CTA = dark pill `bg-[#2A2233] text-white rounded-full`. Font Inter; section `max-w-6xl`.

## Helpers
- `FadeUp` (framer-motion, opacity+y) for the intro and each card (staggered).
- `Float` — gentle vertical bob on the 3D render: `animate={{y:[0,-8,0]}}`, `transition={{duration:6,repeat:Infinity}}`.
- `LogoRow` — greyscale partner logos at low opacity, evenly spaced.

## Structure
```tsx
<section className="bg-[#E7E7E9] px-6 py-20 text-[#1B1B22]">
  <div className="mx-auto max-w-6xl">
    {/* intro: left title + CTA, right paragraph */}
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <FadeUp>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Meet USD Halo.</h2>
        <a className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2A2233] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f1928]">
          Discover it <span className="rounded-full bg-white/20 p-1" aria-hidden>→</span>
        </a>
      </FadeUp>
      <FadeUp delay={0.1}>
        <p className="self-center text-lg leading-relaxed text-zinc-600">
          USD Halo is a reward-earning dollar coin that lets your savings grow while remaining
          tied to the U.S. dollar.
        </p>
      </FadeUp>
    </div>

    {/* three benefit cards */}
    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* wide lavender card with 3D render */}
      <FadeUp delay={0.15}>
        <article className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#D8CFEC] to-[#C3B4E6] p-6">
          <h3 className="text-lg font-semibold text-[#2A2233]">Savings that bloom</h3>
          <Float className="pointer-events-none absolute right-4 top-4 h-40 w-40">
            <img src="/assets/usd-halo-3d.png" alt="" className="h-full w-full object-contain drop-shadow-xl" />
          </Float>
          <p className="max-w-xs text-sm text-[#3a3350]">
            Gain steady returns as your dollar tokens are routed into top-performing DeFi strategies.
          </p>
        </article>
      </FadeUp>

      {/* two dark cards stacked into the second column */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {darkCards.map((c, i) => (
          <FadeUp key={c.title} delay={0.2 + i * 0.08}>
            <article className="flex h-full min-h-[260px] flex-col justify-between rounded-2xl bg-[#2E2640] p-6 text-white">
              <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
              <p className="text-sm text-white/60">{c.body}</p>
            </article>
          </FadeUp>
        ))}
      </div>
    </div>

    {/* partner logo strip */}
    <div className="mt-12 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-zinc-500">Funded by premier partners<br />and forward-thinking leaders.</p>
      <LogoRow logos={partners} className="flex flex-wrap items-center gap-8 opacity-50 grayscale" />
    </div>
  </div>
</section>
```

## Cards / partners data (example, from the preview)
```ts
const intro = {
  title: "Meet USD Halo.",
  cta: "Discover it",
  paragraph: "USD Halo is a reward-earning dollar coin that lets your savings grow while remaining tied to the U.S. dollar.",
};
const lavenderCard = { title: "Savings that bloom", body: "Gain steady returns as your dollar tokens are routed into top-performing DeFi strategies." };
const darkCards = [
  { title: "Always fluid, always pegged.", body: "Keep fully dollar-anchored with on-demand access to funds — no lockups or waits." },
  { title: "Fully automated",              body: "Skip the task of tuning positions yourself. USD Halo runs in the background for you." },
];
const partners = ["KUCOIN", "HBC", "NxGen", "Matter Labs", "DEXTOOLS", "NGRAVE", "Polychain"];
```

## Motion & acceptance
- Intro + cards `FadeUp` with stagger; the 3D render gently `Float`s; cards hover-lift (`whileHover y:-3`).
- "Discover it →" is a dark pill with a small circular arrow badge; lavender card uses a soft gradient.
- Partner logos render greyscale at ~50% opacity in a single row.
- Respect `prefers-reduced-motion`: stop the float, keep static fades.
- Acceptance checklist:
  - Pale-grey stage; left "Meet USD Halo." + dark pill "Discover it →", right intro paragraph.
  - Row of three benefit cards: wide soft-lavender card ("Savings that bloom") with a glossy 3D purple mushroom/coin render, plus two deep-aubergine cards ("Always fluid, always pegged." / "Fully automated").
  - Dark cards use white headings + muted white body text; rounded corners, even gaps.
  - Bottom: "Funded by premier partners…" label + greyscale partner logo strip (KuCoin, HBC, NxGen, Matter Labs, DEXTools, NGRAVE, Polychain); reduced-motion safe.
