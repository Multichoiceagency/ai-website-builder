# Evergreen Finance — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Fintech · hero.

Build a warm, premium **`EvergreenFinanceLanding`** fintech page: a cream/peach theme with a serif hero over a
photoreal rocky bonsai landscape, three floating glassy app-stat cards overlapping the photo, a testimonial band
with a line-drawn portrait, and a "Designed to sharpen every decision" feature-card row at the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/warm theme. Background = soft peach cream `#F6E7DA` with section bands in `#F6E7DA`/`#FBF1E8`.
- Hero photo = a misty rocky landscape with pine/bonsai trees (`/assets/evergreen-rocks.jpg`, `object-cover`).
- Key colors seen: cream `#F6E7DA`, ink serif `#1C1B19`, growth green `#3E9B5F`/`#1F7A45`, alert orange `#E07A2C`,
  bill-pay black bar `#16140F`, chart greys `#D8D2C8`, dark CTA `#16140F`.
- Fonts: a serif display for headlines/section titles (e.g. `font-["Spectral"]`/serif), Inter for body & cards.
- Max content width `max-w-6xl`; rounded app cards `rounded-2xl shadow-xl`.

## Helpers
- `FadeUp` (framer-motion) for headline, cards, sections.
- `Float` — gentle stagger-offset bob on the three stat cards (`y:[0,-8,0]`, differing durations 7/9/8s).
- `StatCard` — white glassy card with mini line/bar chart, %-delta chip, month axis.
- `MiniSpark`/`MiniBars` — tiny SVG sparkline / bar set for the cards.

## Structure
```tsx
<main className="bg-[#F6E7DA] text-[#1C1B19]">
  {/* NAV */}
  <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
    <span className="text-lg font-semibold">Kova</span>
    <nav className="hidden gap-8 text-sm md:flex"><a>Explore</a><a className="underline">Pricing</a><a>Perks</a><a>Reach</a></nav>
    <button className="rounded-full bg-[#16140F] px-4 py-2 text-sm text-white">Get Started</button>
  </header>

  {/* HERO over photo */}
  <section className="relative mx-auto max-w-6xl px-6">
    <FadeUp className="pt-6 text-center">
      <h1 className="font-serif text-4xl leading-tight md:text-6xl">Own your money and build the<br/>wealth you deserve</h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-[#1C1B19]/70">Step into a smarter way to bank, right from your pocket. Kova gives you instant control over your money, wherever you are.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button className="rounded-full bg-white px-5 py-2.5 text-sm shadow">▶ Watch 30s Demo</button>
        <button className="rounded-full bg-[#16140F] px-5 py-2.5 text-sm text-white">Get the App ⤓</button>
      </div>
    </FadeUp>

    {/* photo band with overlapping stat cards */}
    <div className="relative mt-10">
      <img src="/assets/evergreen-rocks.jpg" alt="" className="h-[320px] w-full rounded-2xl object-cover" />
      <div className="absolute inset-x-0 -bottom-12 mx-auto grid max-w-4xl grid-cols-1 gap-4 px-6 md:grid-cols-3">
        {stats.map((s, i) => <Float key={s.title} delay={i*0.1}><StatCard {...s} /></Float>)}
      </div>
    </div>
  </section>

  {/* TESTIMONIAL band */}
  <section className="mx-auto mt-28 grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2">
    <FadeUp>
      <h2 className="font-serif text-2xl">Trusted by ambitious, fast-moving teams</h2>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium"><span className="rounded bg-[#16140F] px-2 py-0.5 text-white">A</span> Arcvex</div>
      <p className="mt-4 max-w-md text-sm leading-relaxed">"With Kova, I have full visibility into our team's spending in real time. It feels like having a sharp financial advisor available at every hour, helping us stay on budget and make wiser calls."</p>
      <p className="mt-4 text-sm font-semibold">Maya Reeves <span className="block font-normal text-[#1C1B19]/60">Director, Arcvex</span></p>
      <button className="mt-5 rounded-full bg-[#16140F] px-4 py-2 text-sm text-white">All Stories →</button>
    </FadeUp>
    <img src="/assets/portrait-line.png" alt="" className="mx-auto w-64" />
  </section>

  {/* FEATURE CARD ROW */}
  <section className="mx-auto max-w-6xl px-6 pb-20">
    <div className="mb-6 flex items-center justify-between">
      <h2 className="font-serif text-2xl">Designed to sharpen every decision</h2>
      <button className="rounded-full bg-[#16140F] px-4 py-2 text-sm text-white">Watch Demo ▶</button>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {features.map((f,i) => <FadeUp key={f.title} delay={i*0.08}><FeatureCard {...f} /></FadeUp>)}
    </div>
  </section>
</main>
```

## Data (example, from the preview)
```ts
const stats = [
  { title:"Savings",  badge:"+25%", delta:"+12%", kind:"spark"  },
  { title:"Others",   sub:"Total overview this month", values:["78% Groceries","43% Entertain.","23% Transport"], kind:"bars" },
  { title:"Bill Pay", badge:"-8%", kind:"bars", highlightMonth:"Mar" },
];

const features = [
  { title:"Smart Budgeting",     icon:"✨", text:"Let AI reshape how you plan your spending. Kova adapts to your…", img:"/assets/f1.jpg" },
  { title:"Bank-Grade Security", icon:"🛡", text:"Keep your money safe with end-to-end encryption, live fraud alerts, and two-factor auth…", img:"/assets/f2.jpg" },
  { title:"Spend Insights",      icon:"⏱", donut:{ label:"50%", caption:"of budget", title:"Monthly Spend", range:"1 Apr – 30 May 2026" } },
  { title:"Wealth Building",     icon:"📈", text:"Grow your net worth with tools that help you set targets, monitor gains, and act…", img:"/assets/f3.jpg" },
];
```

## Motion & acceptance
- Hero text fades up; the three stat cards drift gently (`Float`) and overlap the bottom edge of the photo.
- Testimonial + feature cards fade-up with stagger on scroll.
- Stat cards show real mini-charts: green savings sparkline (+25%/+12%), category bars with one orange bar,
  bill-pay bars with a black highlighted month; feature "Spend Insights" card has a green/orange donut at 50%.
- Acceptance checklist:
  - [ ] Warm peach-cream theme; "Kova" wordmark, Explore/Pricing/Perks/Reach nav, dark "Get Started" pill.
  - [ ] Serif hero "Own your money and build the wealth you deserve" + subhead + Watch Demo / Get the App buttons.
  - [ ] Rocky bonsai photo band with three overlapping glassy stat cards (Savings / Others / Bill Pay) + mini charts.
  - [ ] Testimonial band: title, Arcvex badge, quote, Maya Reeves attribution, "All Stories" pill, line-art portrait.
  - [ ] Bottom feature row: Smart Budgeting / Bank-Grade Security / Spend Insights (donut) / Wealth Building.
  - [ ] `prefers-reduced-motion`: disable card float, keep opacity fades only.
