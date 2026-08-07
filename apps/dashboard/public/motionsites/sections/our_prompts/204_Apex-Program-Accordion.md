# Apex Program Accordion — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Accordion · faq.

Build a dark **`ApexCurriculumAccordion`** section: a near-black canvas with a small "Course Curriculum" pill,
a centered headline ("A fully modern curriculum."), and a single rounded panel containing a numbered accordion of
course modules — each row shows a "MODULE N" label + title and a chevron, with the open module revealing a
checklisted lesson list.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0A0A0B`; the accordion panel is a slightly lighter `#141416` with a
  subtle border.
- Key colors seen: black `#0A0A0B`, panel `#141416`, hairline `#FFFFFF14`, heading near-white `#ECECEE`,
  module label muted grey `#7E7E86`, lesson text `#B9B9C0`, check-circle grey/white outline.
- Font Inter; headline `text-3xl` medium; module titles `text-lg`; module labels uppercase `tracking-[0.18em]` tiny.
- Max content width `max-w-3xl` centered; rows separated by hairline dividers; rounded chevron buttons.

## Helpers
- `FadeUp` (framer-motion) for the pill + headline + panel.
- `Accordion`/`AccordionItem` — controlled open index; the body animates height/opacity with framer-motion
  (`initial={{height:0,opacity:0}}`→`animate={{height:'auto',opacity:1}}`), chevron rotates 180° when open.
- `Check` — small circular check icon before each lesson.

## Structure
```tsx
<section className="bg-[#0A0A0B] py-20 text-white">
  <div className="mx-auto max-w-3xl px-6 text-center">
    <FadeUp>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
        ✦ Course Curriculum
      </span>
    </FadeUp>
    <FadeUp delay={0.08}>
      <h2 className="mt-5 text-3xl font-medium text-[#ECECEE]">A fully modern curriculum.</h2>
    </FadeUp>
  </div>

  {/* accordion panel */}
  <FadeUp delay={0.16} className="mx-auto mt-10 max-w-3xl px-6">
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141416]">
      {modules.map((m, i) => (
        <div key={m.id} className="border-b border-white/10 last:border-b-0">
          <button onClick={() => toggle(i)} className="flex w-full items-center justify-between px-6 py-5 text-left">
            <span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-white/45">Module {m.id}</span>
              <span className="mt-1 block text-lg text-[#ECECEE]">{m.title}</span>
            </span>
            <span className={cn("grid h-8 w-8 place-items-center rounded-full border border-white/15 transition-transform",
              open === i && "rotate-180")}>⌄</span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                          transition={{duration:0.35, ease:[0.22,1,0.36,1]}} className="overflow-hidden">
                <ul className="flex flex-col gap-3 px-6 pb-6 text-sm text-white/70">
                  {m.lessons.map(l => <li key={l} className="flex items-center gap-3"><Check/> {l}</li>)}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  </FadeUp>
</section>
```

## Modules data (example, from the preview)
```ts
const modules = [
  { id:1, title:"Foundations of AI Design",
    lessons:["Intro to The Future of Design and Building, how it started and where it's going.","AI Design Philosophy — why and what makes good AI design."] },
  { id:2, title:"Building with AI",
    lessons:["Choosing your stack and tools","Prompting workflows for production UI"] },
  { id:3, title:"Launch & Growth",
    lessons:["Getting Seen, Launch Videos","Building a portfolio","X (Twitter) Strategy for Designers"] },
  { id:4, title:"Making Money as an AI Designer",
    lessons:["Productizing your skills","Client acquisition and pricing"] },
];
```

## Motion & acceptance
- Pill, headline and panel fade-up with stagger (0/.08/.16).
- Opening a module expands its lesson list (height+opacity ease), chevron rotates 180°; only one open at a time
  (Module 3 "Launch & Growth" open by default as in the preview).
- Acceptance checklist:
  - [ ] Near-black canvas; centered "✦ Course Curriculum" pill above a centered "A fully modern curriculum." headline.
  - [ ] Single rounded panel (`#141416`) with hairline-divided accordion rows.
  - [ ] Each row: "MODULE N" uppercase label + title + round chevron button; open row shows checklisted lessons.
  - [ ] Modules: Foundations of AI Design / Building with AI / Launch & Growth / Making Money as an AI Designer.
  - [ ] One module open at a time, smooth height animation, chevron rotation.
  - [ ] `prefers-reduced-motion`: instant open/close (no height tween), keep opacity only.
