import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'

/**
 * Solar Energy Hero — same-origin Motionsites media only (ADR-0003).
 * Catalogue preview video + thumb (never CloudFront /assets placeholders).
 */
const HERO_VIDEO = '/motionsites/sections/videos/050_Solar-Energy-Hero.mp4'
const HERO_POSTER = '/motionsites/sections/thumbs/050_Solar-Energy-Hero.jpg'

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

const FadeUp = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    viewport={{ once: true }}
    className={className}
  >
    {children}
  </motion.div>
)

const SegToggle = ({
  mode,
  setMode,
}: {
  mode: 'morning' | 'night'
  setMode: (mode: 'morning' | 'night') => void
}) => {
  const isMorning = mode === 'morning'

  return (
    <div className="relative flex items-center rounded-full bg-white/20 p-1 shadow-lg backdrop-blur-md">
      <button
        type="button"
        onClick={() => setMode('morning')}
        className={cn(
          'relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300',
          isMorning ? 'text-black' : 'text-white',
        )}
      >
        {isMorning && (
          <motion.div
            layoutId="toggle-knob"
            className="absolute inset-0 rounded-full bg-white"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Sun size={16} aria-hidden="true" /> Morning
        </span>
      </button>
      <button
        type="button"
        onClick={() => setMode('night')}
        className={cn(
          'relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300',
          !isMorning ? 'text-black' : 'text-white',
        )}
      >
        {!isMorning && (
          <motion.div
            layoutId="toggle-knob"
            className="absolute inset-0 rounded-full bg-white"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Moon size={16} aria-hidden="true" /> Night
        </span>
      </button>
    </div>
  )
}

export default function SolarEnergyHero() {
  const [mode, setMode] = useState<'morning' | 'night'>('morning')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <section className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-black">
      {prefersReducedMotion ? (
        <img
          src={HERO_POSTER}
          alt="Sun-lit suburban house with rooftop solar panels"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-[filter] duration-700',
            mode === 'night' && 'brightness-[0.45] saturate-75',
          )}
        />
      ) : (
        <motion.video
          key={mode}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-[filter] duration-700',
            mode === 'night' && 'brightness-[0.45] saturate-75',
          )}
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white/10 via-transparent to-black/15" />

      <div className="relative z-20 flex w-full items-center justify-between p-4 md:p-6">
        <FadeUp delay={0}>
          <div className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
            <span aria-hidden="true">⚡</span> reposit
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <button
            type="button"
            className="rounded-full bg-[#0B0B0C] px-5 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-gray-800"
          >
            Get an Instant Quote
          </button>
        </FadeUp>
      </div>

      <div className="relative z-20 flex flex-grow flex-col items-center justify-center px-4 pb-20 text-center">
        <FadeUp delay={0.3}>
          <h1 className="text-5xl font-semibold leading-tight text-white drop-shadow-lg [text-shadow:_0_2px_4px_rgb(0_0_0_/_50%)] md:text-7xl lg:text-8xl">
            $0 Electricity Bills
            <br />
            for the next 7 years
          </h1>
        </FadeUp>
      </div>

      <div className="relative z-20 flex w-full flex-col items-center justify-between p-4 md:flex-row md:p-6">
        <FadeUp delay={0.45} className="mb-4 md:mb-0 md:mr-auto">
          <p className="text-sm text-white drop-shadow-md [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]">
            *Terms and conditions apply. Offer valid for new installations only.
          </p>
        </FadeUp>
        <FadeUp delay={0.45}>
          <SegToggle mode={mode} setMode={setMode} />
        </FadeUp>
      </div>
    </section>
  )
}
