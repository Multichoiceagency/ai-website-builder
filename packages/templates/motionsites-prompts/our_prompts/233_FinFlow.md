# FinFlow — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Fintech · hero.
> Light fintech hero ("Fenvex") with a pill nav, a centered big headline + sub + dual CTAs, a soft monochrome wireframe globe rising from the bottom and a faint payment-logo strip (Stripe / Visa / Apple Pay / Mastercard / PayPal).

Build a bright **`FinFlowHero`** section: a near-white background, a floating pill nav with auth
buttons, a centered bold headline + subtitle + two CTAs, a large low-contrast 3D wireframe globe
emerging from the bottom, and a thin payment-method logo bar at the very bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = soft white `#EFEFEF` with a faint radial lift behind the headline.
- Globe = a monochrome dotted/wireframe sphere (`/assets/globe-wire.png`), large (~58vw), anchored
  to the bottom and partially cropped, with tiny white sparkles on the surface.
- Typeface: clean grotesque (Inter/Geist). Headline bold near-black `#161616 font-semibold tracking-tight`;
  sub muted `#6A6A6A`.
- CTAs: primary dark pill `bg-[#141414] text-white`, secondary outline pill `border border-black/15`.
- Payment bar = greyscale brand logos at low opacity in a thin pill/row.

## Helpers
- `FadeUp` — framer-motion opacity+y wrapper for nav, headline, sub, CTAs.
- `SpinGlobe` — extremely slow infinite rotation/drift on the wireframe globe (`rotate` 90s linear,
  or `y:[0,-8,0]` drift if rotation feels heavy).
- `Sparkle` — a few twinkling dots over the globe (`opacity:[0.2,1,0.2]`, random delays).

## Structure
```tsx
<section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#EFEFEF]">
  {/* soft radial lift behind headline */}
  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(255,255,255,0.7),transparent)]" />

  {/* NAV: brand left, pill links center, auth right */}
  <header className="relative z-20 flex items-center justify-between px-8 py-6">
    <span className="text-sm font-semibold text-[#161616]">Fenvex</span>
    <nav className="hidden items-center gap-7 rounded-full bg-white/70 px-6 py-2 text-sm text-[#444] backdrop-blur md:flex">
      {["Platform","Tutorials","Compare","Solutions"].map(l => <a key={l} className="hover:text-black">{l}</a>)}
    </nav>
    <div className="flex items-center gap-3 text-sm">
      <button className="rounded-full border border-black/15 px-4 py-1.5">Log in</button>
      <button className="rounded-full bg-[#141414] px-4 py-1.5 text-white">Sign up</button>
    </div>
  </header>

  {/* centered headline block */}
  <div className="relative z-10 mx-auto mt-[6vh] max-w-2xl px-6 text-center">
    <FadeUp>
      <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#161616] sm:text-5xl md:text-6xl">
        Discover a faster path to financial flow
      </h1>
    </FadeUp>
    <FadeUp delay={0.1}>
      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#6A6A6A]">
        Tap the Fenvex platform to craft payment experiences that are fast, trusted, and effortless.
      </p>
    </FadeUp>
    <FadeUp delay={0.2}>
      <div className="mt-7 flex justify-center gap-3">
        <button className="rounded-full bg-[#141414] px-6 py-3 text-sm text-white">Start building</button>
        <button className="rounded-full border border-black/15 px-6 py-3 text-sm text-[#222]">Reach our team</button>
      </div>
    </FadeUp>
  </div>

  {/* wireframe globe rising from the bottom */}
  <SpinGlobe className="pointer-events-none absolute -bottom-[18vw] left-1/2 z-0 -translate-x-1/2">
    <img src="/assets/globe-wire.png" alt="" className="h-[58vw] w-[58vw] opacity-90" />
    <Sparkle /><Sparkle /><Sparkle />
  </SpinGlobe>

  {/* payment logo bar */}
  <div className="relative z-10 mt-auto flex items-center justify-center gap-10 px-8 pb-7 opacity-70">
    {payments.map(p => <span key={p} className="text-sm font-medium text-[#555]">{p}</span>)}
  </div>
</section>
```

## Nav & payments data (example, from the preview)
```ts
const nav      = ["Platform", "Tutorials", "Compare", "Solutions"];
const payments = ["Stripe", "VISA", "Apple Pay", "Mastercard", "PayPal"];
```

## Motion & acceptance
- Nav, headline, sub and CTAs fade-up with stagger (0 / .1 / .2).
- Wireframe globe rotates/drifts very slowly (`SpinGlobe`) with a few twinkling `Sparkle` dots;
  optional gentle `scale:[1,1.03,1]` breathing.
- Near-white bg with a soft radial lift behind the centered "Discover a faster path to financial
  flow" headline + Fenvex subtitle + dark "Start building" / outline "Reach our team" CTAs.
- Pill nav (Platform / Tutorials / Compare / Solutions) with "Log in" outline + "Sign up" dark pill.
- Low-contrast dotted globe cropped at the bottom; thin greyscale payment-logo strip
  (Stripe / Visa / Apple Pay / Mastercard / PayPal) at the very bottom.
- Respect `prefers-reduced-motion` (freeze globe + sparkles, opacity-only). Responsive: nav center
  links hide on mobile, headline scales, globe stays bottom-centered.
```
