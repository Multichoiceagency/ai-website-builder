<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{ heading?: string; body?: string }>(), { heading: '', body: '' })

const words = computed(() => props.body.split(/\s+/).filter(Boolean))

const root = ref<HTMLElement | null>(null)
/** How far through the reveal we are, 0–1. Drives opacity only. */
const progress = ref(0)
let observer: IntersectionObserver | null = null
let frame = 0

/**
 * Scroll-linked brightening, without a scroll handler doing layout work.
 *
 * The section's position is read once per animation frame while it is on
 * screen, and only while it is on screen — the IntersectionObserver starts and
 * stops the loop. Nothing but `opacity` changes, so the text is never re-laid
 * out and never reflows the page.
 */
function measure() {
  const element = root.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const span = rect.height + window.innerHeight * 0.5
  const travelled = window.innerHeight * 0.85 - rect.top
  progress.value = Math.min(Math.max(travelled / span, 0), 1)
  frame = requestAnimationFrame(measure)
}

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !root.value || typeof IntersectionObserver === 'undefined') {
    progress.value = 1
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !frame) frame = requestAnimationFrame(measure)
        else if (!entry.isIntersecting) stop()
      }
    },
    { threshold: 0 },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
})

/** Each word lights slightly after the one before it. */
function opacityFor(index: number): number {
  const point = words.value.length ? index / words.value.length : 0
  return Math.min(Math.max((progress.value - point) * 6 + 0.28, 0.28), 1)
}
</script>

<template>
  <div ref="root" class="mx-auto w-full max-w-4xl px-6 py-24 lg:px-10 lg:py-32">
    <h2
      v-if="heading"
      class="mb-10 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-primary)]"
    >
      {{ heading }}
    </h2>

    <p
      class="text-[clamp(1.5rem,1rem+2.2vw,2.75rem)] font-semibold leading-[1.24] tracking-[-0.03em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >
      <span
        v-for="(word, index) in words"
        :key="`${word}-${index}`"
        class="transition-opacity duration-300 ease-out"
        :style="{ opacity: opacityFor(index) }"
      >{{ word }}&nbsp;</span>
    </p>
  </div>
</template>
