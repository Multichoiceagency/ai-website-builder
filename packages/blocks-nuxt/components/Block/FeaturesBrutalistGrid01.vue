<script setup lang="ts">
import type { IconName } from '@platform/blocks'

withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    items?: { icon: IconName; title: string; description: string }[]
  }>(),
  { heading: '', intro: '', items: () => [] },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+2vw,3rem)] font-bold uppercase leading-[0.96] tracking-[-0.04em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <!--
      One border on the container and one on each cell, collapsed with negative
      margins, so the grid reads as a single ruled object rather than a set of
      floating cards. No shadows, no radii, nothing to animate but colour.
    -->
    <ul class="mt-12 grid border-2 border-[var(--site-text)] sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="(item, index) in items"
        :key="item.title"
        class="group/cell border-b-2 border-r-2 border-[var(--site-text)] p-8 transition-colors duration-200 last:border-b-0 hover:bg-[var(--site-text)] sm:[&:nth-last-child(-n+1)]:border-b-0"
      >
        <div class="flex items-start justify-between gap-4">
          <span
            class="text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[var(--site-text-muted)] transition-colors duration-200 group-hover/cell:text-[var(--site-surface)]"
          >{{ String(index + 1).padStart(2, '0') }}</span>
          <BlockIcon
            :name="item.icon"
            class="h-5 w-5 text-[var(--site-primary)] transition-colors duration-200 group-hover/cell:text-[var(--site-surface)]"
          />
        </div>

        <h3
          class="mt-8 text-[1.5rem] font-bold uppercase leading-[1.02] tracking-[-0.03em] text-[var(--site-text)] transition-colors duration-200 group-hover/cell:text-[var(--site-surface)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ item.title }}</h3>
        <p
          class="mt-3 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)] transition-colors duration-200 group-hover/cell:text-[var(--site-surface)]/80"
        >{{ item.description }}</p>
      </li>
    </ul>
  </div>
</template>
