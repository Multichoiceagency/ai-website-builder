# Solace sign-in — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Sign In Form · form.
> Glassmorphic login over een dromerige paarse lavendel-veld + sterrenhemel achtergrond: een gecentreerde frosted glass-kaart met logo, "Step back in!" titel, email/password velden, "Stay signed in" + "Reset password?", witte "Sign In" knop, Google-knop en een join-link.

Build a centered glassmorphic **`SolaceSignIn`** form for a wellness/meditation app ("Solace"):
a frosted glass card floating over a twilight lavender-field photo, with a logo glyph, a friendly
"Step back in!" heading + subtext, email + password inputs, a "Stay signed in" checkbox row with a
"Reset password?" link, a full-width white "Sign In" button, a "Continue with Google" button, and a
"New to this place? Join Now" footer link.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark/photo theme. Background = a dreamy twilight lavender field + starry purple sky
  (`/assets/lavender-twilight.jpg`, `object-cover`), softly blurred behind the card.
- Colors I see: white text `#FFFFFF`, muted `text-white/60`, the glass card is `bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl`;
  inputs are `bg-white/10 border border-white/20`; primary button is solid white `bg-white text-[#2A1E3F]`; accent purples come from the photo.
- Fonts: Inter; heading is medium-large (`text-3xl font-semibold`). Card max width `max-w-md`, fully centered.

## Helpers
- `FadeUp` — framer-motion wrapper for the card (`initial={{opacity:0,y:18,scale:0.98}}` → settled).
- `Field` — label + input pair; `password` variant gets a show/hide eye toggle on the right.
- `Checkbox` — small rounded check for "Stay signed in".

## Structure
```tsx
<section className="relative grid min-h-screen place-items-center overflow-hidden px-4">
  <img src="/assets/lavender-twilight.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-[#1B1230]/30 backdrop-blur-[2px]" />

  <FadeUp>
    <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 text-white backdrop-blur-xl">
      {/* logo + heading */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white/20">✦</div>
        <h1 className="text-3xl font-semibold">Step back in!</h1>
        <p className="mt-2 text-sm text-white/60">Log in to continue your mindful exercises, calm routines, and wellness pathway</p>
      </div>

      {/* fields */}
      <div className="space-y-4">
        <Field label="Email" type="email" placeholder="test@gmail.com" />
        <Field label="Password" type="password" placeholder="••••••••" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-white/70"><Checkbox /> Stay signed in</label>
          <a className="text-white/70 hover:text-white">Reset password?</a>
        </div>

        <button className="w-full rounded-full bg-white py-3 text-sm font-medium text-[#2A1E3F]">Sign In</button>

        <button className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 py-3 text-sm">
          <img src="/assets/google.svg" className="h-4 w-4" alt="" /> Continue with Google
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-white/60">
        New to this place? <a className="font-medium text-white">Join Now</a>
      </p>
    </div>
  </FadeUp>
</section>
```

## Form copy data (example, from the preview)
```ts
const form = {
  heading: "Step back in!",
  sub: "Log in to continue your mindful exercises, calm routines, and wellness pathway",
  fields: [
    { label: "Email", type: "email", placeholder: "test@gmail.com" },
    { label: "Password", type: "password", placeholder: "••••••••" },
  ],
  primary: "Sign In",
  oauth: "Continue with Google",
  footer: { text: "New to this place?", link: "Join Now" },
};
```

## Motion & acceptance
- Centered frosted-glass card (`backdrop-blur-xl`, `bg-white/10`, `border-white/20`, `rounded-3xl`) floating over a softly blurred twilight lavender-field photo with a starry purple sky.
- Card top: rounded logo glyph, "Step back in!" heading, and a 2-line muted subtext.
- Email + password fields (password has a show/hide eye), a "Stay signed in" checkbox left + "Reset password?" link right.
- Full-width solid-white "Sign In" button, then a bordered "Continue with Google" button, then "New to this place? Join Now" footer link.
- Card fades/scales up on mount; inputs get a focus ring; buttons darken/lighten slightly on hover.
- Reduced-motion: drop the scale/translate, keep opacity fade only. Card stays centered and `max-w-md` on all breakpoints; background remains cover-filling.
