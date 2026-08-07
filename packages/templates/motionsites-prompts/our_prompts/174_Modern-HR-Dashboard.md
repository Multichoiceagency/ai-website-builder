# Modern HR Dashboard — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Dashboard · hero.

Build a light, friendly **`ModernHRDashboard`** app shell: a pill top-nav with tabs and avatars,
a "Good morning, Kasven" greeting with KPI counters, then a bento grid of cards — profile/savings
on the left, activity bar chart + focus timer + induction donut in the middle, a calendar strip,
and a dark "Pending Actions" panel on the right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. App background soft grey `#EDECEA`; cards white `#FFFFFF` and warm cream `#FBF4E3`
  with `rounded-2xl` and very soft shadows; one dark panel `#23211E`.
- KEY COLORS: ink `#1E1E1C`, muted grey `#8A8881`, signature accent butter-yellow `#F2C94C`,
  hairline borders `border-black/[0.06]`.
- Font: clean sans (Inter). Numbers large + tight for KPIs.
- Max width `max-w-[1280px]`; bento grid `grid-cols-12` with varied spans.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y`, staggered delay).
- `Card` — `rounded-2xl bg-white p-5 shadow-[0_2px_18px_-12px_rgba(0,0,0,0.4)]` (variant: cream/dark).
- `CountUp` — animates KPI numbers 0→value on mount.
- `BarChart` / `Donut` — tiny inline SVG chart helpers (yellow accent bars + a progress ring).

## Structure
```tsx
<section className="min-h-screen bg-[#EDECEA] p-5 text-[#1E1E1C]">
  <div className="mx-auto max-w-[1280px]">
    {/* PILL TOP NAV */}
    <header className="mb-6 flex items-center justify-between">
      <span className="text-sm font-semibold">Talvex</span>
      <nav className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[13px] text-black/55 shadow-sm">
        <a className="rounded-full bg-black px-3 py-1.5 text-white">Dashboard</a>
        {["People","Hiring","Devices","Apps","Salary","Calendar","Reviews"].map(t => <a key={t} className="px-3 py-1.5">{t}</a>)}
      </nav>
      <div className="flex items-center gap-2">
        <button className="rounded-full bg-white px-3 py-1.5 text-[13px] shadow-sm">⚙ Configs</button>
        <div className="flex -space-x-2"><img className="h-7 w-7 rounded-full" src="/avatars/1.jpg"/><img className="h-7 w-7 rounded-full" src="/avatars/2.jpg"/></div>
      </div>
    </header>

    {/* GREETING + KPI ROW */}
    <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="text-3xl font-medium">Good morning, Kasven</h1>
        <div className="mt-3 flex gap-3 text-[12px]">
          {sliders.map(s => <span key={s.label} className="rounded-full bg-white px-3 py-1 shadow-sm">{s.label} <b>{s.value}</b></span>)}
        </div>
      </div>
      <div className="flex gap-8 text-right">
        {kpis.map(k => <div key={k.label}><div className="text-3xl font-semibold"><CountUp value={k.value}/></div><p className="text-[12px] text-black/45">{k.label}</p></div>)}
      </div>
    </div>

    {/* BENTO GRID */}
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 md:col-span-3 row-span-2 p-0 overflow-hidden">{/* profile photo + name + salary chip */}</Card>
      <Card className="col-span-12 md:col-span-5">{/* Activity 6.1h + BarChart + play controls */}</Card>
      <Card className="col-span-12 md:col-span-4">{/* Focus timer 02:35 Donut */}</Card>
      <Card variant="cream" className="col-span-12 md:col-span-5">{/* Induction 18% + Task legend */}</Card>
      <Card variant="dark" className="col-span-12 md:col-span-4 row-span-2">{/* Pending Actions list */}</Card>
      <Card className="col-span-12 md:col-span-3">{/* Retirement savings / Hardware / Earnings / Perks */}</Card>
      <Card variant="cream" className="col-span-12 md:col-span-5">{/* August 2024 calendar strip + chips */}</Card>
    </div>
  </div>
</section>
```

## Dashboard data (example, from the preview)
```ts
const kpis = [
  { label: "Members",  value: 78 },
  { label: "Openings", value: 56 },
  { label: "Launches", value: 203 },
];
const sliders = [
  { label: "Screenings", value: "15%" },
  { label: "Placed",     value: "15%" },
  { label: "Return",     value: "10%" },
];
const pendingActions = [
  { title: "Screening",     meta: "Sep 13, 09:00", done: true },
  { title: "Sync Session",  meta: "Sep 13, 11:00", done: true },
  { title: "Sprint Recap",  meta: "Sep 14, 14:00" },
  { title: "Set Q3 Targets",meta: "Sep 14, 16:00" },
  { title: "Policy Walkthru",meta: "Sep 15, 10:00" },
];
const profile = { name: "Nora Elliston", role: "UX/UI Architect", salary: "$1,200" };
```

## Motion & acceptance
- Cards `FadeUp` in with a small stagger (top-left → bottom-right); KPI numbers `CountUp`.
- Donut "Focus timer" ring animates `pathLength`; bar chart bars grow from baseline.
- Acceptance checklist:
  - Soft grey app background with white + cream rounded cards and one dark panel.
  - Pill top nav: "Talvex" logo, Dashboard (active, black pill) + People/Hiring/Devices/Apps/Salary/Calendar/Reviews, "Configs" button, avatar stack right.
  - "Good morning, Kasven" greeting with percentage chips and three KPIs (78 Members / 56 Openings / 203 Launches).
  - Bento grid: profile card (photo, Nora Elliston, UX/UI Architect, $1,200), Activity card (6.1h + yellow bar chart + play controls), Focus timer (02:35 donut), Induction 18% with Task legend, dark "Pending Actions" list, savings/hardware/earnings/perks card, "August 2024" calendar strip with event chips.
  - Butter-yellow `#F2C94C` accent throughout (active bar, slider, donut).
  - Responsive: bento collapses to single column; `prefers-reduced-motion` disables count-up + slide.
```
