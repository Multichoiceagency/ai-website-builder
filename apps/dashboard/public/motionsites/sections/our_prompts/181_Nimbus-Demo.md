# Nimbus Demo — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Dashboard Demo · dashboard.

Build a dark product-demo **`NimbusDemo`** section: a left bold headline with a right supporting
paragraph, a small "FIG. 2 — NIMBUS GRID WEB CONSOLE" caption, and a large browser-chrome window
showing a "Storage Pools" admin app with a left sidebar, a data table, and a floating toast.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Dark theme. Background = near-black `#0C0E12` with a faint vertical gradient.
- Key colors from the image: off-white headings `#EBEDF0`, muted slate body `#8A92A0`,
  the app window is dark `#13161B` with `border-white/10`, table text muted slate, status pills
  in green `#34D399` (HEALTHY), amber `#FBBF24` (SYNCING/QUEUED), a teal toast `#0E3A3A`.
- Typeface: Inter for copy; small uppercase mono-ish caption (`tracking-widest`). App uses
  small table type, `tabular-nums` for sizes.
- Max content width `max-w-6xl`.

## Helpers
- `FadeUp` — `framer-motion`: `initial={{opacity:0,y:22}}`, `whileInView={{opacity:1,y:0}}`,
  `transition={{duration:0.7, delay, ease:[0.22,1,0.36,1]}}`, `viewport={{once:true}}`.
- `Window` — browser-chrome shell (3 traffic-light dots + faux URL bar) wrapping children.
- `StatusPill` — colored uppercase status chip (healthy / syncing / queued).
- `Toast` — small teal slide-in notification.

## Structure
```tsx
<section className="relative overflow-hidden bg-[#0C0E12] px-6 py-16 text-white md:py-20">
  <div className="mx-auto max-w-6xl">

    {/* heading row */}
    <FadeUp>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <h2 className="text-3xl font-medium leading-tight tracking-tight text-[#EBEDF0] md:text-4xl">
          The biggest forward leap in business cloud storage operations.
        </h2>
        <p className="self-end text-sm leading-relaxed text-[#8A92A0]">
          A single control plane for provisioning storage pools, reviewing policy, watching
          growth, and shipping audit-ready reports without asking teams to change how they work.
        </p>
      </div>
    </FadeUp>

    {/* figure caption */}
    <FadeUp delay={0.1}>
      <p className="mt-8 inline-block rounded border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#8A92A0]">
        FIG. 2 — Nimbus Grid Web Console
      </p>
    </FadeUp>

    {/* browser window with admin app */}
    <FadeUp delay={0.2}>
      <Window>
        <div className="grid grid-cols-[180px_1fr]">
          {/* sidebar */}
          <aside className="border-r border-white/10 p-4 text-sm text-[#8A92A0]">
            <p className="mb-4 font-semibold text-white">Client Vault</p>
            <nav className="flex flex-col gap-2">
              {sidebar.map(s => (
                <a key={s} className={cn("rounded-md px-2 py-1.5 transition hover:text-white",
                  s==="Storage Pools" && "bg-white/[0.06] text-white")}>{s}</a>
              ))}
            </nav>
          </aside>

          {/* main: table */}
          <div className="relative p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Storage Pools</h3>
              <button className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white">NEW POOL</button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-[#5C636E]">
                  <th className="pb-3">Name</th><th>Region</th><th>Used</th><th>Policy</th><th>State</th>
                </tr>
              </thead>
              <tbody className="text-[#A9B0BC]">
                {pools.map(p => (
                  <tr key={p.name} className="border-t border-white/[0.06]">
                    <td className="py-3">{p.name}</td>
                    <td>{p.region}</td>
                    <td className="tabular-nums">{p.used}</td>
                    <td>{p.policy}</td>
                    <td><StatusPill state={p.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Toast title="Pool created" body="finance-vault ready" />
          </div>
        </div>
      </Window>
    </FadeUp>
  </div>
</section>
```

## Window / StatusPill / Toast helpers
```tsx
const Window = ({children}:{children:React.ReactNode}) => (
  <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#13161B] shadow-2xl">
    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      <div className="ml-3 h-4 w-40 rounded bg-white/[0.06]" />
    </div>
    {children}
  </div>
);
const StatusPill = ({state}:{state:"HEALTHY"|"SYNCING"|"QUEUED"}) => {
  const c = { HEALTHY:"text-emerald-400", SYNCING:"text-amber-400", QUEUED:"text-amber-400" }[state];
  return <span className={cn("text-[11px] font-semibold uppercase tracking-wider", c)}>{state}</span>;
};
const Toast = ({title,body}:{title:string;body:string}) => (
  <motion.div initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
    transition={{delay:0.6}}
    className="absolute bottom-4 right-4 rounded-lg border border-teal-500/30 bg-[#0E3A3A] px-4 py-3 text-xs">
    <p className="font-semibold text-teal-200">{title}</p>
    <p className="text-teal-300/70">{body}</p>
  </motion.div>
);
```

## Data (from the preview)
```ts
const sidebar = ["Workspaces","Storage Pools","Retention","Access","Transfers","Reports"];
const pools = [
  { name:"finance-vault",  region:"EU Central", used:"18.4 TiB", policy:"7 years",   state:"HEALTHY" },
  { name:"design-assets",  region:"US East",    used:"9.8 TiB",  policy:"Versioned", state:"SYNCING" },
  { name:"legal-archive",  region:"EU Central", used:"42.1 TiB", policy:"Immutable", state:"HEALTHY" },
  { name:"migration-lane", region:"AP South",   used:"6.2 TiB",  policy:"Temporary", state:"QUEUED" },
] as const;
```

## Motion & acceptance
- Heading row → caption → window fade up (delays 0 / .1 / .2).
- Table rows can stagger-fade in inside the window; the teal toast slides up last (delay ~.6).
- Optional: window tilts subtly with a `whileInView` y-lift to feel like it presents itself.
- Respect `prefers-reduced-motion`: disable row stagger + toast slide, keep simple fades.
- Acceptance checklist:
  - Dark section; left bold headline + right muted paragraph.
  - Small bordered "FIG. 2 — NIMBUS GRID WEB CONSOLE" caption above the mockup.
  - Browser-chrome window (3 dots + faux URL bar) with a dark "Client Vault" sidebar (Storage Pools active).
  - Main panel: "Storage Pools" title + "NEW POOL" button + a 5-column table (Name/Region/Used/Policy/State) with colored status pills (HEALTHY green, SYNCING/QUEUED amber).
  - Floating teal "Pool created / finance-vault ready" toast bottom-right. Responsive: sidebar collapses on mobile.
