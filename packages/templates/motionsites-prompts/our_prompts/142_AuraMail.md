# AuraMail — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: SaaS · hero.

Build a dark **`AuraMailHero`** for an AI email app ("Aura"): a near-black stage with a vivid
diagonal aurora light-beam sweeping from bottom-right, a thin top nav, a centered two-line
headline where "Transformed" carries a blue→peach gradient, a pill "Download Aura" button, and
a glassy macOS-style inbox app window floating into frame at the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `clsx`+`tailwind-merge` as `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0A0B0D` with a diagonal **aurora beam** (blue `#3B82F6` →
  violet `#7C5CFF` → peach `#FFB37A`) glowing from the lower-right corner
  (`bg-[radial-gradient(120%_120%_at_85%_85%,rgba(124,92,255,0.5),rgba(59,130,246,0.4)_30%,transparent_60%)]`).
- Headline white; the word **"Transformed"** uses a gradient text fill
  (`bg-gradient-to-r from-[#FFB37A] via-[#C9A2FF] to-[#3B82F6] bg-clip-text text-transparent`).
- Body copy `text-white/65`. Font Inter; headline bold and tight.
- The floating app window is a light card (`bg-white text-zinc-800 rounded-2xl shadow-2xl`).

## Helpers
- `FadeUp` (framer-motion, opacity+y) for nav-less hero copy.
- `WindowFrame` — macOS chrome: three traffic-light dots + content; lifts up with `whileInView` from `y:60`.
- `AuroraBeam` — slow opacity/position breathing on the diagonal glow.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#0A0B0D] pt-6 text-white">
  <AuroraBeam className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_85%,rgba(124,92,255,0.5),rgba(59,130,246,0.4)_30%,transparent_60%)]" />

  {/* top nav */}
  <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-sm">
    <span className="text-white">◈</span>
    <nav className="hidden gap-8 text-white/70 md:flex">
      <a className="hover:text-white">Solutions</a><a className="hover:text-white">Pricing</a>
      <a className="hover:text-white">Blog</a><a className="hover:text-white">Documentation</a>
      <a className="hover:text-white">Careers</a>
    </nav>
  </header>

  {/* centered hero copy */}
  <div className="relative z-10 mx-auto max-w-2xl px-6 pt-16 text-center">
    <FadeUp>
      <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
        Your inbox.
        <br />
        <span className="bg-gradient-to-r from-[#FFB37A] via-[#C9A2FF] to-[#3B82F6] bg-clip-text text-transparent">
          Transformed
        </span>
      </h1>
    </FadeUp>
    <FadeUp delay={0.12}>
      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/65">
        Aura is the premier email experience for the modern era. It leverages advanced AI to
        organize, prioritize and refine your messages into total clarity.
      </p>
    </FadeUp>
    <FadeUp delay={0.24}>
      <a className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90">
        <span aria-hidden>⬇</span> Download Aura <span aria-hidden>→</span>
      </a>
      <p className="mt-3 text-xs text-white/40">Download for Intel / Apple Silicon</p>
    </FadeUp>
  </div>

  {/* faux menu bar + floating inbox window */}
  <div className="relative z-10 mx-auto mt-12 max-w-5xl px-6">
    <div className="flex items-center justify-between rounded-t-md bg-black/60 px-4 py-1.5 text-xs text-white/60 backdrop-blur">
      <span>◔ Aura&nbsp;&nbsp;File&nbsp;&nbsp;Edit&nbsp;&nbsp;View</span>
      <span>Wed May 6 1:09 PM</span>
    </div>
    <WindowFrame>
      <InboxApp />
    </WindowFrame>
  </div>
</section>
```

## Inbox data (example, from the preview)
```ts
const nav = ["Solutions", "Pricing", "Blog", "Documentation", "Careers"];
const inbox = [
  { sender: "Linear",  subject: "New update: Aura AI integration", time: "10:24 AM", unread: true },
  { sender: "GitHub",  subject: "Account alert for your vault",     time: "9:15 AM",  unread: false },
  { sender: "Stripe",  subject: "Your yearly credit is arriving",   time: "YESTERDAY", unread: true },
];
const sidebar = [
  { label: "Inbox", count: 21, active: true },
  { label: "Sent" },
  { label: "Drafts", count: 3 },
  { label: "Trash" },
];
```

## Motion & acceptance
- Aurora beam breathes slowly (opacity/position); headline → sub → CTA stagger via `FadeUp`.
- Inbox `WindowFrame` rises into view (`whileInView` from `y:60, opacity:0`) as if docking from below.
- "Transformed" renders with the warm→cool gradient text fill; "Download Aura" is a solid white pill.
- Respect `prefers-reduced-motion`: freeze aurora, no window slide — fade only.
- Acceptance checklist:
  - Near-black hero with a diagonal blue→violet→peach aurora beam from the lower-right.
  - Thin top nav (logo + Solutions/Pricing/Blog/Documentation/Careers).
  - Centered headline "Your inbox. / Transformed" with gradient on the second word; muted sub-copy.
  - White pill "Download Aura" + "Download for Intel / Apple Silicon" caption.
  - Faux macOS menu bar (traffic lights, clock) above a light inbox app window with sidebar (Inbox 21 / Sent / Drafts 3 / Trash) and a message list; reduced-motion safe.
