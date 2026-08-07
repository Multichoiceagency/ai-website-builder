<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SectionMotion } from '@platform/schemas'

/**
 * Applies a stored motion intent to its slot.
 *
 * The element renders in its hidden state during SSR and is released either
 * on mount (`load`) or on first intersection (`viewport`). CSS carries the
 * reduced-motion and no-scripting fallbacks, so a failed observer can never
 * strand content invisible.
 *
 * Changing the intent in the editor (Style → Animation) must replay: the
 * observer and hidden→visible transition are re-armed whenever the recipe
 * changes, not only on first mount.
 */
const props = withDefaults(
  defineProps<{
    motion?: Partial<SectionMotion> | null
    /** Element to render. Blocks pass `section`, `header`, `footer`, … */
    as?: string
    /**
     * Extra CSS custom properties merged onto the wrapper (section style
     * overrides: scale, colour tokens). Motion vars win on name clash.
     */
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

function clearObserver() {
  observer?.disconnect()
  observer = null
  if (loadFrame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(loadFrame)
    loadFrame = 0
  }
}

function arm() {
  clearObserver()

  if (preset.value === 'none' || trigger.value === 'none') {
    state.value = 'visible'
    return
  }

  state.value = 'hidden'

  if (trigger.value === 'load') {
    // One frame in the hidden state, so the transition has something to run from.
    loadFrame = requestAnimationFrame(() => {
      loadFrame = 0
      state.value = 'visible'
    })
    return
  }

  const element = root.value
  if (!element || typeof IntersectionObserver === 'undefined') {
    state.value = 'visible'
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          state.value = 'visible'
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
})
</script>

<template>
  <component :is="as" ref="root" :data-motion="preset" :data-motion-state="state" :style="style">
    <slot />
  </component>
</template>
