import { useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'

/** Exact-feel Velorah video hero — local MotionSites media, liquid-glass chrome. */
const VIDEO = '/motionsites/sections/videos/002_Dreamcore-Landing.mp4'

const NAV = ['Work', 'Studio', 'Approach', 'Contact'] as const

export default function App() {
  const [open, setOpen] = useState(false)

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src={VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-black/70" />

      <nav className="relative z-20 px-6 py-6 sm:px-10 lg:px-16">
        <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-3">
          <span className="font-display text-xl tracking-wide sm:text-2xl">Velorah</span>
          <div className="hidden items-center gap-8 md:flex">
            {NAV.map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="text-sm font-medium tracking-widest text-white/80 uppercase transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
          <a
            href="#contact"
            className="hidden items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-xs tracking-widest uppercase transition-colors hover:border-white/60 hover:bg-white/10 md:inline-flex"
          >
            Start a project
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 px-6 py-6 backdrop-blur-sm md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl">Velorah</span>
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X className="h-7 w-7" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            {NAV.map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="font-display text-4xl uppercase"
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-20 sm:px-10 lg:px-16">
        <p className="animate-fade-up mb-6 text-xs tracking-[0.3em] text-white/70 uppercase sm:text-sm">
          Cinematic digital studio
        </p>
        <h1 className="animate-fade-up-delay-1 font-display text-[clamp(2.8rem,8vw,7rem)] leading-[0.92] tracking-tight uppercase">
          Design.
          <br />
          Disrupt.
          <br />
          <em className="italic">Deliver.</em>
        </h1>
        <p className="animate-fade-up-delay-2 mt-6 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
          Full-viewport motion heroes with liquid-glass chrome — rebuilt as a first-party island
          from the MotionSites brief.
        </p>
        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
          <a
            href="#work"
            className="group inline-flex items-center gap-2 bg-black px-6 py-3 text-[11px] tracking-widest uppercase transition-colors hover:bg-white/10 sm:px-7 sm:py-4 sm:text-xs"
          >
            See our work
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </main>
  )
}
