# Glassmorphic Feature Tabs — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Tabs · features.

Build a dark **`GlassmorphicFeatureTabs`** section for "UI Rocket": a "Core Features" eyebrow,
a two-line headline with a supporting paragraph, a center tab bar (Exclusive Tutorial / Courses /
Templates / Animated Backgrounds) with a glassy active pill, and a large glassmorphic app-window
mockup showing a "Courses" dashboard with a 2×2 grid of course cards over a dreamy mushroom-forest backdrop.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0B0C0E`; the showcase window floats over a soft, blurred
  fantasy-forest image (`/assets/forest-glow.jpg`) so the glass panel reads.
- Glass surfaces: `bg-white/[0.05] border border-white/10 backdrop-blur-2xl rounded-3xl`.
- Active tab pill: brighter glass `bg-white/10 border border-white/15 rounded-full` with white text;
  inactive tabs `text-white/55`.
- Accent = a soft cyan/blue for the app icon + small badges. Font Inter; headline tight, two-tone (white + `text-white/40`).

## Helpers
- `FadeUp` (framer-motion, opacity+y) for header + window.
- `TabBar` — controlled active index, animated highlight with `layoutId="tab-pill"`.
- `Carousel` — left/right chevron buttons under the window; framer-motion `AnimatePresence` swap on tab change.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#0B0C0E] py-20 text-white">
  {/* header row */}
  <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 md:grid-cols-2">
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
        ⬡ Core Features
      </span>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
        One platform to run your
        <br /><span className="text-white/40">entire AI design journey.</span>
      </h2>
    </div>
    <p className="self-end text-sm leading-relaxed text-white/55">
      UI Rocket brings your lessons, templates, tools, and community into one space — so you stop
      switching between tabs and start shipping real AI-powered work.
    </p>
  </div>

  {/* center tab bar */}
  <TabBar className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm backdrop-blur">
    {tabs.map((t, i) => (
      <button key={t} className={cn("relative rounded-full px-5 py-2", i === active ? "text-white" : "text-white/55")}>
        {i === active && <motion.span layoutId="tab-pill" className="absolute inset-0 -z-10 rounded-full bg-white/10 ring-1 ring-white/15" />}
        {t}
      </button>
    ))}
  </TabBar>

  {/* glass app-window showcase */}
  <FadeUp delay={0.1}>
    <div className="relative mx-auto mt-10 max-w-5xl px-6">
      <img src="/assets/forest-glow.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full rounded-[2rem] object-cover opacity-50 blur-sm" />
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-2xl">
        <div className="flex gap-4">
          {/* mini sidebar */}
          <aside className="hidden w-40 shrink-0 flex-col gap-2 rounded-2xl bg-white/[0.04] p-3 text-xs text-white/60 md:flex">
            <span className="mb-1 font-semibold text-white">🚀 UI Rocket</span>
            {["Dashboard","Courses","Templates","Tutorials","Backgrounds","Pricing"].map(s => <a key={s} className="rounded px-2 py-1 hover:bg-white/5">{s}</a>)}
          </aside>
          {/* content: 2x2 course grid */}
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">📘 Courses</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {courses.map(c => (
                <div key={c.title} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="aspect-video bg-cover bg-center" style={{ backgroundImage:`url(${c.thumb})` }} />
                  <div className="p-3"><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-white/45">{c.meta}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* carousel chevrons + caption */}
      <div className="mt-5 flex items-center justify-between text-white/50">
        <button className="rounded-full border border-white/15 p-2">‹</button>
        <p className="text-xs">Structured learning paths to level up your skills.</p>
        <button className="rounded-full border border-white/15 p-2">›</button>
      </div>
    </div>
  </FadeUp>
</section>
```

## Tabs / courses data (example, from the preview)
```ts
const tabs = ["Exclusive Tutorial", "Courses", "Templates", "Animated Backgrounds"];
const courses = [
  { title: "Foundations of AI Design", meta: "1 Chapter · 4 lessons", thumb: "/assets/c/zero-to-one.jpg" },
  { title: "Building with AI",         meta: "1 Chapter · 7 lessons", thumb: "/assets/c/building.jpg" },
  { title: "Launch & Growth",          meta: "1 Chapter · 6 lessons", thumb: "/assets/c/launch.jpg" },
  { title: "Making Money as an AI Designer", meta: "1 Chapter · 3 lessons", thumb: "/assets/c/copy-guide.jpg" },
];
```

## Motion & acceptance
- Active tab uses a shared-layout pill (`layoutId="tab-pill"`) that slides between tabs; content swaps with `AnimatePresence` fade/slide on tab change.
- Header + window fade up on scroll (`FadeUp`, delays 0 / .1); course cards hover-lift (`whileHover y:-3`).
- Glass everywhere (`backdrop-blur-2xl`), forest backdrop blurred behind the panel; carousel chevrons reachable.
- Respect `prefers-reduced-motion`: instant tab swap (no slide), keep static glass.
- Acceptance checklist:
  - "Core Features" pill eyebrow, two-line headline (white + dimmed second line), right-aligned paragraph.
  - Center glass tab bar: Exclusive Tutorial / Courses / Templates / Animated Backgrounds, with active glass pill.
  - Large glassmorphic app window over a blurred fantasy-forest backdrop: left mini-sidebar (Dashboard/Courses/…/Pricing) + "Courses" header, profile chip.
  - 2×2 grid of course cards (Foundations of AI Design, Building with AI, Launch & Growth, Making Money as an AI Designer) with chapter/lesson meta.
  - Carousel chevrons + "Structured learning paths…" caption beneath; reduced-motion safe.
