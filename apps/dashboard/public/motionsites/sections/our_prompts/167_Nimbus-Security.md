# Nimbus Security — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Cards · features.

Build a dark, enterprise **`NimbusSecurity`** feature section: a small "SECURITY" eyebrow, a
left bold headline with a right supporting paragraph, then three dark glass cards — a terminal/
YAML snippet, a compliance checklist, and an "economics" card with an ASCII texture and a mini spec table.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = very dark brown/charcoal `#15110C` with a faint warm amber glow at
  top-right (`radial-gradient(50% 60% at 90% 0%, rgba(180,120,40,0.18), transparent)`).
- Key colors from the image: off-white headings `#EDE9E1`, muted warm-grey body `#9A9388`,
  amber accent `#C99A4E` (eyebrow, check icons, code highlights), cards `bg-white/[0.03]
  border-white/[0.07] rounded-2xl`, monospace code in soft amber/green on near-black.
- Typeface: Inter for headings/body; `font-mono` for terminal, YAML, ASCII art and the spec table.
- Max content width `max-w-6xl`.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:22}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.7, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Card` — dark glass container with title + sub.
- `CheckItem` — amber circular check icon + label + sub line.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#15110C] px-6 py-16 text-white md:py-20">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_90%_0%,rgba(180,120,40,0.18),transparent)]" />
  <div className="relative mx-auto max-w-6xl">

    {/* eyebrow + heading row */}
    <FadeUp>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C99A4E]">Security</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <h2 className="text-2xl font-medium leading-snug tracking-tight text-[#EDE9E1] md:text-3xl">
          Modern encryption and compliance controls without slowing the team down.
        </h2>
        <p className="self-end text-sm leading-relaxed text-[#9A9388]">
          Role-based access, customer-managed keys, immutable retention, and regional storage
          policies give business clients a cloud layer that can satisfy procurement, IT, and
          legal from the first deployment.
        </p>
      </div>
    </FadeUp>

    {/* three cards */}
    <div className="mt-10 grid gap-5 md:grid-cols-3">
      {/* 1 — policy control + terminal/YAML */}
      <FadeUp delay={0.1}>
        <Card title="Full policy control"
              sub="First-class API access for storage pools, keys, regions, and retention rules. No vendor lock-in to proprietary workflows.">
          <pre className="mt-5 overflow-hidden rounded-xl bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-300/90">
{`$ nimbus auth login
Enter code: VAULT-XXXX
-> policy attach
   workspace/client-vault`}
          </pre>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[10px] text-[#C99A4E]">
{`openapi: 3.0.0
info:
  title: Nimbus API
paths:
  /storage/pools:
    /keys:
    /regions:
    /retention:`}
          </div>
        </Card>
      </FadeUp>

      {/* 2 — compliance checklist */}
      <FadeUp delay={0.2}>
        <Card title="Full compliance"
              sub="SOC 2, ISO 27001, and GDPR-ready controls help teams satisfy audits, procurement reviews, and data residency requirements.">
          <ul className="mt-5 flex flex-col gap-3">
            {compliance.map(c => <CheckItem key={c.title} {...c} />)}
          </ul>
        </Card>
      </FadeUp>

      {/* 3 — economics + ASCII + spec table */}
      <FadeUp delay={0.3}>
        <Card title="Ownership and predictable economics"
              sub="Reserved capacity, clear transfer lanes, and audit-ready billing make storage spend easy to forecast across business units.">
          <pre className="mt-5 select-none font-mono text-[8px] leading-[1.1] text-[#C99A4E]/70">
{`1111111111111111111111
1111111111000001111111
1111111110001100111111
1111111110011100111111`}
          </pre>
          <table className="mt-4 w-full font-mono text-[11px] text-[#9A9388]">
            <tbody>
              {economics.map(r => (
                <tr key={r.k} className="border-t border-white/10">
                  <td className="py-2 uppercase tracking-wider">{r.k}</td>
                  <td className="py-2 text-right text-white">{r.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </FadeUp>
    </div>
  </div>
</section>
```

## Card / CheckItem helpers
```tsx
const Card = ({title,sub,children}:{title:string;sub:string;children:React.ReactNode}) => (
  <div className="flex h-full flex-col rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-sm">
    <h3 className="text-sm font-semibold text-[#EDE9E1]">{title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-[#9A9388]">{sub}</p>
    {children}
  </div>
);
const CheckItem = ({title,sub}:{title:string;sub:string}) => (
  <li className="flex items-start gap-3">
    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#C99A4E]/50 text-[10px] text-[#C99A4E]">✓</span>
    <div><p className="text-sm text-white">{title}</p><p className="text-[11px] text-[#9A9388]">{sub}</p></div>
  </li>
);
```

## Data (from the preview)
```ts
const compliance = [
  { title:"Type II controls",     sub:"SOC 2" },
  { title:"Security management",   sub:"ISO 27001" },
  { title:"Regional data policy",  sub:"GDPR" },
];
const economics = [
  { k:"Reserved Tier",  v:"24 TiB" },
  { k:"Transfer Lane",  v:"EU Central" },
  { k:"Revision",       v:"Q403" },
];
```

## Motion & acceptance
- Eyebrow + heading row fade up first; the three cards stagger up (delays .1 / .2 / .3).
- The terminal block can type its lines in (optional); ASCII art stays static and faint.
- Cards lift slightly on hover (`whileHover y:-4`) with a brighter amber border.
- Respect `prefers-reduced-motion`: disable typing + hover lift, keep opacity fades.
- Acceptance checklist:
  - Dark warm-charcoal section with subtle amber glow top-right.
  - "SECURITY" amber eyebrow; left bold headline + right muted supporting paragraph.
  - Three dark glass cards: (1) policy control with terminal + YAML snippet, (2) compliance with amber-check list (SOC 2 / ISO 27001 / GDPR), (3) economics with faint ASCII texture + Reserved Tier / Transfer Lane / Revision spec table.
  - Monospace used for all code/table content; amber accents throughout. Responsive: 3 cols → 1 col on mobile.
