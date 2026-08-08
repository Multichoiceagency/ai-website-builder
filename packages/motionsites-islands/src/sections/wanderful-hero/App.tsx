import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Lock } from 'lucide-react'
import './styles.css'

/**
 * Exact Wanderful cinematic hero (ADR-0003 island).
 *
 * Header is intentionally omitted — pages use the system-wide
 * `header-liquid-glass-01` block once, then reuse it across sections.
 * Video is same-origin local MotionSites media (never CloudFront).
 */
const VIDEO = '/motionsites/sections/videos/214_Wanderful-Hero.mp4'

export default function App() {
  const videoWrapRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const raf = useRef(0)

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      target.current = {
        x: ((event.clientX - cx) / cx) * 20,
        y: ((event.clientY - cy) / cy) * 20,
      }
    }

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.06
      current.current.y += (target.current.y - current.current.y) * 0.06
      if (videoWrapRef.current) {
        gsap.set(videoWrapRef.current, {
          x: current.current.x,
          y: current.current.y,
        })
      }
      raf.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    raf.current = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <main className="wanderful relative min-h-screen overflow-x-hidden bg-black text-white">
      <div
        ref={videoWrapRef}
        className="pointer-events-none fixed inset-0 z-0 origin-center scale-[1.08]"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = 1.25
          }}
        />
      </div>

      <div
        className="pointer-events-none fixed left-1/2 top-[120px] z-20 w-full max-w-[1100px] -translate-x-1/2 px-6 text-center opacity-0 translate-y-6 transition-all duration-1000 ease-out [&.in]:translate-y-0 [&.in]:opacity-100"
        ref={(el) => {
          if (el) requestAnimationFrame(() => el.classList.add('in'))
        }}
      >
        <h1
          className="wanderful-heading font-normal text-white"
          style={{
            fontSize: 'clamp(40px, 5.4vw, 72px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          Venture without edges.
        </h1>
        <p
          className="wanderful-heading mt-1 font-normal"
          style={{
            fontSize: 'clamp(40px, 5.4vw, 72px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          Uncover with keen instinct.
        </p>
      </div>

      <div
        className="pointer-events-none fixed bottom-14 left-1/2 z-20 flex w-full max-w-[720px] -translate-x-1/2 flex-col items-center gap-6 px-6 opacity-0 translate-y-6 transition-all delay-300 duration-1000 ease-out [&.in]:translate-y-0 [&.in]:opacity-100"
        ref={(el) => {
          if (el) requestAnimationFrame(() => el.classList.add('in'))
        }}
      >
        <p className="max-w-[620px] text-center text-[15px] leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>
          <span className="text-white">
            Our smart itineraries shape around you — your rhythm, your vibe, your hunger for adventure.
          </span>
          <span className="text-white/55"> Each getaway is tailored, seamless, and wholly yours.</span>
        </p>

        <a
          href="#plan"
          className="pointer-events-auto rounded-full bg-white px-8 py-3.5 text-[15px] font-medium text-black no-underline transition-transform duration-200 hover:scale-[1.03] hover:shadow-[0_0_32px_4px_rgba(255,255,255,0.2)] active:scale-[0.97]"
        >
          Plan my escape today
        </a>

        <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-white/70">
          <Lock size={13} strokeWidth={1.5} aria-hidden="true" />
          <span>SECURE BY DESIGN. ZERO DATA LEAKS.</span>
        </div>
      </div>
    </main>
  )
}
