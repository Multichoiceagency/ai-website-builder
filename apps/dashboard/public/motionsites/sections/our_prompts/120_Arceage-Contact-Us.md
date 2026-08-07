# Arceage Contact Us — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Form · form.
> Clean, centered contact form on an off-white canvas with a playful serif-italic + sans headline ("Let's grow! Fill in the form…") and underline-style inputs.

Build a centered **`ContactForm`** section: a light off-white background, a mixed serif-italic/sans
headline, a subtitle, and a stack of borderless underline inputs ending in a dark pill submit button.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light theme. Background = soft off-white `#ECECEC`; content centered in `max-w-2xl`.
- Headline mixes a serif italic accent (`font-serif italic` for "Let's grow!") with a bold sans
  for the rest; near-black `#1A1A1A`. Labels are small bold dark; placeholders light grey `#B5B5B5`.
- Inputs are underline-only (`border-b border-[#D2D2D2]`), transparent bg, focus turns the underline
  near-black. Submit = dark rounded-full pill `bg-[#171717] text-white`.

## Helpers
- `FadeUp` — framer-motion wrapper for headline/subtitle/each field with incremental delay.
- `Field` — label + input/textarea row helper (props: `label`, `required`, `placeholder`, `as`).

## Structure
```tsx
<section className="flex min-h-screen w-full items-center justify-center bg-[#ECECEC] px-6 py-24">
  <div className="mx-auto w-full max-w-2xl">
    <FadeUp>
      <h2 className="text-center text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-4xl">
        <span className="font-serif italic">Let's grow!</span> Fill in the form<br className="hidden sm:block" /> and we'll be in touch
      </h2>
    </FadeUp>
    <FadeUp delay={0.1}>
      <p className="mt-4 text-center text-sm text-[#7A7A7A]">Ask us about our precision harvesting services</p>
    </FadeUp>

    <form className="mt-14 flex flex-col gap-7">
      {fields.map((f, i) => (
        <FadeUp key={f.label} delay={0.15 + i * 0.06}>
          <label className="block">
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              {f.label}{f.required && "*"}
            </span>
            {f.as === "textarea" ? (
              <textarea rows={1} placeholder={f.placeholder}
                className="mt-2 w-full border-b border-[#D2D2D2] bg-transparent py-2 text-sm text-[#1A1A1A] placeholder:text-[#B5B5B5] focus:border-[#1A1A1A] focus:outline-none" />
            ) : (
              <input placeholder={f.placeholder}
                className="mt-2 w-full border-b border-[#D2D2D2] bg-transparent py-2 text-sm text-[#1A1A1A] placeholder:text-[#B5B5B5] focus:border-[#1A1A1A] focus:outline-none" />
            )}
          </label>
        </FadeUp>
      ))}

      <FadeUp delay={0.5}>
        <div className="mt-6 flex justify-center">
          <button type="submit"
            className="rounded-full bg-[#171717] px-7 py-3 text-sm font-medium text-white transition hover:bg-black">
            Send Message
          </button>
        </div>
      </FadeUp>
    </form>
  </div>
</section>
```

## Fields data (example, from the preview)
```ts
const fields = [
  { label: "Your Name",     required: true,  placeholder: "Who's reaching out?" },
  { label: "Email",         required: true,  placeholder: "Where can we reach you?" },
  { label: "Phone Number",  required: true,  placeholder: "Best number to call you on?" },
  { label: "Farm / Company", required: false, placeholder: "Your farm or organization?" },
  { label: "Tell Us More",  required: false, placeholder: "What crops or acreage would you like to discuss?", as: "textarea" },
];
```

## Motion & acceptance
- Headline, subtitle and each field fade-up in sequence (stagger ~0.06s per field).
- Inputs are underline-only on transparent bg; focus animates the underline to near-black.
- Mixed-type headline: serif-italic "Let's grow!" + bold sans remainder, centered, two lines.
- Five labeled rows (Name*, Email*, Phone*, Farm/Company, Tell Us More — last is a textarea),
  light-grey placeholders matching the preview copy.
- Centered dark "Send Message" pill button at the bottom; subtle hover darken + `whileTap scale:0.98`.
- Off-white `#ECECEC` canvas, content max-w-2xl centered. Respect `prefers-reduced-motion`
  (skip fade-up, render static). Fully responsive single-column stack.
```
