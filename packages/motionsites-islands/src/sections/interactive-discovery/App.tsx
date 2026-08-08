import React, { useState, useEffect, useRef, useCallback } from 'react'
import { listenHostProps, type MotionsitesHostProps } from '@shared/hostProps'

const BG_IMAGE_1 = '/motionsites/sections/assets/001_Interactive-Discovery-base.webp'
const BG_IMAGE_2 = '/motionsites/sections/assets/001_Interactive-Discovery-reveal.webp'
const SPOTLIGHT_R = 260

const DEFAULTS = {
  headline: 'Layers hold',
  headlineLine2: 'tales of time',
  bodyLeft:
    'Every layer of sediment records a chapter of our planet, from ancient seabeds to drifting ash, layered across millions of years beneath us.',
  bodyRight:
    'Our interactive maps let you peel back the crust to trace how stones, fossils, and deep time combine to shape the ground beneath your feet.',
  ctaLabel: 'Start Digging',
  fontDisplay: 'Playfair Display',
  fontBody: 'Inter',
} as const

function googleFontsHref(display: string, body: string) {
  const families = [display, body]
    .filter(Boolean)
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400`)
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

function mergeCopy(host: MotionsitesHostProps) {
  return {
    headline: host.headline?.trim() || DEFAULTS.headline,
    headlineLine2: host.headlineLine2?.trim() || DEFAULTS.headlineLine2,
    bodyLeft: host.bodyLeft?.trim() || DEFAULTS.bodyLeft,
    bodyRight: host.bodyRight?.trim() || DEFAULTS.bodyRight,
    ctaLabel: host.ctaLabel?.trim() || DEFAULTS.ctaLabel,
    fontDisplay: host.fontDisplay?.trim() || DEFAULTS.fontDisplay,
    fontBody: host.fontBody?.trim() || DEFAULTS.fontBody,
  }
}

const globalKeyframes = `
@keyframes hero-zoom {
  0% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes hero-reveal {
  0% { opacity: 0; transform: translateY(20px) blur(8px); }
  100% { opacity: 1; transform: translateY(0) blur(0); }
}

@keyframes hero-fade {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.hero-zoom {
  animation: hero-zoom 3s ease-out forwards;
}

.hero-anim {
  animation-fill-mode: forwards;
  animation-duration: 1s;
  animation-timing-function: ease-out;
  opacity: 0;
}

.hero-reveal {
  animation-name: hero-reveal;
}

.hero-fade {
  animation-name: hero-fade;
}
`

type RevealProps = {
  image: string
  cursorX: number
  cursorY: number
}

const RevealLayer = ({ image, cursorX, cursorY }: RevealProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const revealDivRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const updateCanvasSize = useCallback(() => {
    setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const revealDiv = revealDivRef.current

    if (ctx && revealDiv && cursorX !== -999 && cursorY !== -999) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, SPOTLIGHT_R)
      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.4, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.75)')
      gradient.addColorStop(0.75, 'rgba(255,255,255,0.4)')
      gradient.addColorStop(0.88, 'rgba(255,255,255,0.12)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, 2 * Math.PI)
      ctx.fill()

      const dataURL = canvas.toDataURL()
      revealDiv.style.maskImage = `url(${dataURL})`
      revealDiv.style.webkitMaskImage = `url(${dataURL})`
      revealDiv.style.maskSize = '100% 100%'
      revealDiv.style.webkitMaskSize = '100% 100%'
    }
  }, [cursorX, cursorY, canvasSize])

  return (
    <>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'none' }}
      />
      <div
        ref={revealDivRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        style={{ backgroundImage: `url(${image})` }}
      />
    </>
  )
}

export default function LithosHero() {
  const mouse = useRef({ x: -999, y: -999 })
  const smooth = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number | null>(null)
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 })
  const [copy, setCopy] = useState(() => mergeCopy({}))

  useEffect(() => {
    const { unsubscribe } = listenHostProps('interactive-discovery', (host) => {
      setCopy(mergeCopy(host))
    })
    return unsubscribe
  }, [])

  const animateCursor = useCallback(() => {
    smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1
    smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1
    setCursorPos({ x: smooth.current.x, y: smooth.current.y })
    rafRef.current = requestAnimationFrame(animateCursor)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener('mousemove', handleMouseMove)
    rafRef.current = requestAnimationFrame(animateCursor)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [animateCursor])

  const fontsHref = googleFontsHref(copy.fontDisplay, copy.fontBody)

  return (
    <>
      <link rel="stylesheet" href={fontsHref} />
      <style>{globalKeyframes}</style>
      <main
        className="min-h-screen bg-white tracking-[-0.02em]"
        style={{ fontFamily: `'${copy.fontBody}', sans-serif` }}
      >
        <section className="relative w-full overflow-hidden h-screen bg-black" style={{ height: '100dvh' }}>
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom"
            style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
          />

          <RevealLayer image={BG_IMAGE_2} cursorX={cursorPos.x} cursorY={cursorPos.y} />

          <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
            <h1 className="text-white leading-[0.95]">
              <span
                className="block italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
                style={{
                  fontFamily: `'${copy.fontDisplay}', serif`,
                  letterSpacing: '-0.05em',
                  animationDelay: '0.25s',
                }}
              >
                {copy.headline}
              </span>
              <span
                className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
                style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
              >
                {copy.headlineLine2}
              </span>
            </h1>
          </div>

          <div
            className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade"
            style={{ animationDelay: '0.7s' }}
          >
            <p className="text-sm text-white/80 leading-relaxed">{copy.bodyLeft}</p>
          </div>

          <div
            className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade"
            style={{ animationDelay: '0.85s' }}
          >
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{copy.bodyRight}</p>
            <button className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30">
              {copy.ctaLabel}
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
