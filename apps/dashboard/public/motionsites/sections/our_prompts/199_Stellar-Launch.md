# Stellar Launch — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Landing Page · hero.
> Editorial awards-style landing: een licht 3D chrome/liquid-metal hero met centrale nav, grote donkerblauwe headline "launchex prizes" + uppercase subtekst, en eronder een lichtgrijze sectie-aankondiging "SUBMISSIONS" met scroll-cue en 01 / 05 pager.

Build a refined, editorial **`StellarLaunch`** landing for an awards/prizes program ("launchex"):
a top hero filled with a glossy 3D liquid-chrome render (centered text-nav, big two-line headline,
uppercase tagline) flowing into a light-grey section header band ("SUBMISSIONS") with a "scroll to
discover" cue on the left and a "01 — 05" pager on the right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/editorial theme. Hero background = a glossy chrome/liquid-metal 3D render
  (`/assets/chrome-swoosh.jpg`, `object-cover`) — cool silvers + a warm copper streak; the lower band is `#ECECEA`.
- Colors I see: deep navy/ink `#1B2A3A` for headline + "SUBMISSIONS", muted grey `text-slate-500`
  for tagline/labels, white-ish nav over the bright chrome. No saturated brand color — it's metallic + ink.
- Fonts: a heavy condensed grotesque for "launchex prizes" + "SUBMISSIONS" (`font-extrabold tracking-tight`),
  Inter for nav + small uppercase labels. Max width `max-w-[1200px]`.

## Helpers
- `FadeUp` — framer-motion stagger wrapper.
- `CenterNav` — centered horizontal text nav over the hero.
- `Pager` — small "01 — 05" counter; `ScrollCue` — "SCROLL TO DISCOVER" label bottom-left.

## Structure
```tsx
<>
  {/* HERO over chrome render */}
  <section className="relative h-[78vh] overflow-hidden rounded-b-[16px]">
    <img src="/assets/chrome-swoosh.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />

    <CenterNav className="relative z-10 mx-auto flex w-fit gap-7 rounded-b-xl bg-white/70 px-6 py-3 text-xs uppercase tracking-widest text-[#1B2A3A] backdrop-blur">
      <a>About</a><a>Submissions</a><a>Venue</a><a>Judges</a><a>Connect</a>
    </CenterNav>

    <div className="relative z-10 mx-auto mt-12 max-w-[1200px] px-6 text-center">
      <FadeUp>
        <h1 className="font-sans text-6xl font-extrabold leading-[0.95] tracking-tight text-[#1B2A3A] md:text-7xl">
          launchex<br/>prizes
        </h1>
      </FadeUp>
      <FadeUp delay={0.15}>
        <p className="mx-auto mt-5 max-w-md text-xs uppercase tracking-[0.2em] text-slate-600">
          Bridging visions with reality, helping ventures soar up to the stars
        </p>
      </FadeUp>
    </div>
  </section>

  {/* SECTION HEADER BAND */}
  <section className="bg-[#ECECEA] px-6 py-14 text-[#1B2A3A]">
    <div className="mx-auto max-w-[1200px] text-center">
      <FadeUp><p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">[ Submissions ]</p></FadeUp>
      <FadeUp delay={0.1}><h2 className="mt-2 text-5xl font-extrabold tracking-tight md:text-6xl">SUBMISSIONS</h2></FadeUp>
      <div className="mt-8 flex items-center justify-between text-[11px] uppercase tracking-widest text-slate-500">
        <ScrollCue>Scroll to discover</ScrollCue>
        <Pager current="01" total="05" />
      </div>
    </div>
  </section>
</>
```

## Nav + meta data (example, from the preview)
```ts
const nav = ["About","Submissions","Venue","Judges","Connect"];
const tagline = "Bridging visions with reality, helping ventures soar up to the stars";
const pager = { current: "01", total: "05" };
```

## Motion & acceptance
- Hero filled by a glossy liquid-chrome/metal 3D render (cool silver with a warm copper streak); centered translucent text-nav over it.
- Big navy two-line headline "launchex / prizes" (heavy condensed grotesque) with a small uppercase tagline beneath, centered.
- Below, a light-grey band repeats the section name: "[ SUBMISSIONS ]" eyebrow + huge "SUBMISSIONS" wordmark, with "SCROLL TO DISCOVER" bottom-left and a "01 — 05" pager bottom-right.
- Headline + tagline stagger-fade-up; the section band fades in on scroll; the chrome render can drift/parallax slowly on scroll.
- Reduced-motion: no parallax/translate, opacity-only entrance. On mobile the headline shrinks and the band labels stack.
