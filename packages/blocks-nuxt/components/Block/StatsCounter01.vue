<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{ items?: { value: number; suffix: string; label: string }[] }>(),
  { items: () => [] },
)

const root = ref<HTMLElement | null>(null)
const shown = ref<number[]>(props.items.map(() => 0))
let observer: IntersectionObserver | null = null

/**
 * Counts up once on entry. Reduced-motion users get the final value straight
 * away — the number is the information, the animation is decoration.
 */
function run() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    shown.value = props.items.map((item) => item.value)
    return
  }

  const start = performance.now()
  const duration = 1100

  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - (1 - progress) ** 3
    shown.value = props.items.map((item) => Math.round(item.value * eased))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    shown.value = props.items.map((item) => item.value)
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        run()
        observer?.disconnect()
      }
    },
    { threshold: 0.3 },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="root" class="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10">
    <dl class="grid gap-8" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))">
      <div v-for="(item, index) in items" :key="item.label" class="flex flex-col text-center">
        <dd
          class="order-1 text-[clamp(2.5rem,1.8rem+2.4vw,3.75rem)] font-semibold leading-none tracking-[-0.045em] text-[var(--site-text)] tabular-nums"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ shown[index] ?? 0 }}{{ item.suffix }}</dd>
        <dt class="order-2 mt-2.5 text-sm font-medium text-[var(--site-text-muted)]">{{ item.label }}</dt>
      </div>
    </dl>
  </div>
</template>
