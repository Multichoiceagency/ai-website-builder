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

/**
 * One listener on the grid, not one per card.
 *
 * Each card reads the same pair of custom properties and draws its own border
 * glow from them, so a nine-card grid still costs a single pointer handler that
 * writes two variables. No `getBoundingClientRect` per card, no layout read.
 */
function onPointerMove(event: PointerEvent) {
  const grid = event.currentTarget as HTMLElement
  const rect = grid.getBoundingClientRect()
  grid.style.setProperty('--glow-x', `${event.clientX - rect.left}px`)
  grid.style.setProperty('--glow-y', `${event.clientY - rect.top}px`)
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <ul class="group/grid mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" @pointermove="onPointerMove">
      <li
        v-for="item in items"
        :key="item.title"
        class="relative overflow-hidden rounded-[calc(var(--site-radius)*1.5)] bg-[var(--site-surface-alt)] p-px transition-transform duration-200 hover:-translate-y-1"
      >
        <!-- The border itself: a gradient that follows the pointer, sitting
             under a solid inner surface. Nothing about it can affect layout. -->
        <span
          class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100"
          style="background: radial-gradient(280px circle at var(--glow-x, 50%) var(--glow-y, 50%), var(--site-primary), transparent 65%)"
          aria-hidden="true"
        />
        <div class="relative h-full rounded-[calc(var(--site-radius)*1.5-1px)] border border-[var(--site-line)] bg-[var(--site-surface)] p-7">
          <span class="grid h-11 w-11 place-items-center rounded-[var(--site-radius)] bg-[var(--site-primary)]/10 text-[var(--site-primary)]">
            <BlockIcon :name="item.icon" class="h-5 w-5" />
          </span>
          <h3 class="mt-5 text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">{{ item.title }}</h3>
          <p class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
