<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import type { SectionMotion } from '@platform/schemas'

/**
 * Applies a stored motion intent to its slot.
 *
 * CSS presets remain the default. Hero / product reveals also run a short GSAP
 * tween when the library is available (Lenis+GSAP host plugin).
 */
const props = withDefaults(
  defineProps<{
    motion?: Partial<SectionMotion> | null
    as?: string
    vars?: Record<string, string> | null
  }>(),
  { motion: null, as: 'div', vars: null },
)

const preset = computed(() => props.motion?.preset ?? 'none')
const trigger = computed(() => props.motion?.trigger ?? 'viewport')
const once = computed(() => props.motion?.once ?? true)

const style = computed(() => ({
  ...(props.vars ?? {}),
  '--motion-delay': `${(props.motion?.delay ?? 0) * 1000}ms`,
  '--motion-stagger': `${(props.motion?.stagger ?? 0.08) * 1000}ms`,
}))

const root = ref<HTMLElement | null>(null)
const state = ref<'hidden' | 'visible'>(preset.value === 'none' ? 'visible' : 'hidden')
let observer: IntersectionObserver | null = null
let loadFrame = 0
let tween: gsap.core.Tween | null = null

const GSAP_PRESETS = new Set(['hero-reveal', 'product-reveal', 'fade-up', 'scale-in', 'blur-in'])

function clearObserver() {
  observer?.disconnect()
  observer = null
  if (loadFrame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(loadFrame)
    loadFrame = 0
  }
}

function playGsap() {
  const el = root.value
  if (!el || !GSAP_PRESETS.has(preset.value)) return
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  tween?.kill()
  const from: gsap.TweenVars = { autoAlpha: 0, duration: 0.7, ease: 'power2.out', delay: props.motion?.delay ?? 0 }
  if (preset.value === 'fade-up' || preset.value === 'hero-reveal' || preset.value === 'product-reveal') from.y = 28
  if (preset.value === 'scale-in') from.scale = 0.94
  if (preset.value === 'blur-in') from.filter = 'blur(12px)'
  tween = gsap.fromTo(el, from, { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: from.duration, ease: from.ease, delay: from.delay })
}

function arm() {
  clearObserver()
  tween?.kill()
  tween = null

  if (preset.value === 'none' || trigger.value === 'none') {
    state.value = 'visible'
    return
  }

  state.value = 'hidden'

  if (trigger.value === 'load') {
    loadFrame = requestAnimationFrame(() => {
      loadFrame = 0
      state.value = 'visible'
      playGsap()
    })
    return
  }

  const element = root.value
  if (!element || typeof IntersectionObserver === 'undefined') {
    state.value = 'visible'
    playGsap()
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          state.value = 'visible'
          playGsap()
          if (once.value) clearObserver()
        } else if (!once.value) {
          state.value = 'hidden'
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  )

  observer.observe(element)
}

onMounted(() => {
  arm()
})

watch(
  () =>
    [
      preset.value,
      trigger.value,
      once.value,
      props.motion?.delay ?? 0,
      props.motion?.stagger ?? 0.08,
    ] as const,
  () => {
    arm()
  },
)

onBeforeUnmount(() => {
  clearObserver()
  tween?.kill()
})
</script>

<template>
  <component :is="as" ref="root" :data-motion="preset" :data-motion-state="state" :style="style">
    <slot />
  </component>
</template>
