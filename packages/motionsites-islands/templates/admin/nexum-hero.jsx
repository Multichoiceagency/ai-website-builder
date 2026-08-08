import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'

/**
 * Exact Nexum cinematic AI-ops hero (ADR-0003 island).
 *
 * Full-bleed video is same-origin local MotionSites media (never CloudFront).
 * Nav is part of this section brief (unlike Wanderful, which uses the system header).
 */
const VIDEO = '/motionsites/sections/videos/nexum-hero.mp4'
const NAV_LINKS = ['Modules', 'Clientele', 'Solutions', 'Billing'] as const
const CTA_GRADIENT = { background: 'linear-gradient(to bottom, #2B2B2B, #101010)' } as const

function NexumLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 256 256"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M 128 128 C 128 198.692 70.692 256 0 256 C 0 185.308 57.308 128 128 128 Z M 128 128 C 198.692 128 256 185.308 256 256 C 185.308 256 128 198.692 128 128 Z M 0 0 C 70.692 0 128 57.308 128 128 C 57.308 128 0 70.692 0 0 Z M 256 0 C 256 70.692 198.692 128 128 128 C 128 57.308 185.308 0 256 0 Z"
      />
    </svg>
  )
}

export default function NexumHero() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <section className="nexum relative h-screen w-full overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
          <a href="#top" className="flex items-center gap-2 no-underline">
            <NexumLogo className="fill-[#010101] text-[#010101] lg:fill-white lg:text-white" />
            <span className="text-lg font-semibold text-[#010101] lg:text-white">nexum</span>
          </a>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg">
              {NAV_LINKS.map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  className="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 no-underline transition-colors hover:bg-white/10 hover:text-white"
                >
                  {label}
                  {label === 'Solutions' ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : null}
                </a>
              ))}
            </div>
            <button
              type="button"
              className="nexum-cta self-stretch rounded-full px-5 text-sm font-medium text-white transition-opacity"
              style={CTA_GRADIENT}
            >
              Get started
            </button>
          </div>

          <button
            type="button"
            className="relative z-50 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-[#010101] backdrop-blur-lg md:hidden lg:text-white"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu
              className={`absolute h-5 w-5 transition-all duration-300 ${
                menuOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
              }`}
            />
            <X
              className={`absolute h-5 w-5 transition-all duration-300 ${
                menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
              }`}
            />
          </button>
        </nav>

        {/* Mobile overlay + drawer */}
        <div
          className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300 md:hidden ${
            menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={!menuOpen}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col bg-black/90 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="flex flex-col gap-2 px-6 pt-24">
            {NAV_LINKS.map((label, index) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium text-white/80 no-underline transition-all duration-300 hover:bg-white/10 hover:text-white"
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateX(0)' : 'translateX(24px)',
                  transitionDelay: menuOpen ? `${(index + 1) * 60}ms` : '0ms',
                }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
                {label === 'Solutions' ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : null}
              </a>
            ))}
          </div>
          <div
            className="mt-auto px-6 pb-10 transition-all duration-[400ms]"
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: menuOpen ? '300ms' : '0ms',
            }}
          >
            <button
              type="button"
              className="nexum-cta w-full rounded-full px-6 py-3.5 text-sm font-medium text-white transition-opacity"
              style={CTA_GRADIENT}
            >
              Get started
            </button>
          </div>
        </aside>

        {/* Bottom-anchored content */}
        <div className="mt-auto flex flex-col gap-6 px-5 pb-8 sm:gap-8 sm:px-8 sm:pb-12 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-16">
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-[#010101] sm:text-4xl lg:text-[3.5rem] lg:text-white">
              Ship AI workers that grind while you rest
            </h1>

            <form
              className="mt-6 flex flex-col gap-3 sm:mt-8 sm:inline-flex sm:flex-row sm:items-center sm:rounded-full sm:bg-white sm:p-1.5"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Type your email"
                className="rounded-full bg-white px-5 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 sm:w-64 sm:rounded-none sm:bg-transparent sm:px-4 sm:py-2"
              />
              <button
                type="submit"
                className="nexum-cta rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity sm:py-2.5"
                style={CTA_GRADIENT}
              >
                Get started
              </button>
            </form>
          </div>

          <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto lg:gap-5">
            <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6">
              <p className="nexum-stat text-3xl font-normal tracking-tight text-[#010101] sm:text-4xl lg:text-white">
                42,500+
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#010101]/70 sm:mt-4 lg:text-white/70">
                Teams run Nexum to handle recurring ops daily.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6">
              <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <span className="grid h-6 w-6 place-items-center rounded bg-black text-xs font-bold text-white">
                  S
                </span>
                <span className="text-sm font-semibold text-[#010101] lg:text-white">Stratify</span>
              </div>
              <p className="text-sm leading-relaxed text-[#010101]/80 lg:text-white/80">
                &ldquo;With Nexum we went from managing tedious operational work to having AI agents that
                handle everything.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3 sm:mt-5">
                <img
                  src="https://i.pravatar.cc/72?img=12"
                  alt="Sara Klein"
                  className="h-9 w-9 rounded-full object-cover bg-white/20"
                  width={36}
                  height={36}
                />
                <div>
                  <p className="text-sm font-semibold text-[#010101] lg:text-white">Sara Klein</p>
                  <p className="text-xs text-[#010101]/60 lg:text-white/60">Dir of Operations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
