export type LiquidGlassHeaderLink = {
  label: string
  href: string
}

export type LiquidGlassHeaderProps = {
  brand: string
  trademark?: boolean
  links?: LiquidGlassHeaderLink[]
  ctaLabel?: string
  ctaHref?: string
}

/**
 * Shared MotionSites liquid-glass header chrome.
 * Used by islands that still embed a header; system pages should prefer the
 * Vue registry block `header-liquid-glass-01` so navigation is generated once.
 */
export function LiquidGlassHeader({
  brand,
  trademark = true,
  links = [
    { label: 'JOURNEY', href: '#journey' },
    { label: 'BENEFITS', href: '#benefits' },
    { label: 'JOURNAL', href: '#journal' },
    { label: 'GUIDEBOOK', href: '#guidebook' },
  ],
  ctaLabel = 'GET ROAMING',
  ctaHref = '#plan',
}: LiquidGlassHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
      <a
        href="/"
        className="text-[17px] font-semibold tracking-tight text-white no-underline [text-shadow:0_1px_12px_rgba(0,0,0,0.55)]"
      >
        {brand}
        {trademark ? <sup className="ml-0.5 text-[0.65em]">TM</sup> : null}
      </a>

      <nav
        className="liquid-glass hidden items-center gap-1 rounded-full px-2 py-2 md:flex"
        aria-label="Primary"
      >
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="relative z-[1] rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] text-white/95 no-underline transition-colors duration-200 hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <a
        href={ctaHref}
        className="liquid-glass relative z-[1] rounded-full px-5 py-2.5 text-[11px] font-medium tracking-[0.12em] text-white/95 no-underline transition-colors duration-200 hover:text-white"
      >
        {ctaLabel}
      </a>
    </header>
  )
}
