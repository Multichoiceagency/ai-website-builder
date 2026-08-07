<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { IconName } from '@platform/blocks'

interface Step {
  icon: IconName
  title: string
  description: string
}

withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Step[] }>(),
  { heading: '', intro: '', items: () => [] },
)

const reached = ref(0)
const stepElements = ref<HTMLElement[]>([])
let observer: IntersectionObserver | null = null

/**
 * The beam grows with `scaleY` on a fixed-height rail — a transform, not a
 * height — and how far it has grown is decided by which step has been seen.
 * That keeps a scroll-linked-looking effect down to one observer callback per
 * step rather than a measurement every frame.
 */
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    reached.value = stepElements.value.length
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = stepElements.value.indexOf(entry.target as HTMLElement)
        if (index >= 0) reached.value = Math.max(reached.value, index + 1)
      }
    },
    { rootMargin: '0px 0px -35% 0px', threshold: 0 },
  )

  for (const element of stepElements.value) observer.observe(element)
})

onBeforeUnmount(() => observer?.disconnect())

function registerStep(element: unknown, index: number) {
  if (element instanceof HTMLElement) stepElements.value[index] = element
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-20 lg:px-10 lg:py-28">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <ol class="relative mt-14 pl-14">
      <span class="absolute bottom-6 left-[1.375rem] top-2 w-px bg-[var(--site-line)]" aria-hidden="true" />
      <span
        class="absolute left-[1.375rem] top-2 w-px origin-top bg-[linear-gradient(180deg,var(--site-primary),var(--site-accent))] transition-transform duration-700 ease-out motion-reduce:transition-none"
        :style="{
          bottom: '1.5rem',
          transform: `scaleY(${items.length ? Math.min(reached / items.length, 1) : 0})`,
        }"
        aria-hidden="true"
      />

      <li
        v-for="(item, index) in items"
        :ref="(element) => registerStep(element, index)"
        :key="item.title"
        class="relative pb-12 last:pb-0"
      >
        <span
          class="absolute -left-14 top-0 grid h-11 w-11 place-items-center rounded-full border bg-[var(--site-surface)] transition-[border-color,color,transform] duration-500"
          :class="
            reached > index
              ? 'scale-105 border-[var(--site-primary)] text-[var(--site-primary)]'
              : 'border-[var(--site-line)] text-[var(--site-text-muted)]'
          "
        >
          <BlockIcon :name="item.icon" class="h-5 w-5" />
        </span>

        <h3 class="text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]">{{ item.title }}</h3>
        <p class="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
      </li>
    </ol>
  </div>
</template>
