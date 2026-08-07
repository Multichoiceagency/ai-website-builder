<script setup lang="ts">
import { computed } from 'vue'

interface Logo {
  name: string
  image: string
}

const props = withDefaults(
  defineProps<{ heading?: string; subheading?: string; items?: Logo[] }>(),
  { heading: '', subheading: '', items: () => [] },
)

/**
 * Two rings, inner and outer, counter-rotating. Each mark is placed with a
 * static transform and the *ring* rotates, so there is one animated element per
 * ring rather than one per logo. The counter-rotation on each mark keeps the
 * logo upright without adding a second animated layer per item.
 */
const rings = computed(() => {
  const inner = props.items.slice(0, Math.ceil(props.items.length / 2))
  const outer = props.items.slice(Math.ceil(props.items.length / 2))
  return [
    { items: inner, radius: 8.5, duration: '46s', direction: 'normal' },
    { items: outer.length ? outer : inner, radius: 14, duration: '64s', direction: 'reverse' },
  ]
})

function angleFor(index: number, count: number): number {
  return (360 / Math.max(count, 1)) * index
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-20 lg:px-10 lg:py-28">
    <div class="relative mx-auto grid aspect-square w-full max-w-[36rem] place-items-center">
      <div
        v-for="(ring, ringIndex) in rings"
        :key="ringIndex"
        class="pointer-events-none absolute inset-0 grid place-items-center [animation:orbit-spin_var(--orbit-duration)_linear_infinite] motion-reduce:animate-none"
        :style="{ '--orbit-duration': ring.duration, animationDirection: ring.direction }"
        aria-hidden="true"
      >
        <span
          class="absolute rounded-full border border-[var(--site-line)]"
          :style="{ width: `${ring.radius * 2}rem`, height: `${ring.radius * 2}rem` }"
        />
        <!-- Placement is a static transform on the outer span; the inner span
             carries the counter-rotation. Putting both on one element would
             mean the animation overwrote the placement. -->
        <span
          v-for="(item, index) in ring.items"
          :key="`${ringIndex}-${item.name}-${index}`"
          class="absolute"
          :style="{ transform: `rotate(${angleFor(index, ring.items.length)}deg) translate(${ring.radius}rem)` }"
        >
          <span
            class="grid h-14 w-14 place-items-center rounded-full border border-[var(--site-line)] bg-[var(--site-surface)] [animation:orbit-spin_var(--orbit-duration)_linear_infinite] motion-reduce:animate-none"
            :style="{
              '--orbit-duration': ring.duration,
              animationDirection: ring.direction === 'reverse' ? 'normal' : 'reverse',
            }"
          >
            <img v-if="item.image" :src="item.image" :alt="''" class="h-7 w-auto object-contain" width="80" height="28" loading="lazy" />
            <span v-else class="px-1 text-center text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              {{ item.name.slice(0, 8) }}
            </span>
          </span>
        </span>
      </div>

      <div class="relative max-w-[15rem] text-center">
        <h2
          v-if="heading"
          class="text-[clamp(1.25rem,1rem+1vw,1.75rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-balance text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ heading }}</h2>
        <p v-if="subheading" class="mt-2 text-[0.875rem] text-[var(--site-text-muted)]">{{ subheading }}</p>
      </div>
    </div>

    <!-- The orbit is decoration. The names are the content, so they are also
         listed plainly for assistive tech and for search. -->
    <ul class="sr-only">
      <li v-for="item in items" :key="`name-${item.name}`">{{ item.name }}</li>
    </ul>
  </div>
</template>

<style>
@keyframes orbit-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
