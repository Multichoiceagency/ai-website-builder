/**
 * Lenis smooth scroll + GSAP ScrollTrigger sync for Nuxt hosts.
 * Storefront only by default — dashboard uses nested `overflow-y-auto` mains
 * and Lenis on `document` steals wheel events (broken page scroll).
 */
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'lenis/dist/lenis.css'

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const config = useRuntimeConfig()
  const enableLenis = Boolean(config.public.motion?.enableLenis)

  gsap.registerPlugin(ScrollTrigger)

  if (!enableLenis) {
    return {
      provide: {
        lenis: null as Lenis | null,
        gsap,
        ScrollTrigger,
      },
    }
  }

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
