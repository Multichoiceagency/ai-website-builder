<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Step {
  title: string
  description: string
  image: string
  imageAlt: string
}

const props = withDefaults(defineProps<{ heading?: string; items?: Step[] }>(), { heading: '', items: () => [] })

const active = ref(0)
const steps = ref<HTMLElement[]>([])
let observer: IntersectionObserver | null = null

/**
 * The visual pins with `position: sticky`; only *which* panel is on top changes
 * as you scroll, and that is decided by an IntersectionObserver watching the
 * caption blocks. No scroll handler, no per-frame measurement.
 *
 * Every panel is in the document at all times and only its opacity and scale
 * change, so the images are one paint each and the section never reflows.
 */
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = steps.value.indexOf(entry.target as HTMLElement)
        if (index >= 0) active.value = index
      }
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  )

  for (const step of steps.value) observer.observe(step)
})

onBeforeUnmount(() => observer?.disconnect())

function registerStep(element: unknown, index: number) {
  if (element instanceof HTMLElement) steps.value[index] = element
}

const count = () => props.items.length
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <h2
      v-if="heading"
      class="max-w-2xl text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >{{ heading }}</h2>

    <div class="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <!-- Captions. In document order, so this section reads correctly with
           the stylesheet off and to a screen reader. -->
      <ol class="order-2 lg:order-1">
        <li
          v-for="(item, index) in items"
          :ref="(element) => registerStep(element, index)"
          :key="item.title"
          class="border-l-2 py-8 pl-6 transition-[border-color,opacity] duration-300 lg:min-h-[60vh] lg:py-[20vh]"
          :class="active === index ? 'border-[var(--site-primary)] opacity-100' : 'border-[var(--site-line)] opacity-60'"
        >
          <p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]">
            {{ String(index + 1).padStart(2, '0') }} / {{ String(count()).padStart(2, '0') }}
          </p>
          <h3 class="mt-2 text-[1.5rem] font-semibold tracking-[-0.025em] text-[var(--site-text)]">{{ item.title }}</h3>
          <p class="mt-3 max-w-md text-[1rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
        </li>
      </ol>

      <div class="order-1 lg:order-2 lg:sticky lg:top-24 lg:h-[64vh]">
        <div
          class="relative h-64 overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)] sm:h-96 lg:h-full"
        >
          <div
            v-for="(item, index) in items"
            :key="item.title"
            class="absolute inset-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none"
            :style="{
              opacity: active === index ? 1 : 0,
              transform: active === index ? 'scale(1)' : 'scale(1.04)',
            }"
            :aria-hidden="active === index ? undefined : 'true'"
          >
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.imageAlt"
              class="h-full w-full object-cover"
              width="900"
              height="700"
              loading="lazy"
            />
            <div
              v-else
              class="h-full w-full bg-[radial-gradient(100%_80%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-25"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
