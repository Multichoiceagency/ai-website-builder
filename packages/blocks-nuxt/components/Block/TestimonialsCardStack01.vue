<script setup lang="ts">
import { computed, ref } from 'vue'

interface Review {
  quote: string
  author: string
  role: string
  rating: number
}

const props = withDefaults(defineProps<{ heading?: string; items?: Review[] }>(), {
  heading: '',
  items: () => [],
})

const index = ref(0)
const total = computed(() => props.items.length)

function go(step: number) {
  if (!total.value) return
  index.value = (index.value + step + total.value) % total.value
}

/**
 * Position in the fan: 0 is the front card, 1 and 2 sit behind it. Everything
 * behind the third is parked with the third, so a twelve-review stack costs the
 * same as a three-review one.
 */
function depth(cardIndex: number): number {
  if (!total.value) return 0
  return Math.min((cardIndex - index.value + total.value) % total.value, 3)
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>

      <div v-if="total > 1" class="flex items-center gap-2">
        <button
          type="button"
          class="grid h-10 w-10 place-items-center rounded-full border border-[var(--site-line)] text-[var(--site-text)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[var(--site-surface-alt)]"
          aria-label="Previous review"
          @click="go(-1)"
        >‹</button>
        <button
          type="button"
          class="grid h-10 w-10 place-items-center rounded-full border border-[var(--site-line)] text-[var(--site-text)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[var(--site-surface-alt)]"
          aria-label="Next review"
          @click="go(1)"
        >›</button>
      </div>
    </div>

    <!--
      Every review stays in the document. The deck is a stack of absolutely
      positioned cards separated by transform and opacity only, so search
      engines and screen readers see all of the proof, not just the top card.
    -->
    <div class="relative mt-10 min-h-[17rem]" aria-live="polite">
      <figure
        v-for="(item, cardIndex) in items"
        :key="`${item.author}-${cardIndex}`"
        class="absolute inset-x-0 top-0 rounded-[calc(var(--site-radius)*1.75)] border border-[var(--site-line)] bg-[var(--site-surface)] p-8 shadow-[0_24px_60px_-40px_rgb(0_0_0/0.5)] transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none"
        :style="{
          transform: `translate3d(0, ${depth(cardIndex) * 0.9}rem, 0) scale(${1 - depth(cardIndex) * 0.035})`,
          opacity: depth(cardIndex) >= 3 ? 0 : 1 - depth(cardIndex) * 0.22,
          zIndex: items.length - depth(cardIndex),
          pointerEvents: depth(cardIndex) === 0 ? 'auto' : 'none',
        }"
        :aria-hidden="depth(cardIndex) === 0 ? undefined : 'true'"
      >
        <div v-if="item.rating > 0" class="flex gap-0.5 text-[var(--site-accent)]" :aria-label="`${item.rating} out of 5`">
          <BlockIcon v-for="star in Math.round(item.rating)" :key="star" name="star" class="h-4 w-4" />
        </div>
        <blockquote
          class="mt-4 text-[1.125rem] leading-relaxed text-pretty text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ item.quote }}</blockquote>
        <figcaption class="mt-5 text-[0.875rem] text-[var(--site-text-muted)]">
          <span class="font-semibold text-[var(--site-text)]">{{ item.author }}</span>
          <span v-if="item.role"> · {{ item.role }}</span>
        </figcaption>
      </figure>
    </div>
  </div>
</template>
