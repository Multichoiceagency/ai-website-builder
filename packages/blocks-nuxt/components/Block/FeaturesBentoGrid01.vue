<script setup lang="ts">
/**
 * Bento grid — feature cells at mixed sizes.
 *
 * The span pattern is static CSS grid, which is why this is class A despite
 * looking like an effect: there is no measurement, no scroll listener and no
 * per-frame work. The only motion is the section's entrance, which the shared
 * motion layer already gates on `prefers-reduced-motion`.
 *
 * `size` is a span *intent*, honoured only from `sm` upward. Below that every
 * cell is full width, because a two-column span means nothing in one column.
 */
withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    items?: { title: string; description: string; size: 'normal' | 'wide' | 'tall' }[]
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', intro: '', items: () => [], headingLevel: 'h2' },
)

/**
 * Spans are written out rather than interpolated: Tailwind resolves class names
 * at build time, so a computed `sm:col-span-${n}` would produce no CSS at all.
 */
const SPAN_CLASS: Record<string, string> = {
  normal: '',
  wide: 'sm:col-span-2',
  tall: 'sm:row-span-2',
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <component
        :is="headingLevel"
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ heading }}
      </component>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <ul class="mt-12 grid auto-rows-[minmax(11rem,auto)] gap-4 sm:grid-cols-3">
      <li
        v-for="item in items"
        :key="item.title"
        class="flex flex-col justify-end rounded-[var(--site-radius)] border border-[var(--site-text)]/10 bg-[var(--site-surface-alt)] p-6 transition-colors duration-200 hover:border-[var(--site-primary)]/40"
        :class="SPAN_CLASS[item.size]"
      >
        <h3 class="text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">{{ item.title }}</h3>
        <p class="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
      </li>
    </ul>
  </div>
</template>
