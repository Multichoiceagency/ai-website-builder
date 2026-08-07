# Arceage Testimonial — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Testimonials · testimonials.

Build a clean, editorial **`ArceageTestimonial`** section on a white card framed by dark
top/bottom bands: a small "Customer Feedback" eyebrow, a large centered serif quote between
guillemets, and a footer row with a round avatar + name/role on the left and two circular
prev/next arrow buttons on the right.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Theme: light content card on a near-black page. Page `bg-[#1A1A18]`; the testimonial sits on a
  white panel `bg-white` so it reads like a framed slide.
- KEY COLORS: ink `#1F1F1D`, muted label grey `#8A8A86`, hairline divider `border-black/10`,
  light-grey arrow buttons `bg-[#E6E6E3]`.
- Font: a refined serif for the quote (e.g. `font-["Newsreader"]` / Georgia), sans for labels.
- Max content width `max-w-[1000px]`, centered; the white panel has tall vertical padding.

## Helpers
- `FadeIn` — framer-motion wrapper, `initial={{opacity:0,y:16}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.6, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `ArrowBtn` — round 44px button, `bg-[#E6E6E3] hover:bg-[#DADAD6]`, holds a left/right arrow glyph;
  on click advances `index` through the `quotes` array (animate quote crossfade with `AnimatePresence`).

## Structure
```tsx
<section className="bg-[#1A1A18] py-10">
  <div className="mx-auto max-w-[1100px] bg-white px-10 py-16 md:px-16">
    {/* eyebrow + divider */}
    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/55">Customer Feedback</p>
    <hr className="mt-5 border-black/10" />

    {/* big centered quote */}
    <AnimatePresence mode="wait">
      <motion.blockquote key={active.name}
        initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
        transition={{duration:0.45}}
        className="mx-auto max-w-3xl py-16 text-center font-serif text-2xl leading-snug text-[#1F1F1D] md:text-[28px]">
        «{active.text}»
      </motion.blockquote>
    </AnimatePresence>

    <hr className="border-black/10" />

    {/* footer: avatar + name/role  |  arrows */}
    <div className="mt-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={active.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-[#1F1F1D]">{active.name}</p>
          <p className="text-[12px] text-black/45">{active.role}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <ArrowBtn dir="prev" onClick={prev} />
        <ArrowBtn dir="next" onClick={next} />
      </div>
    </div>
  </div>
</section>
```

## Quotes data (example, from the preview)
```ts
const quotes = [
  { text: "Working with the Acreage Ag team gave us a competitive edge in bringing our crops to market. Their technical expertise, machinery, and customer service are outstanding. We consider them a key partner for all our harvesting needs",
    name: "Maranda Walsh", role: "Operations Manager, GreenAcres Farms", avatar: "/avatars/maranda.jpg" },
  { text: "Their fleet uptime is the best we have seen — dependable hardware and a support team that actually picks up the phone during peak season.",
    name: "Tobias Lund", role: "Yield Lead, NorthField Co-op", avatar: "/avatars/tobias.jpg" },
];
```

## Motion & acceptance
- Quote crossfades when navigating (`AnimatePresence`, swap `key`); footer name/role updates in sync.
- Whole panel `FadeIn` on enter; arrow buttons scale slightly on `whileTap` / `whileHover`.
- Acceptance checklist:
  - Dark page bands top + bottom with a centered white content panel.
  - Small uppercase "Customer Feedback" eyebrow, thin divider beneath it.
  - Large centered serif quote wrapped in « » guillemets.
  - Bottom divider, then footer row: round avatar + bold name + grey role on the left.
  - Two round light-grey prev/next buttons (left arrow + right arrow) bottom-right.
  - Quote/author cycle on click; responsive type scale; respects `prefers-reduced-motion` (instant swap, no slide).
```
