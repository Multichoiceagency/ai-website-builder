/**
 * Lenis smooth scroll + GSAP ScrollTrigger sync for Nuxt hosts (storefront / dashboard).
 * Respects prefers-reduced-motion. Motionsites islands keep their own scroll — do not use there.
 */
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'lenis/dist/lenis.css'

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  gsap.registerPlugin(ScrollTrigger)

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    return {
      provide: {
        lenis: null as Lenis | null,
        gsap,
        ScrollTrigger,
      },
    }
  }

  const lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)

  const tick = (time: number) => {
    lenis.raf(time * 1000)
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    })
  }

  return {
    provide: {
      lenis,
      gsap,
      ScrollTrigger,
    },
  }
})
