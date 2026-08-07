<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Step {
  year: string
  title: string
  description: string
}

withDefaults(
  defineProps<{ heading?: string; image?: string; imageAlt?: string; items?: Step[] }>(),
  { heading: '', image: '', imageAlt: '', items: () => [] },
)

const active = ref(0)
const stepElements = ref<HTMLElement[]>([])
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = stepElements.value.indexOf(entry.target as HTMLElement)
        if (index >= 0) active.value = index
      }
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
  )
  for (const element of stepElements.value) observer.observe(element)
})

onBeforeUnmount(() => observer?.disconnect())

function registerStep(element: unknown, index: number) {
  if (element instanceof HTMLElement) stepElements.value[index] = element
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-28">
    <h2
      v-if="heading"
      class="max-w-2xl text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >{{ heading }}</h2>

    <div class="mt-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
      <!--
        The visual holds still while the story moves past it. Sticky does the
        holding; the only thing that animates is the highlight on the active
        step, and that is an opacity and a border colour.
      -->
      <div class="lg:sticky lg:top-28 lg:self-start">
        <div class="aspect-[4/5] overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-[var(--site-surface-alt)]">
          <img
            v-if="image"
            :src="image"
            :alt="imageAlt"
            class="h-full w-full object-cover"
            width="800"
            height="1000"
            loading="lazy"
          />
          <div
            v-else
            class="h-full w-full bg-[radial-gradient(90%_70%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-25"
            aria-hidden="true"
          />
        </div>
      </div>

      <ol class="relative border-l border-[var(--site-line)] pl-8">
        <li
          v-for="(item, index) in items"
          :ref="(element) => registerStep(element, index)"
          :key="`${item.year}-${item.title}`"
          class="relative pb-14 last:pb-0"
        >
          <span
            class="absolute -left-[2.3rem] top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 bg-[var(--site-surface)] transition-[border-color,transform] duration-300"
            :class="active === index ? 'scale-125 border-[var(--site-primary)]' : 'border-[var(--site-line)]'"
            aria-hidden="true"
          />
          <p class="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]">{{ item.year }}</p>
          <h3 class="mt-1.5 text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]">{{ item.title }}</h3>
          <p
            class="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)] transition-opacity duration-300"
            :class="active === index ? 'opacity-100' : 'opacity-70'"
          >{{ item.description }}</p>
        </li>
      </ol>
    </div>
  </div>
</template>
