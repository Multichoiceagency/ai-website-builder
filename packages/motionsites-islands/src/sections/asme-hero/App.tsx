import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  Instagram,
  Twitter,
} from 'lucide-react'

/**
 * Asme liquid-glass landing — multi-section island matching the MotionSites
 * recreation brief. Videos are same-origin under /motionsites/.
 */
const HERO_VIDEO = '/motionsites/backgrounds/videos/005_Dark-flowers.mp4'
const FEATURED_VIDEO = '/motionsites/sections/videos/003_Bold-Studio.mp4'
const PHILOSOPHY_VIDEO = '/motionsites/sections/videos/006_Art-Landing.mp4'
const SERVICE_A = '/motionsites/sections/videos/014_Reveal-Hero.mp4'
const SERVICE_B = '/motionsites/sections/videos/001_Interactive-Discovery.mp4'

function useCrossfadeVideo(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const fadingOut = useRef(false)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const cancel = () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
    }

    const animateOpacity = (from: number, to: number, ms: number) => {
      cancel()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms)
        video.style.opacity = String(from + (to - from) * t)
        if (t < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }

    const onCanPlay = () => {
      void video.play()
      animateOpacity(0, 1, 500)
    }
    const onTimeUpdate = () => {
      if (!video.duration || fadingOut.current) return
      if (video.duration - video.currentTime <= 0.55) {
        fadingOut.current = true
        animateOpacity(Number(video.style.opacity || 1), 0, 500)
      }
    }
    const onEnded = () => {
      video.style.opacity = '0'
      window.setTimeout(() => {
        video.currentTime = 0
        void video.play()
        fadingOut.current = false
        animateOpacity(0, 1, 500)
      }, 100)
    }

    video.style.opacity = '0'
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    return () => {
      cancel()
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
    }
  }, [videoRef])
}

function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useCrossfadeVideo(videoRef)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-bottom"
        src={HERO_VIDEO}
        muted
        autoPlay
        playsInline
        preload="auto"
      />

      <nav className="relative z-20 px-6 py-6">
        <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-white" />
              <span className="text-lg font-semibold text-white">Asme</span>
            </div>
            <div className="ml-8 hidden gap-8 md:flex">
              {['Features', 'Pricing', 'About'].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  className="text-sm font-medium text-white/80 transition-colors hover:text-white"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <button type="button" className="text-sm font-medium text-white">
              Sign Up
            </button>
            <button
              type="button"
              className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white"
            >
              Login
            </button>
          </div>
          <button
            type="button"
            className="flex flex-col space-y-1.5 md:hidden"
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-4 bg-white" />
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-sm transition-all duration-500 md:hidden ${
            menuOpen ? 'visible opacity-100' : 'invisible opacity-0'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-6">
            <span className="text-lg font-semibold">Asme</span>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 -translate-y-[20%] flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="animate-fade-up font-display text-7xl tracking-tight whitespace-nowrap text-white md:text-8xl lg:text-9xl">
          Know it then <em className="italic">all</em>.
        </h1>
        <div className="animate-fade-up-delay-1 liquid-glass mt-8 flex w-full max-w-xl items-center gap-3 rounded-full py-2 pr-2 pl-6">
          <input
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/40"
            placeholder="Enter your email"
          />
          <button
            type="button"
            className="rounded-full bg-white p-3 text-black"
            aria-label="Subscribe"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
        <p className="animate-fade-up-delay-2 mt-6 max-w-lg px-4 text-sm leading-relaxed text-white">
          Stay updated with the latest news and insights. Subscribe to our newsletter today and
          never miss out on exciting updates.
        </p>
        <button
          type="button"
          className="animate-fade-up-delay-3 liquid-glass mt-8 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
        >
          Manifesto
        </button>
      </div>

      <div className="relative z-10 flex justify-center gap-4 pb-12">
        {[Instagram, Twitter, Globe].map((Icon, index) => (
          <button
            key={index}
            type="button"
            className="liquid-glass rounded-full p-4 text-white/80 transition-all hover:bg-white/5 hover:text-white"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </section>
  )
}

function AboutSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      id="about"
      className="overflow-hidden bg-black px-6 pt-32 pb-10 md:pt-44 md:pb-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      <motion.p
        className="text-sm tracking-widest text-white/40 uppercase"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6 }}
      >
        About Us
      </motion.p>
      <motion.h2
        className="mt-4 max-w-5xl text-4xl leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8, delay: 0.1 }}
      >
        Pioneering <em className="font-display italic text-white/60">ideas</em> for
        <br className="hidden md:block" />
        minds that <em className="font-display italic text-white/60">create, build, and inspire.</em>
      </motion.h2>
    </section>
  )
}

function FeaturedVideoSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="overflow-hidden bg-black px-6 pt-6 pb-20 md:pt-10 md:pb-32">
      <motion.div
        ref={ref}
        className="relative mx-auto aspect-video max-w-6xl overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.9 }}
      >
        <video
          className="h-full w-full object-cover"
          src={FEATURED_VIDEO}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-10">
          <div className="liquid-glass max-w-md rounded-2xl p-6 md:p-8">
            <p className="mb-3 text-xs tracking-widest text-white/50 uppercase">Our Approach</p>
            <p className="text-sm leading-relaxed text-white md:text-base">
              We believe in the power of curiosity-driven exploration. Every project starts with a
              question, and every answer opens a new door to innovation.
            </p>
          </div>
          <motion.button
            type="button"
            className="liquid-glass rounded-full px-8 py-3 text-sm font-medium text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore more
          </motion.button>
        </div>
      </motion.div>
    </section>
  )
}

function PhilosophySection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          className="mb-16 text-5xl tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8 }}
        >
          Innovation <em className="font-display italic text-white/40">x</em> Vision
        </motion.h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            className="aspect-[4/3] overflow-hidden rounded-3xl"
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : undefined}
            transition={{ duration: 0.8 }}
          >
            <video
              className="h-full w-full object-cover"
              src={PHILOSOPHY_VIDEO}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
            />
          </motion.div>
          <motion.div
            className="flex flex-col justify-center gap-8"
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : undefined}
            transition={{ duration: 0.8 }}
          >
            <div>
              <p className="mb-4 text-xs tracking-widest text-white/40 uppercase">Choose your space</p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                Every meaningful breakthrough begins at the intersection of disciplined strategy and
                remarkable creative vision. We operate at that crossroads, turning bold thinking into
                tangible outcomes that move people and reshape industries.
              </p>
            </div>
            <div className="h-px w-full bg-white/10" />
            <div>
              <p className="mb-4 text-xs tracking-widest text-white/40 uppercase">Shape the future</p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                We believe that the best work emerges when curiosity meets conviction. Our process is
                designed to uncover hidden opportunities and translate them into experiences that
                resonate long after the first impression.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const cards = [
    {
      video: SERVICE_A,
      tag: 'Strategy',
      title: 'Research & Insight',
      body: 'We dig deep into data, culture, and human behavior to surface the insights that drive meaningful, lasting change.',
    },
    {
      video: SERVICE_B,
      tag: 'Craft',
      title: 'Design & Execution',
      body: 'From concept to launch, we obsess over every detail to deliver experiences that feel effortless and look extraordinary.',
    },
  ]

  return (
    <section
      ref={ref}
      id="features"
      className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          className="mb-10 flex items-end justify-between"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl tracking-tight text-white md:text-5xl">What we do</h2>
          <span className="hidden text-sm text-white/40 md:inline">Our services</span>
        </motion.div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {cards.map((card, index) => (
            <motion.article
              key={card.title}
              className="liquid-glass group overflow-hidden rounded-3xl"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.8, delay: index * 0.15 }}
            >
              <div className="aspect-video overflow-hidden">
                <video
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={card.video}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                />
              </div>
              <div className="p-6 md:p-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs tracking-widest text-white/40 uppercase">{card.tag}</span>
                  <span className="liquid-glass rounded-full p-2">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="mb-3 text-xl tracking-tight text-white md:text-2xl">{card.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{card.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <div className="bg-black text-white">
      <Hero />
      <AboutSection />
      <FeaturedVideoSection />
      <PhilosophySection />
      <ServicesSection />
    </div>
  )
}
