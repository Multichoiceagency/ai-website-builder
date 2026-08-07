# BookedUp — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: SaaS · hero.

Build a light, split-layout SaaS hero **`BookedUpHero`**: left column with an eyebrow badge,
a bold two-line headline (with an inline rounded "spark" chip), sub-copy, two CTAs, and a
social-proof row; right column shows a stack of floating "consultation set" appointment cards.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = soft off-white `#F4F4F5` (very faint top-down gradient to `#FAFAFA`).
- Key colors from the image: near-black headline `#0D0D0F`, muted grey body `#6B7280`,
  a green accent `#22C55E` (eyebrow dot + "BOOKING FOR SUMMER" + 5/5), an orange→red gradient
  spark chip `#F97316→#EF4444`, amber stars `#F59E0B`. White appointment cards with soft shadow.
- Typeface: Inter; headline tight tracking, semibold. Max content width `max-w-6xl`, 2-col grid on md+.

## Helpers
- `FadeUp` / `FadeRight` — `framer-motion`: `initial={{opacity:0,y:24}}` (or `x:24`),
  `whileInView` to `{opacity:1,y:0}`, `transition={{duration:0.7, delay, ease:[0.22,1,0.36,1]}}`.
- `FloatCard` — each appointment card drifts subtly: `animate={{y:[0,-6,0]}}`,
  `transition={{duration:5+i, repeat:Infinity, ease:"easeInOut"}}`.
- `Avatar` — small round image with optional colored ring.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#F4F4F5] px-6 py-16 md:py-24">
  <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">

    {/* LEFT — copy */}
    <div>
      <FadeUp>
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Booking for Summer
        </span>
      </FadeUp>
      <FadeUp delay={0.1}>
        <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-[#0D0D0F] md:text-6xl">
          Expanding <span className="inline-flex h-9 w-9 -translate-y-1 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 align-middle text-white">📈</span> reach<br/>with every lead
        </h1>
      </FadeUp>
      <FadeUp delay={0.2}>
        <p className="mt-5 max-w-md text-base leading-relaxed text-gray-500">
          Automating lead systems and funnels, we design scalable growth engines for your next venture.
        </p>
      </FadeUp>
      <FadeUp delay={0.3}>
        <div className="mt-7 flex items-center gap-3">
          <a className="rounded-xl bg-[#0D0D0F] px-6 py-3 text-sm font-medium text-white transition hover:bg-black/85">Scale revenue now</a>
          <a className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-[#0D0D0F] transition hover:bg-black/5">▶ Start Here</a>
        </div>
      </FadeUp>
      <FadeUp delay={0.4}>
        <div className="mt-10 flex items-center gap-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Verified clients</p>
            <div className="mt-2 flex -space-x-2">{clients.map(c => <Avatar key={c} src={c} />)}</div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Top tier quality 5/5</p>
            <div className="mt-2 text-amber-500">★★★★★</div>
          </div>
        </div>
      </FadeUp>
    </div>

    {/* RIGHT — floating appointment card stack */}
    <FadeRight delay={0.2}>
      <div className="relative flex flex-col items-end gap-4">
        {appointments.map((day, i) => (
          <FloatCard key={day.label} i={i}
            className="w-[88%] rounded-2xl border border-black/5 bg-white p-4 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25)]">
            <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              <span>{day.label}</span><span>{day.date}</span>
            </div>
            {day.slots.map(s => (
              <div key={s.name} className="flex items-center gap-3 border-t border-black/5 py-2 first:border-t-0">
                <Avatar src={s.avatar} />
                <div>
                  <p className="text-sm font-semibold text-[#0D0D0F]">Consultation set: {s.name}</p>
                  <p className="text-xs text-gray-400">{s.time}</p>
                </div>
              </div>
            ))}
          </FloatCard>
        ))}
      </div>
    </FadeRight>
  </div>
</section>
```

## Appointments data (from the preview)
```ts
const appointments = [
  { label:"WED", date:"20 JUL", slots:[
    { name:"Matthew", time:"2:00 PM - 3:00 PM", avatar:"/a/m.jpg" },
    { name:"Lily",    time:"4:15 PM - 4:45 PM", avatar:"/a/l.jpg" },
  ]},
  { label:"MON", date:"18 JUL", slots:[
    { name:"Jacob", time:"9:30 AM - 10:30 AM", avatar:"/a/j.jpg" },
  ]},
  { label:"TUE", date:"19 JUL", slots:[
    { name:"Chloe", time:"9:30 AM - 10:30 AM", avatar:"/a/c.jpg" },
    { name:"Maya",  time:"12:45 PM - 1:15 PM", avatar:"/a/my.jpg" },
  ]},
  { label:"THU", date:"21 JUL", slots:[
    { name:"Oliver", time:"9:30 AM - 10:30 AM", avatar:"/a/o.jpg" },
  ]},
];
const clients = ["/a/c1.jpg","/a/c2.jpg","/a/c3.jpg","/a/c4.jpg"];
```

## Motion & acceptance
- Left column staggers up (eyebrow → headline → sub → CTAs → social proof, delays 0–.4).
- Right card stack slides in from the right (`FadeRight`); each card floats with a unique `FloatCard` duration.
- Inline spark chip in the headline has the orange→red gradient; on hover it can pulse subtly.
- Respect `prefers-reduced-motion`: disable float + slide, keep opacity fades.
- Acceptance checklist:
  - Off-white split hero, 2 columns on desktop, stacked on mobile.
  - Green eyebrow with dot "BOOKING FOR SUMMER"; bold 2-line headline with inline gradient spark chip.
  - Muted sub-copy; dark "Scale revenue now" button + ghost "▶ Start Here".
  - Social-proof row: overlapping client avatars + amber 5-star "TOP TIER QUALITY 5/5".
  - Right side: stack of white "Consultation set: …" appointment cards with day labels/dates, soft shadow, gentle float.
