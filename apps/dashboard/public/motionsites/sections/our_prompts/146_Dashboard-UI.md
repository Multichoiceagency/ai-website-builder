# Dashboard UI — onze versie (reverse-engineerd uit de preview)

> Origineel geschreven o.b.v. de preview-afbeelding. Categorie: Dashboard · dashboard.
> macOS-achtige meeting/rooms dashboard over een Bliss-style grasveld-wallpaper: bovenbalk met toggle + "Meeting is about to start" timer-pill + Dashboard/Rooms tabs, een grid van witte room-kaarten met avatar-stacks, en een floating avatar-dock onderaan.

Build a glassy **`RoomsDashboard`** UI mock over the classic green-hill-blue-sky wallpaper:
a top toolbar (toggle, centered "meeting about to start" countdown pill, Dashboard/Rooms tabs,
search), a responsive grid of white rounded room-cards (each with a title, subtitle, avatar stack,
member count and contextual content like a waveform or screen-share thumbnails), and a centered
floating avatar dock at the bottom.

## Stack & global setup
- React 18 + Vite + TypeScript, TailwindCSS, `framer-motion`, `cn()` from `@/lib/utils`.
- Light/photo theme. Background = the iconic green-hill + blue-sky wallpaper (`/assets/bliss.jpg`, `object-cover`).
- Colors I see: pure white cards `#FFFFFF` with soft shadow + `rounded-3xl`, ink text `#1D2433`,
  muted subtitles `text-slate-400`, the toggle is sky-blue `#3B82F6`, active tab = white pill on translucent bar.
- Chrome bars are translucent glass: `bg-white/30 backdrop-blur-md border border-white/40`.
- Font Inter / SF-like system stack. Max width `max-w-[1200px]`; card grid `md:grid-cols-4`.

## Helpers
- `FadeUp` — framer-motion stagger wrapper for cards.
- `AvatarStack` — overlapping round avatars (`-space-x-2`) + a count bubble.
- `RoomCard` — white card shell with header (title/subtitle), optional media (waveform / thumbs / "+ create"), footer (avatars + count).
- `Toggle` — animated sky-blue pill switch.

## Structure
```tsx
<section className="relative min-h-screen overflow-hidden">
  <img src="/assets/bliss.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />

  {/* TOP TOOLBAR (glass) */}
  <header className="relative z-10 flex items-center justify-between px-6 py-4">
    <div className="flex items-center gap-3">
      <Toggle />
      <span className="text-sm text-white drop-shadow">Settings</span>
    </div>
    <div className="flex items-center gap-2 rounded-full bg-white/40 px-4 py-1.5 text-sm text-slate-700 backdrop-blur-md">
      <img className="h-5 w-5 rounded-full" /> Meeting is about to start <span className="font-mono">-5:23</span> ↻
    </div>
    <div className="flex items-center gap-2 rounded-full bg-white/30 p-1 backdrop-blur-md">
      <button className="px-4 py-1.5 text-sm text-white">Dashboard</button>
      <button className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-800">Rooms</button>
      <button className="px-3">⌕</button>
    </div>
  </header>

  {/* ROOM CARD GRID */}
  <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-6 pt-4 sm:grid-cols-2 md:grid-cols-4">
    {rooms.map((r, i) => (
      <FadeUp key={r.title} delay={i * 0.06}>
        <RoomCard {...r} />
      </FadeUp>
    ))}
  </div>

  {/* FLOATING AVATAR DOCK */}
  <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/30 px-4 py-2 backdrop-blur-md">
    <AvatarStack people={dockPeople} extra="+17" />
    <button className="rounded-full bg-slate-800/70 p-2 text-white">🎥</button>
    <button className="rounded-full bg-slate-800/70 p-2 text-white">🎙</button>
  </div>
</section>
```

## Rooms data (example, from the preview)
```ts
const rooms = [
  { title: "Create a room", placeholder: true },                                   // dashed "+ Create a room" tile
  { title: "Subscription Growth Experiments", subtitle: "Sprint Retrospective", count: 9 },
  { title: "Weekly Insights", subtitle: "", media: "waveform", count: 0, play: true },
  { title: "Product Strategy 2023", subtitle: "No upcoming meetings", count: 32 },
  { title: "User Onboarding Team", subtitle: "Sprint Planning", count: 3 },
  { title: "User & Market Research", subtitle: "No upcoming meetings", count: 6 },
  { title: "Core Product Team", subtitle: "Core Product Team", count: 2 },
  { title: "Screen Share", subtitle: "0:30", media: "thumbs", count: 8 },          // two landscape thumbnails
];

const dockPeople = ["/a1.jpg","/a2.jpg","/a3.jpg","/a4.jpg"];
```

## Motion & acceptance
- Bliss-style green-hill / blue-sky wallpaper fills the viewport; all chrome is translucent glass (`backdrop-blur-md`, white/30).
- Top toolbar: sky-blue toggle + "Settings" (left), a centered "Meeting is about to start −5:23" countdown pill, and Dashboard/Rooms tabs (Rooms active = white pill) + search (right).
- Grid of white rounded room-cards: a dashed "Create a room" tile, cards with title + subtitle, avatar stacks + member-count bubbles, a "Weekly Insights" card with a tiny audio waveform + play, and a "Screen Share 0:30" card with two thumbnail previews.
- A centered floating avatar dock at the bottom with overlapping avatars, "+17" overflow, and camera/mic buttons.
- Cards stagger-fade-up on mount; avatar dock fades in last; cards lift slightly on hover.
- Reduced-motion: no translate/scale, keep glass + static layout. Grid responsively collapses 4→2→1 columns; dock stays pinned bottom-center.
