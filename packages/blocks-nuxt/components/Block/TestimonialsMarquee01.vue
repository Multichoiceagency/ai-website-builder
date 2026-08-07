<script setup lang="ts">
import { computed } from 'vue'

interface Review {
  quote: string
  author: string
  role: string
  rating: number
}

const props = withDefaults(
  defineProps<{ heading?: string; speed?: 'slow' | 'medium' | 'fast'; items?: Review[] }>(),
  { heading: '', speed: 'slow', items: () => [] },
)

const duration = computed(() => ({ slow: '64s', medium: '46s', fast: '30s' })[props.speed])

/** Two rows drifting opposite ways reads as a wall; one row reads as a ticker. */
const rows = computed(() => {
  const half = Math.ceil(props.items.length / 2) || 1
  return [props.items.slice(0, half), props.items.slice(half).length ? props.items.slice(half) : props.items.slice(0, half)]
})
</script>

<template>
  <div class="overflow-hidden py-20 lg:py-24">
    <h2
      v-if="heading"
      class="mx-auto mb-12 w-full max-w-6xl px-6 text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)] lg:px-10"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >{{ heading }}</h2>

    <!--
      Each row is duplicated so the loop is seamless. The duplicate is hidden
      from assistive technology, and the group pauses on hover *and* on focus so
      a keyboard user can read a card without chasing it.
    -->
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="group mt-4 flex w-max first:mt-0 focus-within:[animation-play-state:paused] hover:[animation-play-state:paused] motion-reduce:animate-none"
      :class="rowIndex === 1 ? '[animation:marquee-wall-reverse_var(--wall-duration)_linear_infinite]' : '[animation:marquee-wall_var(--wall-duration)_linear_infinite]'"
      :style="{ '--wall-duration': duration }"
    >
      <ul
        v-for="copy in 2"
        :key="copy"
        class="flex shrink-0 items-stretch gap-4 pr-4"
        :aria-hidden="copy === 2 ? 'true' : undefined"
      >
        <li
          v-for="(item, index) in row"
          :key="`${copy}-${index}`"
          class="w-[min(22rem,80vw)] shrink-0 rounded-[calc(var(--site-radius)*1.5)] border border-[var(--site-line)] bg-[var(--site-surface)] p-6"
        >
          <figure>
            <div v-if="item.rating > 0" class="flex gap-0.5 text-[var(--site-accent)]" :aria-label="`${item.rating} out of 5`">
              <BlockIcon v-for="star in Math.round(item.rating)" :key="star" name="star" class="h-4 w-4" />
            </div>
            <blockquote class="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-[var(--site-text)]">
              {{ item.quote }}
            </blockquote>
            <figcaption class="mt-4 text-[0.8125rem] text-[var(--site-text-muted)]">
              <span class="font-semibold text-[var(--site-text)]">{{ item.author }}</span>
              <span v-if="item.role"> · {{ item.role }}</span>
            </figcaption>
          </figure>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
@keyframes marquee-wall {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@keyframes marquee-wall-reverse {
  from { transform: translate3d(-50%, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
}
</style>
