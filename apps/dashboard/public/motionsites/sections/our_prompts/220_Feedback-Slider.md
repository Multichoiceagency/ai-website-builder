# Feedback Slider — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Slider · carousel.

Build a light **`FeedbackSlider`** testimonial carousel: a soft off-white canvas with a serif/italic "What
builders say" heading top-left, a five-star "Clutch 5/5" rating top-right, two adjacent rounded quote cards
(big quote glyph, testimonial text, avatar + name + role), and round prev/next arrows bottom-left.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = soft off-white `#EFEFF0` (very subtle warm grey).
- Key colors seen: paper `#EFEFF0`, card white `#FFFFFF`, ink `#1B1C1F` heading, body grey `#5B5C60`,
  quote-mark light grey `#1B1C1F`, star gold/near-black `#1B1C1F` (filled dark stars), avatar photos.
- Fonts: a serif display mixing roman + *italic* for "What builders say" (e.g. `font-["Fraunces"]`/serif);
  Inter for card body, names and roles.
- Max content width `max-w-5xl`; cards `rounded-3xl shadow-sm`; two visible per view on desktop.

## Helpers
- `FadeUp` (framer-motion) for heading + cards.
- `Slider` — controlled index; the card track animates `x` with framer-motion spring on prev/next; supports drag.
- `Stars` — renders 5 filled star glyphs; `Avatar` — round image with name + role.

## Structure
```tsx
<section className="bg-[#EFEFF0] py-16">
  <div className="mx-auto max-w-5xl px-8">
    {/* heading row */}
    <div className="mb-12 flex items-start justify-between">
      <FadeUp>
        <h2 className="font-serif text-4xl text-[#1B1C1F]">What <span className="italic">builders</span> say</h2>
      </FadeUp>
      <FadeUp delay={0.1} className="text-right">
        <Stars className="justify-end text-[#1B1C1F]" />
        <p className="mt-1 text-sm font-semibold text-[#1B1C1F]">Clutch <span className="font-normal text-[#5B5C60]">5/5</span></p>
      </FadeUp>
    </div>

    {/* two-up card track */}
    <div className="overflow-hidden">
      <motion.div className="flex gap-6" animate={{ x: -index * 360 }} transition={{ type:'spring', stiffness:120, damping:20 }}
                  drag="x" dragConstraints={{ left: -maxX, right: 0 }}>
        {quotes.map(q => (
          <FadeUp key={q.name} className="w-[340px] shrink-0">
            <div className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-sm">
              <span className="text-4xl leading-none text-[#1B1C1F]">&#8220;</span>
              <p className="mt-3 text-sm leading-relaxed text-[#5B5C60]">{q.text}</p>
              <div className="mt-6 flex items-center gap-3">
                <img src={q.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                <span className="text-sm font-medium text-[#1B1C1F]">{q.name}<span className="block text-xs font-normal text-[#5B5C60]">↳ {q.role}</span></span>
              </div>
            </div>
          </FadeUp>
        ))}
      </motion.div>
    </div>

    {/* prev / next */}
    <div className="mt-8 flex items-center gap-3">
      <button onClick={prev} className="grid h-11 w-11 place-items-center rounded-full border border-[#1B1C1F]/15 text-[#1B1C1F] hover:bg-black/[0.03]">‹</button>
      <button onClick={next} className="grid h-11 w-11 place-items-center rounded-full border border-[#1B1C1F]/15 text-[#1B1C1F] hover:bg-black/[0.03]">›</button>
    </div>
  </div>
</section>
```

## Quotes data (example, from the preview)
```ts
const quotes = [
  { text:"Viktor led the creation of our best fundraising deck to date! Knows how to merge sophisticated UX with simple cryptonative design.",
    name:"alexwu",        role:"Founder, Nexgate",      avatar:"/assets/a1.jpg" },
  { text:"Working with Viktor transformed our product vision into something truly exceptional. The attention to detail and strategic thinking was outstanding.",
    name:"James Mitchell", role:"VP Product, LaunchPad",  avatar:"/assets/a2.jpg" },
  { text:"Sharp, fast and reliable — every milestone landed exactly when promised, and the polish was next-level.",
    name:"Priya Nair",     role:"Design Lead, Orbital",   avatar:"/assets/a3.jpg" },
];
```

## Motion & acceptance
- Heading + rating + cards fade-up; the card track slides via framer-motion spring on prev/next and supports drag-to-scroll.
- Round arrow buttons advance/rewind; two cards visible per view on desktop, one on mobile.
- Acceptance checklist:
  - [ ] Soft off-white `#EFEFF0` canvas; serif heading "What *builders* say" top-left (italic middle word).
  - [ ] Five dark stars + "Clutch 5/5" rating top-right.
  - [ ] Two adjacent white rounded quote cards: big quote glyph, body text, avatar + name + "↳ role".
  - [ ] Quotes from alexwu (Founder, Nexgate) and James Mitchell (VP Product, LaunchPad) visible.
  - [ ] Round prev/next arrow buttons bottom-left; spring slide + drag support.
  - [ ] `prefers-reduced-motion`: instant index change (no spring), keep opacity fades only.
