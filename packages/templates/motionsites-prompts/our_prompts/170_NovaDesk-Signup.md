# NovaDesk Signup — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Signup · hero.
> Donker glass signup-paneel ("Join us") links over een warme zonsondergang-landschap met een retro-TV-render; e-mail + wachtwoord velden, akkoord-checkbox, witte "Launch Account" knop en social-login knoppen (Google / Apple / Twitter).

Build a **`NovaDeskSignup`** section: a full-bleed warm sunset landscape (with a retro CRT
TV rendered on the hill), a dark glassmorphic signup card on the left containing logo,
heading, email + password fields, a terms checkbox, a white "Launch Account" button and
three social-login buttons.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark-on-photo theme. Background = full-bleed image (`/assets/novadesk-sunset.jpg`, orange/red
  gradient sky over a dark green hill) via `object-cover`; light grey panel/frame edge top-left.
- Signup card = glassmorphic `bg-black/70 border border-white/10 backdrop-blur-xl rounded-2xl`,
  sitting on a larger faint glass frame that extends to the TV.
- Inputs = `bg-white/5 border border-white/10 rounded-lg` with muted placeholders.
- Fonts: Inter throughout; heading bold; tiny uppercase helper labels.
- Key colors I see: sunset orange `#E15A2B`, deep red `#8E2C1E`, card black `#0E0E10`, white CTA `#FFFFFF`, brand orange logo `#FF5A1F`.

## Helpers
- `FadeUp` — framer-motion wrapper (`opacity/y` on mount, stagger).
- `Field` — labeled input row: `<input>` styled glass, optional trailing eye-toggle for password.
- `SocialButton` — outlined rounded button with provider icon + label (Google / Apple / Twitter).

## Structure
```tsx
<section className="relative min-h-screen w-full overflow-hidden p-6 text-white">
  <img src="/assets/novadesk-sunset.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
  <div className="absolute inset-0 bg-black/20" />

  {/* faint glass frame spanning to the TV */}
  <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-5xl items-center rounded-2xl border border-white/15 bg-white/[0.03] p-4 backdrop-blur-sm">

    {/* signup card */}
    <FadeUp>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/70 p-7 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[#FF5A1F] text-black">◣</span>
          <span className="font-semibold">NovaDesk</span>
        </div>

        <h1 className="mt-7 text-2xl font-bold">Join us</h1>
        <p className="mt-1 text-sm text-white/55">Set up your profile and jump in right now.</p>

        <div className="mt-6 space-y-3">
          <Field placeholder="Input Email" type="email" />
          <Field placeholder="Choose Password" type="password" hasEye />
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" className="accent-[#FF5A1F]" />
          I Agree On The <a className="text-white underline">Rules</a> &amp; <a className="text-white underline">Privacy Notice</a>
        </label>

        <button className="mt-5 w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90">
          Launch Account
        </button>

        <div className="my-4 text-center text-xs text-white/40">or join us via</div>
        <div className="grid grid-cols-3 gap-2">
          <SocialButton provider="google" /><SocialButton provider="apple" /><SocialButton provider="twitter" />
        </div>

        <p className="mt-5 text-center text-xs text-white/50">
          Already Hold An Account? <a className="text-white underline">Enter</a>
        </p>
      </div>
    </FadeUp>
  </div>
</section>
```

## Form data (example, from the preview)
```ts
const signup = {
  brand: "NovaDesk",
  heading: "Join us",
  sub: "Set up your profile and jump in right now.",
  fields: [
    { name: "email",    placeholder: "Input Email",      type: "email" },
    { name: "password", placeholder: "Choose Password",  type: "password", hasEye: true },
  ],
  terms: "I Agree On The Rules & Privacy Notice",
  submit: "Launch Account",
  socials: ["google", "apple", "twitter"],
  altLink: "Already Hold An Account? Enter",
};
```

## Motion & acceptance
- Card fades-up on mount; fields can stagger in slightly. Inputs show a focus ring (orange-tinted) on focus.
- Password eye-toggle switches `type` between password/text. White button darkens slightly on hover.
- Optional: very subtle parallax of the sunset background on mouse-move; CRT TV can have a faint screen-flicker.
- Acceptance checklist:
  - Full-bleed warm sunset landscape background with a retro CRT TV rendered on the hill (right side).
  - Dark glassmorphic signup card on the left, sitting on a larger faint glass frame; NovaDesk logo + name top.
  - "Join us" heading + sub; email + password (with eye toggle) glass inputs; terms checkbox with underlined links.
  - Full-width white "Launch Account" button; "or join us via" divider; 3 social buttons (Google/Apple/Twitter); "Already Hold An Account? Enter" footer.
  - Respect `prefers-reduced-motion`: disable parallax/flicker, keep fade + functional focus states.
```
